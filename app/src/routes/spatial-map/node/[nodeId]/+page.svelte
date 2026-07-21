<script lang="ts">
	import PageShell from '$lib/components/PageShell.svelte';
	import LineAreaChart from '$lib/components/charts/LineAreaChart.svelte';
	import TimeRangeSelector from '$lib/components/ui/TimeRangeSelector.svelte';
	import HeatmapGrid from '$lib/components/ui/HeatmapGrid.svelte';
	import type { PageData } from './$types';
	import type { SeriesDef } from '$lib/components/charts/types.js';
	import type { TimeSeries } from '$lib/mock';

	let { data }: { data: PageData } = $props();

	const sensor     = $derived(data.sensor);
	const telemetry  = $derived(data.telemetry);
	const health     = $derived(data.health);
	const confidence = $derived(data.confidence);
	const alerts     = $derived(data.alerts);
	let selectedRange = $state<'24h' | '7d' | '30d'>('24h');

	// ── Status helpers ─────────────────────────────────────────────────────────

	const STATUS_COLOR: Record<string, string> = {
		online:   '#22c55e',
		warning:  '#f59e0b',
		critical: '#ef4444',
		offline:  '#6b7280'
	};

	const SEVERITY_COLOR: Record<string, string> = {
		low:      '#22c55e',
		medium:   '#f59e0b',
		high:     '#fb923c',
		critical: '#ef4444'
	};

	const RISK_BG: Record<string, string> = {
		low:      'rgba(34,197,94,0.12)',
		medium:   'rgba(245,158,11,0.12)',
		high:     'rgba(251,146,60,0.12)',
		critical: 'rgba(239,68,68,0.12)'
	};

	function statusLabel(s: string) {
		return s.charAt(0).toUpperCase() + s.slice(1);
	}

	function sensorTypeLabel(t: string) {
		const MAP: Record<string, string> = {
			thermal:  'Thermal',
			smoke:    'Smoke',
			wind:     'Wind',
			humidity: 'Humidity',
			co2:      'CO₂',
			seismic:  'Seismic',
			visual:   'Visual',
			lidar:    'LiDAR'
		};
		return MAP[t] ?? t;
	}

	function fmtDate(ts: number) {
		return new Date(ts).toLocaleString(undefined, {
			year: 'numeric', month: 'short', day: 'numeric',
			hour: '2-digit', minute: '2-digit'
		});
	}

	function fmtDateShort(ts: number) {
		return new Date(ts).toLocaleDateString(undefined, {
			year: 'numeric', month: 'short', day: 'numeric'
		});
	}

	function fmtAlertTime(ts: number) {
		const d = new Date(ts);
		const now = Date.now();
		const diff = now - ts;
		if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m ago`;
		if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)}h ago`;
		return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
	}

	function categoryLabel(cat: string) {
		return cat.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
	}

	function sampleSeries(series: TimeSeries | undefined, count = 24): number[] {
		if (!series?.length) return Array.from({ length: count }, () => 0);
		if (series.length <= count) return series.map((point) => point.value);
		const step = Math.max(1, Math.floor(series.length / count));
		const sampled: number[] = [];
		for (let i = 0; i < count; i += 1) {
			const index = Math.min(series.length - 1, i * step);
			sampled.push(series[index].value);
		}
		return sampled;
	}

	function sliceHistoryRange(series: TimeSeries | undefined, range: '24h' | '7d' | '30d'): TimeSeries {
		if (!series?.length) return [];
		if (range === '24h') {
			const points = 48;
			return series.slice(Math.max(0, series.length - points));
		}
		return series;
	}

	function selectRange(range: '24h' | '7d' | '30d') {
		selectedRange = range;
	}

	const rangeLabel = $derived.by(() => {
		if (selectedRange === '7d') return '7 days (30-min intervals)';
		if (selectedRange === '30d') return '30 days (daily summaries)';
		return '24 hours (30-min intervals)';
	});

	const historySource = $derived.by(() => {
		if (!telemetry) return null;
		if (selectedRange === '30d') return telemetry.history30d;
		if (selectedRange === '24h') {
			return {
				temperature: sliceHistoryRange(telemetry.history.temperature, '24h'),
				humidity: sliceHistoryRange(telemetry.history.humidity, '24h'),
				smokeIndex: sliceHistoryRange(telemetry.history.smokeIndex, '24h'),
				windSpeed: sliceHistoryRange(telemetry.history.windSpeed, '24h'),
				coPpm: sliceHistoryRange(telemetry.history.coPpm, '24h'),
				co2Ppm: sliceHistoryRange(telemetry.history.co2Ppm, '24h'),
				soilMoisture: sliceHistoryRange(telemetry.history.soilMoisture, '24h'),
				groundwaterLevel: sliceHistoryRange(telemetry.history.groundwaterLevel, '24h'),
				batteryPct: sliceHistoryRange(telemetry.history.batteryPct, '24h'),
				signalStrength: sliceHistoryRange(telemetry.history.signalStrength, '24h')
			};
		}
		return telemetry.history;
	});

	const tempSeries: SeriesDef[] = $derived(telemetry
		? [{ id: 'temperature', label: 'Temperature', data: historySource?.temperature ?? telemetry.history.temperature, color: '#f97316' }]
		: []);

	const moistureSeries: SeriesDef[] = $derived(telemetry
		? [{ id: 'soilMoisture', label: 'Soil Moisture', data: historySource?.soilMoisture ?? telemetry.history.soilMoisture, color: '#38bdf8' }]
		: []);

	const groundwaterSeries: SeriesDef[] = $derived(telemetry
		? [{ id: 'groundwaterLevel', label: 'Groundwater Level', data: historySource?.groundwaterLevel ?? telemetry.history.groundwaterLevel, color: '#818cf8' }]
		: []);

	const gasSeries: SeriesDef[] = $derived(telemetry
		? [
				{ id: 'co2Ppm', label: 'CO₂', data: historySource?.co2Ppm ?? telemetry.history.co2Ppm, color: '#fb923c' },
				{ id: 'coPpm', label: 'CO', data: telemetry.history.coPpm, color: '#facc15', filled: false }
		  ]
		: []);

	const humiditySeries: SeriesDef[] = $derived(telemetry
		? [{ id: 'humidity', label: 'Humidity', data: historySource?.humidity ?? telemetry.history.humidity, color: '#a78bfa' }]
		: []);

	const batterySeries: SeriesDef[] = $derived(telemetry
		? [{ id: 'batteryPct', label: 'Battery', data: historySource?.batteryPct ?? telemetry.history.batteryPct, color: '#4ade80' }]
		: []);

	const signalSeries: SeriesDef[] = $derived(telemetry
		? [{ id: 'signalStrength', label: 'RSSI', data: historySource?.signalStrength ?? telemetry.history.signalStrength, color: '#67e8f9' }]
		: []);

	const gasHeatmapValues = $derived(sampleSeries(historySource?.co2Ppm, 40));
	const soilHeatmapValues = $derived(sampleSeries(historySource?.soilMoisture, 40));
	const groundwaterHeatmapValues = $derived(sampleSeries(historySource?.groundwaterLevel, 40));

	// Derived confidence display
	const confScore = $derived(confidence?.score ?? 0);
	const confLabel = $derived(confidence?.label ?? '—');
	const confRisk = $derived(confidence?.riskLevel ?? 'low');
	const confColor = $derived(SEVERITY_COLOR[confRisk] ?? '#6b7280');
	const confBg = $derived(RISK_BG[confRisk] ?? 'rgba(107,114,128,0.12)');
