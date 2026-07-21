import { error } from '@sveltejs/kit';
import { mockService } from '$lib/mock';
import type { PageLoad } from './$types';

export const ssr = false;

export const load: PageLoad = ({ params }) => {
	const { nodeId } = params;

	const sensor = mockService.getSensor(nodeId);
	if (!sensor) {
		throw error(404, `Sensor node "${nodeId}" not found`);
	}

	const telemetry  = mockService.getTelemetry(nodeId)  ?? null;
	const health     = mockService.getNodeHealth(nodeId)  ?? null;
	const confidence = mockService.getConfidenceScore(nodeId) ?? null;

	// Alerts specifically tied to this sensor
	const alerts = mockService
		.getAlerts()
		.filter((a) => a.sensorId === nodeId)
		.sort((a, b) => b.triggeredAt - a.triggeredAt);

	return { sensor, telemetry, health, confidence, alerts };
};
