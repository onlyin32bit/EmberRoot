<script lang="ts">
	import { mockService } from '$lib/mock';
	import type { SeriesDef } from '$lib/components/charts';

	// Widgets
	import OperationalStatusWidget from '$lib/components/dashboard/OperationalStatusWidget.svelte';
	import ForestHealthWidget      from '$lib/components/dashboard/ForestHealthWidget.svelte';
	import ActiveAlertsWidget      from '$lib/components/dashboard/ActiveAlertsWidget.svelte';
	import SensorCountWidget       from '$lib/components/dashboard/SensorCountWidget.svelte';
	import WeatherWidget           from '$lib/components/dashboard/WeatherWidget.svelte';
	import RecentAlertsWidget      from '$lib/components/dashboard/RecentAlertsWidget.svelte';
	import TelemetryCard           from '$lib/components/dashboard/TelemetryCard.svelte';
	import OverviewChartWidget     from '$lib/components/dashboard/OverviewChartWidget.svelte';

	// UI Components
	import Card from '$lib/components/ui/Card.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';

	// ── Pull telemetry for representative sensors ─────────────────────────────
	const sensors = mockService.getSensors();
	const onlines = sensors.filter(s => s.status === 'online');
	const sample  = onlines.slice(0, 4);
	const telems  = sample.map(s => mockService.getTelemetry(s.id)).filter(Boolean);

	// ── Scalar averages for card values ──────────────────────────────────────
	const avgTemp     = telems.reduce((s, t) => s + t!.temperature, 0)        / (telems.length || 1);
	const avgHumidity = telems.reduce((s, t) => s + t!.humidity, 0)            / (telems.length || 1);
	const avgWind     = telems.reduce((s, t) => s + t!.windSpeed, 0)           / (telems.length || 1);
	const avgCO2      = telems.reduce((s, t) => s + t!.co2Ppm, 0)              / (telems.length || 1);
	const avgSmoke    = telems.reduce((s, t) => s + t!.smokeIndex, 0)          / (telems.length || 1);
	const avgPM25     = telems.reduce((s, t) => s + t!.particulateMatter, 0)   / (telems.length || 1);

	// ── Full TimeSeries for interactive sparklines ────────────────────────────
	const tempSeries  = telems[0]?.history.temperature ?? [];
	const smokeSeries = telems[0]?.history.smokeIndex  ?? [];
	const windSeries  = telems[0]?.history.windSpeed   ?? [];
	// Smoke scaled to % for display
	const smokeSeriesPct = smokeSeries.map(p => ({ timestamp: p.timestamp, value: p.value * 100 }));

	// ── Overview chart series ──────────────────────────────────────────────────
	const tempChartSeries: SeriesDef[] = [
		{ id: 'temperature', label: 'Temperature (°C)',  data: tempSeries,     color: 'var(--ember-400)' },
		{ id: 'smoke',       label: 'Smoke Index ×100',  data: smokeSeriesPct, color: 'var(--status-warning)', filled: false },
	];

	const riskHistory = mockService.getHighRiskRegions(0)[0]
		? mockService.getRiskIndex(mockService.getHighRiskRegions(0)[0].regionId)?.history ?? []
		: [];
	const riskChartSeries: SeriesDef[] = [
		{ id: 'risk', label: 'Risk Composite Score', data: riskHistory, color: 'var(--ember-300)' },
	];

	const now    = new Date();
	const nowStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
</script>

<svelte:head>
	<title>Dashboard — EmberRoot</title>
	<meta name="description" content="EmberRoot dashboard — system-wide operational status, alerts, sensor telemetry, and risk overview." />
</svelte:head>

