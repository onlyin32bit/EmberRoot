<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { SensorNode } from '$lib/mock';
	import L from 'leaflet';
	import 'leaflet/dist/leaflet.css';
	import 'leaflet.markercluster';
	import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
	import 'leaflet.markercluster/dist/MarkerCluster.css';

	let {
	sensors = [],
	selectedId = null,
	onSelectSensor = () => {},
	activeLayers = {},
	onMousePosition = () => {}
    }: {
        sensors?: SensorNode[];
        selectedId?: string | null;
        onSelectSensor?: (id: string) => void;
        activeLayers?: Record<string, boolean>;
        onMousePosition?: (coords: string) => void;
    } = $props();

	let map: L.Map;
	let clusterGroup: L.MarkerClusterGroup;
	let heatmapLayer: L.LayerGroup | null = null;
	let hotspotLayer: L.LayerGroup | null = null;
	let previousSelectedId: string | null = null;

	const defaultCenter: L.LatLngExpression = [9.66, 105.04];
	const defaultZoom = 10;

	const providerLayers = {
		openstreetmap: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
			attribution: '&copy; OpenStreetMap contributors'
		})
	};

	function statusColor(status: string) {
		switch (status) {
			case 'online': return '#22c55e';
			case 'warning': return '#f59e0b';
			case 'critical': return '#ef4444';
			case 'offline': return '#374151';
			default: return '#64748b';
		}
	}

	function createMarker(sensor: SensorNode) {
		return L.marker(
			[sensor.location.lat, sensor.location.lon]
		).on('click', () => onSelectSensor?.(sensor.id));
	}

	function buildSensorLayer() {
		if (!clusterGroup) return;
		clusterGroup.clearLayers();
		const markers = sensors.map((sensor) => createMarker(sensor));
		clusterGroup.addLayers(markers);
	}

	function updateMousePosition(e: L.LeafletMouseEvent) {
		onMousePosition?.(`${e.latlng.lat.toFixed(5)}, ${e.latlng.lng.toFixed(5)}`);
	}

	function addHeatmap() {
		const layer = L.layerGroup();
		for (const sensor of sensors.slice(0, 24)) {
			layer.addLayer(
				L.circle([sensor.location.lat, sensor.location.lon], {
					radius: 2400,
					color: 'rgba(244, 63, 94, 0.18)',
					weight: 0,
					fillColor: 'rgba(244, 63, 94, 0.15)',
					fillOpacity: 0.35
				})
			);
		}
		return layer;
	}

	function addFirmsHotspots() {
		const layer = L.layerGroup();
		for (let i = 0; i < 10; i += 1) {
			const lat = 9.62 + Math.random() * 0.08;
			const lon = 105.0 + Math.random() * 0.08;
			layer.addLayer(
				L.circleMarker([lat, lon], {
					radius: 10,
					color: '#facc15',
					fillColor: '#fde68a',
					fillOpacity: 0.8,
					weight: 1.4
				}).bindTooltip('FIRMS hotspot', { permanent: false, direction: 'top' })
			);
		}
		return layer;
	}

	function setHeatmapLayer(enabled: boolean) {
		if (!map) return;
		if (enabled) {
			if (!heatmapLayer) {
				heatmapLayer = addHeatmap();
			}
			if (heatmapLayer && !map.hasLayer(heatmapLayer)) {
				map.addLayer(heatmapLayer);
			}
			return;
		}

		if (heatmapLayer && map.hasLayer(heatmapLayer)) {
			map.removeLayer(heatmapLayer);
		}
	}

	function setHotspotLayer(enabled: boolean) {
		if (!map) return;
		if (enabled) {
			if (!hotspotLayer) {
				hotspotLayer = addFirmsHotspots();
			}
			if (hotspotLayer && !map.hasLayer(hotspotLayer)) {
				map.addLayer(hotspotLayer);
			}
			return;
		}

		if (hotspotLayer && map.hasLayer(hotspotLayer)) {
			map.removeLayer(hotspotLayer);
		}
	}

	function setSensorLayer(enabled: boolean) {
		if (!map || !clusterGroup) return;
		if (enabled) {
			if (!map.hasLayer(clusterGroup)) {
				map.addLayer(clusterGroup);
			}
			return;
		}
		if (map.hasLayer(clusterGroup)) {
			map.removeLayer(clusterGroup);
		}
	}

	onMount(() => {
		map = L.map('emberroot-map', {
			center: defaultCenter,
			zoom: defaultZoom,
			zoomControl: false,
			scrollWheelZoom: true
		});

		providerLayers.openstreetmap.addTo(map);
		L.control.scale({ position: 'bottomleft', metric: true, imperial: false }).addTo(map);
		L.control.zoom({ position: 'topright' }).addTo(map);
		map.on('mousemove', updateMousePosition);

		clusterGroup = L.markerClusterGroup({
			chunkedLoading: true,
			showCoverageOnHover: false,
			spiderfyOnMaxZoom: true,
			zoomToBoundsOnClick: true
		});

		buildSensorLayer();
		map.addLayer(clusterGroup);
		setHeatmapLayer(activeLayers.riskHeatmap);
		setHotspotLayer(activeLayers.firmsHotspots);

		return () => {
			map.off();
			map.remove();
		};
	});

	$effect(() => {
	if (map) {
		buildSensorLayer();
	}
    });

    $effect(() => {
        if (map) {
            setSensorLayer(activeLayers.sensorNodes ?? true);
        }
    });

    $effect(() => {
        if (map) {
            setHeatmapLayer(activeLayers.riskHeatmap ?? false);
        }
    });

    $effect(() => {
        if (map) {
            setHotspotLayer(activeLayers.firmsHotspots ?? false);
        }
    });

    $effect(() => {
        if (map && selectedId && selectedId !== previousSelectedId) {
            const selectedSensor = sensors.find(
                (sensor) => sensor.id === selectedId
            );

            if (selectedSensor) {
                previousSelectedId = selectedId;
                flyToSensor(selectedSensor);
            }
        }
    });

	export function flyToSensor(sensor: SensorNode) {
		if (!map) return;
		map.flyTo([sensor.location.lat, sensor.location.lon], 13, { duration: 0.9 });
	}
</script>

<div id="emberroot-map" class="map-view"></div>

<style>
	.map-view {
		width: 100%;
		height: 100%;
		border-radius: 20px;
		overflow: hidden;
	}

	:global(.er-map-marker) {
		position: relative;
		width: 96px;
		height: 84px;
		overflow: visible;
	}

	:global(.er-map-marker-inner) {
		position: relative;
		width: 100%;
		height: 100%;
	}

	:global(.er-map-marker-ring) {
		position: absolute;
		top: 18px;
		left: 50%;
		transform: translateX(-50%);
		width: 18px;
		height: 18px;
		border-radius: 999px;
		box-shadow: 0 0 0 4px rgba(15, 23, 42, 0.8);
	}

	:global(.er-map-marker-label) {
		position: absolute;
		top: 42px;
		left: 50%;
		transform: translateX(-50%);
		font-size: 12px;
		font-weight: 800;
		color: white;
		background: rgba(15, 23, 42, 0.96);
		padding: 8px 12px;
		border-radius: 999px;
		border: 1px solid rgba(255, 255, 255, 0.22);
		box-shadow: 0 16px 32px rgba(0, 0, 0, 0.4);
		white-space: nowrap;
		text-shadow: 0 1px 2px rgba(0, 0, 0, 0.45);
		z-index: 10;
	}
</style>