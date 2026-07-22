import type { Bindings } from './bindings';
import type { RealtimeEvent } from './realtime-hub';

type TelemetrySource = 'mqtt' | 'websocket' | 'http' | 'seed';

export interface TelemetryInput {
	nodeId: string;
	deviceTimestamp?: string;
	temp5?: number;
	temp15?: number;
	temp30?: number;
	temp45?: number;
	co?: number;
	co2?: number;
	ch4?: number;
	moisture?: number;
	waterTable?: number;
	ambientTemp?: number;
	ambientRh?: number;
	batteryV?: number;
	batteryPct?: number;
	signalRssi?: number;
	signalSnr?: number;
	rawPayload?: unknown;
}

interface TelemetryRow extends Required<Omit<TelemetryInput, 'rawPayload' | 'deviceTimestamp'>> {
	id: number;
	receivedAt: string;
	source: TelemetrySource;
}

interface AlertResult {
	id: string;
	level: 'monitoring' | 'suspicious' | 'warning';
	explanation: string;
}

const OPTIONAL_NUMBERS = [
	'temp5', 'temp15', 'temp30', 'temp45', 'co', 'co2', 'ch4', 'moisture', 'waterTable',
	'ambientTemp', 'ambientRh', 'batteryV', 'batteryPct', 'signalRssi', 'signalSnr'
] as const;

function finiteNumber(value: unknown): number | undefined {
	return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

export function parseTelemetryPayload(payload: unknown): TelemetryInput | null {
	if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) return null;
	const body = payload as Record<string, unknown>;
	const nodeId = body.node_id ?? body.nodeId ?? body.id;
	if (typeof nodeId !== 'string' || !/^[a-zA-Z0-9_-]{1,64}$/u.test(nodeId)) return null;

	const input: TelemetryInput = {
		nodeId,
		deviceTimestamp: typeof (body.timestamp ?? body.ts) === 'string' ? String(body.timestamp ?? body.ts) : undefined,
		temp5: finiteNumber(body.temp_5 ?? body.temp5 ?? body.t),
		temp15: finiteNumber(body.temp_15 ?? body.temp15 ?? body.tempObj),
		temp30: finiteNumber(body.temp_30 ?? body.temp30),
		temp45: finiteNumber(body.temp_45 ?? body.temp45),
		co: finiteNumber(body.co ?? body.mq7),
		co2: finiteNumber(body.co2 ?? body.mq2),
		ch4: finiteNumber(body.ch4),
		moisture: finiteNumber(body.moisture ?? body.soil),
		waterTable: finiteNumber(body.water_table ?? body.waterTable),
		ambientTemp: finiteNumber(body.ambient_temp ?? body.ambientTemp),
		ambientRh: finiteNumber(body.ambient_rh ?? body.ambientRh),
		batteryV: finiteNumber(body.battery_v ?? body.batteryV),
		batteryPct: finiteNumber(body.battery_pct ?? body.batteryPct),
		signalRssi: finiteNumber(body.signal_rssi ?? body.signalRssi ?? body.rssi),
		signalSnr: finiteNumber(body.signal_snr ?? body.signalSnr ?? body.snr),
		rawPayload: body
	};
	if (OPTIONAL_NUMBERS.every((key) => input[key] === undefined)) return null;
	return input;
}

async function publish(env: Bindings, event: RealtimeEvent): Promise<void> {
	const hub = env.REALTIME_HUB.getByName('emberroot');
	await hub.publish(event);
}

