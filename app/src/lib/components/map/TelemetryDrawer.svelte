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

		<a
			href="/spatial-map/node/{sensor.id}"
			class="analytics-btn"
			id="btn-view-node-analytics-{sensor.id}"
		>
			<svg
				width="16"
				height="16"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				aria-hidden="true"
			>
				<polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
			</svg>
			View Detailed Analytics
			<svg
				class="analytics-btn__arrow"
				width="14"
				height="14"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2.5"
				stroke-linecap="round"
				stroke-linejoin="round"
				aria-hidden="true"
			>
				<line x1="5" y1="12" x2="19" y2="12" />
				<polyline points="12 5 19 12 12 19" />
			</svg>
		</a>
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

	/* ── View Detailed Analytics button ───────────────────────────────────── */

	.analytics-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		padding: 13px 18px;
		border-radius: 14px;
		background: linear-gradient(135deg, #f0783f 0%, #e05428 100%);
		color: #fff;
		font-size: 14px;
		font-weight: 700;
		text-decoration: none;
		letter-spacing: 0.01em;
		box-shadow:
			0 4px 16px rgba(240, 120, 63, 0.35),
			0 1px 0 rgba(255, 255, 255, 0.12) inset;
		transition:
			filter 0.18s ease,
			transform 0.14s ease,
			box-shadow 0.18s ease;
	}

	.analytics-btn:hover {
		filter: brightness(1.08);
		transform: translateY(-1px);
		box-shadow:
			0 8px 24px rgba(240, 120, 63, 0.45),
			0 1px 0 rgba(255, 255, 255, 0.15) inset;
	}

	.analytics-btn:active {
		transform: translateY(0);
		filter: brightness(0.96);
	}

	.analytics-btn__arrow {
		margin-left: auto;
		opacity: 0.85;
		transition: transform 0.18s ease;
	}

	.analytics-btn:hover .analytics-btn__arrow {
		transform: translateX(3px);
	}

	.drawer-empty {
		color: var(--text-muted);
		font-size: 13px;
	}
</style>