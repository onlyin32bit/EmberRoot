<script lang="ts">
import { onMount } from 'svelte';
import { mockService, type Telemetry, type NodeHealth, type ConfidenceScore } from '$lib/mock';
import PageShell from '$lib/components/PageShell.svelte';
import SideDrawer from '$lib/components/ui/SideDrawer.svelte';
import MapView from '$lib/components/map/MapView.svelte';
import TelemetryDrawer from '$lib/components/map/TelemetryDrawer.svelte';
import LayerControl from '$lib/components/map/LayerControl.svelte';
import MapLegend from '$lib/components/map/MapLegend.svelte';
import SearchPanel from '$lib/components/map/SearchPanel.svelte';

const regionId = 'RG-UMINH-01';
const region = mockService.getRegion(regionId);
const sensors = region ? mockService.getSensorsForRegion(regionId) : [];
const telemetryMap = new Map<string, Telemetry | undefined>(
	sensors.map((sensor) => [sensor.id, mockService.getTelemetry(sensor.id)])
);
const healthMap = new Map<string, NodeHealth | undefined>(
	sensors.map((sensor) => [sensor.id, mockService.getNodeHealth(sensor.id)])
);
const confidenceMap = new Map<string, ConfidenceScore | undefined>(
	sensors.map((sensor) => [sensor.id, mockService.getConfidenceScore(sensor.id)])
);

const initialSensorId = sensors[0]?.id ?? null;
let selectedSensorId = $state<string | null>(initialSensorId);
let activeLayers = $state({
	sensorNodes: true,
	sensorConnections: false,
	riskHeatmap: true,
	firmsHotspots: true,
	groundwater: false,
	moisture: false
});
let searchResults = $state<{ id: string; title: string; details: string; coords: [number, number] }[]>([]);
let mapReady = $state(false);
let drawerOpen = $state(initialSensorId !== null);

const legendItems = [
	{ label: 'Normal', color: '#22c55e' },
	{ label: 'Monitor', color: '#f59e0b' },
	{ label: 'Suspected', color: '#fb923c' },
	{ label: 'Warning', color: '#ef4444' },
	{ label: 'Offline', color: '#374151' }
];

function selectSensor(id: string) {
	selectedSensorId = id;
	drawerOpen = true;
}

type LayerKey = keyof typeof activeLayers;

function toggleLayer(id: string) {
	const layerId = id as LayerKey;
	activeLayers = { ...activeLayers, [layerId]: !activeLayers[layerId] };
}

function updateMousePosition(coords: string) {
	// expose cursor coordinates for potential map header or debug overlay
}

function runSearch(query: string) {
	const cleaned = query.trim().toLowerCase();
	if (!cleaned) {
		searchResults = [];
		return;
	}

	searchResults = sensors
		.filter((sensor) =>
			sensor.id.toLowerCase().includes(cleaned)
			|| sensor.type.toLowerCase().includes(cleaned)
			|| sensor.status.toLowerCase().includes(cleaned)
			|| String(sensor.location.lat).includes(cleaned)
			|| String(sensor.location.lon).includes(cleaned)
		)
		.slice(0, 10)
		.map((sensor) => ({
			id: sensor.id,
			title: sensor.id,
			details: `${sensor.type.toUpperCase()} • ${sensor.status}`,
			coords: [sensor.location.lat, sensor.location.lon]
		}));
}

function selectSearch(item: { id: string; title: string; details: string; coords: [number, number] }) {
	selectedSensorId = item.id;
	searchResults = [];
	drawerOpen = true;
}

function closeDrawer() {
	drawerOpen = false;
	selectedSensorId = null;
}

onMount(() => {
	mapReady = true;
});

function metricAverage<K extends keyof Telemetry>(key: K) {
	const values = sensors
		.map((sensor) => telemetryMap.get(sensor.id))
		.filter((value): value is Telemetry => !!value)
		.map((telemetry) => telemetry[key] as number);

	return values.length ? (values.reduce((sum, next) => sum + next, 0) / values.length).toFixed(1) : '—';
}
</script>

<svelte:head>
<title>Spatial Map � EmberRoot</title>
<meta name="description" content="Spatial Map � geographic deployment visualisation of U Minh Forest sensors and hotspots." />
</svelte:head>

<PageShell
title="Spatial Map"
subtitle="Geographic deployment visualisation and spatial analysis"
breadcrumb={['EmberRoot', 'Spatial Map']}
>
<div class="spatial-grid">
<section class="map-panel">
<div class="map-panel__header">
<div>
<h2>{region?.name ?? 'U Minh Forest'}</h2>
<p>{region ? `${region.terrain.replace('_', ' ')} terrain � ${region.areaSqKm.toFixed(0)} km�` : 'Forest monitoring region'}</p>
</div>
<div class="map-panel__stats">
<div><span>{sensors.length}</span><small>Total sensors</small></div>
<div><span>{metricAverage('temperature')}�C</span><small>Avg. temperature</small></div>
<div><span>{metricAverage('co2Ppm')}</span><small>Avg. CO2</small></div>
<div><span>{metricAverage('batteryPct')}%</span><small>Avg. battery</small></div>
</div>
</div>

