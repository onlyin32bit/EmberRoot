<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import PageShell from '$lib/components/PageShell.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import StatusIndicator from '$lib/components/ui/StatusIndicator.svelte';
	import { mockService } from '$lib/mock';

	const sensors = mockService.getSensors().filter((sensor) => sensor.regionId === 'RG-UMINH-01').slice(0, 12);
	const replayLength = 96;

	let replayIndex = $state(0);
	let isPlaying = $state(true);
	let playbackSpeed = $state(1);
	let timer: ReturnType<typeof setInterval> | null = null;

	function statusTone(status: 'online' | 'warning' | 'offline') {
		const tones = {
			online: { label: 'Stable', color: 'var(--status-online)' },
			warning: { label: 'Watch', color: 'var(--status-warning)' },
			offline: { label: 'Offline', color: 'var(--status-offline)' }
		} as const;
		return tones[status];
	}

	function getReplayPoint(index: number) {
		return sensors.map((sensor) => {
			const telemetry = mockService.getTelemetry(sensor.id);
			const history = telemetry?.history;
			const historyLength = history?.temperature?.length ?? 0;
			const safeIndex = historyLength > 0 ? Math.min(historyLength - 1, Math.round((index / (replayLength - 1)) * (historyLength - 1))) : 0;
			const temp = history?.temperature?.[safeIndex]?.value ?? telemetry?.temperature ?? 0;
			const co2 = history?.co2Ppm?.[safeIndex]?.value ?? telemetry?.co2Ppm ?? 0;
			const moisture = history?.soilMoisture?.[safeIndex]?.value ?? telemetry?.soilMoisture ?? 0;
			const battery = history?.batteryPct?.[safeIndex]?.value ?? telemetry?.batteryPct ?? 0;
			const signal = history?.signalStrength?.[safeIndex]?.value ?? telemetry?.signalStrength ?? 0;
			const status: 'online' | 'warning' | 'offline' = battery < 10 || signal < -100 ? 'offline' : temp > 34 || co2 > 1450 || moisture < 18 ? 'warning' : 'online';

			return {
				sensor,
				temp,
				co2,
				moisture,
				battery,
				signal,
				status,
				tone: statusTone(status)
			};
		});
	}

	const replaySnapshots = $derived(getReplayPoint(replayIndex));
	const activeRiskScore = $derived.by(() => {
		const risk = Math.round(replaySnapshots.reduce((sum, item) => sum + (item.status === 'offline' ? 92 : item.status === 'warning' ? 64 : 18), 0) / Math.max(replaySnapshots.length, 1));
		return Math.max(8, Math.min(100, risk));
	});

	const summary = $derived.by(() => {
		const counts = replaySnapshots.reduce(
			(acc, item) => {
				if (item.status === 'offline') acc.offline += 1;
				else if (item.status === 'warning') acc.warning += 1;
				else acc.online += 1;
				return acc;
			},
			{ online: 0, warning: 0, offline: 0 }
		);
		return counts;
	});

	const timeline = $derived.by(() => {
		return Array.from({ length: replayLength }, (_, pointIndex) => {
			const sample = getReplayPoint(pointIndex);
			const risk = Math.round(sample.reduce((sum, item) => sum + (item.status === 'offline' ? 70 : item.status === 'warning' ? 45 : 12), 0) / sample.length);
			return Math.max(8, Math.min(100, risk));
		});
	});

	const currentTimestamp = $derived.by(() => {
		const telemetry = mockService.getTelemetry(sensors[0]?.id ?? '');
		const history = telemetry?.history.temperature;
		if (!history?.length) return new Date().toLocaleString();
		const point = history[Math.min(history.length - 1, Math.round((replayIndex / (replayLength - 1)) * (history.length - 1)))];
		return new Date(point.timestamp).toLocaleString(undefined, {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	});

	function togglePlayback() {
		isPlaying = !isPlaying;
		if (isPlaying) startPlayback();
		else stopPlayback();
	}

	function startPlayback() {
		if (timer) clearInterval(timer);
		timer = setInterval(() => {
			replayIndex = (replayIndex + 1) % replayLength;
		}, 1100 / playbackSpeed);
	}

	function stopPlayback() {
		if (timer) {
			clearInterval(timer);
			timer = null;
		}
	}

	function jumpTo(index: number) {
		replayIndex = index;
	}

	function resetReplay() {
		replayIndex = 0;
	}

	onMount(() => {
		if (isPlaying) startPlayback();
	});

	onDestroy(() => {
		stopPlayback();
	});
</script>

<svelte:head>
	<title>Live Monitoring — EmberRoot</title>
	<meta name="description" content="Historical replay and live-style telemetry animation for EmberRoot sensor nodes." />
</svelte:head>

<PageShell
	title="Live Monitoring"
	subtitle="Historical replay with animated node status across the last 7-day telemetry window"
	breadcrumb={['EmberRoot', 'Operations', 'Live Monitoring']}
>
	<div class="replay-shell">
		<Card padding="md" class="hero-card">
			<div class="hero-card__content">
				<div>
					<div class="hero-card__eyebrow">Mission replay</div>
					<h2 class="hero-card__title">Watch U Minh nodes transition through the latest fire-risk window.</h2>
					<p class="hero-card__text">
						The timeline below animates telemetry snapshots from the mock data model so the operations team can scrub through historical status changes without leaving the dashboard.
					</p>
				</div>
				<div class="hero-card__pill-row">
					<Badge variant="ember" size="sm">7-day replay</Badge>
					<Badge variant="neutral" size="sm">{sensors.length} nodes</Badge>
				</div>
			</div>
		</Card>

		<div class="replay-controls">
			<Card padding="md" class="control-card">
				<div class="control-card__header">
					<div>
						<div class="control-card__eyebrow">Playback</div>
						<div class="control-card__title">{currentTimestamp}</div>
					</div>
					<StatusIndicator status="online" pulse={true} label={isPlaying ? 'Playing' : 'Paused'} />
				</div>
				<div class="control-card__actions">
					<Button variant="primary" size="sm" onclick={togglePlayback}>
						{isPlaying ? 'Pause' : 'Play'}
					</Button>
					<Button variant="secondary" size="sm" onclick={resetReplay}>Reset</Button>
					<Button variant="ghost" size="sm" onclick={() => (playbackSpeed = playbackSpeed === 1 ? 2 : 1)}>Speed ×{playbackSpeed}</Button>
				</div>
				<input class="replay-slider" type="range" min="0" max={replayLength - 1} bind:value={replayIndex} />
			</Card>

			<div class="summary-grid">
				<Card padding="sm" class="summary-card">
					<div class="summary-card__label">Online</div>
					<div class="summary-card__value">{summary.online}</div>
				</Card>
				<Card padding="sm" class="summary-card">
					<div class="summary-card__label">Watch</div>
					<div class="summary-card__value">{summary.warning}</div>
				</Card>
				<Card padding="sm" class="summary-card">
					<div class="summary-card__label">Offline</div>
					<div class="summary-card__value">{summary.offline}</div>
				</Card>
			</div>
		</div>

		<Card padding="md" class="timeline-card">
			<div class="timeline-card__header">
				<div>
					<div class="timeline-card__eyebrow">Risk pulse</div>
					<div class="timeline-card__title">Animated risk score over time</div>
				</div>
				<Badge variant="warning" size="sm">{replayIndex + 1}/{replayLength} steps</Badge>
			</div>
			<div class="timeline-strip" role="list" aria-label="Replay timeline">
				{#each timeline as point, index}
					<button
						type="button"
						class="timeline-strip__cell"
						class:timeline-strip__cell--active={index === replayIndex}
						onclick={() => jumpTo(index)}
						style={`height:${Math.max(8, point)}%`}
						title={`${point}% risk for this replay step`}
						aria-label={`Jump to replay step ${index + 1} with ${point}% risk`}
					></button>
				{/each}
			</div>
		</Card>

		<Card padding="md" class="node-list-card">
			<div class="node-list-card__header">
				<div>
					<div class="node-list-card__eyebrow">Node state snapshot</div>
					<div class="node-list-card__title">Status view at the selected replay step</div>
				</div>
			</div>
			<div class="node-list">
				{#each replaySnapshots as item}
					<div class="node-item">
						<div class="node-item__meta">
							<div class="node-item__name">{item.sensor.name}</div>
							<div class="node-item__id">{item.sensor.id}</div>
						</div>
						<div class="node-item__status" style={`color:${item.tone.color}; border-color:${item.tone.color}44; background:${item.tone.color}1a`}>
							{item.tone.label}
						</div>
						<div class="node-item__metrics">
							<span>Temp {item.temp.toFixed(1)}°C</span>
							<span>CO₂ {Math.round(item.co2)} ppm</span>
							<span>Moisture {item.moisture.toFixed(1)}%</span>
						</div>
					</div>
				{/each}
			</div>
		</Card>
	</div>
</PageShell>

<style>
	.replay-shell {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.hero-card {
		background: linear-gradient(135deg, rgba(240, 120, 64, 0.14), rgba(10, 20, 30, 0.94));
	}

	.hero-card__content {
		display: flex;
		justify-content: space-between;
		gap: 16px;
		align-items: flex-start;
	}

	.hero-card__eyebrow,
	.control-card__eyebrow,
	.timeline-card__eyebrow,
	.node-list-card__eyebrow {
		font-size: 10px;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--text-muted);
		margin-bottom: 6px;
	}

	.hero-card__title,
	.control-card__title,
	.timeline-card__title,
	.node-list-card__title {
		margin: 0;
		font-size: 18px;
		font-weight: 700;
		color: var(--text-primary);
	}

	.hero-card__text {
		margin: 8px 0 0;
		max-width: 720px;
		color: var(--text-secondary);
		line-height: 1.6;
	}

	.hero-card__pill-row {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
	}

	.replay-controls {
		display: grid;
		grid-template-columns: 1.7fr 0.9fr;
		gap: 16px;
	}

	.control-card {
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	.control-card__header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
	}

	.control-card__actions {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
	}

	.replay-slider {
		width: 100%;
		accent-color: var(--ember-400);
	}

	.summary-grid {
		display: grid;
		gap: 12px;
	}

	.summary-card {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.summary-card__label {
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--text-muted);
	}

	.summary-card__value {
		font-size: 22px;
		font-weight: 800;
		font-family: 'JetBrains Mono', monospace;
		color: var(--text-primary);
	}

	.timeline-card,
	.node-list-card {
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	.timeline-card__header,
	.node-list-card__header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
	}

	.timeline-strip {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(6px, 1fr));
		gap: 4px;
		align-items: end;
		min-height: 120px;
	}

	.timeline-strip__cell {
		border: 0;
		border-radius: 999px 999px 4px 4px;
		background: linear-gradient(180deg, rgba(240, 120, 64, 0.95), rgba(240, 120, 64, 0.18));
		min-height: 8px;
		cursor: pointer;
		transition: transform 0.16s ease, filter 0.16s ease;
	}

	.timeline-strip__cell:hover {
		transform: translateY(-1px);
		filter: brightness(1.08);
	}

	.timeline-strip__cell--active {
		outline: 2px solid rgba(255, 255, 255, 0.28);
		outline-offset: 2px;
	}

	.node-list {
		display: grid;
		gap: 10px;
	}

	.node-item {
		display: grid;
		grid-template-columns: 1.35fr auto 1fr;
		gap: 12px;
		align-items: center;
		padding: 12px 14px;
		border: 1px solid var(--surface-border);
		border-radius: 14px;
		background: var(--surface-raised);
	}

	.node-item__name {
		font-weight: 700;
		color: var(--text-primary);
	}

	.node-item__id {
		font-size: 11px;
		color: var(--text-muted);
	}

	.node-item__status {
		justify-self: start;
		padding: 4px 10px;
		border: 1px solid;
		border-radius: 999px;
		font-size: 10px;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.node-item__metrics {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		justify-content: flex-end;
		font-size: 12px;
		color: var(--text-secondary);
	}

	@media (max-width: 900px) {
		.replay-controls {
			grid-template-columns: 1fr;
		}

		.node-item {
			grid-template-columns: 1fr;
		}

		.node-item__metrics {
			justify-content: flex-start;
		}
	}
</style>
