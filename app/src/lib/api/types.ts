export interface ApiRegion {
	id: string;
	name: string;
	code: string;
	description: string | null;
	center_lat: number;
	center_lon: number;
}

export interface ApiNode {
	id: string;
	region_id: string;
	name: string;
	node_type: 'full' | 'light' | 'fence';
	latitude: number | null;
	longitude: number | null;
	status: 'online' | 'offline' | 'warning' | 'critical';
	firmware_version: string | null;
	battery_v: number | null;
	battery_pct: number | null;
	signal_rssi: number | null;
	signal_snr: number | null;
	last_seen_at: string | null;
}

export interface ApiTelemetry {
	id: number;
	node_id: string;
	received_at: string;
	temp_5: number | null;
	temp_15: number | null;
	temp_30: number | null;
	temp_45: number | null;
	co: number | null;
	co2: number | null;
	ch4: number | null;
	moisture: number | null;
	water_table: number | null;
	ambient_temp: number | null;
	ambient_rh: number | null;
	battery_v: number | null;
	battery_pct: number | null;
	signal_rssi: number | null;
	signal_snr: number | null;
}

export interface ApiAlert {
	id: string;
	node_id: string;
	node_name?: string;
	region_id?: string;
	level: 'monitoring' | 'suspicious' | 'warning';
	state: 'open' | 'acknowledged' | 'investigating' | 'resolved' | 'false_positive';
	explanation: string;
	created_at: string;
	acknowledged_at: string | null;
	acknowledged_by: string | null;
}

export interface AuthSession {
	token: string;
	expiresAt: number;
	user: { username: 'admin'; role: 'admin' };
}

export interface ApiEnvelope<T> {
	success: boolean;
	data: T;
	error?: string;
}

export interface RealtimeEvent {
	type: 'connected' | 'telemetry.created' | 'alert.created' | 'alert.updated' | 'node.updated';
	payload?: Record<string, unknown>;
	sentAt: string;
}
