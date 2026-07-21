/**
 * EmberRoot Mock Data Layer — Generators
 * ─────────────────────────────────────────────
 * One factory function per domain type.
 * Each generator is pure and seedable via the shared rand() in utils.
 */

import type {
	SensorNode,
	SensorType,
	Telemetry,
	Hotspot,
	NodeHealth,
	ConfidenceScore,
	Alert,
	AlertCategory,
	Incident,
	IncidentType,
	IncidentStatus,
	Region,
	TerrainType,
	Weather,
	WeatherCondition,
	WeatherForecastSlot,
	RiskIndex,
	RiskFactor,
	LatLon,
	Severity
} from './types.js';

import {
	rand,
	randInt,
	randFloat,
	pick,
	pickN,
	weightedPick,
	makeSeries,
	hoursAgo,
	daysAgo,
	hoursAhead,
	msAgo,
	regionName,
	scoreToSeverity,
	scoreToStatus,
	uid,
	shortId
} from './utils.js';

// ─── Region ───────────────────────────────────────────────────────────────────

const TERRAIN_TYPES: TerrainType[] = ['forest', 'grassland', 'urban', 'coastal', 'mountainous'];
const RISK_WEIGHTS = [0.15, 0.25, 0.30, 0.20, 0.10]; // none → critical more likely in mid-range

/** Base lat/lon centres tuned for a Southeast Asian peatland monitoring network */
const REGION_CENTRES: LatLon[] = [
	{ lat: 9.78, lon: 105.08 }, // U Minh wetlands
	{ lat: 10.68, lon: 105.36 }, // An Giang delta
	{ lat: 10.17, lon: 105.74 }, // Đồng Tháp marsh
	{ lat: 11.92, lon: 109.13 }, // Nha Trang coast
	{ lat: 10.95, lon: 108.16 }, // Phú Yên basin
	{ lat: 12.24, lon: 109.18 }, // Quảng Ngãi ridge
	{ lat: 9.35, lon: 105.90 }, // Cà Mau estuary
	{ lat: 9.98, lon: 106.55 }  // Bạc Liêu reserve
];

export function generateRegion(index: number): Region {
	const centre = REGION_CENTRES[index % REGION_CENTRES.length];
	const offset = (x: number) => parseFloat((x + (rand() - 0.5) * 0.04).toFixed(4));
	const riskScore = randInt(10, 98);
	const sensorCount = randInt(8, 64);
	const incidents = randInt(0, 3);

	return {
		id: uid('RG', index + 1),
		name: regionName(),
		code: `${pick(['NW', 'NE', 'SW', 'SE', 'CN'])}-${String(index + 1).padStart(2, '0')}`,
		terrain: weightedPick(TERRAIN_TYPES, [3, 2, 1, 1, 2]),
		center: { lat: offset(centre.lat), lon: offset(centre.lon) },
		boundingBox: {
			sw: { lat: centre.lat - 0.08, lon: centre.lon - 0.12 },
			ne: { lat: centre.lat + 0.08, lon: centre.lon + 0.12 }
		},
		areaSqKm: randFloat(40, 380),
		population: randInt(1200, 82000),
		sensorCount,
		activeIncidents: incidents,
		riskLevel: scoreToSeverity(riskScore),
		commandPostId: rand() > 0.3 ? uid('CP', index + 1) : null
	};
}

export function generateRegions(count = 8): Region[] {
	return Array.from({ length: count }, (_, i) => generateRegion(i));
}

export const U_MINH_CENTER: LatLon = { lat: 9.66, lon: 105.04 };

