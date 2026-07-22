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

	function statusTone(status: string) {
		const tones = {
			online: { label: 'Operational', color: '#22c55e' },
			warning: { label: 'Attention', color: '#f59e0b' },
			critical: { label: 'Critical', color: '#ef4444' },
			offline: { label: 'Offline', color: '#6b7280' }
		};
		return tones[status as keyof typeof tones] ?? tones.offline;
	}

	function healthTone(value: number) {
		if (value >= 80) return { label: 'Healthy', color: '#22c55e' };
		if (value >= 55) return { label: 'Stable', color: '#f59e0b' };
		return { label: 'Needs review', color: '#ef4444' };
	}

	const statusInfo = $derived(sensor ? statusTone(sensor.status) : null);
	const batteryHealth = $derived(telemetry ? healthTone(telemetry.batteryPct) : null);
</script>

<div class="drawer-content">
	{#if sensor && telemetry}
		<div class="drawer-top">
			<div>
				<div class="drawer-title">{sensor.name}</div>
				<div class="drawer-subtitle">{sensor.id} • {sensor.regionId}</div>
			</div>
			<div class="drawer-score" style="color:{statusInfo?.color}">{confidence?.score ?? 0}<span>Confidence</span></div>
		</div>

		{#if confidence?.explanation?.length}
			<div class="drawer-section">
				<div class="drawer-section__title">Explainable alert rationale</div>
				<ul>
					{#each confidence.explanation as item}
						<li>{item}</li>
					{/each}
				</ul>
			</div>
		{/if}

		{#if confidence?.factors}
			<div class="drawer-section">
				<div class="drawer-section__title">Signal factors</div>
				<div class="drawer-factor-grid">
					{#each Object.entries(confidence.factors) as [key, value]}
						<div class="drawer-factor-pill">
							<span>{key}</span>
							<strong>{value}</strong>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<div class="drawer-status-row">
			<span class="drawer-status-pill" style="color:{statusInfo?.color}; background:{statusInfo?.color}1a; border-color:{statusInfo?.color}44;">{statusInfo?.label}</span>
			{#if health}
				<span class="drawer-status-pill" style="color:{batteryHealth?.color}; background:{batteryHealth?.color}1a; border-color:{batteryHealth?.color}44;">{batteryHealth?.label}</span>
			{/if}
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
			<div class="drawer-card">
				<div class="drawer-card__label">Danger level</div>
				<div>{sensor.dangerLevel}</div>
			</div>
			<div class="drawer-card">
				<div class="drawer-card__label">Humidity</div>
				<div>{telemetry.humidity.toFixed(1)}%</div>
			</div>
			<div class="drawer-card">
				<div class="drawer-card__label">GPS</div>
				<div>{sensor.location.lat.toFixed(4)}, {sensor.location.lon.toFixed(4)}</div>
			</div>
			<div class="drawer-card">
				<div class="drawer-card__label">Elevation</div>
				<div>{sensor.elevation} m</div>
			</div>
			<div class="drawer-card">
				<div class="drawer-card__label">Firmware</div>
				<div>{health?.firmwareVersion ?? sensor.firmwareVersion}</div>
			</div>
			<div class="drawer-card">
				<div class="drawer-card__label">Deployed</div>
				<div>{new Date(sensor.deployedAt).toLocaleDateString()}</div>
			</div>
		</div>

		<div class="drawer-section">
			<div class="drawer-section__title">Environmental readings</div>
			<ul>
				<li>Temperature: {telemetry.temperature.toFixed(1)}°C</li>
				<li>Humidity: {telemetry.humidity.toFixed(1)}%</li>
				<li>CO₂: {Math.round(telemetry.co2Ppm)} ppm</li>
				<li>CO: {telemetry.coPpm} ppm</li>
				<li>Soil moisture: {telemetry.soilMoisture.toFixed(1)}%</li>
				<li>Groundwater: {telemetry.groundwaterLevel.toFixed(2)} m</li>
			</ul>
		</div>

		{#if health}
			<div class="drawer-section">
				<div class="drawer-section__title">Node health</div>
				<ul>
					<li>Firmware: {health.firmwareVersion}</li>
					<li>Calibration: {health.calibrationStatus}</li>
					<li>Drift: {health.sensorDrift.toFixed(2)}</li>
					<li>Recommendation: {health.maintenanceRecommendation}</li>
					<li>Deployed: {new Date(sensor.deployedAt).toLocaleDateString()}</li>
				</ul>
			</div>
		{/if}

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

	.drawer-status-row {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	.drawer-status-pill {
		display: inline-flex;
		align-items: center;
		border: 1px solid;
		border-radius: 999px;
		padding: 4px 10px;
		font-size: 10px;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
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

	.drawer-factor-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 8px;
	}

	.drawer-factor-pill {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 8px;
		padding: 8px 10px;
		border-radius: 10px;
		background: var(--surface-raised);
		border: 1px solid var(--surface-border);
		font-size: 12px;
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