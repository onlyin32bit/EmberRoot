/**
 * Cloudflare Workers should receive MQTT through an MQTT broker webhook or a
 * gateway bridge. A Worker cannot own a reliable, long-lived TCP MQTT session.
 * The `/api/ingest/mqtt` route is that bridge target and reuses the strict
 * parser in telemetry.service.ts.
 */
export const MQTT_INGEST_ROUTE = '/api/ingest/mqtt';