export function generateUminhRegion(): Region {
	return {
		id: 'RG-UMINH-01',
		name: 'U Minh Forest',
		code: 'UM-01',
		terrain: 'forest',
		center: U_MINH_CENTER,
		boundingBox: {
			sw: { lat: U_MINH_CENTER.lat - 0.08, lon: U_MINH_CENTER.lon - 0.10 },
			ne: { lat: U_MINH_CENTER.lat + 0.08, lon: U_MINH_CENTER.lon + 0.10 }
		},
		areaSqKm: 450,
		population: 0,
		sensorCount: 56,
		activeIncidents: randInt(1, 3),
		riskLevel: scoreToSeverity(randInt(40, 95)),
		commandPostId: 'CP-UMINH-01'
	};
}

export function generateUminhSensors(region: Region, count = 56): SensorNode[] {
	return Array.from({ length: count }, (_, index) => {
		const battery = randInt(6, 100);
		const locLat = parseFloat((region.center.lat + (rand() - 0.5) * 0.14).toFixed(5));
		const locLon = parseFloat((region.center.lon + (rand() - 0.5) * 0.16).toFixed(5));
		const signalStrength = randInt(-110, -48);
		const baseTemp = randFloat(22, 40);
		const baseCo2 = randInt(420, 1800);
		const baseMoisture = randFloat(8, 42, 1);
		return {
			id: uid('UM', index + 1),
			name: `UM Sensor ${String(index + 1).padStart(2, '0')}`,
			type: weightedPick(SENSOR_TYPES, SENSOR_TYPE_WEIGHTS),
			regionId: region.id,
			location: { lat: locLat, lon: locLon },
			elevation: randInt(1, 80),
			status: sensorStatus(battery),
			dangerLevel: deriveDangerLevel({ batteryPct: battery, signalStrength, telemetry: { temperature: baseTemp, co2Ppm: baseCo2, soilMoisture: baseMoisture } }),
			batteryPct: battery,
			signalStrength,
			firmwareVersion: pick(FIRMWARE_VERSIONS),
			lastSeenAt: msAgo(randInt(120_000, battery < 15 ? 4_500_000 : 160_000)),
			deployedAt: daysAgo(randInt(10, 540))
		};
	});
}

export function generateUminhTelemetryMap(sensors: SensorNode[]): Map<string, Telemetry> {
	const map = new Map<string, Telemetry>();
	for (const sensor of sensors) {
		const telemetry = generateTelemetry(sensor);
		map.set(sensor.id, telemetry);
	}
	return map;
}

export function generateFirmsHotspots(region: Region, count = 12): Hotspot[] {
	return Array.from({ length: count }, (_, index) => {
		const lat = parseFloat((region.center.lat + (rand() - 0.5) * 0.14).toFixed(5));
		const lon = parseFloat((region.center.lon + (rand() - 0.5) * 0.14).toFixed(5));
		const intensity = randInt(40, 98);
		return {
			id: uid('HS', index + 1),
			location: { lat, lon },
			intensity,
			confidence: Math.max(50, Math.min(100, intensity + randInt(-12, 6))),
			detectedAt: Date.now() - randInt(10_000, 1_200_000),
			type: 'thermal'
		};
	});
}

// ─── SensorNode ───────────────────────────────────────────────────────────────

const SENSOR_TYPES: SensorType[] = ['thermal', 'smoke', 'wind', 'humidity', 'co2', 'seismic', 'visual', 'lidar'];
const SENSOR_TYPE_WEIGHTS = [3, 3, 2, 2, 2, 1, 2, 1];

const FIRMWARE_VERSIONS = ['2.4.1', '2.5.0', '2.5.3', '3.0.0-rc', '3.1.2'];

function sensorStatus(battery: number): import('./types.js').StatusLevel {
	if (rand() > 0.92) return 'offline';
	if (battery < 10) return 'critical';
	if (battery < 25) return 'warning';
	return 'online';
}