</script>

<svelte:head>
	<title>{sensor.id} — Node Analytics · EmberRoot</title>
	<meta name="description" content="Detailed telemetry analytics for sensor node {sensor.id} in the EmberRoot monitoring system." />
</svelte:head>

<PageShell
	title={sensor.id}
	subtitle="Sensor node telemetry & historical analytics"
	breadcrumb={['EmberRoot', 'Spatial Map', sensor.id]}
>
	<!-- ── Node header ─────────────────────────────────────────────────────── -->
	<div class="node-header">
		<div class="node-meta">
			<span class="node-meta__type">{sensorTypeLabel(sensor.type)}</span>

			<span
				class="node-meta__status"
				style="
					color:{STATUS_COLOR[sensor.status]};
					background:{STATUS_COLOR[sensor.status]}1a;
					border-color:{STATUS_COLOR[sensor.status]}44;
				"
			>
				<span class="node-meta__status-dot" style="background:{STATUS_COLOR[sensor.status]}"></span>
				{statusLabel(sensor.status)}
			</span>
		</div>

		<h2 class="node-name">{sensor.name}</h2>

		<div class="node-info-grid">
			<div class="node-info-card">
				<div class="node-info-card__label">Region</div>
				<div class="node-info-card__value">{sensor.regionId}</div>
			</div>
			<div class="node-info-card">
				<div class="node-info-card__label">Location</div>
				<div class="node-info-card__value">{sensor.location.lat.toFixed(4)}, {sensor.location.lon.toFixed(4)}</div>
			</div>
			<div class="node-info-card">
				<div class="node-info-card__label">Elevation</div>
				<div class="node-info-card__value">{sensor.elevation} m ASL</div>
			</div>
			<div class="node-info-card">
				<div class="node-info-card__label">Firmware</div>
				<div class="node-info-card__value">{sensor.firmwareVersion}</div>
			</div>
			<div class="node-info-card">
				<div class="node-info-card__label">Last seen</div>
				<div class="node-info-card__value">{fmtDate(sensor.lastSeenAt)}</div>
			</div>
			<div class="node-info-card">
				<div class="node-info-card__label">Deployed</div>
				<div class="node-info-card__value">{fmtDateShort(sensor.deployedAt)}</div>
			</div>
		</div>
	</div>

	<!-- ── Charts grid ─────────────────────────────────────────────────────── -->

	{#if telemetry}
		<div class="section-label section-label--between">
			<span>Historical Telemetry — {selectedRange === '30d' ? '30 days (daily summaries)' : selectedRange === '7d' ? '7 days (30-min intervals)' : '24 hours (30-min intervals)'}</span>
			<TimeRangeSelector value={selectedRange} onChange={selectRange} />
		</div>

		<div class="charts-grid">

			<!-- Temperature -->
			<div class="chart-card chart-card--wide">
				<div class="chart-card__header">
					<div class="chart-card__title">
						<span class="chart-card__dot" style="background:#f97316"></span>
						Temperature Profile
					</div>
					<div class="chart-card__current">{telemetry.temperature.toFixed(1)} °C</div>
				</div>
				<LineAreaChart
					series={tempSeries}
					unit=" °C"
					height={180}
					formatValue={(n) => n.toFixed(1)}
				/>
			</div>

			<!-- Soil Moisture -->
			<div class="chart-card">
				<div class="chart-card__header">
					<div class="chart-card__title">
						<span class="chart-card__dot" style="background:#38bdf8"></span>
						Soil Moisture
					</div>
					<div class="chart-card__current">{telemetry.soilMoisture.toFixed(1)} %</div>
				</div>
				<LineAreaChart
					series={moistureSeries}
					unit=" %"
					height={160}
					formatValue={(n) => n.toFixed(1)}
					showLegend={false}
				/>
			</div>

			<!-- Groundwater Level -->
			<div class="chart-card">
				<div class="chart-card__header">
					<div class="chart-card__title">
						<span class="chart-card__dot" style="background:#818cf8"></span>
						Groundwater Level
					</div>
					<div class="chart-card__current">{telemetry.groundwaterLevel.toFixed(2)} m</div>
				</div>
				<LineAreaChart
					series={groundwaterSeries}
					unit=" m"
					height={160}
					formatValue={(n) => n.toFixed(2)}
					showLegend={false}
				/>
			</div>

			<!-- Gas Concentrations -->
			<div class="chart-card chart-card--wide">
				<div class="chart-card__header">
					<div class="chart-card__title">
						<span class="chart-card__dot" style="background:#fb923c"></span>
						Gas Concentrations
					</div>
					<div class="chart-card__current-group">
						<span>CO₂ {Math.round(telemetry.co2Ppm)} ppm</span>
						<span class="chart-card__sep">·</span>
						<span>CO {telemetry.coPpm} ppm</span>
					</div>
				</div>
				<LineAreaChart
					series={gasSeries}
					unit=" ppm"
					height={180}
					formatValue={(n) => Math.round(n).toString()}
				/>
			</div>

			<!-- Humidity -->
			<div class="chart-card">
				<div class="chart-card__header">
					<div class="chart-card__title">
						<span class="chart-card__dot" style="background:#a78bfa"></span>
						Humidity
					</div>
					<div class="chart-card__current">{telemetry.humidity.toFixed(1)} %</div>
				</div>
				<LineAreaChart
					series={humiditySeries}
					unit=" %"
					height={160}
					formatValue={(n) => n.toFixed(1)}
					showLegend={false}
				/>
			</div>

			<!-- Battery Level -->
			<div class="chart-card">
				<div class="chart-card__header">
					<div class="chart-card__title">
						<span class="chart-card__dot" style="background:#4ade80"></span>
						Battery Level
					</div>
					<div class="chart-card__current">{telemetry.batteryPct} %</div>
				</div>
				<LineAreaChart
					series={batterySeries}
					unit=" %"
					height={160}
					formatValue={(n) => n.toFixed(0)}
					showLegend={false}
				/>
			</div>

			<!-- Signal Quality -->
			<div class="chart-card chart-card--wide">
				<div class="chart-card__header">
					<div class="chart-card__title">
						<span class="chart-card__dot" style="background:#67e8f9"></span>
						Signal Quality (RSSI)
					</div>
					<div class="chart-card__current-group">
						<span>RSSI {telemetry.loraRssi} dBm</span>
						<span class="chart-card__sep">·</span>
						<span>SNR {telemetry.loraSnr} dB</span>
					</div>
				</div>
				<LineAreaChart
					series={signalSeries}
					unit=" dBm"
					height={160}
					formatValue={(n) => n.toFixed(0)}
					showLegend={false}
				/>
			</div>

		</div>

		<div class="section-label">Depth × Time Heatmaps</div>
		<div class="heatmaps-grid">
			<HeatmapGrid
				values={gasHeatmapValues}
				title="Gas Concentration"
				unit=" ppm"
				description="CO₂ trend across the selected window"
				color="#fb923c"
			/>
			<HeatmapGrid
				values={soilHeatmapValues}
				title="Soil Moisture"
				unit=" %"
				description="Volumetric moisture profile"
				color="#38bdf8"
			/>
			<HeatmapGrid
				values={groundwaterHeatmapValues}
				title="Groundwater"
				unit=" m"
				description="Subsurface depth trend"
				color="#818cf8"
			/>
		</div>

		<!-- ── Confidence score ───────────────────────────────────────────────── -->

		<div class="section-label">AI Confidence Score</div>

		<div class="confidence-panel">
			<div class="confidence-score" style="color:{confColor}; background:{confBg}; border-color:{confColor}44;">
				<div class="confidence-score__number">{confScore}</div>
				<div class="confidence-score__label">{confLabel}</div>
			</div>

			<div class="confidence-detail">
				<div class="confidence-detail__risk" style="color:{confColor}">
					Risk level: <strong>{confRisk.toUpperCase()}</strong>
				</div>

				{#if confidence?.factors}
					<div class="confidence-factors">
						{#each Object.entries(confidence.factors) as [key, value]}
							<div class="confidence-factor">
								<span class="confidence-factor__key">{key.charAt(0).toUpperCase() + key.slice(1)}</span>
								<span class="confidence-factor__val">{value}</span>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>

	{:else}
		<div class="no-telemetry">
			<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
				<circle cx="12" cy="12" r="10" />
				<line x1="12" y1="8" x2="12" y2="12" />
				<line x1="12" y1="16" x2="12.01" y2="16" />
			</svg>
			<p>No telemetry data available for this sensor node.</p>
			<small>The node may be offline or have not yet reported readings.</small>
		</div>
	{/if}

	<!-- ── Node health ─────────────────────────────────────────────────────── -->

	{#if health}
		<div class="section-label">Node Health</div>

		<div class="health-grid">
			<div class="health-card">
				<div class="health-card__label">Calibration</div>
				<div class="health-card__value">{health.calibrationStatus}</div>
			</div>
			<div class="health-card">
				<div class="health-card__label">Sensor Drift</div>
				<div class="health-card__value">{health.sensorDrift.toFixed(2)}</div>
			</div>
			<div class="health-card">
				<div class="health-card__label">Signal Strength</div>
				<div class="health-card__value">{health.signalStrength} dBm</div>
			</div>
			<div class="health-card health-card--full">
				<div class="health-card__label">Maintenance Recommendation</div>
				<div class="health-card__value health-card__value--note">{health.maintenanceRecommendation}</div>
			</div>
		</div>
	{/if}

	<!-- ── Alert history ───────────────────────────────────────────────────── -->

	<div class="section-label">
		Alert History
		<span class="section-label__count">{alerts.length}</span>
	</div>

	{#if alerts.length > 0}
		<div class="alert-table-wrap">
			<table class="alert-table">
				<thead>
					<tr>
						<th>Time</th>
						<th>Category</th>
						<th>Severity</th>
						<th>Title</th>
						<th>Status</th>
					</tr>
				</thead>
				<tbody>
					{#each alerts as alert (alert.id)}
						<tr class="alert-row" class:alert-row--resolved={alert.resolvedAt !== null}>
							<td class="alert-cell alert-cell--time" title={fmtDate(alert.triggeredAt)}>
								{fmtAlertTime(alert.triggeredAt)}
							</td>
							<td class="alert-cell">
								<code class="alert-category">{categoryLabel(alert.category)}</code>
							</td>
							<td class="alert-cell">
								<span
									class="alert-severity"
									style="
										color:{SEVERITY_COLOR[alert.severity]};
										background:{SEVERITY_COLOR[alert.severity]}1a;
										border-color:{SEVERITY_COLOR[alert.severity]}44;
									"
								>
									{alert.severity.toUpperCase()}
								</span>
							</td>
							<td class="alert-cell alert-cell--title">{alert.title}</td>
							<td class="alert-cell">
								{#if alert.resolvedAt !== null}
									<span class="alert-status alert-status--resolved">Resolved</span>
								{:else if alert.acknowledged}
									<span class="alert-status alert-status--ack">Acknowledged</span>
								{:else}
									<span class="alert-status alert-status--active">Active</span>
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{:else}
		<div class="no-alerts">No alerts recorded for this sensor node.</div>
	{/if}

</PageShell>

<style>
	/* ── Layout ────────────────────────────────────────────────────────────── */

	.section-label {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--text-muted);
		margin-top: 8px;
	}

	.section-label--between {
		justify-content: space-between;
		margin-top: 12px;
	}

	.section-label__count {
		background: var(--surface-raised);
		border: 1px solid var(--surface-border);
		border-radius: 99px;
		padding: 1px 8px;
		font-size: 10px;
		color: var(--text-secondary);
		letter-spacing: 0;
		text-transform: none;
	}

	/* ── Node header ───────────────────────────────────────────────────────── */

	.node-header {
		background: var(--surface-base);
		border: 1px solid var(--surface-border);
		border-radius: 20px;
		padding: 24px;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.node-meta {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.node-meta__type {
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 0.07em;
		text-transform: uppercase;
		background: var(--surface-raised);
		border: 1px solid var(--surface-border);
		border-radius: 6px;
		padding: 3px 10px;
		color: var(--text-secondary);
	}

	.node-meta__status {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		border: 1px solid;
		border-radius: 6px;
		padding: 3px 10px;
	}

	.node-meta__status-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		flex-shrink: 0;
		animation: pulse-dot 2s ease-in-out infinite;
	}

	@keyframes pulse-dot {
		0%, 100% { opacity: 1; }
		50%       { opacity: 0.45; }
	}

	.node-name {
		margin: 0;
		font-size: 18px;
		font-weight: 700;
		color: var(--text-primary);
	}

	.node-info-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
		gap: 10px;
	}

	.node-info-card {
		background: var(--surface-raised);
		border: 1px solid var(--surface-border);
		border-radius: 12px;
		padding: 12px 14px;
	}

	.node-info-card__label {
		font-size: 10px;
		font-weight: 600;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--text-muted);
		margin-bottom: 5px;
	}

	.node-info-card__value {
		font-size: 13px;
		font-weight: 600;
		color: var(--text-primary);
		font-family: 'JetBrains Mono', monospace;
	}

	/* ── Charts ────────────────────────────────────────────────────────────── */

	.charts-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 16px;
	}

	.chart-card {
		background: var(--surface-base);
		border: 1px solid var(--surface-border);
		border-radius: 18px;
		padding: 20px 20px 16px;
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	.chart-card--wide {
		grid-column: span 2;
	}

	.chart-card__header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
	}

	.chart-card__title {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 13px;
		font-weight: 700;
		color: var(--text-secondary);
	}

	.chart-card__dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.chart-card__current {
		font-size: 18px;
		font-weight: 700;
		font-family: 'JetBrains Mono', monospace;
		color: var(--text-primary);
		white-space: nowrap;
	}

	.chart-card__current-group {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 14px;
		font-weight: 700;
		font-family: 'JetBrains Mono', monospace;
		color: var(--text-primary);
		white-space: nowrap;
	}

	.chart-card__sep {
		color: var(--text-muted);
	}

	/* ── No telemetry ──────────────────────────────────────────────────────── */

	.no-telemetry {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 10px;
		padding: 48px 24px;
		background: var(--surface-base);
		border: 1px solid var(--surface-border);
		border-radius: 18px;
		color: var(--text-muted);
		text-align: center;
	}

	.no-telemetry p { margin: 0; font-size: 15px; color: var(--text-secondary); }
	.no-telemetry small { font-size: 12px; }

	.heatmaps-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 12px;
		margin-top: 10px;
	}

	/* ── Confidence panel ──────────────────────────────────────────────────── */

	.confidence-panel {
		display: flex;
		gap: 20px;
		background: var(--surface-base);
		border: 1px solid var(--surface-border);
		border-radius: 18px;
		padding: 24px;
		align-items: flex-start;
	}

	.confidence-score {
		flex-shrink: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		width: 108px;
		height: 108px;
		border-radius: 18px;
		border: 2px solid;
		gap: 2px;
	}

	.confidence-score__number {
		font-size: 36px;
		font-weight: 800;
		font-family: 'JetBrains Mono', monospace;
		line-height: 1;
	}

	.confidence-score__label {
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		opacity: 0.8;
	}

	.confidence-detail {
		display: flex;
		flex-direction: column;
		gap: 14px;
		flex: 1;
	}

	.confidence-detail__risk {
		font-size: 13px;
		font-weight: 600;
	}

	.confidence-factors {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
		gap: 10px;
	}

	.confidence-factor {
		display: flex;
		flex-direction: column;
		gap: 3px;
		background: var(--surface-raised);
		border: 1px solid var(--surface-border);
		border-radius: 10px;
		padding: 10px 12px;
	}

	.confidence-factor__key {
		font-size: 10px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--text-muted);
	}

	.confidence-factor__val {
		font-size: 12px;
		font-weight: 600;
		color: var(--text-secondary);
	}

	/* ── Node health ───────────────────────────────────────────────────────── */

	.health-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 12px;
	}

	.health-card {
		background: var(--surface-base);
		border: 1px solid var(--surface-border);
		border-radius: 14px;
		padding: 16px;
	}

	.health-card--full {
		grid-column: span 3;
	}

	.health-card__label {
		font-size: 10px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--text-muted);
		margin-bottom: 6px;
	}

	.health-card__value {
		font-size: 14px;
		font-weight: 600;
		color: var(--text-primary);
		font-family: 'JetBrains Mono', monospace;
	}

	.health-card__value--note {
		font-family: inherit;
		font-size: 13px;
		color: var(--text-secondary);
	}

	/* ── Alert table ───────────────────────────────────────────────────────── */

	.alert-table-wrap {
		background: var(--surface-base);
		border: 1px solid var(--surface-border);
		border-radius: 18px;
		overflow: hidden;
	}

	.alert-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 13px;
	}

	.alert-table thead tr {
		border-bottom: 1px solid var(--surface-border);
	}

	.alert-table th {
		padding: 13px 16px;
		text-align: left;
		font-size: 10px;
		font-weight: 700;
		letter-spacing: 0.07em;
		text-transform: uppercase;
		color: var(--text-muted);
		white-space: nowrap;
	}

	.alert-row {
		border-bottom: 1px solid var(--surface-border);
		transition: background 0.12s;
	}

	.alert-row:last-child {
		border-bottom: none;
	}

	.alert-row:hover {
		background: var(--surface-raised);
	}

	.alert-row--resolved {
		opacity: 0.65;
	}

	.alert-cell {
		padding: 12px 16px;
		color: var(--text-secondary);
		vertical-align: middle;
	}

	.alert-cell--time {
		font-family: 'JetBrains Mono', monospace;
		font-size: 12px;
		color: var(--text-muted);
		white-space: nowrap;
	}

	.alert-cell--title {
		font-weight: 600;
		color: var(--text-primary);
	}

	.alert-category {
		font-family: 'JetBrains Mono', monospace;
		font-size: 11px;
		background: var(--surface-raised);
		border: 1px solid var(--surface-border);
		border-radius: 5px;
		padding: 2px 7px;
		color: var(--text-secondary);
		white-space: nowrap;
	}

	.alert-severity {
		display: inline-block;
		font-size: 10px;
		font-weight: 700;
		letter-spacing: 0.06em;
		border: 1px solid;
		border-radius: 5px;
		padding: 2px 8px;
		white-space: nowrap;
	}

	.alert-status {
		display: inline-block;
		font-size: 10px;
		font-weight: 700;
		letter-spacing: 0.05em;
		border-radius: 5px;
		padding: 2px 8px;
		white-space: nowrap;
	}

	.alert-status--resolved {
		background: rgba(34, 197, 94, 0.12);
		color: #22c55e;
		border: 1px solid rgba(34, 197, 94, 0.25);
	}

	.alert-status--ack {
		background: rgba(245, 158, 11, 0.12);
		color: #f59e0b;
		border: 1px solid rgba(245, 158, 11, 0.25);
	}

	.alert-status--active {
		background: rgba(239, 68, 68, 0.12);
		color: #ef4444;
		border: 1px solid rgba(239, 68, 68, 0.25);
	}

	.no-alerts {
		padding: 24px;
		background: var(--surface-base);
		border: 1px solid var(--surface-border);
		border-radius: 14px;
		color: var(--text-muted);
		font-size: 13px;
		text-align: center;
	}

	/* ── Responsive ────────────────────────────────────────────────────────── */

	@media (max-width: 860px) {
		.charts-grid {
			grid-template-columns: 1fr;
		}

		.chart-card--wide {
			grid-column: span 1;
		}

		.health-grid {
			grid-template-columns: 1fr 1fr;
		}

		.health-card--full {
			grid-column: span 2;
		}

		.confidence-panel {
			flex-direction: column;
		}

		.heatmaps-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
