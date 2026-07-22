<!-- ForestHealthWidget — SparklineChart (7-day trend) + BarChart (risk factors) -->
<script lang="ts">
	import { mockService } from '$lib/mock';
	import SparklineChart from '$lib/components/charts/SparklineChart.svelte';
	import BarChart from '$lib/components/charts/BarChart.svelte';
	import type { BarDef } from '$lib/components/charts';
	import type { TimeSeries } from '$lib/mock';

	const risks      = mockService.getAllRiskIndices();
	const avgRisk    = risks.reduce((s, r) => s + r.composite, 0) / (risks.length || 1);
	const health     = Math.max(0, Math.min(100, Math.round(100 - avgRisk)));
	const level      = health >= 70 ? 'Good' : health >= 45 ? 'Moderate' : 'Poor';
	const variant    = health >= 70 ? 'online' : health >= 45 ? 'warning' : 'critical';

	// 7-day health sparkline from first region's risk history (inverted)
	const first = risks[0];
	const sparkSeries: TimeSeries = first
		? first.history.slice(-7).map(p => ({ timestamp: p.timestamp, value: Math.round(100 - p.value) }))
		: [];

	// Risk factor bars
	const factorBars: BarDef[] = first ? [
		{ id: 'fuel',  label: 'Fuel Moisture', value: Math.round(first.factors.fuelMoisture.score),
			color: first.factors.fuelMoisture.score > 65 ? 'var(--status-critical)' : 'var(--status-warning)',
			sub: `Trend: ${first.factors.fuelMoisture.trend}` },
		{ id: 'wind',  label: 'Wind Exposure', value: Math.round(first.factors.windExposure.score),
			color: first.factors.windExposure.score > 65 ? 'var(--status-critical)' : 'var(--ember-400)',
			sub: `Trend: ${first.factors.windExposure.trend}` },
		{ id: 'temp',  label: 'Temperature',   value: Math.round(first.factors.temperature.score),
			color: first.factors.temperature.score > 65 ? 'var(--status-critical)' : 'var(--ember-300)',
			sub: `Trend: ${first.factors.temperature.trend}` },
	] : [];

	const COLOR: Record<string, string> = {
		online: 'var(--status-online)', warning: 'var(--status-warning)', critical: 'var(--status-critical)'
	};
</script>

<div class="fh">
	<div class="fh__header">
		<div class="fh__icon fh__icon--{variant}">
			<svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3l14 9-14 9V3z"/>
			</svg>
		</div>
		<div>
			<div class="fh__title">Forest Health</div>
			<div class="fh__sub">Composite risk-adjusted index</div>
		</div>
	</div>

	<div class="fh__score-row">
		<span class="fh__score fh__score--{variant}">{health}</span>
		<div>
			<div class="fh__level fh__level--{variant}">{level}</div>
			<div class="fh__denom">/ 100</div>
		</div>
	</div>

	{#if sparkSeries.length >= 3}
		<div>
			<SparklineChart
				data={sparkSeries} color={COLOR[variant]}
				unit="/100" height={40}
				formatValue={(n) => n.toFixed(0)}
				formatTime={(ts) => { const d = new Date(ts); return `${d.getMonth()+1}/${d.getDate()}`; }}
			/>
			<p class="fh__spark-label">7-day health trend</p>
		</div>
	{/if}

	{#if factorBars.length > 0}
		<BarChart bars={factorBars} orientation="horizontal" showValues />
	{/if}
</div>

<style>
	.fh { display: flex; flex-direction: column; gap: 14px; height: 100%; }
	.fh__header { display: flex; align-items: center; gap: 10px; }
	.fh__icon {
		width: 32px; height: 32px; border-radius: 8px; border: 1px solid;
		display: flex; align-items: center; justify-content: center; flex-shrink: 0;
	}
	.fh__icon--online   { background: rgba(34,211,160,0.12); border-color: rgba(34,211,160,0.25); color: var(--status-online); }
	.fh__icon--warning  { background: rgba(240,179,64,0.12); border-color: rgba(240,179,64,0.25); color: var(--status-warning); }
	.fh__icon--critical { background: rgba(240,80,80,0.12);  border-color: rgba(240,80,80,0.25);  color: var(--status-critical); }
	.fh__title { font-size: 12px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: var(--text-primary); }
	.fh__sub   { font-size: 10px; color: var(--text-muted); }

	.fh__score-row { display: flex; align-items: baseline; gap: 8px; }
	.fh__score {
		font-family: 'JetBrains Mono', monospace;
		font-size: 42px; font-weight: 800; line-height: 1; letter-spacing: -2px;
	}
	.fh__score--online   { color: var(--status-online); }
	.fh__score--warning  { color: var(--status-warning); }
	.fh__score--critical { color: var(--status-critical); }
	.fh__level { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; }
	.fh__level--online   { color: var(--status-online); }
	.fh__level--warning  { color: var(--status-warning); }
	.fh__level--critical { color: var(--status-critical); }
	.fh__denom { font-size: 11px; color: var(--text-muted); }
	.fh__spark-label {
		font-size: 9px; color: var(--text-muted); margin: 3px 0 0;
		text-transform: uppercase; letter-spacing: 0.06em;
	}
</style>