function deriveDangerLevel(input: { batteryPct: number; signalStrength: number; telemetry?: Partial<Telemetry> | null }): import('./types.js').DangerLevel {
	const telemetry = input.telemetry;
	const tempRisk = telemetry?.temperature ? (telemetry.temperature > 35 ? 0.55 : 0.12) : 0.2;
	const co2Risk = telemetry?.co2Ppm ? (telemetry.co2Ppm > 1400 ? 0.65 : 0.1) : 0.15;
	const moistureRisk = telemetry?.soilMoisture ? (telemetry.soilMoisture < 18 ? 0.65 : 0.1) : 0.12;
	const signalRisk = input.signalStrength < -95 ? 0.2 : 0.05;
	const score = tempRisk * 0.35 + co2Risk * 0.3 + moistureRisk * 0.25 + signalRisk * 0.1;
	if (score > 0.5) return 'warning';
	if (score > 0.3) return 'suspected';
	if (score > 0.15) return 'monitor';
	return 'normal';
}

export function generateSensorNode(index: number, region: Region): SensorNode {
	const battery = randInt(2, 100);
	const latOff = (rand() - 0.5) * 0.15;
	const lonOff = (rand() - 0.5) * 0.20;
	const signalStrength = randInt(-105, -40);
	const baseTemp = randFloat(20, 42);
	const baseCo2 = randInt(380, 1800);
	const baseMoisture = randFloat(8, 46, 1);

	return {
		id: uid('SN', index + 1),
		name: `Sensor ${String(index + 1).padStart(3, '0')}`,
		type: weightedPick(SENSOR_TYPES, SENSOR_TYPE_WEIGHTS),
		regionId: region.id,
		location: {
			lat: parseFloat((region.center.lat + latOff).toFixed(5)),
			lon: parseFloat((region.center.lon + lonOff).toFixed(5))
		},
		elevation: randInt(10, 1400),
		status: sensorStatus(battery),
		dangerLevel: deriveDangerLevel({ batteryPct: battery, signalStrength, telemetry: { temperature: baseTemp, co2Ppm: baseCo2, soilMoisture: baseMoisture } }),
		batteryPct: battery,
		signalStrength,
		firmwareVersion: pick(FIRMWARE_VERSIONS),
		lastSeenAt: msAgo(randInt(1000, battery < 15 ? 3_600_000 : 120_000)),
		deployedAt: daysAgo(randInt(30, 730))
	};
}

export function generateSensorNodes(regions: Region[], countPerRegion = 12): SensorNode[] {
	const nodes: SensorNode[] = [];
	let globalIndex = 0;
	for (const region of regions) {
		const count = randInt(8, countPerRegion);
		for (let i = 0; i < count; i++) {
			nodes.push(generateSensorNode(globalIndex++, region));
		}
	}
	return nodes;
}

// ─── Telemetry ────────────────────────────────────────────────────────────────

