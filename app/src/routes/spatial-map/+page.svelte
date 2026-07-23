<script lang="ts">
import { onMount } from 'svelte';
import { api, type ApiNode, type ApiRegion, type ApiTelemetry } from '$lib/api';
import { selectedRegionId } from '$lib/stores/regionContext';
import PageShell from '$lib/components/PageShell.svelte';
import SideDrawer from '$lib/components/ui/SideDrawer.svelte';
import MapView from '$lib/components/map/MapView.svelte';
import TelemetryDrawer from '$lib/components/map/TelemetryDrawer.svelte';
import LayerControl from '$lib/components/map/LayerControl.svelte';
import MapLegend from '$lib/components/map/MapLegend.svelte';
import SearchPanel from '$lib/components/map/SearchPanel.svelte';
import FilterBar from '$lib/components/map/FilterBar.svelte';

type MapSensor = {
	id: string;
	name: string;
	type: string;
	regionId: string;
	location: { lat: number; lon: number };
	elevation: number;
	status: ApiNode['status'];
	dangerLevel: 'normal' | 'monitor' | 'suspected' | 'warning';
	batteryPct: number;
	signalStrength: number;
	firmwareVersion: string;
	lastSeenAt: number;
	deployedAt: number;
};

const resolvedRegionId = $derived($selectedRegionId === 'all' ? null : $selectedRegionId);

let nodes = $state<ApiNode[]>([]);
let regions = $state<ApiRegion[]>([]);
const region = $derived(regions.find((entry) => entry.id === resolvedRegionId) ?? null);
let selectedNode = $state<ApiNode | null>(null);
let selectedTelemetry = $state<ApiTelemetry | null>(null);
let selectedSensorId = $state<string | null>(null);
let loadingNodes = $state(true);
let loadingTelemetry = $state(false);
let error = $state<string | null>(null);
	let activeLayers = $state({
		sensorNodes: true,
		sensorConnections: false,
		firmsHotspots: true
	});
let searchResults = $state<{ id: string; title: string; details: string; coords: [number, number] }[]>([]);
let mapReady = $state(false);
let drawerOpen = $state(false);
let filterStatus = $state<string | null>(null);

function toMapSensor(node: ApiNode): MapSensor {
	const status = node.status ?? 'offline';
	const dangerLevel = status === 'critical' || status === 'warning' ? 'warning' : status === 'offline' ? 'monitor' : 'normal';
	return {
		id: node.id,
		name: node.name,
		type: node.node_type,
		regionId: node.region_id,
		location: { lat: node.latitude ?? 0, lon: node.longitude ?? 0 },
		elevation: 0,
		status,
		dangerLevel,
		batteryPct: node.battery_pct ?? 0,
		signalStrength: node.signal_rssi ?? -120,
		firmwareVersion: node.firmware_version ?? 'unknown',
		lastSeenAt: node.last_seen_at ? Date.parse(node.last_seen_at) : 0,
		deployedAt: node.last_seen_at ? Date.parse(node.last_seen_at) : 0
	};
}

const sensors = $derived(nodes.map((node) => toMapSensor(node)));

const filteredSensors = $derived(
	filterStatus === null
		? sensors
		: sensors.filter((s) => s.status === filterStatus)
);

const legendItems = [
	{ label: 'Normal', color: '#22c55e' },
	{ label: 'Monitor', color: '#f59e0b' },
	{ label: 'Warning', color: '#ef4444' },
	{ label: 'Offline', color: '#374151' }
];

async function loadNodes() {
	try {
		loadingNodes = true;
		error = null;
		const [fetchedNodes, fetchedRegions] = await Promise.all([
			api.getNodes(resolvedRegionId ?? undefined),
			api.getRegions()
		]);
		nodes = fetchedNodes.filter((node) => node.latitude !== null && node.longitude !== null);
		regions = fetchedRegions;
	} catch (err) {
		error = err instanceof Error ? err.message : 'Failed to load sensor nodes';
	} finally {
		loadingNodes = false;
	}
}

