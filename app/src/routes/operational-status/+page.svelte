<script lang="ts">
	import { onMount } from 'svelte';
	import PageShell from '$lib/components/PageShell.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import MetricCard from '$lib/components/ui/MetricCard.svelte';
	import ProgressBar from '$lib/components/ui/ProgressBar.svelte';
	import { api, type ApiAlert, type ApiNode, type ApiRegion } from '$lib/api';
	import { selectedRegionId } from '$lib/stores/regionContext';

	const resolvedRegionId = $derived($selectedRegionId === 'all' ? null : $selectedRegionId);
	let regions = $state<ApiRegion[]>([]);
	let nodes = $state<ApiNode[]>([]);
	let alerts = $state<ApiAlert[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);

	const region = $derived(resolvedRegionId ? regions.find((item) => item.id === resolvedRegionId) ?? null : null);
	const scopedNodes = $derived(resolvedRegionId ? nodes.filter((node) => node.region_id === resolvedRegionId) : nodes);
	const scopedAlerts = $derived(resolvedRegionId ? alerts.filter((alert) => alert.region_id === resolvedRegionId) : alerts);
	const summary = $derived.by(() => ({
		totalSensors: scopedNodes.length,
		onlineSensors: scopedNodes.filter((node) => node.status === 'online').length,
		warningSensors: scopedNodes.filter((node) => node.status === 'warning').length,
		offlineSensors: scopedNodes.filter((node) => node.status === 'offline').length,
		criticalSensors: scopedNodes.filter((node) => node.status === 'critical').length,
		totalAlerts: scopedAlerts.length,
		activeAlerts: scopedAlerts.filter((alert) => alert.state === 'open').length,
		criticalAlerts: scopedAlerts.filter((alert) => alert.level === 'warning').length,
		totalRegions: regions.length,
		highRiskRegions: regions.length
	}));
	const readinessScore = $derived(Math.round((summary.onlineSensors / Math.max(summary.totalSensors, 1)) * 100));
	const commandCoverage = $derived(Math.max(60, Math.min(98, 92 - summary.activeAlerts * 3)));
	const communicationsHealth = $derived(Math.max(72, Math.min(100, 100 - summary.criticalAlerts * 4)));
	const regionalWatchlist = $derived.by(() => {
		const items = resolvedRegionId ? regions.filter((item) => item.id === resolvedRegionId) : regions;
		return items.slice().sort((a, b) => b.id.localeCompare(a.id));
	});
	const activeAlerts = $derived(scopedAlerts.filter((alert) => alert.state === 'open').slice(0, 5));

	async function loadData() {
		try {
			loading = true;
			error = null;
			const [regionData, nodeData, alertData] = await Promise.all([
				api.getRegions(),
				api.getNodes(),
				api.getAlerts({ limit: 200 })
			]);
			regions = regionData;
			nodes = nodeData;
			alerts = alertData;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load operational status';
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		void loadData();
		const poll = window.setInterval(() => void loadData(), 30_000);
		return () => window.clearInterval(poll);
	});

	function statusVariant(level: 'online' | 'warning' | 'critical' | 'offline'): 'critical' | 'warning' | 'online' | 'neutral' {
		if (level === 'critical' || level === 'offline') return 'critical';
		if (level === 'warning') return 'warning';
		return 'online';
	}

	const systemStatus = [
		{
			name: 'Sensor Mesh',
			status: 'online' as const,
			percent: readinessScore,
			caption: `${summary.onlineSensors}/${summary.totalSensors} nodes online`
		},
		{
			name: 'Field Communications',
			status: summary.activeAlerts > 0 ? 'warning' as const : 'online' as const,
			percent: communicationsHealth,
			caption: `${summary.activeAlerts} active alerts`
		},
		{
			name: 'Command Coverage',
			status: commandCoverage > 85 ? 'online' as const : 'warning' as const,
			percent: commandCoverage,
			caption: `${summary.criticalAlerts} critical alerts`
		}
	];
</script>

<svelte:head>
	<title>Operational Status — EmberRoot</title>
	<meta name="description" content="Live operational status of all EmberRoot systems and units." />
</svelte:head>

<PageShell
	title="Operational Status"
	subtitle="Real-time status of all deployed units and subsystems"
	breadcrumb={['EmberRoot', 'Operations', 'Operational Status']}
