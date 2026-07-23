import { error } from '@sveltejs/kit';
import { api } from '$lib/api/client';
import type { PageLoad } from './$types';

export const ssr = false;

export const load: PageLoad = async ({ params }) => {
	const { nodeId } = params;

	let node;
	try {
		node = await api.getNode(nodeId);
	} catch (e) {
		throw error(404, `Sensor node "${nodeId}" not found`);
	}

	const status = node.status ?? 'offline';
	const dangerLevel = status === 'critical' || status === 'warning' ? 'warning' : status === 'offline' ? 'monitor' : 'normal';
	const sensor = {
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

	const rawTelemetry = await api.getTelemetry(nodeId, { limit: 1000 }).catch(() => []);
	
	let telemetry = null;
	if (rawTelemetry.length > 0) {
		const current = rawTelemetry[0];
		
		const createSeries = (key: keyof typeof current) => {
			return rawTelemetry.map(t => ({
				timestamp: new Date(t.received_at).getTime(),
				value: Number(t[key]) || 0
			})).reverse(); // Reverse to get chronological order (oldest first)
		};

		telemetry = {
			temperature: current.ambient_temp ?? current.temp_5 ?? 0,
			temp5: current.temp_5 ?? 0,
			temp15: current.temp_15 ?? 0,
			soilMoisture: current.moisture ?? 0,
			groundwaterLevel: current.water_table ?? 0,
			co2Ppm: current.co2 ?? 0,
			coPpm: current.co ?? 0,
			ch4: current.ch4 ?? 0,
			humidity: current.ambient_rh ?? 0,
			batteryPct: current.battery_pct ?? 0,
			loraRssi: current.signal_rssi ?? 0,
			loraSnr: current.signal_snr ?? 0,
			
			history: {
				temperature: createSeries('ambient_temp'),
				temp5: createSeries('temp_5'),
				temp15: createSeries('temp_15'),
				soilMoisture: createSeries('moisture'),
				groundwaterLevel: createSeries('water_table'),
				co2Ppm: createSeries('co2'),
				coPpm: createSeries('co'),
				ch4: createSeries('ch4'),
				humidity: createSeries('ambient_rh'),
				batteryPct: createSeries('battery_pct'),
				signalStrength: createSeries('signal_rssi')
			},
			history30d: {
				temperature: createSeries('ambient_temp'),
				temp5: createSeries('temp_5'),
				temp15: createSeries('temp_15'),
				soilMoisture: createSeries('moisture'),
				groundwaterLevel: createSeries('water_table'),
				co2Ppm: createSeries('co2'),
				coPpm: createSeries('co'),
				ch4: createSeries('ch4'),
				humidity: createSeries('ambient_rh'),
				batteryPct: createSeries('battery_pct'),
				signalStrength: createSeries('signal_rssi')
			}
		};
	}

	const rawAlerts = await api.getAlerts({ nodeId }).catch(() => []);
	const alerts = rawAlerts.map((a: any) => ({
		id: a.id,
		triggeredAt: new Date(a.created_at).getTime(),
		category: 'system_alert',
		severity: a.level || 'low',
		title: a.explanation || a.id,
		resolvedAt: a.state === 'resolved' ? Date.now() : null,
		acknowledged: a.state === 'acknowledged'
	}));

	return { sensor, telemetry, alerts };
};