export function generateTelemetry(sensor: SensorNode): Telemetry {
	const baseTemp        = randFloat(18, 42);
	const baseSmoke       = randFloat(0, 0.7, 3);
	const baseWind        = randFloat(0, 55);
	const baseCo2         = randInt(380, 1800);
	const baseCo          = randInt(0, 28);
	const baseMoisture    = randFloat(12, 48, 1);
	const baseGroundwater = randFloat(-4.5, -1.6);
	const baseHumidity    = randFloat(12, 85);

	const dangerLevel = deriveDangerLevel({ batteryPct: sensor.batteryPct, signalStrength: sensor.signalStrength, telemetry: { temperature: baseTemp, co2Ppm: baseCo2, soilMoisture: baseMoisture } });
	const updatedSensor: SensorNode = { ...sensor, dangerLevel };

	return {
		id: shortId(),
		sensorId: sensor.id,
		timestamp: sensor.lastSeenAt,
		temperature: baseTemp,
		humidity: baseHumidity,
		windSpeed: baseWind,
		windDirection: randInt(0, 359),
		coPpm: baseCo,
		co2Ppm: baseCo2,
		smokeIndex: baseSmoke,
		particulateMatter: randFloat(0, 250, 1),
		pressure: randFloat(985, 1025),
		uvIndex: randFloat(0, 11, 1),
		soilMoisture: baseMoisture,
		groundwaterLevel: baseGroundwater,
		loraRssi: sensor.signalStrength,
		loraSnr: parseFloat(randFloat(6, 18, 1).toFixed(1)),
		batteryPct: sensor.batteryPct,
		signalStrength: sensor.signalStrength,
		// 7-day history at 30-min intervals (336 points)
		history: {
			temperature:     makeSeries(baseTemp,              336, 1_800_000, 2.5,  [0, 60]),
			humidity:        makeSeries(baseHumidity,          336, 1_800_000, 3,    [5, 100]),
			smokeIndex:      makeSeries(baseSmoke,             336, 1_800_000, 0.05, [0, 1]),
			windSpeed:       makeSeries(baseWind,              336, 1_800_000, 5,    [0, 120]),
			coPpm:           makeSeries(baseCo,                336, 1_800_000, 1.5,  [0, 50]),
			co2Ppm:          makeSeries(baseCo2,               336, 1_800_000, 30,   [350, 2200]),
			soilMoisture:    makeSeries(baseMoisture,          336, 1_800_000, 2.4,  [8, 55]),
			groundwaterLevel: makeSeries(baseGroundwater,      336, 1_800_000, 0.12, [-5.5, -1.2]),
			batteryPct:      makeSeries(sensor.batteryPct,     336, 1_800_000, 0.8,  [0, 100]),
			signalStrength:  makeSeries(sensor.signalStrength, 336, 1_800_000, 2.5,  [-120, -30])
		},
		// 30-day daily summaries (1 point per day)
		history30d: {
			temperature:     makeSeries(baseTemp,              30, 86_400_000, 5,    [0, 60]),
			humidity:        makeSeries(baseHumidity,          30, 86_400_000, 6,    [5, 100]),
			co2Ppm:          makeSeries(baseCo2,               30, 86_400_000, 60,   [350, 2200]),
			soilMoisture:    makeSeries(baseMoisture,          30, 86_400_000, 4,    [8, 55]),
			groundwaterLevel: makeSeries(baseGroundwater,      30, 86_400_000, 0.25, [-5.5, -1.2]),
			batteryPct:      makeSeries(sensor.batteryPct,     30, 86_400_000, 1.5,  [0, 100]),
			signalStrength:  makeSeries(sensor.signalStrength, 30, 86_400_000, 5,    [-120, -30])
		}
	};
}


export function generateTelemetryMap(sensors: SensorNode[]): Map<string, Telemetry> {
	const map = new Map<string, Telemetry>();
	for (const s of sensors) {
		map.set(s.id, generateTelemetry(s));
	}
	return map;
}

const CALIBRATION_STATUSES = ['Calibrated', 'Drifted', 'Recalibration Needed'] as const;
const MAINTENANCE_NOTES = [
	'Replace sensor within 24h',
	'Inspect antenna and cabling',
	'Validate CO₂ calibration',
	'Schedule full maintenance check',
	'Battery replacement recommended soon'
];

export function generateNodeHealth(sensor: SensorNode): NodeHealth {
	const drift = parseFloat((rand() * 0.18).toFixed(2));
	const calib = pick(CALIBRATION_STATUSES);
	const score = Math.max(0, Math.min(100, sensor.batteryPct - drift * 40 + (sensor.signalStrength + 120) / 2));

	return {
		sensorId: sensor.id,
		batteryPct: sensor.batteryPct,
		firmwareVersion: sensor.firmwareVersion,
		calibrationStatus: calib,
		signalStrength: sensor.signalStrength,
		sensorDrift: drift,
		maintenanceRecommendation: pick(MAINTENANCE_NOTES),
		lastSeenAt: sensor.lastSeenAt
	};
}

