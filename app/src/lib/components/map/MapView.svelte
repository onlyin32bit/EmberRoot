<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { mockService, type SensorNode } from '$lib/mock';
	import L from 'leaflet';
	import 'leaflet/dist/leaflet.css';
	import 'leaflet.markercluster';
	import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
	import 'leaflet.markercluster/dist/MarkerCluster.css';
	import { PUBLIC_FIRMS_MAP_KEY } from '$env/static/public';

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
	let firmsLastUpdated: Date | null = $state(null);
	let previousSelectedId: string | null = null;

	const defaultCenter: L.LatLngExpression = [9.66, 105.04];
	const defaultZoom = 10;

	const providerLayers = {
		openstreetmap: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
			attribution: '&copy; OpenStreetMap contributors'
		})
	};

	// ── Colour-coded marker icons (pointhi/leaflet-color-markers) ─────────────
	// These are standard Leaflet marker PNGs with the default anchor/size,
	// so positioning remains stable through all zoom and pan operations.

	const MARKER_BASE = 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img';

	function statusIcon(status: string): L.Icon {
		const color = {
			online:   'green',
			warning:  'gold',
			critical: 'red',
			offline:  'grey'
		}[status] ?? 'grey';

		return L.icon({
			iconUrl:       `${MARKER_BASE}/marker-icon-2x-${color}.png`,
			shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
			iconSize:      [25, 41],
			iconAnchor:    [12, 41],
			popupAnchor:   [1, -34],
			shadowSize:    [41, 41]
		});
	}

	function dangerLevelColor(level: SensorNode['dangerLevel']) {
		const colors = {
			normal: '#22c55e',
			monitor: '#f59e0b',
			suspected: '#fb923c',
			warning: '#ef4444'
		} as const;
		return colors[level] ?? '#6b7280';
	}

	function createMarker(sensor: SensorNode) {
		const icon = L.icon({
			iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${sensor.status === 'offline' ? 'grey' : sensor.dangerLevel === 'warning' ? 'red' : sensor.dangerLevel === 'suspected' ? 'orange' : sensor.dangerLevel === 'monitor' ? 'gold' : 'green'}.png`,
			shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
			iconSize: [25, 41],
			iconAnchor: [12, 41],
			popupAnchor: [1, -34],
			shadowSize: [41, 41]
		});
		const marker = L.marker(
			[sensor.location.lat, sensor.location.lon],
			{ icon }
		)
			.on('click', () => onSelectSensor?.(sensor.id))
			.bindTooltip(
				`<div style="display:flex; align-items:center; gap:6px;">
					<span>${sensor.id}</span>
					<span style="color:#4ade80; display:flex; align-items:center; gap:2px;"><svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M16 4h-2V2h-4v2H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2z"/></svg>${sensor.batteryPct}%</span>
					<span style="color:#67e8f9; display:flex; align-items:center; gap:2px;"><svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3C6.95 3 3.15 4.85 0 7.23L12 22 24 7.23C20.85 4.85 17.05 3 12 3zm0 13.91L5.82 7.74C8 6.05 10.15 5.5 12 5.5c1.85 0 4 .55 6.18 2.24L12 16.91z"/></svg>${sensor.signalStrength}</span>
				</div>`,
				{
					permanent: true,
					direction: 'bottom',
					className: 'er-node-label',
					offset: [0, 6]
				}
			)
			.bindPopup(
				`<div style="font-family:'JetBrains Mono',monospace; min-width:190px; padding:3px 2px; color:#e2e8f0;">
					<div style="font-size:12px; font-weight:700; margin-bottom:6px; color:#f59e0b;">${sensor.id}</div>
					<div style="display:grid; gap:4px; font-size:11px;">
						<div><span style="color:#94a3b8;">Status</span> <strong>${sensor.status}</strong></div>
						<div><span style="color:#94a3b8;">Danger</span> <strong>${sensor.dangerLevel}</strong></div>
						<div><span style="color:#94a3b8;">Battery</span> <strong>${sensor.batteryPct}%</strong></div>
						<div><span style="color:#94a3b8;">Signal</span> <strong>${sensor.signalStrength} dBm</strong></div>
						<div><span style="color:#94a3b8;">Type</span> <strong>${sensor.type}</strong></div>
					</div>
				</div>`,
				{ autoPan: true, closeButton: true }
			);

		return marker;
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
		const fillColors = {
			low: 'rgba(34, 197, 94, 0.24)',
			medium: 'rgba(245, 158, 11, 0.28)',
			high: 'rgba(249, 115, 22, 0.32)',
			critical: 'rgba(239, 68, 68, 0.36)'
		} as const;

		for (const region of mockService.getRegions()) {
			const risk = mockService.getRiskIndex(region.id);
			const composite = risk?.composite ?? 0;
			const level: keyof typeof fillColors = composite >= 75 ? 'critical' : composite >= 55 ? 'high' : composite >= 35 ? 'medium' : 'low';
			const fillColor = fillColors[level];
			const polygon = L.polygon(
				[
					[region.boundingBox.sw.lat, region.boundingBox.sw.lon],
					[region.boundingBox.sw.lat, region.boundingBox.ne.lon],
					[region.boundingBox.ne.lat, region.boundingBox.ne.lon],
					[region.boundingBox.ne.lat, region.boundingBox.sw.lon],
					[region.boundingBox.sw.lat, region.boundingBox.sw.lon]
				],
				{
					color: fillColor,
					weight: 1,
					fillColor,
					fillOpacity: 0.24
				}
			).bindPopup(`<div style="font-family:'JetBrains Mono',monospace; padding:4px 2px; min-width:180px; color:#e2e8f0;">
				<div style="font-size:12px; font-weight:700; margin-bottom:6px; color:#f59e0b;">${region.name}</div>
				<div style="display:grid; gap:4px; font-size:11px;">
					<div><span style="color:#94a3b8;">Risk</span> <strong>${risk?.composite.toFixed(1) ?? '—'}</strong></div>
					<div><span style="color:#94a3b8;">Dry days</span> <strong>${risk?.dryDays ?? '—'}</strong></div>
					<div><span style="color:#94a3b8;">GW / moisture</span> <strong>${risk?.groundwaterLevel.toFixed(2) ?? '—'} m · ${risk?.soilMoistureAvg.toFixed(1) ?? '—'}%</strong></div>
				</div>
			</div>`);

		layer.addLayer(polygon);
		}
		return layer;
	}

	// Bounding box for U Minh Region (approx W,S,E,N)
	const UMINH_BBOX = '104.0,9.0,106.0,10.0';
	// Bounding box for Central Africa to test FIRMS data reliably
	const TEST_BBOX = '-15.0,5.0,30.0,20.0';
	let testFirmsMode = $state(false);

	async function fetchFirmsHotspots() {
		const bbox = testFirmsMode ? TEST_BBOX : UMINH_BBOX;
		const cacheKey = testFirmsMode ? 'firms_hotspots_cache_test' : 'firms_hotspots_cache';
		const cacheTimeKey = testFirmsMode ? 'firms_hotspots_cache_time_test' : 'firms_hotspots_cache_time';
		const now = Date.now();
		
		// 15-minute cache TTL
		if (localStorage.getItem(cacheKey) && localStorage.getItem(cacheTimeKey)) {
			const cachedTime = parseInt(localStorage.getItem(cacheTimeKey) || '0', 10);
			if (now - cachedTime < 15 * 60 * 1000) {
				firmsLastUpdated = new Date(cachedTime);
				return JSON.parse(localStorage.getItem(cacheKey) || '[]');
			}
		}

		try {
			// NASA FIRMS Area API Endpoint for CSV
			const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${PUBLIC_FIRMS_MAP_KEY}/VIIRS_SNPP_NRT/${bbox}/1`;
			const res = await fetch(url);
			
			if (!res.ok) throw new Error('FIRMS API Error');
			const text = await res.text();
			
			// Simple CSV parser
			const rows = text.split('\n').slice(1).filter(r => r.trim().length > 0);
			const hotspots = rows.map(row => {
				const cols = row.split(',');
				return {
					lat: parseFloat(cols[0]),
					lon: parseFloat(cols[1]),
					bright_ti4: parseFloat(cols[2]),
					scan: parseFloat(cols[3]),
					track: parseFloat(cols[4]),
					acq_date: cols[5],
					acq_time: cols[6],
					confidence: cols[8]
				};
			});
			
			localStorage.setItem(cacheKey, JSON.stringify(hotspots));
			localStorage.setItem(cacheTimeKey, now.toString());
			firmsLastUpdated = new Date(now);
			return hotspots;
		} catch (err) {
			console.error('Failed to fetch FIRMS data:', err);
			// Fallback to cache if available
			if (localStorage.getItem(cacheKey)) {
				firmsLastUpdated = new Date(parseInt(localStorage.getItem(cacheTimeKey) || '0', 10));
				return JSON.parse(localStorage.getItem(cacheKey) || '[]');
			}
			return [];
		}
	}

	async function addFirmsHotspots() {
		const layer = L.layerGroup();
		const hotspots = await fetchFirmsHotspots();
		
		for (const hotspot of hotspots) {
			const confidenceVal = hotspot.confidence === 'h' ? 100 : hotspot.confidence === 'n' ? 50 : 25;
			const radius = 8 + Math.round((hotspot.bright_ti4 - 290) / 10);
			
			layer.addLayer(
				L.circleMarker([hotspot.lat, hotspot.lon], {
					radius: Math.max(5, Math.min(20, radius)),
					color: '#facc15',
					fillColor: '#fde68a',
					fillOpacity: 0.8,
					weight: 1.4
				}).bindPopup(`
					<div style="font-family:'JetBrains Mono',monospace; padding:6px 4px; min-width:200px; color:#e2e8f0;">
						<div style="font-weight:700; color:#f59e0b; margin-bottom:6px;">FIRMS Thermal Hotspot</div>
						<div style="display:grid; gap:4px; font-size:11px;">
							<div><span style="color:#94a3b8;">Brightness</span> <strong>${hotspot.bright_ti4} K</strong></div>
							<div><span style="color:#94a3b8;">Confidence</span> <strong>${confidenceVal}%</strong></div>
							<div><span style="color:#94a3b8;">Detected</span> <strong>${hotspot.acq_date} ${hotspot.acq_time} UTC</strong></div>
							<div><span style="color:#94a3b8;">Status</span> <strong style="color:var(--status-online);">Live API Data</strong></div>
						</div>
					</div>
				`)
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

	async function setHotspotLayer(enabled: boolean) {
		if (!map) return;
		if (enabled) {
			if (!hotspotLayer) {
				hotspotLayer = await addFirmsHotspots();
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

<div style="position: relative; width: 100%; height: 100%;">
	<div id="emberroot-map" class="map-view"></div>
	{#if activeLayers.firmsHotspots}
		<div class="firms-metadata">
			<div style="display: flex; gap: 6px;">
				<span>FIRMS Layer Status:</span>
				{#if firmsLastUpdated}
					<span style="color: var(--status-online);">Updated {firmsLastUpdated.toLocaleTimeString()}</span>
				{:else}
					<span style="color: var(--status-warning);">Syncing...</span>
				{/if}
			</div>
			
			<div style="margin-top: 4px; border-top: 1px solid var(--surface-border); padding-top: 4px;">
				<label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
					<input type="checkbox" bind:checked={testFirmsMode} onchange={async () => {
						if (map && hotspotLayer && map.hasLayer(hotspotLayer)) {
							map.removeLayer(hotspotLayer);
						}
						firmsLastUpdated = null;
						hotspotLayer = await addFirmsHotspots();
						if (activeLayers.firmsHotspots && map) {
							map.addLayer(hotspotLayer);
						}
					}} />
					<span style="font-size: 11px;">Test Mode (Fetch African Region)</span>
				</label>
			</div>
		</div>
	{/if}
</div>

<style>
	.map-view {
		width: 100%;
		height: 100%;
		border-radius: 20px;
		overflow: hidden;
	}

	/*
	 * Permanent node-label tooltips.
	 * These are Leaflet-managed tooltip elements — positioned by Leaflet's own
	 * anchor logic so they stay locked to the marker through zoom and pan.
	 */
	:global(.er-node-label) {
		background: rgba(15, 23, 42, 0.88);
		border: 1px solid rgba(255, 255, 255, 0.14);
		border-radius: 6px;
		color: #e2e8f0;
		font-size: 10px;
		font-weight: 700;
		font-family: 'JetBrains Mono', monospace;
		padding: 3px 8px;
		white-space: nowrap;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35);
		pointer-events: none;
	}

	/* Hide the default Leaflet tooltip arrow for permanent labels */
	:global(.er-node-label::before) {
		display: none;
	}

	.firms-metadata {
		position: absolute;
		bottom: 12px;
		right: 12px;
		background: rgba(15, 23, 42, 0.85);
		border: 1px solid rgba(255, 255, 255, 0.14);
		border-radius: 6px;
		padding: 6px 10px;
		font-family: 'JetBrains Mono', monospace;
		font-size: 11px;
		color: #e2e8f0;
		z-index: 1000;
		display: flex;
		flex-direction: column;
		backdrop-filter: blur(4px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35);
		pointer-events: auto;
	}
</style>