async function selectSensor(id: string) {
	selectedSensorId = id;
	const node = nodes.find((entry) => entry.id === id) ?? null;
	selectedNode = node;
	selectedTelemetry = null;
	drawerOpen = true;
	if (!node) return;
	try {
		loadingTelemetry = true;
		const telemetry = await api.getTelemetry(node.id, { limit: 1 });
		selectedTelemetry = telemetry[0] ?? null;
	} catch {
		selectedTelemetry = null;
	} finally {
		loadingTelemetry = false;
	}
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

async function selectSearch(item: { id: string; title: string; details: string; coords: [number, number] }) {
	selectedSensorId = item.id;
	searchResults = [];
	drawerOpen = true;
	const node = nodes.find((entry) => entry.id === item.id) ?? null;
	selectedNode = node;
	selectedTelemetry = null;
	if (!node) return;
	try {
		loadingTelemetry = true;
		const telemetry = await api.getTelemetry(node.id, { limit: 1 });
		selectedTelemetry = telemetry[0] ?? null;
	} catch {
		selectedTelemetry = null;
	} finally {
		loadingTelemetry = false;
	}
}

function closeDrawer() {
	drawerOpen = false;
	selectedSensorId = null;
	selectedNode = null;
	selectedTelemetry = null;
}

onMount(() => {
	mapReady = true;
	void loadNodes();
});

$effect(() => {
	void loadNodes();
});

function metricAverage(key: 'batteryPct' | 'signalStrength') {
	const values = sensors
		.map((sensor) => (key === 'batteryPct' ? sensor.batteryPct : sensor.signalStrength));
	return values.length ? (values.reduce((sum, next) => sum + next, 0) / values.length).toFixed(1) : '—';
}
</script>

<svelte:head>
<title>Spatial Map — EmberRoot</title>
<meta name="description" content="Spatial map overview for the U Minh Forest monitoring network." />
</svelte:head>

<PageShell
title="Spatial Map"
subtitle="Geographic deployment overview and analysis"
breadcrumb={['EmberRoot', 'Spatial Map']}
>
<div class="spatial-grid">
<section class="map-panel">
<div class="map-panel__header">
<div>
<h2>{region?.name ?? 'U Minh Forest'}</h2>
<p>{region ? region.description ?? 'Forest monitoring region' : 'Forest monitoring region'}</p>
</div>
<div class="map-panel__stats">
<div><span>{sensors.length}</span><small>Total sensors</small></div>
<div><span>{loadingNodes ? '…' : metricAverage('batteryPct')}%</span><small>Average battery</small></div>
<div><span>{loadingNodes ? '…' : metricAverage('signalStrength')} dBm</span><small>Average signal</small></div>
<div><span>{region?.name ?? 'Live network'}</span><small>Region</small></div>
</div>
</div>

<div class="map-container">
{#if mapReady}
<MapView
sensors={filteredSensors}
selectedId={selectedSensorId}
onSelectSensor={selectSensor}
activeLayers={activeLayers}
onMousePosition={updateMousePosition}
/>
{/if}

<div class="map-overlays">
	<FilterBar onFilter={(status) => (filterStatus = status)} />

	<SearchPanel
		results={searchResults}
		onSearch={runSearch}
		onSelect={selectSearch}
	/>

	<LayerControl
		layers={[
			{ id: 'sensorNodes', label: 'Sensor Nodes', enabled: activeLayers.sensorNodes },
			{ id: 'firmsHotspots', label: 'Hotspots', enabled: activeLayers.firmsHotspots }
		]}
		onToggle={toggleLayer}
	/>

	<MapLegend items={legendItems} />
</div>
</div>
</section>

<section class="overview-panel">
<div class="overview-card">
<h3>Operational overview</h3>
<ul>
<li><strong>{sensors.filter((sensor) => sensor.status === 'online').length}</strong> active sensors</li>
<li><strong>{sensors.length}</strong> nodes loaded from the database</li>
<li><strong>{sensors.filter((sensor) => sensor.status === 'warning' || sensor.status === 'critical').length}</strong> nodes requiring attention</li>
<li><strong>{regions.length}</strong> monitored regions</li>
</ul>
</div>

{#if error}
<div class="overview-card">
<h3>Map data issue</h3>
<p>{error}</p>
</div>
{/if}

		<SideDrawer bind:open={drawerOpen} title={selectedSensorId ? `Sensor ${selectedSensorId}` : 'Sensor details'} width="md" onclose={closeDrawer}>
			<TelemetryDrawer
				sensor={sensors.find(s => s.id === selectedSensorId) ?? null}
				telemetry={selectedTelemetry}
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
