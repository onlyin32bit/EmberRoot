<script lang="ts">
	import { onMount } from 'svelte';
	import { mockService } from '$lib/mock';
	import { api, type ApiAlert, type ApiNode } from '$lib/api';
	import { selectedRegionId } from '$lib/stores/regionContext';
	import type { SeriesDef } from '$lib/components/charts';

	// Widgets
	import OperationalStatusWidget from '$lib/components/dashboard/OperationalStatusWidget.svelte';
	import ForestHealthWidget      from '$lib/components/dashboard/ForestHealthWidget.svelte';
	import ActiveAlertsWidget      from '$lib/components/dashboard/ActiveAlertsWidget.svelte';

	// UI Components
	import Card from '$lib/components/ui/Card.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';

	// ── Pull telemetry for representative sensors ─────────────────────────────
	const resolvedRegionId = $derived($selectedRegionId === 'all' ? null : $selectedRegionId);
	const sensors = $derived(resolvedRegionId ? mockService.getSensorsForRegion(resolvedRegionId) : mockService.getSensors());
	const onlines = $derived(sensors.filter(s => s.status === 'online'));
	const sample  = $derived(onlines.slice(0, 4));
	const telems  = $derived(sample.map(s => mockService.getTelemetry(s.id)).filter(Boolean));

	// ── Scalar averages for card values ──────────────────────────────────────
	const avgTemp     = $derived(telems.reduce((s, t) => s + t!.temperature, 0)        / (telems.length || 1));
	const avgHumidity = $derived(telems.reduce((s, t) => s + t!.humidity, 0)            / (telems.length || 1));
	const avgWind     = $derived(telems.reduce((s, t) => s + t!.windSpeed, 0)           / (telems.length || 1));
	const avgCO2      = $derived(telems.reduce((s, t) => s + t!.co2Ppm, 0)              / (telems.length || 1));
	const avgSmoke    = $derived(telems.reduce((s, t) => s + t!.smokeIndex, 0)          / (telems.length || 1));
	const avgPM25     = $derived(telems.reduce((s, t) => s + t!.particulateMatter, 0)   / (telems.length || 1));

	// ── Full TimeSeries for interactive sparklines ────────────────────────────
	const tempSeries  = $derived(telems[0]?.history.temperature ?? []);
	const smokeSeries = $derived(telems[0]?.history.smokeIndex  ?? []);
	const windSeries  = $derived(telems[0]?.history.windSpeed   ?? []);
	// Smoke scaled to % for display
	const smokeSeriesPct = $derived(smokeSeries.map(p => ({ timestamp: p.timestamp, value: p.value * 100 })));

	// ── Overview chart series ──────────────────────────────────────────────────
	const tempChartSeries = $derived.by(() => [
		{ id: 'temperature', label: 'Temperature (°C)',  data: tempSeries,     color: 'var(--ember-400)' },
		{ id: 'smoke',       label: 'Smoke Index ×100',  data: smokeSeriesPct, color: 'var(--status-warning)', filled: false },
	] as SeriesDef[]);

	const riskHistory = $derived(
		resolvedRegionId
			? mockService.getRiskIndex(resolvedRegionId)?.history ?? []
			: (mockService.getHighRiskRegions(0)[0]
				? mockService.getRiskIndex(mockService.getHighRiskRegions(0)[0].regionId)?.history ?? []
				: [])
	);
	const riskChartSeries = $derived.by(() => [
		{ id: 'risk', label: 'Risk Composite Score', data: riskHistory, color: 'var(--ember-300)' },
	] as SeriesDef[]);

	const now    = new Date();
	const nowStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

	// The dashboard retains mock widgets while the remaining screens are migrated,
	// but its network status and field counts come from the production API.
	let apiNodes = $state<ApiNode[]>([]);
	let apiAlerts = $state<ApiAlert[]>([]);
	let apiError = $state<string | null>(null);
	let apiLoading = $state(true);

	async function refreshLiveData() {
		try {
			const [nodes, alerts] = await Promise.all([api.getNodes(), api.getAlerts()]);
			apiNodes = nodes;
			apiAlerts = alerts;
			apiError = null;
		} catch (error) {
			apiError = error instanceof Error ? error.message : 'Unable to reach the EmberRoot API';
		} finally {
			apiLoading = false;
		}
	}

	onMount(() => {
		void refreshLiveData();
		const unsubscribe = api.connectRealtime(() => void refreshLiveData());
		const poll = window.setInterval(() => void refreshLiveData(), 30_000);
		return () => {
			unsubscribe?.();
			window.clearInterval(poll);
		};
	});
</script>

<svelte:head>
	<title>Dashboard — EmberRoot</title>
	<meta name="description" content="EmberRoot dashboard — wildfire risk, active alerts, and sensor health for the U Minh forest monitoring network." />
</svelte:head>