<div class="map-container">
{#if mapReady}
<MapView
sensors={sensors}
selectedId={selectedSensorId}
onSelectSensor={selectSensor}
activeLayers={activeLayers}
onMousePosition={updateMousePosition}
/>
{/if}

<div class="map-overlays">
	<SearchPanel
		results={searchResults}
		onSearch={runSearch}
		onSelect={selectSearch}
	/>

	<LayerControl
		layers={[
			{ id: 'sensorNodes', label: 'Sensor Nodes', enabled: activeLayers.sensorNodes },
			{ id: 'sensorConnections', label: 'Sensor Connections', enabled: activeLayers.sensorConnections },
			{ id: 'riskHeatmap', label: 'Daily Risk Heatmap', enabled: activeLayers.riskHeatmap },
			{ id: 'firmsHotspots', label: 'FIRMS Hotspots', enabled: activeLayers.firmsHotspots },
			{ id: 'groundwater', label: 'Groundwater Layer', enabled: activeLayers.groundwater },
			{ id: 'moisture', label: 'Moisture Layer', enabled: activeLayers.moisture }
		]}
		onToggle={toggleLayer}
	/>

	<MapLegend items={legendItems} />
</div>
</div>
</section>

<section class="overview-panel">
<div class="overview-card">
<h3>Region Analytics</h3>
<ul>
<li><strong>{sensors.filter((sensor) => sensor.status === 'online').length}</strong> active sensors</li>
<li><strong>{metricAverage('temperature')}�C</strong> average temperature</li>
<li><strong>{metricAverage('humidity')}%</strong> average humidity</li>
<li><strong>{metricAverage('co2Ppm')}</strong> average CO2</li>
<li><strong>{metricAverage('batteryPct')}%</strong> average battery</li>
</ul>
</div>

<SideDrawer bind:open={drawerOpen} title={selectedSensorId ? `Sensor ${selectedSensorId}` : 'Sensor details'} width="md" onclose={closeDrawer}>
			<TelemetryDrawer
				sensor={selectedSensorId ? mockService.getSensor(selectedSensorId) ?? null : null}
				telemetry={selectedSensorId ? telemetryMap.get(selectedSensorId) ?? null : null}
				health={selectedSensorId ? healthMap.get(selectedSensorId) ?? null : null}
				confidence={selectedSensorId ? confidenceMap.get(selectedSensorId) ?? null : null}
			/>
		</SideDrawer>
</section>
</div>
</PageShell>

<style>
.spatial-grid {
display: grid;
grid-template-columns: 1.7fr 1fr;
gap: 18px;
margin-top: 18px;
}

.map-panel {
position: relative;
}

.map-panel__header {
display: flex;
justify-content: space-between;
align-items: flex-start;
gap: 18px;
margin-bottom: 18px;
}

.map-panel__header h2 {
margin: 0;
font-size: 20px;
}

.map-panel__header p {
margin: 6px 0 0;
color: var(--text-muted);
}

.map-panel__stats {
display: grid;
grid-template-columns: repeat(4, minmax(0, 1fr));
gap: 12px;
}

.map-panel__stats div {
background: var(--surface-raised);
border: 1px solid var(--surface-border);
border-radius: 14px;
padding: 16px;
}

.map-panel__stats span {
display: block;
font-weight: 700;
font-size: 18px;
}

.map-panel__stats small {
color: var(--text-muted);
}

.map-container {
position: relative;
height: calc(100vh - 160px);
min-height: 680px;
}

.map-overlays {
position: absolute;
top: 18px;
right: 18px;
display: grid;
gap: 12px;
width: min(320px, calc(100% - 36px));
z-index: 600;
}

.overview-panel {
display: grid;
gap: 18px;
}

.overview-card {
background: var(--surface-base);
border: 1px solid var(--surface-border);
border-radius: 18px;
padding: 20px;
}

.overview-card h3 {
margin: 0 0 12px;
font-size: 18px;
}

.overview-card ul {
list-style: none;
padding: 0;
margin: 0;
display: grid;
gap: 10px;
}

.overview-card li {
padding: 14px;
background: var(--surface-raised);
border-radius: 14px;
}

@media (max-width: 980px) {
.spatial-grid {
grid-template-columns: 1fr;
}

.map-container {
height: 620px;
}
}
</style>