export function generateConfidenceScore(sensor: SensorNode, telemetryOverride?: Partial<Telemetry> | null): ConfidenceScore {
	const telemetry = telemetryOverride ? {
		temperature: telemetryOverride.temperature ?? randFloat(20, 42),
		co2Ppm: telemetryOverride.co2Ppm ?? randInt(380, 1900),
		soilMoisture: telemetryOverride.soilMoisture ?? randFloat(6, 48, 1)
	} : {
		temperature: randFloat(20, 42),
		co2Ppm: randInt(380, 1900),
		soilMoisture: randFloat(6, 48, 1)
	};
	const tempRisk = telemetry.temperature > 35 ? 0.6 : telemetry.temperature > 28 ? 0.35 : 0.1;
	const co2Risk = telemetry.co2Ppm > 1400 ? 0.65 : telemetry.co2Ppm > 950 ? 0.3 : 0.1;
	const moistureRisk = telemetry.soilMoisture < 18 ? 0.7 : telemetry.soilMoisture < 26 ? 0.35 : 0.1;
	const signalRisk = sensor.signalStrength < -95 ? 0.2 : 0.05;
	const riskScore = Math.round((tempRisk * 0.35 + co2Risk * 0.3 + moistureRisk * 0.25 + signalRisk * 0.1) * 100);
	const score = Math.max(8, Math.min(100, riskScore));
	const label = score >= 75 ? 'Critical' : score >= 55 ? 'High' : score >= 35 ? 'Moderate' : 'Low';
	const level: Severity = score >= 75 ? 'critical' : score >= 55 ? 'high' : score >= 35 ? 'medium' : 'low';
	const explanation = [
		telemetry.temperature > 35 ? 'Temperature exceeds the smoldering-risk threshold.' : 'Temperature remains within the expected envelope.',
		telemetry.co2Ppm > 1400 ? 'CO₂ is elevated relative to the local baseline.' : 'CO₂ is stable for the current conditions.',
		telemetry.soilMoisture < 18 ? 'Soil moisture is very low, increasing ignition potential.' : 'Soil moisture is within the monitored range.',
		`${sensor.signalStrength} dBm signal remains ${sensor.signalStrength < -95 ? 'weaker than ideal' : 'stable'} for the node.`
	];

	return {
		sensorId: sensor.id,
		score,
		label,
		riskLevel: level,
		factors: {
			temperature: telemetry.temperature > 35 ? 'Elevated' : telemetry.temperature > 28 ? 'Moderate' : 'Low',
			co2: telemetry.co2Ppm > 1400 ? 'Elevated' : telemetry.co2Ppm > 950 ? 'Moderate' : 'Low',
			moisture: telemetry.soilMoisture < 18 ? 'Dry' : telemetry.soilMoisture < 26 ? 'Moderate' : 'Moist',
			signal: sensor.signalStrength < -95 ? 'Weak' : 'Stable'
		},
		explanation,
		updatedAt: Date.now() - randInt(120_000, 1_800_000)
	};
}

// ─── Alert ────────────────────────────────────────────────────────────────────

