/**
 * EmberRoot Mock Data Layer — Public API
 * ─────────────────────────────────────────────
 * Single entry point for all mock data.
 *
 * Import patterns:
 *   import { mockService } from '$lib/mock';
 *   import type { SensorNode, Alert, Incident } from '$lib/mock';
 */

// Service singleton
export { mockService } from './service.js';

// All types
export type {
	// Primitives
	StatusLevel,
	Severity,
	TrendDirection,
	LatLon,
	TimeSeries,

	// Domain interfaces
	SensorNode,
	SensorType,
	Telemetry,
	Alert,
	AlertCategory,
	Incident,
	IncidentType,
	IncidentStatus,
	IncidentUpdate,
	Region,
	TerrainType,
	Weather,
	WeatherCondition,
	WeatherForecastSlot,
	RiskIndex,
	RiskFactor
} from './types.js';

// Raw generators (for custom one-off usage or Storybook-style component testing)
export {
	generateRegion,
	generateRegions,
	generateSensorNode,
	generateSensorNodes,
	generateTelemetry,
	generateTelemetryMap,
	generateAlert,
	generateAlerts,
	generateIncident,
	generateIncidents,
	generateWeather,
	generateWeatherMap,
	generateRiskIndex,
	generateRiskIndexMap
} from './generators.js';

// Utils (exposed for custom generators in other parts of the codebase)
export { rand, randInt, randFloat, pick, makeSeries, setSeed } from './utils.js';