<div class="dash">
	<div class="dash__header">
		<div class="dash__header-left">
			<h1 class="dash__title">Forest Watch Dashboard</h1>
			<p class="dash__subtitle">Focused view of live fire-risk conditions, key sensors, and active alerts · Updated {nowStr}</p>
		</div>
		<div class="dash__header-actions">
			<Badge variant="online">
				<span class="dash__live-dot"></span>
				{apiLoading ? 'Connecting' : apiError ? 'API offline' : 'Live API'}
			</Badge>
		</div>
	</div>

	<div class:dash__api-status--error={Boolean(apiError)} class="dash__api-status" role="status">
		{#if apiError}
			API connection unavailable: {apiError}. Showing prototype widgets until the service is reachable.
		{:else if apiLoading}
			Connecting to the EmberRoot API…
		{:else}
			Field data: {apiNodes.length} nodes · {apiNodes.filter((node) => node.status === 'online').length} online · {apiAlerts.filter((alert) => alert.state === 'open').length} open alerts
		{/if}
	</div>

	<div class="dash__row dash__row--top">
		<Card padding="md" class="dash__widget dash__widget--ops">
			<OperationalStatusWidget />
		</Card>
		<Card padding="md" class="dash__widget">
			<ForestHealthWidget />
		</Card>
		<Card padding="md" class="dash__widget">
			<ActiveAlertsWidget />
		</Card>
	</div>

	<div class="dash__focus-card">
		<div>
			<h2>Current watch focus</h2>
			<p>Track smoke, heat, humidity, and wind conditions across the active monitoring region. Prioritize critical alerts and heat anomalies before they escalate into a wildfire incident.</p>
		</div>
		<div class="dash__focus-metrics">
			<div><strong>{avgTemp.toFixed(1)}°C</strong><span>Avg. temp</span></div>
			<div><strong>{avgHumidity.toFixed(0)}%</strong><span>Humidity</span></div>
			<div><strong>{(avgSmoke * 100).toFixed(0)}%</strong><span>Smoke index</span></div>
		</div>
	</div>
</div>

<style>
	.dash {
		padding: 24px 28px;
		display: flex;
		flex-direction: column;
		gap: 20px;
		min-height: 100%;
	}

	/* ── Header ─────────────────────────────────────────────────── */
	.dash__header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 16px;
		padding-bottom: 16px;
		border-bottom: 1px solid var(--surface-border);
	}
	.dash__header-left { display: flex; flex-direction: column; gap: 3px; }
	.dash__title {
		font-size: 22px;
		font-weight: 700;
		letter-spacing: -0.4px;
		color: var(--text-primary);
		margin: 0;
	}
	.dash__subtitle { font-size: 12px; color: var(--text-muted); margin: 0; }

	.dash__header-actions {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-shrink: 0;
	}
	.dash__api-status {
		font-size: 12px;
		padding: 9px 12px;
		border: 1px solid color-mix(in srgb, var(--status-online) 30%, transparent);
		background: color-mix(in srgb, var(--status-online) 8%, transparent);
		border-radius: 10px;
		color: var(--text-secondary);
	}
	.dash__api-status--error {
		border-color: color-mix(in srgb, var(--status-warning) 45%, transparent);
		background: color-mix(in srgb, var(--status-warning) 8%, transparent);
	}

	.dash__focus-card {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 20px;
		padding: 18px 20px;
		border: 1px solid var(--surface-border);
		border-radius: 16px;
		background: linear-gradient(135deg, rgba(240, 120, 64, 0.10), rgba(15, 23, 42, 0.70));
	}

	.dash__focus-card h2 {
		margin: 0 0 6px;
		font-size: 16px;
		color: var(--text-primary);
	}

	.dash__focus-card p {
		margin: 0;
		color: var(--text-muted);
		max-width: 700px;
	}

	.dash__focus-metrics {
		display: flex;
		gap: 12px;
		flex-wrap: wrap;
	}

	.dash__focus-metrics div {
		display: flex;
		flex-direction: column;
		padding: 10px 12px;
		border-radius: 12px;
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.08);
		min-width: 100px;
	}

	.dash__focus-metrics strong {
		font-size: 16px;
		color: var(--text-primary);
	}

	.dash__focus-metrics span {
		font-size: 11px;
		color: var(--text-muted);
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}
	.dash__live-dot {
		display: inline-block;
		width: 6px; height: 6px;
		border-radius: 50%;
		background: var(--status-online);
		animation: livepulse 2s ease-in-out infinite;
	}
	@keyframes livepulse {
		0%, 100% { opacity: 1; }
		50%       { opacity: 0.5; }
	}

	/* ── Rows ───────────────────────────────────────────────────── */
	.dash__row { display: grid; gap: 16px; }

	.dash__row--top {
		grid-template-columns: repeat(4, 1fr);
	}

	/* Top stat cards equal height */
	:global(.dash__widget) { min-height: 200px; }

	/* Telemetry row: 6 small cards + weather */
	.dash__row--telem {
		grid-template-columns: 1fr auto;
		align-items: start;
	}
	.dash__telem-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 10px;
	}
	:global(.dash__weather) { width: 280px; }

	/* Charts + alerts row */
	.dash__row--charts {
		grid-template-columns: 1fr 340px;
		align-items: start;
	}
	.dash__charts-col {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}
	:global(.dash__alerts-col) {
		max-height: 520px;
		overflow: hidden;
		display: flex;
		flex-direction: column;
	}

	/* ── Responsive ─────────────────────────────────────────────── */
	@media (max-width: 1200px) {
		.dash__row--top { grid-template-columns: repeat(2, 1fr); }
	}
	@media (max-width: 900px) {
		.dash__row--telem { grid-template-columns: 1fr; }
		:global(.dash__weather) { width: 100%; }
		.dash__telem-grid { grid-template-columns: repeat(2, 1fr); }
		.dash__row--charts { grid-template-columns: 1fr; }
	}
	@media (max-width: 600px) {
		.dash { padding: 16px; }
		.dash__row--top { grid-template-columns: 1fr; }
		.dash__telem-grid { grid-template-columns: 1fr; }
	}
</style>