const ALERT_TEMPLATES: Record<AlertCategory, { title: string; message: string; severity: Severity }[]> = {
	smoke_detected: [
		{ title: 'Smoke Plume Detected', message: 'Optical density exceeds safe threshold. Potential ignition source nearby.', severity: 'high' },
		{ title: 'Elevated Particulate Matter', message: 'PM2.5 reading at 185 µg/m³, 3× daily limit.', severity: 'medium' }
	],
	temperature_spike: [
		{ title: 'Temperature Spike', message: 'Surface temperature rose 18°C in under 12 minutes.', severity: 'critical' },
		{ title: 'Heat Anomaly', message: 'Thermal sensor registers abnormal localised heat signature.', severity: 'high' }
	],
	sensor_offline: [
		{ title: 'Sensor Unresponsive', message: 'No heartbeat received in the past 30 minutes.', severity: 'medium' }
	],
	battery_low: [
		{ title: 'Low Battery Warning', message: 'Sensor battery below 12%. Schedule replacement within 48 h.', severity: 'low' },
		{ title: 'Critical Battery', message: 'Battery at 4%. Sensor will shut down imminently.', severity: 'medium' }
	],
	wind_shift: [
		{ title: 'Rapid Wind Direction Change', message: 'Sustained 42° shift in wind bearing detected over 8 minutes.', severity: 'high' },
		{ title: 'Wind Gust Alarm', message: 'Gusts exceeding 95 km/h recorded at sensor.', severity: 'critical' }
	],
	perimeter_breach: [
		{ title: 'Perimeter Zone Breach', message: 'Motion detected inside the established exclusion zone.', severity: 'critical' }
	],
	co2_threshold: [
		{ title: 'CO₂ Threshold Exceeded', message: 'Concentration at 1620 ppm, above the 1500 ppm action level.', severity: 'high' }
	],
	signal_lost: [
		{ title: 'Signal Lost', message: 'RF link dropped. Last telemetry was 45 minutes ago.', severity: 'medium' }
	]
};

const ALERT_CATEGORIES = Object.keys(ALERT_TEMPLATES) as AlertCategory[];

export function generateAlert(index: number, sensors: SensorNode[], regions: Region[]): Alert {
	const category = pick(ALERT_CATEGORIES);
	const template = pick(ALERT_TEMPLATES[category]);
	const sensor = rand() > 0.1 ? pick(sensors) : null;
	const region = sensor ? regions.find(r => r.id === sensor.regionId) ?? pick(regions) : pick(regions);
	const triggered = hoursAgo(randInt(1, 168));
	const resolved = rand() > 0.45 ? triggered + randInt(600_000, 7_200_000) : null;

	return {
		id: uid('AL', index + 1),
		category,
		severity: template.severity,
		sensorId: sensor?.id ?? null,
		regionId: region.id,
		title: template.title,
		message: template.message,
		triggeredAt: triggered,
		resolvedAt: resolved,
		acknowledged: resolved !== null || rand() > 0.55,
		acknowledgedBy: rand() > 0.4 ? pick(['ops.command', 'unit.alpha', 'unit.bravo', 'admin']) : null,
		autoResolved: resolved !== null && rand() > 0.6
	};
}

export function generateAlerts(sensors: SensorNode[], regions: Region[], count = 60): Alert[] {
	return Array.from({ length: count }, (_, i) => generateAlert(i, sensors, regions))
		.sort((a, b) => b.triggeredAt - a.triggeredAt);
}

// ─── Incident ─────────────────────────────────────────────────────────────────

const INCIDENT_TYPES: IncidentType[] = ['wildfire', 'structural', 'hazmat', 'search_rescue', 'flood'];
const INCIDENT_TYPE_WEIGHTS = [4, 2, 2, 1, 1];

const STATUS_BY_SEVERITY: Record<Severity, IncidentStatus[]> = {
	critical: ['active', 'active', 'monitoring'],
	high:     ['active', 'monitoring', 'contained'],
	medium:   ['monitoring', 'contained', 'resolved'],
	low:      ['contained', 'resolved', 'resolved']
};

const UNIT_POOL = ['Alpha-1', 'Alpha-2', 'Bravo-1', 'Bravo-3', 'Charlie-2', 'Delta-4', 'Eagle-1', 'Falcon-2', 'Ground-7'];

const INCIDENT_TITLES: Record<IncidentType, string[]> = {
	wildfire:     ['Ridgeline Fire', 'Dry Creek Burn', 'Mesa Blaze', 'Summit Fire Complex', 'Valley Ember'],
	structural:   ['Industrial Unit Fire', 'Warehouse Structure Fire', 'Residential Blaze'],
	hazmat:       ['Chemical Spill — Road 12', 'Fuel Leak at Depot', 'Unknown Substance — Grid C4'],
	search_rescue: ['Missing Hiker — Sector 7', 'Cliff Rescue — North Face', 'Swift Water Rescue'],
	flood:        ['Flash Flood — Lower Basin', 'River Overflow — East Bank', 'Culvert Failure']
};

