<script lang="ts">
	import PageShell from '$lib/components/PageShell.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import MetricCard from '$lib/components/ui/MetricCard.svelte';
	import ProgressBar from '$lib/components/ui/ProgressBar.svelte';
	import { mockService } from '$lib/mock';

	const regions = mockService.getRegions();
	const activeIncidents = mockService.getActiveIncidents();
	const activeAlerts = mockService.getActiveAlerts();

	const allocations = [
		{ id: 'alpha', label: 'Unit Alpha', region: 'R-01', load: 82, status: 'Deploying', eta: '12 min', focus: 'Containment line' },
		{ id: 'bravo', label: 'Unit Bravo', region: 'R-03', load: 64, status: 'Holding', eta: '20 min', focus: 'Sensor relay' },
		{ id: 'charlie', label: 'Unit Charlie', region: 'R-06', load: 91, status: 'Hot', eta: '6 min', focus: 'Evacuation support' }
	];

	const workstreams = [
		{ title: 'Priority Firebreak', owner: 'Ops Command', progress: 74, note: 'Three crews on the western ridge' },
		{ title: 'Sensor Mesh Refresh', owner: 'Field Techs', progress: 46, note: 'Battery swap window in progress' },
		{ title: 'Medical Support Escort', owner: 'Med Team', progress: 88, note: 'Route clearance nearly complete' }
	];

	const queueItems = [
		{ label: 'Reassign drone coverage', detail: 'R-04 · 2 assets required' },
		{ label: 'Stabilize comms uplink', detail: 'R-02 · Backup relay ready' },
		{ label: 'Dispatch support convoy', detail: 'R-06 · ETA 9 min' }
	];
</script>

<svelte:head>
	<title>Resource Logic — EmberRoot</title>
	<meta name="description" content="Resource allocation logic and scheduling for EmberRoot robotic systems." />
</svelte:head>

<PageShell
	title="Resource Logic"
	subtitle="Resource allocation, scheduling, and task distribution"
	breadcrumb={['EmberRoot', 'Operations', 'Resource Logic']}
