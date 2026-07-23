<script lang="ts">
	import { onMount } from 'svelte';
	import { api, type ApiAlert, type ApiNode, type ApiTelemetry } from '$lib/api';
	import { selectedRegionId } from '$lib/stores/regionContext';
	import type { SeriesDef } from '$lib/components/charts';

	// UI Components
	import Card from '$lib/components/ui/Card.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import { LineAreaChart } from '$lib/components/charts';

	// State
	const resolvedRegionId = $derived($selectedRegionId === 'all' ? null : $selectedRegionId);
	
	let apiNodes = $state<ApiNode[]>([]);
	let apiAlerts = $state<ApiAlert[]>([]);
	let telemetryData = $state<Map<string, ApiTelemetry[]>>(new Map());
	let apiError = $state<string | null>(null);
	let apiLoading = $state(true);

	// Derived metrics from live data
	const visibleNodes = $derived(resolvedRegionId 
		? apiNodes.filter(n => n.region_id === resolvedRegionId)
		: apiNodes
	);
	
	const onlineNodes = $derived(visibleNodes.filter(n => n.status === 'online'));
	const criticalAlerts = $derived(apiAlerts.filter(a => a.level === 'warning'));
	const suspiciousAlerts = $derived(apiAlerts.filter(a => a.level === 'suspicious'));
	
	// Calculate averages from latest telemetry
	const avgMetrics = $derived.by(() => {
		if (onlineNodes.length === 0) {
			return { temp: 0, co: 0, co2: 0, moisture: 0, battery: 0 };
		}
		
		const latestReadings = onlineNodes.map(n => {
			const telems = telemetryData.get(n.id) ?? [];
			return telems[0];
		}).filter((t): t is ApiTelemetry => !!t);
		
		if (latestReadings.length === 0) {
			return { temp: 0, co: 0, co2: 0, moisture: 0, battery: 0 };
		}
		
		return {
			temp: latestReadings.reduce((s, t) => s + (t.temp_5 ?? t.ambient_temp ?? 0), 0) / latestReadings.length,
			co: latestReadings.reduce((s, t) => s + (t.co ?? 0), 0) / latestReadings.length,
			co2: latestReadings.reduce((s, t) => s + (t.co2 ?? 0), 0) / latestReadings.length,
			moisture: latestReadings.reduce((s, t) => s + (t.moisture ?? 0), 0) / latestReadings.length,
			battery: latestReadings.reduce((s, t) => s + (t.battery_pct ?? 0), 0) / latestReadings.length
		};
	});

	// Chart series from first node's telemetry
	const chartData = $derived.by(() => {
		const firstOnlineNode = onlineNodes[0];
		if (!firstOnlineNode) return { ambientTemp: [], temp5: [], temp15: [], co: [], co2: [], ch4: [], moisture: [], ambientRh: [], battery: [] };
		
		const telems = telemetryData.get(firstOnlineNode.id) ?? [];
		return {
			ambientTemp: telems.map(t => ({ timestamp: new Date(t.received_at).getTime(), value: t.ambient_temp ?? t.temp_5 ?? 0 })).reverse(),
			temp5: telems.map(t => ({ timestamp: new Date(t.received_at).getTime(), value: t.temp_5 ?? 0 })).reverse(),
			temp15: telems.map(t => ({ timestamp: new Date(t.received_at).getTime(), value: t.temp_15 ?? 0 })).reverse(),
			co: telems.map(t => ({ timestamp: new Date(t.received_at).getTime(), value: t.co ?? 0 })).reverse(),
			co2: telems.map(t => ({ timestamp: new Date(t.received_at).getTime(), value: t.co2 ?? 0 })).reverse(),
			ch4: telems.map(t => ({ timestamp: new Date(t.received_at).getTime(), value: t.ch4 ?? 0 })).reverse(),
			moisture: telems.map(t => ({ timestamp: new Date(t.received_at).getTime(), value: t.moisture ?? 0 })).reverse(),
			ambientRh: telems.map(t => ({ timestamp: new Date(t.received_at).getTime(), value: t.ambient_rh ?? 0 })).reverse(),
			battery: telems.map(t => ({ timestamp: new Date(t.received_at).getTime(), value: t.battery_pct ?? 0 })).reverse()
		};
	});

	const tempSeries = $derived([
		{ id: 'ambientTemp', label: 'Ambient (°C)', data: chartData.ambientTemp, color: '#f97316' },
		{ id: 'temp5', label: 'Soil 5cm (°C)', data: chartData.temp5, color: '#fbbf24', filled: false },
		{ id: 'temp15', label: 'Soil 15cm (°C)', data: chartData.temp15, color: '#d97706', filled: false }
	] as SeriesDef[]);

	const gasSeries = $derived([
		{ id: 'co2', label: 'CO2 (ppm)', data: chartData.co2, color: '#fb923c' },
		{ id: 'co', label: 'CO (ppm)', data: chartData.co, color: '#facc15', filled: false },
		{ id: 'ch4', label: 'CH4 (ppm)', data: chartData.ch4, color: '#ef4444', filled: false }
	] as SeriesDef[]);

	const environmentSeries = $derived([
		{ id: 'moisture', label: 'Soil Moisture (%)', data: chartData.moisture, color: '#38bdf8' },
		{ id: 'ambientRh', label: 'Ambient RH (%)', data: chartData.ambientRh, color: '#a78bfa', filled: false }
	] as SeriesDef[]);

	const healthSeries = $derived([
		{ id: 'battery', label: 'Battery (%)', data: chartData.battery, color: '#4ade80' }
	] as SeriesDef[]);

	const now = new Date();
	const nowStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

	async function refreshLiveData() {
		try {
			const [nodes, alerts] = await Promise.all([api.getNodes(), api.getAlerts()]);
			apiNodes = nodes;
			apiAlerts = alerts;
			
			// Fetch latest telemetry for each online node
			const newTelemetry = new Map<string, ApiTelemetry[]>();
			for (const node of nodes.filter(n => n.status === 'online')) {
				const telem = await api.getTelemetry(node.id, { limit: 50 });
				newTelemetry.set(node.id, telem);
			}
			telemetryData = newTelemetry;
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
	<meta name="description" content="EmberRoot dashboard — monitoring network status, active alerts, and real-time telemetry." />
</svelte:head>

<div class="dash">
	<div class="dash__header">
		<div class="dash__header-left">
			<h1 class="dash__title">Network Dashboard</h1>
			<p class="dash__subtitle">Real-time network status and telemetry from sensor nodes · Updated {nowStr}</p>
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
			API connection unavailable: {apiError}
		{:else if apiLoading}
			Connecting to the EmberRoot API…
		{:else}
			Network: {visibleNodes.length} nodes · {onlineNodes.length} online · {criticalAlerts.length} critical alerts
		{/if}
	</div>

	<div class="dash__stats-row">
		<Card padding="md" class="stat-card">
			<div class="stat-label">Online Nodes</div>
			<div class="stat-value">{onlineNodes.length}/{visibleNodes.length}</div>
			<div class="stat-detail">Network Coverage</div>
		</Card>
		<Card padding="md" class="stat-card">
			<div class="stat-label">Avg Temperature</div>
			<div class="stat-value">{avgMetrics.temp.toFixed(1)}°C</div>
			<div class="stat-detail">Across online nodes</div>
		</Card>
		<Card padding="md" class="stat-card">
			<div class="stat-label">Avg CO</div>
			<div class="stat-value">{avgMetrics.co.toFixed(1)}<span class="stat-unit">ppm</span></div>
			<div class="stat-detail">Carbon monoxide</div>
		</Card>
		<Card padding="md" class="stat-card">
			<div class="stat-label">Avg Battery</div>
			<div class="stat-value">{avgMetrics.battery.toFixed(0)}%</div>
			<div class="stat-detail">Network average</div>
		</Card>
	</div>

	{#if criticalAlerts.length > 0 || suspiciousAlerts.length > 0}
		<Card padding="lg" class="alerts-card">
			<h2>Active Alerts</h2>
			<div class="alerts-list">
				{#each [...criticalAlerts, ...suspiciousAlerts].slice(0, 5) as alert}
					<div class="alert-item" class:alert-critical={alert.level === 'warning'} class:alert-suspicious={alert.level === 'suspicious'}>
						<Badge variant={alert.level === 'warning' ? 'critical' : 'warning'}>{alert.level}</Badge>
						<div class="alert-content">
							<div class="alert-title">{alert.node_name || alert.node_id}</div>
							<div class="alert-text">{alert.explanation}</div>
						</div>
						<div class="alert-time">{new Date(alert.created_at).toLocaleString()}</div>
					</div>
				{/each}
			</div>
		</Card>
	{/if}

	<div class="dash__charts-row">
		<Card padding="lg" class="chart-card">
			<h3>Temperature Trend</h3>
			<LineAreaChart series={tempSeries} unit=" °C" height={250} />
		</Card>
		<Card padding="lg" class="chart-card">
			<h3>Gas Levels (CO₂, CO, CH₄)</h3>
			<LineAreaChart series={gasSeries} unit=" ppm" height={250} />
		</Card>
		<Card padding="lg" class="chart-card">
			<h3>Environment (Moisture, RH)</h3>
			<LineAreaChart series={environmentSeries} unit=" %" height={250} />
		</Card>
		<Card padding="lg" class="chart-card">
			<h3>Network Health</h3>
			<LineAreaChart series={healthSeries} unit=" %" height={250} />
		</Card>
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

	/* ── Stats Row ──────────────────────────────────────────────– */
	.dash__stats-row {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 16px;
	}

	:global(.stat-card) {
		display: flex;
		flex-direction: column;
		justify-content: center;
		gap: 8px;
		text-align: center;
	}

	.stat-label {
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--text-muted);
	}

	.stat-value {
		font-size: 24px;
		font-weight: 700;
		color: var(--text-primary);
	}

	.stat-unit {
		font-size: 12px;
		font-weight: 500;
		margin-left: 4px;
	}

	.stat-detail {
		font-size: 10px;
		color: var(--text-secondary);
	}

	/* ── Alerts Card ────────────────────────────────────────────– */
	:global(.alerts-card) {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	:global(.alerts-card h2) {
		margin: 0;
		font-size: 14px;
		color: var(--text-primary);
	}

	.alerts-list {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.alert-item {
		display: flex;
		align-items: flex-start;
		gap: 12px;
		padding: 12px;
		border-radius: 10px;
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid rgba(255, 255, 255, 0.05);
		transition: background 200ms ease;
	}

	.alert-item:hover {
		background: rgba(255, 255, 255, 0.04);
	}

	.alert-item.alert-critical {
		border-color: color-mix(in srgb, var(--status-critical) 30%, transparent);
		background: color-mix(in srgb, var(--status-critical) 5%, transparent);
	}

	.alert-item.alert-suspicious {
		border-color: color-mix(in srgb, var(--status-warning) 30%, transparent);
		background: color-mix(in srgb, var(--status-warning) 5%, transparent);
	}

	.alert-content {
		flex: 1;
		min-width: 0;
	}

	.alert-title {
		font-size: 12px;
		font-weight: 600;
		color: var(--text-primary);
		margin-bottom: 2px;
	}

	.alert-text {
		font-size: 11px;
		color: var(--text-muted);
		line-height: 1.4;
		white-space: break-spaces;
		word-break: break-word;
	}

	.alert-time {
		font-size: 10px;
		color: var(--text-secondary);
		white-space: nowrap;
		flex-shrink: 0;
	}

	/* ── Charts Row ─────────────────────────────────────────────– */
	.dash__charts-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 16px;
	}

	:global(.chart-card) {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	:global(.chart-card h3) {
		margin: 0;
		font-size: 14px;
		color: var(--text-primary);
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
		.dash__stats-row { grid-template-columns: repeat(2, 1fr); }
		.dash__charts-row { grid-template-columns: 1fr; }
	}
	@media (max-width: 900px) {
		.dash__row--telem { grid-template-columns: 1fr; }
		:global(.dash__weather) { width: 100%; }
		.dash__telem-grid { grid-template-columns: repeat(2, 1fr); }
		.dash__row--charts { grid-template-columns: 1fr; }
		.dash__stats-row { grid-template-columns: repeat(2, 1fr); }
	}
	@media (max-width: 600px) {
		.dash { padding: 16px; }
		.dash__row--top { grid-template-columns: 1fr; }
		.dash__telem-grid { grid-template-columns: 1fr; }
		.dash__stats-row { grid-template-columns: 1fr; }
		.dash__charts-row { grid-template-columns: 1fr; }
	}
</style>
