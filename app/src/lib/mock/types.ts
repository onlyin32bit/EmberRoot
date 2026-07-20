/**
 * EmberRoot Mock Data Layer — Type Definitions
 * ─────────────────────────────────────────────
 * All TypeScript interfaces for the centralized mock service.
 * Modelled for a wildfire / emergency-robotics GIS operations context.
 */

// ─── Primitive shared types ───────────────────────────────────────────────────

export type StatusLevel = 'online' | 'warning' | 'critical' | 'offline';
export type TrendDirection = 'up' | 'down' | 'stable';
export type Severity = 'low' | 'medium' | 'high' | 'critical';
export type LatLon = { lat: number; lon: number };
export type TimeSeries<T = number> = { timestamp: number; value: T }[];

// ─── SensorNode ───────────────────────────────────────────────────────────────

export type SensorType =
	| 'thermal'
	| 'smoke'
	| 'wind'
	| 'humidity'
	| 'co2'
	| 'seismic'
	| 'visual'
	| 'lidar';

export interface SensorNode {
	id: string;                     // e.g. "SN-0042"
	name: string;
	type: SensorType;
	regionId: string;
	location: LatLon;
	elevation: number;              // metres ASL
	status: StatusLevel;
	batteryPct: number;             // 0–100
	signalStrength: number;         // dBm, typically -120..0
	firmwareVersion: string;
	lastSeenAt: number;             // Unix ms
	deployedAt: number;
}

// ─── Telemetry ────────────────────────────────────────────────────────────────

export interface Telemetry {
	id: string;
	sensorId: string;
	timestamp: number;
	temperature: number;            // °C
	humidity: number;               // %
	windSpeed: number;              // km/h
	windDirection: number;          // degrees 0–359
	coPpm: number;
	co2Ppm: number;
	smokeIndex: number;             // 0–1 normalised
	particulateMatter: number;      // µg/m³ PM2.5
	pressure: number;               // hPa
	uvIndex: number;                // 0–11
	soilMoisture: number;           // % volumetric water content
	groundwaterLevel: number;       // metres below surface
	loraRssi: number;               // dBm
	loraSnr: number;                // dB
	batteryPct: number;             // 0–100
	signalStrength: number;         // dBm
	history: {
		temperature: TimeSeries;
		smokeIndex: TimeSeries;
		windSpeed: TimeSeries;
		coPpm: TimeSeries;
		co2Ppm: TimeSeries;
		soilMoisture: TimeSeries;
		groundwaterLevel: TimeSeries;
		batteryPct: TimeSeries;
		signalStrength: TimeSeries;
	};
}

export type TelemetryRecord = Telemetry;

export interface Hotspot {
	id: string;
	location: LatLon;
	intensity: number;              // 0–100
	confidence: number;             // 0–100
	detectedAt: number;
	type: 'satellite' | 'thermal' | 'smoke';
}

export interface NodeHealth {
	sensorId: string;
	batteryPct: number;             // 0–100
	firmwareVersion: string;
	calibrationStatus: 'Calibrated' | 'Drifted' | 'Recalibration Needed';
	signalStrength: number;         // dBm
	sensorDrift: number;            // unitless drift score
	maintenanceRecommendation: string;
	lastSeenAt: number;
}

export interface ConfidenceScore {
	sensorId: string;
	score: number;                  // 0–100
	label: 'Low' | 'Moderate' | 'High' | 'Critical';
	riskLevel: Severity;
	factors: {
		temperature: string;
		co2: string;
		moisture: string;
		signal: string;
	};
	explanation: string[];
	updatedAt: number;
}

// ─── Alert ────────────────────────────────────────────────────────────────────

export type AlertCategory =
	| 'smoke_detected'
	| 'temperature_spike'
	| 'sensor_offline'
	| 'battery_low'
	| 'wind_shift'
	| 'perimeter_breach'
	| 'co2_threshold'
	| 'signal_lost';

export interface Alert {
	id: string;
	category: AlertCategory;
	severity: Severity;
	sensorId: string | null;
	regionId: string;
	title: string;
	message: string;
	triggeredAt: number;
	resolvedAt: number | null;
	acknowledged: boolean;
	acknowledgedBy: string | null;
	autoResolved: boolean;
}

// ─── Incident ─────────────────────────────────────────────────────────────────

export type IncidentType = 'wildfire' | 'structural' | 'hazmat' | 'search_rescue' | 'flood';
export type IncidentStatus = 'active' | 'contained' | 'monitoring' | 'resolved';

export interface IncidentUpdate {
	timestamp: number;
	authorId: string;
	message: string;
}

export interface Incident {
	id: string;
	type: IncidentType;
	status: IncidentStatus;
	severity: Severity;
	title: string;
	description: string;
	regionId: string;
	origin: LatLon;
	affectedAreaKm2: number;
	containmentPct: number;         // 0–100
	reportedAt: number;
	updatedAt: number;
	estimatedControlAt: number | null;
	assignedUnits: string[];
	casualties: number;
	evacuated: number;
	updates: IncidentUpdate[];
}

// ─── Region ───────────────────────────────────────────────────────────────────

export type TerrainType = 'forest' | 'grassland' | 'urban' | 'coastal' | 'mountainous';

export interface Region {
	id: string;
	name: string;
	code: string;                   // short uppercase e.g. "NW-01"
	terrain: TerrainType;
	center: LatLon;
	boundingBox: { sw: LatLon; ne: LatLon };
	areaSqKm: number;
	population: number;
	sensorCount: number;
	activeIncidents: number;
	riskLevel: Severity;
	commandPostId: string | null;
}

// ─── Weather ─────────────────────────────────────────────────────────────────

export type WeatherCondition =
	| 'clear'
	| 'partly_cloudy'
	| 'overcast'
	| 'fog'
	| 'rain'
	| 'thunderstorm'
	| 'smoke';

export interface WeatherForecastSlot {
	timestamp: number;
	condition: WeatherCondition;
	tempC: number;
	humidity: number;
	windSpeedKph: number;
	windDirection: number;
	precipMm: number;
}

export interface Weather {
	regionId: string;
	updatedAt: number;
	condition: WeatherCondition;
	tempC: number;
	feelsLikeC: number;
	humidity: number;
	windSpeedKph: number;
	windDirection: number;          // degrees
	windGustKph: number;
	precipMmH: number;              // precipitation mm/h
	visibilityKm: number;
	uvIndex: number;
	dewPointC: number;
	forecast: WeatherForecastSlot[]; // 24-hour hourly slots
}

// ─── RiskIndex ────────────────────────────────────────────────────────────────

export interface RiskFactor {
	label: string;
	score: number;                  // 0–100
	weight: number;                 // 0–1 (contribution weight)
	trend: TrendDirection;
}

export interface RiskIndex {
	regionId: string;
	calculatedAt: number;
	composite: number;              // 0–100 weighted composite
	level: Severity;
	factors: {
		fuelMoisture: RiskFactor;
		windExposure: RiskFactor;
		temperature: RiskFactor;
		slopeAspect: RiskFactor;
		humanActivity: RiskFactor;
		historicalFrequency: RiskFactor;
	};
	history: TimeSeries;            // composite score over past 30 days
	nextReviewAt: number;
}