const UPDATE_MESSAGES = [
	'Air support requested and en route.',
	'Ground units established perimeter at northern boundary.',
	'Evacuation order extended to Zone B.',
	'Aerial reconnaissance confirms fire front advancing north-east.',
	'Retardant drop completed. Re-evaluation in 2 hours.',
	'All units maintaining current positions. Situation stable.',
	'Containment line holding. No spot fires observed.',
	'Incident command post relocated to higher ground.',
	'Weather conditions deteriorating. Wind shift imminent.',
	'Structure triage completed. 3 properties at risk.'
];

export function generateIncident(index: number, regions: Region[]): Incident {
	const region = pick(regions);
	const type = weightedPick(INCIDENT_TYPES, INCIDENT_TYPE_WEIGHTS);
	const severityScore = randInt(20, 99);
	const severity = scoreToSeverity(severityScore);
	const status = pick(STATUS_BY_SEVERITY[severity]);
	const reported = daysAgo(randInt(0, 14));
	const containment = status === 'resolved' ? 100 : status === 'contained' ? randInt(60, 95) : randInt(0, 55);

	const updates = Array.from({ length: randInt(1, 5) }, (_, i) => ({
		timestamp: reported + i * randInt(1_800_000, 7_200_000),
		authorId: pick(['ops.command', 'unit.alpha', 'unit.bravo', 'dispatch']),
		message: pick(UPDATE_MESSAGES)
	}));

	return {
		id: uid('INC', index + 1),
		type,
		status,
		severity,
		title: pick(INCIDENT_TITLES[type]),
		description: `${type.replace('_', ' ')} incident in ${region.name}. Severity assessed as ${severity}. Monitoring active.`,
		regionId: region.id,
		origin: {
			lat: parseFloat((region.center.lat + (rand() - 0.5) * 0.08).toFixed(5)),
			lon: parseFloat((region.center.lon + (rand() - 0.5) * 0.12).toFixed(5))
		},
		affectedAreaKm2: randFloat(0.2, 180),
		containmentPct: containment,
		reportedAt: reported,
		updatedAt: reported + randInt(3_600_000, 86_400_000),
		estimatedControlAt: status !== 'resolved' ? hoursAhead(randInt(4, 72)) : null,
		assignedUnits: pickN(UNIT_POOL, randInt(1, 5)),
		casualties: randInt(0, severity === 'critical' ? 8 : 2),
		evacuated: randInt(0, severity === 'critical' ? 3000 : 200),
		updates
	};
}

export function generateIncidents(regions: Region[], count = 20): Incident[] {
	return Array.from({ length: count }, (_, i) => generateIncident(i, regions))
		.sort((a, b) => b.reportedAt - a.reportedAt);
}

// ─── Weather ─────────────────────────────────────────────────────────────────

const CONDITIONS: WeatherCondition[] = ['clear', 'partly_cloudy', 'overcast', 'fog', 'rain', 'thunderstorm', 'smoke'];
const CONDITION_WEIGHTS = [3, 3, 2, 1, 2, 1, 2]; // skew toward clear/partly cloudy in CA

