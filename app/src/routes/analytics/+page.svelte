<script lang="ts">
	import PageShell from '$lib/components/PageShell.svelte';
	import ChartContainer from '$lib/components/ui/ChartContainer.svelte';
	import { LineAreaChart } from '$lib/components/charts';
	import NodeHealthPanel from '$lib/components/dashboard/NodeHealthPanel.svelte';
	import RecentAnomalies from '$lib/components/dashboard/RecentAnomalies.svelte';
	import { mockService } from '$lib/mock';
	import { selectedRegionId } from '$lib/stores/regionContext';

	const resolvedRegionId = $derived($selectedRegionId === 'all' ? 'RG-UMINH-01' : $selectedRegionId);
	const region = $derived(mockService.getRegion(resolvedRegionId));
	const sensors = $derived(
		$selectedRegionId === 'all'
			? mockService.getSensors()
			: mockService.getSensorsForRegion(resolvedRegionId)
	);
	const primarySensor = $derived(sensors.find((s) => s.status === 'online') ?? sensors[0]);
	const telemetry = $derived(primarySensor ? mockService.getTelemetry(primarySensor.id) : null);
	const nodeHealth = $derived(primarySensor ? mockService.getNodeHealth(primarySensor.id) : null);

	const tempSeries = $derived(telemetry?.history.temperature ?? []);
	const tempSub = $derived(tempSeries.map((point, index) => ({ timestamp: point.timestamp, value: Math.max(0, point.value - 2.2 - index * 0.02) })));
	const coRatioSeries = $derived(telemetry
		? telemetry.history.coPpm.map((point: { timestamp: number; value: number }, index: number) => {
			const co2Point = telemetry.history.co2Ppm[index];
			const value = co2Point?.value ? parseFloat((point.value / co2Point.value).toFixed(3)) : 0;
			return { timestamp: point.timestamp, value };
		})
		: []);
	const moistureSeries = $derived(telemetry?.history.soilMoisture ?? []);
	const groundwaterSeries = $derived(telemetry?.history.groundwaterLevel ?? []);
	const batterySeries = $derived(telemetry?.history.batteryPct ?? []);
	const signalSeries = $derived(telemetry?.history.signalStrength.map((p) => ({ timestamp: p.timestamp, value: Math.min(100, Math.max(0, p.value + 120)) })) ?? []);
	const riskIndex = $derived(mockService.getRiskIndex(resolvedRegionId));
	const forecastSeries = $derived(riskIndex?.forecast ? riskIndex.forecast.map((point) => ({ timestamp: point.timestamp, value: point.value })) : []);
	const sensorLabel = $derived(primarySensor ? `${primarySensor.name} · ${primarySensor.type.toUpperCase()} · ${region?.name ?? 'Global'}` : 'Sensor');
</script>

<svelte:head>
	<title>Analytics — EmberRoot</title>
	<meta
		name="description"
		content="Analytics — data trends and performance analysis for EmberRoot systems."
	/>
</svelte:head>

<PageShell
	title="Analytics"
	subtitle="Data trends, charts, and performance analysis"
	breadcrumb={['EmberRoot', 'Analytics']}
>
	<div class="analytics-grid">
	<div class="main-chart">
		<ChartContainer title="Temperature Gradient Over Time" subtitle={sensorLabel}>
			<LineAreaChart series={[{ id: 'surface', label: 'Surface Temp (°C)', data: tempSeries, color: 'var(--ember-400)' }, { id: 'sub', label: 'Subsurface Trend', data: tempSub, color: 'var(--status-warning)', filled: false }]} unit="°C" />
		</ChartContainer>
	</div>

	<div class="side-panel">
		<NodeHealthPanel health={nodeHealth} />
	</div>

	<div class="small-chart">
		<ChartContainer title="CO / CO₂ Ratio" subtitle="Recent sensor trend">
			<LineAreaChart series={[{ id: 'coRatio', label: 'CO/CO₂ Ratio', data: coRatioSeries, color: 'var(--ember-500)' }]} unit="" height={140} showLegend={false} />
		</ChartContainer>
	</div>

	<div class="small-chart">
		<ChartContainer title="Soil Moisture & Groundwater" subtitle="Sensor hydrology trend">
			<LineAreaChart series={[{ id: 'moisture', label: 'Soil Moisture (%)', data: moistureSeries, color: 'var(--status-online)' }, { id: 'groundwater', label: 'Groundwater Depth (m)', data: groundwaterSeries, color: 'var(--status-critical)', filled: false }]} unit="" height={140} showLegend={true} />
		</ChartContainer>
	</div>

	<div class="small-chart">
		<ChartContainer title="7-Day Risk Forecast" subtitle={riskIndex ? `${riskIndex.level.toUpperCase()} outlook for ${region?.name ?? 'selected region'}` : 'Projected risk trend'}>
			<LineAreaChart series={[{ id: 'forecast', label: 'Forecasted Risk Score', data: forecastSeries, color: 'var(--ember-400)' }]} unit="" height={140} showLegend={false} />
		</ChartContainer>
	</div>

	<div class="anomalies">
		<RecentAnomalies />
	</div>
	</div>
</PageShell>

<style>
.analytics-grid {
	display: grid;
	grid-template-columns: 1fr 320px;
	grid-template-rows: auto 160px 180px;
	gap: 16px;
	margin-top: 18px;
}
.main-chart { grid-column: 1 / 2; grid-row: 1 / 3; }
.side-panel { grid-column: 2 / 3; grid-row: 1 / 2; }
.small-chart { background: transparent; }
.small-chart:nth-of-type(2) { grid-column: 1 / 2; grid-row: 3 / 4; }
.small-chart:nth-of-type(1) { grid-column: 1 / 2; grid-row: 2 / 3; }
.anomalies { grid-column: 2 / 3; grid-row: 2 / 4; }

@media (max-width: 900px) {
	.analytics-grid { grid-template-columns: 1fr; grid-template-rows: auto; }
	.side-panel, .anomalies { grid-column: 1 / -1; }
	.main-chart { grid-row: auto; }
}
</style>
