<script lang="ts">
	import type {
		SensorNode,
		Telemetry,
		NodeHealth,
		ConfidenceScore
	} from '$lib/mock';

	let {
		sensor = null,
		telemetry = null,
		health = null,
		confidence = null
	}: {
		sensor?: SensorNode | null;
		telemetry?: Telemetry | null;
		health?: NodeHealth | null;
		confidence?: ConfidenceScore | null;
	} = $props();
</script>
<div class="drawer-content">
	{#if sensor && telemetry}
		<div class="drawer-top">
			<div>
				<div class="drawer-title">{sensor.name}</div>
				<div class="drawer-subtitle">{sensor.status.toUpperCase()}</div>
			</div>
			<div class="drawer-score">{confidence?.score ?? 0}<span>Confidence</span></div>
		</div>

		<div class="drawer-grid">
			<div class="drawer-card">
				<div class="drawer-card__label">Last update</div>
				<div>{new Date(telemetry.timestamp).toLocaleString()}</div>
			</div>
			<div class="drawer-card">
				<div class="drawer-card__label">Battery</div>
				<div>{telemetry.batteryPct}%</div>
			</div>
			<div class="drawer-card">
				<div class="drawer-card__label">LoRa RSSI</div>
				<div>{telemetry.loraRssi} dBm</div>
			</div>
			<div class="drawer-card">
				<div class="drawer-card__label">LoRa SNR</div>
				<div>{telemetry.loraSnr} dB</div>
			</div>
		</div>

		<div class="drawer-section">
			<div class="drawer-section__title">Environmental readings</div>
			<ul>
				<li>Temperature: {telemetry.temperature.toFixed(1)}°C</li>
				<li>CO₂: {Math.round(telemetry.co2Ppm)} ppm</li>
				<li>CO: {telemetry.coPpm} ppm</li>
				<li>Soil moisture: {telemetry.soilMoisture.toFixed(1)}%</li>
				<li>Groundwater: {telemetry.groundwaterLevel.toFixed(2)} m</li>
			</ul>
		</div>

		{#if confidence}
			<div class="drawer-section">
				<div class="drawer-section__title">Explainable factors</div>
				<ul>
					<li>{confidence.explanation[0]}</li>
					<li>{confidence.explanation[1]}</li>
					<li>{confidence.explanation[2]}</li>
				</ul>
			</div>
		{/if}
	{:else}
		<div class="drawer-empty">Select a sensor to inspect telemetry.</div>
	{/if}
</div>

<style>
	.drawer-content {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.drawer-top {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 14px;
	}

	.drawer-title {
		font-size: 18px;
		font-weight: 700;
	}

	.drawer-subtitle {
		font-size: 13px;
		color: var(--text-muted);
	}

	.drawer-score {
		text-align: right;
	}

	.drawer-score span {
		display: block;
		font-size: 11px;
		color: var(--text-muted);
	}

	.drawer-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 12px;
	}

	.drawer-card {
		background: var(--surface-raised);
		border: 1px solid var(--surface-border);
		border-radius: 16px;
		padding: 14px;
	}

	.drawer-card__label {
		font-size: 11px;
		color: var(--text-muted);
		margin-bottom: 6px;
	}

	.drawer-section {
		background: var(--surface-base);
		border: 1px solid var(--surface-border);
		border-radius: 16px;
		padding: 16px;
	}

	.drawer-section__title {
		font-weight: 700;
		margin-bottom: 10px;
	}

	.drawer-section ul {
		list-style: none;
		padding: 0;
		margin: 0;
		display: grid;
		gap: 8px;
	}

	.drawer-empty {
		color: var(--text-muted);
		font-size: 13px;
	}
</style>