export function generateWeather(region: Region): Weather {
	const cond = weightedPick(CONDITIONS, CONDITION_WEIGHTS);
	const temp = randFloat(14, 38);
	const wind = randFloat(4, 65);
	const forecast: WeatherForecastSlot[] = Array.from({ length: 24 }, (_, i) => ({
		timestamp: Date.now() + i * 3_600_000,
		condition: weightedPick(CONDITIONS, CONDITION_WEIGHTS),
		tempC: parseFloat((temp + (rand() - 0.5) * 6).toFixed(1)),
		humidity: randInt(15, 88),
		windSpeedKph: parseFloat((wind + (rand() - 0.5) * 15).toFixed(1)),
		windDirection: randInt(0, 359),
		precipMm: cond === 'rain' || cond === 'thunderstorm' ? randFloat(0, 18, 1) : 0
	}));

	return {
		regionId: region.id,
		updatedAt: msAgo(randInt(60_000, 900_000)),
		condition: cond,
		tempC: temp,
		feelsLikeC: parseFloat((temp - randFloat(0, 6)).toFixed(1)),
		humidity: randInt(15, 85),
		windSpeedKph: wind,
		windDirection: randInt(0, 359),
		windGustKph: parseFloat((wind + randFloat(8, 30)).toFixed(1)),
		precipMmH: cond === 'rain' || cond === 'thunderstorm' ? randFloat(0.5, 20, 1) : 0,
		visibilityKm: cond === 'fog' || cond === 'smoke' ? randFloat(0.2, 3) : randFloat(10, 50),
		uvIndex: randFloat(0, 11, 1),
		dewPointC: parseFloat((temp - randFloat(5, 20)).toFixed(1)),
		forecast
	};
}

export function generateWeatherMap(regions: Region[]): Map<string, Weather> {
	const map = new Map<string, Weather>();
	for (const r of regions) map.set(r.id, generateWeather(r));
	return map;
}

// ─── RiskIndex ────────────────────────────────────────────────────────────────

function makeRiskFactor(label: string, weight: number): RiskFactor {
	const score = randInt(5, 95);
	const t = rand();
	return {
		label,
		score,
		weight,
		trend: t < 0.33 ? 'up' : t < 0.66 ? 'stable' : 'down'
	};
}

export function generateRiskIndex(region: Region): RiskIndex {
	const groundwaterLevel = parseFloat((randFloat(-4.8, -1.3) * 1.1).toFixed(2));
	const soilMoistureAvg = randFloat(8, 40, 1);
	const dryDays = randInt(8, 90);
	const groundwaterFactor = Math.max(0, Math.min(100, (1 - (Math.abs(groundwaterLevel) - 1.3) / 3.5) * 100));
	const moistureFactor = Math.max(0, Math.min(100, (1 - (soilMoistureAvg / 40)) * 100));
	const dryDaysFactor = Math.max(0, Math.min(100, (dryDays / 90) * 100));
	const composite = parseFloat((groundwaterFactor * 0.4 + moistureFactor * 0.4 + dryDaysFactor * 0.2).toFixed(1));
	const factors = {
		fuelMoisture:       makeRiskFactor('Fuel Moisture Content', 0.20),
		windExposure:       makeRiskFactor('Wind Exposure',         0.16),
		temperature:        makeRiskFactor('Surface Temperature',   0.14),
		slopeAspect:        makeRiskFactor('Slope & Aspect',        0.12),
		humanActivity:      makeRiskFactor('Human Activity Index',  0.10),
		groundwaterLevel:   makeRiskFactor('Groundwater Level',      0.18),
		soilMoistureAvg:    makeRiskFactor('Soil Moisture',         0.16),
		historicalFrequency: makeRiskFactor('Historical Frequency', 0.10)
	};

	return {
		regionId: region.id,
		calculatedAt: msAgo(randInt(300_000, 3_600_000)),
		composite,
		level: scoreToSeverity(composite),
		dryDays,
		groundwaterLevel,
		soilMoistureAvg,
		factors,
		history: makeSeries(composite, 30, 86_400_000, 8, [0, 100]),
		nextReviewAt: hoursAhead(randInt(1, 6))
	};
}

export function generateRiskIndexMap(regions: Region[]): Map<string, RiskIndex> {
	const map = new Map<string, RiskIndex>();
	for (const r of regions) map.set(r.id, generateRiskIndex(r));
	return map;
}