>
	<div class="ops-page">
		<div class="metrics-grid">
			<MetricCard title="Network Readiness" value={`${readinessScore}%`} unit="readiness" trend={readinessScore >= 85 ? 'up' : 'neutral'} trendValue={`${summary.onlineSensors} nodes live`} />
			<MetricCard title="Active Alerts" value={summary.activeAlerts} unit="open" trend="down" trendValue={`${summary.criticalAlerts} critical`} />
			<MetricCard title="Active Incidents" value={summary.activeIncidents} unit="deployments" trend="neutral" trendValue={`${summary.containedIncidents} contained`} />
			<MetricCard title="High-Risk Regions" value={summary.highRiskRegions} unit="regions" trend="up" trendValue="watchlist active" />
		</div>

		<div class="hero-grid">
			<Card variant="raised" padding="lg" class="hero-card">
				<div class="hero-header">
					<div>
						<div class="hero-eyebrow">Active context</div>
						<h3 class="hero-title">{region ? region.name : 'Global Command'}</h3>
					</div>
					<Badge variant="neutral">{region ? region.code : 'ALL'}</Badge>
				</div>
				<p class="hero-copy">
					{region ? `${region.sensorCount} sensors • ${region.activeIncidents} active incidents` : 'Cross-region command posture'}
				</p>
			</Card>
			<Card variant="raised" padding="lg" class="hero-card">
				<div class="hero-header">
					<div>
						<div class="hero-eyebrow">Mission posture</div>
						<h3 class="hero-title">Operations are stable with focused escalation pressure.</h3>
					</div>
					<Badge variant="online">All-clear posture</Badge>
				</div>
				<p class="hero-copy">
					The mesh is reporting at {readinessScore}% readiness, with {summary.activeAlerts} active alerts and {summary.activeIncidents} active incidents under command monitoring.
				</p>
				<div class="hero-bars">
					<div class="hero-bar-block">
						<span class="hero-bar-label">Coverage</span>
						<ProgressBar value={commandCoverage} max={100} variant="online" size="md" showValue />
					</div>
					<div class="hero-bar-block">
						<span class="hero-bar-label">Comms uptime</span>
						<ProgressBar value={communicationsHealth} max={100} variant="ember" size="md" showValue />
					</div>
				</div>
			</Card>

			<Card variant="glass" padding="lg" class="hero-card">
				<div class="section-title">System status</div>
				<div class="system-list">
					{#each systemStatus as system}
						<div class="system-item">
							<div class="system-item__top">
								<div>
									<div class="system-name">{system.name}</div>
									<div class="system-caption">{system.caption}</div>
								</div>
								<Badge variant={statusVariant(system.status)}>{system.status}</Badge>
							</div>
							<ProgressBar value={system.percent} max={100} variant={system.status === 'online' ? 'online' : system.status === 'warning' ? 'warning' : 'critical'} size="sm" showValue />
						</div>
					{/each}
				</div>
			</Card>
		</div>

		<div class="content-grid">
			<Card variant="default" padding="lg" class="panel-card">
				<div class="section-title">Regional watchlist</div>
				<div class="watchlist-list">
					{#each regions as region}
						<div class="watchlist-item">
							<div class="watchlist-item__main">
								<div class="watchlist-title">{region.name}</div>
								<div class="watchlist-meta">{region.code} · {region.sensorCount} sensors · {region.activeIncidents} active incidents</div>
							</div>
							<div class="watchlist-item__side">
								<Badge variant={severityVariant(region.riskLevel)}>{region.riskLevel}</Badge>
							</div>
						</div>
					{/each}
				</div>
			</Card>

			<Card variant="default" padding="lg" class="panel-card">
				<div class="section-title">Priority alerts and incidents</div>
				<div class="priority-stack">
					{#each activeAlerts as alert}
						<div class="priority-item">
							<div class="priority-item__title">{alertTitle(alert)}</div>
							<div class="priority-item__meta">{alert.severity.toUpperCase()} · {timeAgo(alert.triggeredAt)}</div>
						</div>
					{/each}
					{#each activeIncidents as incident}
						<div class="priority-item">
							<div class="priority-item__title">{incident.title}</div>
							<div class="priority-item__meta">{incidentLabel(incident)} · {timeAgo(incident.updatedAt)}</div>
						</div>
					{/each}
				</div>
			</Card>
		</div>
	</div>
</PageShell>

<style>
	.ops-page {
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
		grid-template-columns: 1.3fr 0.9fr;
		gap: 16px;
	}

	.hero-card {
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	.hero-header {
		display: flex;
		justify-content: space-between;
		align-items: start;
		gap: 12px;
	}

	.hero-eyebrow {
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

	.hero-bars {
		display: grid;
		gap: 10px;
	}

	.hero-bar-block {
		display: grid;
		gap: 6px;
	}

	.hero-bar-label {
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--text-muted);
	}

	.section-title {
		font-size: 12px;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--text-secondary);
		margin-bottom: 10px;
	}

	.system-list {
		display: grid;
		gap: 12px;
	}

	.system-item {
		display: grid;
		gap: 8px;
		padding: 10px 12px;
		border: 1px solid var(--surface-border);
		border-radius: 10px;
		background: rgba(255, 255, 255, 0.03);
	}

	.system-item__top {
		display: flex;
		justify-content: space-between;
		align-items: start;
		gap: 8px;
	}

	.system-name {
		font-size: 13px;
		font-weight: 600;
		color: var(--text-primary);
	}

	.system-caption {
		font-size: 11px;
		color: var(--text-muted);
		margin-top: 2px;
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

	.watchlist-list,
	.priority-stack {
		display: grid;
		gap: 10px;
	}

	.watchlist-item,
	.priority-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 10px;
		padding: 10px 12px;
		border: 1px solid var(--surface-border);
		border-radius: 10px;
		background: var(--surface-raised);
	}

	.watchlist-item__main,
	.priority-item__title {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.watchlist-title {
		font-size: 13px;
		font-weight: 600;
		color: var(--text-primary);
	}

	.watchlist-meta,
	.priority-item__meta {
		font-size: 11px;
		color: var(--text-muted);
	}

	@media (max-width: 960px) {
		.hero-grid,
		.content-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
