<script lang="ts">
	import type { SensorNode } from '$lib/mock';

	let { sensor, selected = false }: { sensor: SensorNode; selected?: boolean } = $props();
</script>

<div class="sensor-marker {selected ? 'selected' : ''}">
	<div class="status-dot status-dot--{sensor.status}"></div>
	<div class="sensor-label">{sensor.id.replace('SN-', '')}</div>
</div>

<style>
	.sensor-marker {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 4px 8px;
		border-radius: 999px;
		background: rgba(15, 23, 42, 0.9);
		color: white;
		font-size: 11px;
		font-weight: 700;
		box-shadow: 0 0 0 2px rgba(15, 23, 42, 0.32);
	}

	.sensor-marker.selected {
		background: rgba(34, 197, 94, 0.95);
	}

	.status-dot {
		width: 10px;
		height: 10px;
		border-radius: 999px;
	}

	.status-dot--online { background: #22c55e; }
	.status-dot--warning { background: #f59e0b; }
	.status-dot--critical { background: #ef4444; }
	.status-dot--offline { background: #374151; }
</style>