<div class="dash">
	<!-- ── Page header ─────────────────────────────────────────────────────── -->
	<div class="dash__header">
		<div class="dash__header-left">
			<h1 class="dash__title">Dashboard</h1>
			<p class="dash__subtitle">Live operational overview · Updated {nowStr}</p>
		</div>
		<div class="dash__header-actions">
			<Badge variant="online">
				<span class="dash__live-dot"></span>
				Live
			</Badge>
			<Button variant="secondary" size="sm">Export PDF</Button>
			<Button variant="primary"   size="sm">Deploy Response</Button>
		</div>
	</div>

	<!-- ── Row 1 — four top-level stat cards ─────────────────────────────── -->
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
		<Card padding="md" class="dash__widget">
			<SensorCountWidget />
		</Card>
	</div>

	<!-- ── Row 2 — telemetry cards + weather ─────────────────────────────── -->
	<div class="dash__row dash__row--telem">
		<!-- Small telemetry cards -->
		<div class="dash__telem-grid">
			<TelemetryCard
				label="Temperature"
				value={avgTemp.toFixed(1)}
				unit="°C"
				variant={avgTemp > 35 ? 'critical' : avgTemp > 28 ? 'warning' : 'default'}
				trend={avgTemp > 30 ? 'up' : 'stable'}
				trendLabel="{avgTemp > 30 ? '+' : ''}{(avgTemp - 22).toFixed(1)}° vs baseline"
				sparkSeries={tempSeries.slice(-24)}
				formatValue={(n) => n.toFixed(1)}
			>
				{#snippet icon()}
					<svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.5 10V5a2.5 2.5 0 00-5 0v5a5.5 5.5 0 105 0z"/></svg>
				{/snippet}
			</TelemetryCard>

			<TelemetryCard
				label="Humidity"
				value={avgHumidity.toFixed(0)}
				unit="%"
				variant={avgHumidity < 20 ? 'critical' : avgHumidity < 35 ? 'warning' : 'online'}
				trend={avgHumidity < 25 ? 'down' : 'stable'}
				trendLabel={avgHumidity < 25 ? 'Critically dry' : 'Normal range'}
			>
				{#snippet icon()}
					<svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0z"/></svg>
				{/snippet}
			</TelemetryCard>

			<TelemetryCard
				label="Wind Speed"
				value={avgWind.toFixed(0)}
				unit="km/h"
				variant={avgWind > 60 ? 'critical' : avgWind > 35 ? 'warning' : 'default'}
				trend={avgWind > 40 ? 'up' : 'stable'}
				trendLabel="{avgWind > 40 ? 'High' : 'Normal'}"
				sparkSeries={windSeries.slice(-24)}
				formatValue={(n) => n.toFixed(0)}
			>
				{#snippet icon()}
					<svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.59 4.59A2 2 0 1111 8H2m10.59 11.41A2 2 0 1014 16H2m15.73-8.27A2.5 2.5 0 1119.5 12H2"/></svg>
				{/snippet}
			</TelemetryCard>

			<TelemetryCard
				label="CO₂"
				value={Math.round(avgCO2)}
				unit="ppm"
				variant={avgCO2 > 1500 ? 'critical' : avgCO2 > 1000 ? 'warning' : 'default'}
				trend={avgCO2 > 1200 ? 'up' : 'stable'}
				trendLabel={avgCO2 > 1500 ? 'Above threshold' : 'Normal'}
			>
				{#snippet icon()}
					<svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h8M12 8v8"/></svg>
				{/snippet}
			</TelemetryCard>

			<TelemetryCard
				label="Smoke Index"
				value={(avgSmoke * 100).toFixed(0)}
				unit="%"
				variant={avgSmoke > 0.6 ? 'critical' : avgSmoke > 0.3 ? 'warning' : 'online'}
				trend={avgSmoke > 0.3 ? 'up' : 'down'}
				trendLabel={avgSmoke > 0.5 ? 'Elevated' : 'Low'}
				sparkSeries={smokeSeriesPct.slice(-24)}
				formatValue={(n) => n.toFixed(1)}
			>
				{#snippet icon()}
					<svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"/></svg>
				{/snippet}
			</TelemetryCard>

			<TelemetryCard
				label="PM 2.5"
				value={avgPM25.toFixed(0)}
				unit="µg/m³"
				variant={avgPM25 > 150 ? 'critical' : avgPM25 > 75 ? 'warning' : 'online'}
				trend={avgPM25 > 100 ? 'up' : 'stable'}
				trendLabel={avgPM25 > 150 ? 'Hazardous' : avgPM25 > 75 ? 'Moderate' : 'Good'}
			>
				{#snippet icon()}
					<svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>
				{/snippet}
			</TelemetryCard>
		</div>

		<!-- Weather widget -->
		<Card padding="md" class="dash__weather">
			<WeatherWidget />
		</Card>
	</div>

	<!-- ── Row 3 — overview charts + recent alerts ────────────────────────── -->
	<div class="dash__row dash__row--charts">
		<div class="dash__charts-col">
			<!-- Temperature + smoke chart -->
			<OverviewChartWidget
				title="Surface Temperature & Smoke Trend"
				subtitle="48-hour rolling average · Click series in legend to toggle"
				unit=""
				series={tempChartSeries}
				badge={{ label: 'Live', variant: 'online' }}
				formatValue={(n) => n.toFixed(1)}
			/>

			<!-- Risk index chart -->
			<OverviewChartWidget
				title="Risk Index — 30-Day History"
				subtitle="Composite EmberBrain risk score for highest-risk region"
				series={riskChartSeries}
				badge={{ label: 'High Risk', variant: 'critical' }}
				formatValue={(n) => n.toFixed(0)}
			/>
		</div>

		<!-- Recent alerts column -->
		<Card padding="md" class="dash__alerts-col">
			<RecentAlertsWidget />
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