async function evaluateAlert(env: Bindings, input: TelemetryInput, telemetryId: number): Promise<AlertResult | null> {
	const baseline = await env.DB.prepare(
		`SELECT AVG(temp_5) AS temp5 FROM telemetry
		 WHERE node_id = ? AND temp_5 IS NOT NULL AND received_at >= datetime('now', '-7 days')`
	).bind(input.nodeId).first<{ temp5: number | null }>();
	const temperature = input.temp5 ?? input.temp15 ?? input.temp30 ?? input.temp45;
	if (temperature === undefined) return null;
	const baselineTemp = baseline?.temp5 ?? temperature;
	const temperatureRise = temperature - baselineTemp;
	const ratio = input.co2 !== undefined && input.co !== undefined ? input.co2 / Math.max(input.co, 0.01) : undefined;
	const dry = input.moisture !== undefined && input.moisture < 25;
	const hot = temperature >= 45 || (input.temp15 ?? 0) >= 40 || temperatureRise >= 12;
	const elevated = temperature >= 35 || temperatureRise >= 7 || (input.co ?? 0) >= 3;
	const gasSignal = (input.co ?? 0) >= 5 && (ratio === undefined || ratio < 50);

	let level: AlertResult['level'] | null = null;
	if (hot && gasSignal) level = 'warning';
	else if (hot || ((input.co ?? 0) >= 5 && dry)) level = 'suspicious';
	else if (elevated) level = 'monitoring';
	if (!level) return null;

	const factors = [
		`temperature ${temperature.toFixed(1)}°C`,
		`adaptive baseline delta +${temperatureRise.toFixed(1)}°C`,
		input.co !== undefined ? `CO ${input.co.toFixed(2)} ppm` : null,
		ratio !== undefined ? `CO₂:CO ${ratio.toFixed(1)}` : null,
		input.moisture !== undefined ? `moisture ${input.moisture.toFixed(1)}%` : null
	].filter((value): value is string => value !== null);
	const explanation = factors.join('; ');
	const existing = await env.DB.prepare(
		"SELECT id FROM alerts WHERE node_id = ? AND level = ? AND state IN ('open', 'acknowledged', 'investigating') ORDER BY created_at DESC LIMIT 1"
	).bind(input.nodeId, level).first<{ id: string }>();
	if (existing) return null;

	const id = crypto.randomUUID();
	await env.DB.prepare(
		'INSERT INTO alerts (id, node_id, telemetry_id, level, explanation) VALUES (?, ?, ?, ?, ?)'
	).bind(id, input.nodeId, telemetryId, level, explanation).run();
	return { id, level, explanation };
}

export async function ingestTelemetry(env: Bindings, input: TelemetryInput, source: TelemetrySource): Promise<TelemetryRow> {
	const now = new Date().toISOString();
	await env.DB.prepare(
		`INSERT OR IGNORE INTO nodes (id, region_id, name, node_type, status, last_seen_at)
		 VALUES (?, 'region-uminh', ?, 'full', 'online', ?)`
	).bind(input.nodeId, `Node ${input.nodeId}`, now).run();

	const insert = await env.DB.prepare(
		`INSERT INTO telemetry (
		 node_id, device_timestamp, received_at, temp_5, temp_15, temp_30, temp_45, co, co2, ch4,
		 moisture, water_table, ambient_temp, ambient_rh, battery_v, battery_pct, signal_rssi, signal_snr, source, raw_payload
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
	).bind(
		input.nodeId, input.deviceTimestamp ?? null, now, input.temp5 ?? null, input.temp15 ?? null, input.temp30 ?? null,
		input.temp45 ?? null, input.co ?? null, input.co2 ?? null, input.ch4 ?? null, input.moisture ?? null,
		input.waterTable ?? null, input.ambientTemp ?? null, input.ambientRh ?? null, input.batteryV ?? null,
		input.batteryPct ?? null, input.signalRssi ?? null, input.signalSnr ?? null, source,
		input.rawPayload === undefined ? null : JSON.stringify(input.rawPayload)
	).run();
	const telemetryId = Number(insert.meta.last_row_id);
	await env.DB.prepare(
		`UPDATE nodes SET status = 'online', last_seen_at = ?, battery_v = COALESCE(?, battery_v),
		 battery_pct = COALESCE(?, battery_pct), signal_rssi = COALESCE(?, signal_rssi), signal_snr = COALESCE(?, signal_snr), updated_at = ?
		 WHERE id = ?`
	).bind(now, input.batteryV ?? null, input.batteryPct ?? null, input.signalRssi ?? null, input.signalSnr ?? null, now, input.nodeId).run();

	const telemetry: TelemetryRow = { id: telemetryId, receivedAt: now, source, ...input } as TelemetryRow;
	await publish(env, { type: 'telemetry.created', payload: telemetry as unknown as Record<string, unknown>, sentAt: now });
	const alert = await evaluateAlert(env, input, telemetryId);
	if (alert) await publish(env, { type: 'alert.created', payload: { ...alert, nodeId: input.nodeId }, sentAt: now });
	return telemetry;
}