>
	<div class="resource-page">
		<div class="metrics-grid">
			<MetricCard title="Regional Coverage" value={regions.length} unit="zones" trend="up" trendValue="3 live dispatches" />
			<MetricCard title="Active Incidents" value={activeIncidents.length} unit="units" trend="neutral" trendValue="2 in surge" />
			<MetricCard title="Open Alerts" value={activeAlerts.length} unit="alerts" trend="down" trendValue="1 critical" />
			<MetricCard title="Task Queue" value={queueItems.length} unit="ready" trend="neutral" trendValue="balanced" />
		</div>

		<div class="hero-grid">
			<Card variant="raised" padding="lg" class="hero-card">
				<div class="hero-card__header">
					<div>
						<div class="eyebrow">Dynamic allocation posture</div>
						<h3 class="hero-title">Operational resources are balanced across the current incident footprint.</h3>
					</div>
					<Badge variant="online">Adaptive</Badge>
				</div>
				<p class="hero-copy">
					The current dispatch model prioritizes containment, relay stability, and escort throughput with a moderate safety buffer for emerging hotspots.
				</p>
				<div class="hero-metrics">
					<div class="pill">Load balance: 78%</div>
					<div class="pill">Reserve margin: 14%</div>
					<div class="pill">Avg. response: 9 min</div>
				</div>
			</Card>

			<Card variant="glass" padding="lg" class="hero-card">
				<div class="section-title">Resource queue</div>
				<div class="queue-list">
					{#each queueItems as item}
						<div class="queue-item">
							<div class="queue-item__title">{item.label}</div>
							<div class="queue-item__detail">{item.detail}</div>
						</div>
					{/each}
				</div>
			</Card>
		</div>

		<div class="content-grid">
			<Card variant="default" padding="lg" class="panel-card">
				<div class="section-title">Unit allocation</div>
				<div class="allocation-list">
					{#each allocations as unit}
						<div class="allocation-item">
							<div class="allocation-item__header">
								<div>
									<div class="allocation-title">{unit.label}</div>
									<div class="allocation-meta">{unit.region} · {unit.focus}</div>
								</div>
								<Badge variant={unit.status === 'Hot' ? 'critical' : unit.status === 'Deploying' ? 'warning' : 'online'}>{unit.status}</Badge>
							</div>
							<ProgressBar value={unit.load} max={100} variant={unit.load > 85 ? 'critical' : unit.load > 70 ? 'warning' : 'online'} size="sm" showValue />
							<div class="allocation-footer">
								<span class="allocation-footer__label">ETA</span>
								<span class="allocation-footer__value">{unit.eta}</span>
							</div>
						</div>
					{/each}
				</div>
			</Card>

			<Card variant="default" padding="lg" class="panel-card">
				<div class="section-title">Workstream progress</div>
				<div class="workstream-list">
					{#each workstreams as stream}
						<div class="workstream-item">
							<div class="workstream-item__top">
								<div class="workstream-title">{stream.title}</div>
								<div class="workstream-owner">{stream.owner}</div>
							</div>
							<ProgressBar value={stream.progress} max={100} variant={stream.progress > 80 ? 'online' : stream.progress > 55 ? 'warning' : 'ember'} size="sm" showValue />
							<div class="workstream-note">{stream.note}</div>
						</div>
					{/each}
				</div>
			</Card>
		</div>
	</div>
</PageShell>

<style>
	.resource-page {
		display: flex;
		flex-direction: column;
		gap: 18px;
	}

	.metrics-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
		gap: 16px;
	}

	.hero-grid {
		display: grid;
		grid-template-columns: 1.2fr 0.8fr;
		gap: 16px;
	}

	.hero-card {
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	.hero-card__header {
		display: flex;
		justify-content: space-between;
		align-items: start;
		gap: 12px;
	}

	.eyebrow {
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--text-muted);
		margin-bottom: 6px;
	}

	.hero-title {
		margin: 0;
		font-size: 18px;
		font-weight: 700;
		color: var(--text-primary);
	}

	.hero-copy {
		margin: 0;
		font-size: 13px;
		line-height: 1.6;
		color: var(--text-secondary);
	}

	.hero-metrics {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	.pill {
		padding: 6px 10px;
		border-radius: 999px;
		background: rgba(255,255,255,0.05);
		border: 1px solid var(--surface-border);
		font-size: 11px;
		font-weight: 600;
		color: var(--text-secondary);
	}

	.section-title {
		font-size: 12px;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--text-secondary);
		margin-bottom: 10px;
	}

	.queue-list,
	.allocation-list,
	.workstream-list {
		display: grid;
		gap: 10px;
	}

	.queue-item,
	.allocation-item,
	.workstream-item {
		padding: 10px 12px;
		border: 1px solid var(--surface-border);
		border-radius: 10px;
		background: var(--surface-raised);
	}

	.queue-item__title,
	.allocation-title,
	.workstream-title {
		font-size: 13px;
		font-weight: 600;
		color: var(--text-primary);
	}

	.queue-item__detail,
	.allocation-meta,
	.workstream-owner,
	.workstream-note {
		font-size: 11px;
		color: var(--text-muted);
		margin-top: 2px;
	}

	.allocation-item__header {
		display: flex;
		justify-content: space-between;
		align-items: start;
		gap: 8px;
		margin-bottom: 8px;
	}

	.allocation-footer {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-top: 8px;
		font-size: 11px;
		color: var(--text-muted);
	}

	.allocation-footer__value {
		font-weight: 600;
		color: var(--text-primary);
	}

	.content-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 16px;
	}

	.panel-card {
		display: flex;
		flex-direction: column;
	}

	@media (max-width: 960px) {
		.hero-grid,
		.content-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
