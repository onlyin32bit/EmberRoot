/**
 * EmberRoot Mock Data Layer — Service
 * ─────────────────────────────────────────────
 * Singleton that owns the entire synthetic dataset.
 * All data is generated once on first access and cached.
 *
 * Usage:
 *   import { mockService } from '$lib/mock';
 *
 *   const regions   = mockService.getRegions();
 *   const sensors   = mockService.getSensorsForRegion('RG-0001');
 *   const telemetry = mockService.getTelemetry('SN-0042');
 *   const alerts    = mockService.getActiveAlerts();
 */

import { setSeed } from './utils.js';
import {
	generateRegions,
	generateSensorNodes,
	generateTelemetryMap,
	generateAlerts,
	generateIncidents,
	generateWeatherMap,
	generateRiskIndexMap,
	generateNodeHealth,
	generateConfidenceScore,
	generateUminhRegion,
	generateUminhSensors,
	generateFirmsHotspots
} from './generators.js';

import type {
	Region,
	SensorNode,
	Telemetry,
	NodeHealth,
	ConfidenceScore,
	Hotspot,
	Alert,
	Incident,
	Weather,
	RiskIndex,
	Severity,
	StatusLevel
} from './types.js';

// ─── Config ───────────────────────────────────────────────────────────────────

const CONFIG = {
	seed:               0xc0ffee42,
	regionCount:        8,
	sensorsPerRegion:   14,
	alertCount:         72,
	incidentCount:      18
} as const;

// ─── Dataset ─────────────────────────────────────────────────────────────────

class MockDataStore {
	private _regions:    Region[]                 | null = null;
	private _sensors:    SensorNode[]             | null = null;
	private _telemetry:  Map<string, Telemetry>   | null = null;
	private _alerts:     Alert[]                  | null = null;
	private _incidents:  Incident[]               | null = null;
	private _weather:    Map<string, Weather>     | null = null;
	private _riskIndex:  Map<string, RiskIndex>   | null = null;
	private _nodeHealth: Map<string, NodeHealth>  | null = null;
	private _confidence: Map<string, ConfidenceScore> | null = null;
	private _hotspots: Map<string, Hotspot[]> | null = null;

	private boot() {
		setSeed(CONFIG.seed);
		const regions = generateRegions(CONFIG.regionCount);
		const uMinhRegion = generateUminhRegion();
		this._regions = [...regions, uMinhRegion];

		const standardSensors = generateSensorNodes(regions, CONFIG.sensorsPerRegion);
		const uMinhSensors = generateUminhSensors(uMinhRegion, 56);
		this._sensors = [...standardSensors, ...uMinhSensors];

		this._telemetry = generateTelemetryMap(this._sensors);
		this._alerts = generateAlerts(this._sensors, this._regions, CONFIG.alertCount);
		this._incidents = generateIncidents(this._regions, CONFIG.incidentCount);
		this._weather = generateWeatherMap(this._regions);
		this._riskIndex = generateRiskIndexMap(this._regions);
		this._nodeHealth = new Map(this._sensors.map(s => [s.id, generateNodeHealth(s)]));
		this._confidence = new Map(this._sensors.map(s => [s.id, generateConfidenceScore(s)]));
		this._hotspots = new Map(this._regions.map((region) => [region.id, generateFirmsHotspots(region)]));
	}

	private get regions()   { if (!this._regions)   this.boot(); return this._regions!; }
	private get sensors()   { if (!this._sensors)   this.boot(); return this._sensors!; }
	private get telemetry() { if (!this._telemetry) this.boot(); return this._telemetry!; }
	private get alerts()    { if (!this._alerts)    this.boot(); return this._alerts!; }
	private get incidents() { if (!this._incidents) this.boot(); return this._incidents!; }
	private get weather()   { if (!this._weather)   this.boot(); return this._weather!; }
	private get riskIndex() { if (!this._riskIndex) this.boot(); return this._riskIndex!; }
	private get nodeHealth() { if (!this._nodeHealth) this.boot(); return this._nodeHealth!; }
	private get confidence() { if (!this._confidence) this.boot(); return this._confidence!; }

	// ── Regions ──────────────────────────────────────────────────────────────

	getRegions(): Region[] { return this.regions; }

	getRegion(id: string): Region | undefined {
		return this.regions.find(r => r.id === id);
	}

	getRegionsByRisk(level: Severity): Region[] {
		return this.regions.filter(r => r.riskLevel === level);
	}

	// ── Sensors ───────────────────────────────────────────────────────────────

	getSensors(): SensorNode[] { return this.sensors; }

	getSensor(id: string): SensorNode | undefined {
		return this.sensors.find(s => s.id === id);
	}

	getSensorsForRegion(regionId: string): SensorNode[] {
		return this.sensors.filter(s => s.regionId === regionId);
	}

	getSensorsByStatus(status: StatusLevel): SensorNode[] {
		return this.sensors.filter(s => s.status === status);
	}

	getSensorsByType(type: SensorNode['type']): SensorNode[] {
		return this.sensors.filter(s => s.type === type);
	}

	// ── Telemetry ─────────────────────────────────────────────────────────────

	getTelemetry(sensorId: string): Telemetry | undefined {
		return this.telemetry.get(sensorId);
	}

	getAllTelemetry(): Telemetry[] {
		return Array.from(this.telemetry.values());
	}

