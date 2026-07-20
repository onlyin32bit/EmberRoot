// place files you want to import through the `$lib` alias in this folder.
export { default as TopNav } from './components/TopNav.svelte';
export { default as Sidebar } from './components/Sidebar.svelte';
export { default as PageShell } from './components/PageShell.svelte';

// ── Design System UI components ──
export * from './components/ui/index.js';

// ── Mock data layer ──
export { mockService } from './mock/index.js';
export type {
	SensorNode, Telemetry, Alert, Incident,
	Region, Weather, RiskIndex,
	StatusLevel, Severity, TrendDirection, LatLon, TimeSeries
} from './mock/index.js';