	getNodeHealth(sensorId: string): NodeHealth | undefined {
		return this.nodeHealth.get(sensorId);
	}

	getConfidenceScore(sensorId: string): ConfidenceScore | undefined {
		return this.confidence.get(sensorId);
	}

	// ── Alerts ────────────────────────────────────────────────────────────────

	getAlerts(): Alert[] { return this.alerts; }

	getActiveAlerts(): Alert[] {
		return this.alerts.filter(a => a.resolvedAt === null);
	}

	getUnacknowledgedAlerts(): Alert[] {
		return this.alerts.filter(a => !a.acknowledged);
	}

	getAlertsForRegion(regionId: string): Alert[] {
		return this.alerts.filter(a => a.regionId === regionId);
	}

	getAlertsBySeverity(severity: Severity): Alert[] {
		return this.alerts.filter(a => a.severity === severity);
	}

	// ── Incidents ─────────────────────────────────────────────────────────────

	getIncidents(): Incident[] { return this.incidents; }

	getIncident(id: string): Incident | undefined {
		return this.incidents.find(i => i.id === id);
	}

	getActiveIncidents(): Incident[] {
		return this.incidents.filter(i => i.status === 'active' || i.status === 'monitoring');
	}

	getIncidentsForRegion(regionId: string): Incident[] {
		return this.incidents.filter(i => i.regionId === regionId);
	}

	getIncidentsByType(type: Incident['type']): Incident[] {
		return this.incidents.filter(i => i.type === type);
	}

	// ── Weather ───────────────────────────────────────────────────────────────

	getWeather(regionId: string): Weather | undefined {
		return this.weather.get(regionId);
	}

	getAllWeather(): Weather[] {
		return Array.from(this.weather.values());
	}

	// ── Risk Index ────────────────────────────────────────────────────────────

	getRiskIndex(regionId: string): RiskIndex | undefined {
		return this.riskIndex.get(regionId);
	}

	getAllRiskIndices(): RiskIndex[] {
		return Array.from(this.riskIndex.values());
	}

	getHotspotsForRegion(regionId: string): Hotspot[] {
		return this.hotspots.get(regionId) ?? [];
	}

	getHighRiskRegions(minComposite = 60): RiskIndex[] {
		return this.getAllRiskIndices()
			.filter(r => r.composite >= minComposite)
			.sort((a, b) => b.composite - a.composite);
	}

	// ── Aggregate / Dashboard helpers ─────────────────────────────────────────

	/** Key summary stats for a top-level dashboard */
	getSummaryStats() {
		const sensors = this.getSensors();
		const alerts  = this.getAlerts();
		const incidents = this.getIncidents();

		return {
			totalSensors:       sensors.length,
			onlineSensors:      sensors.filter(s => s.status === 'online').length,
			warningSensors:     sensors.filter(s => s.status === 'warning').length,
			offlineSensors:     sensors.filter(s => s.status === 'offline').length,
			criticalSensors:    sensors.filter(s => s.status === 'critical').length,
			totalAlerts:        alerts.length,
			activeAlerts:       alerts.filter(a => a.resolvedAt === null).length,
			unacknowledged:     alerts.filter(a => !a.acknowledged).length,
			criticalAlerts:     alerts.filter(a => a.severity === 'critical').length,
			totalIncidents:     incidents.length,
			activeIncidents:    incidents.filter(i => i.status === 'active').length,
			containedIncidents: incidents.filter(i => i.status === 'contained').length,
			resolvedIncidents:  incidents.filter(i => i.status === 'resolved').length,
			totalRegions:       this.getRegions().length,
			highRiskRegions:    this.getHighRiskRegions(65).length
		};
	}

	/** Latest telemetry values across all sensors for a region */
	getRegionTelemetrySummary(regionId: string) {
		const sensors = this.getSensorsForRegion(regionId);
		const readings = sensors
			.map(s => this.getTelemetry(s.id))
			.filter((t): t is Telemetry => t !== undefined);

		if (readings.length === 0) return null;

		const avg = <K extends keyof Omit<Telemetry, 'id' | 'sensorId' | 'timestamp' | 'history'>>(
			key: K
		): number =>
			parseFloat(
				(readings.reduce((s, r) => s + (r[key] as number), 0) / readings.length).toFixed(2)
			);

		return {
			regionId,
			sampleSize: readings.length,
			avgTemperature:  avg('temperature'),
			avgHumidity:     avg('humidity'),
			avgWindSpeed:    avg('windSpeed'),
			avgCo2Ppm:       avg('co2Ppm'),
			avgSmokeIndex:   avg('smokeIndex'),
			maxSmokeIndex:   Math.max(...readings.map(r => r.smokeIndex)),
			maxTemperature:  Math.max(...readings.map(r => r.temperature)),
			updatedAt:       Math.max(...readings.map(r => r.timestamp))
		};
	}

	/** Flush cache and regenerate all data (e.g. for hot-reload dev use) */
	reset(seed = CONFIG.seed) {
		setSeed(seed);
		this._regions   = null;
		this._sensors   = null;
		this._telemetry = null;
		this._alerts    = null;
		this._incidents = null;
		this._weather   = null;
		this._riskIndex = null;
		this._nodeHealth = null;
		this._confidence = null;
	}
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const mockService = new MockDataStore();
