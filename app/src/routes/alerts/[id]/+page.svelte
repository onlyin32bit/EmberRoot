<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { api, type ApiAlert, type ApiNode, type ApiTelemetry } from '$lib/api';
	import PageShell from '$lib/components/PageShell.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { LineAreaChart } from '$lib/components/charts';
	import { goto } from '$app/navigation';
	
	const id = $derived(page.params.id as string);
	
	let alert = $state<ApiAlert | null>(null);
	let node = $state<ApiNode | null>(null);
	let telemetry = $state<ApiTelemetry[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);

	const chartData = $derived.by(() => {
		if (telemetry.length === 0) {
			return { co: [], co2: [], temp: [], moisture: [] };
		}

		// Sort by timestamp ascending for chart display
		const sorted = [...telemetry].reverse();

		return {
			co: sorted.map(t => ({ 
				timestamp: new Date(t.received_at).getTime(), 
				value: t.co ?? 0 
			})),
			co2: sorted.map(t => ({ 
				timestamp: new Date(t.received_at).getTime(), 
				value: t.co2 ?? 0 
			})),
			temp: sorted.map(t => ({ 
				timestamp: new Date(t.received_at).getTime(), 
				value: t.temp_5 ?? 0 
			})),
			moisture: sorted.map(t => ({ 
				timestamp: new Date(t.received_at).getTime(), 
				value: t.moisture ?? 0 
			}))
		};
	});

	const gasChartSeries = $derived([
		{ id: 'co', label: 'CO (ppm)', data: chartData.co, color: 'var(--status-warning)' },
		{ id: 'co2', label: 'CO2 (ppm)', data: chartData.co2, color: 'var(--status-critical)', filled: false }
	]);

	const tempChartSeries = $derived([
		{ id: 'temp', label: 'Temperature (°C)', data: chartData.temp, color: 'var(--ember-400)' }
	]);

	function getLevelBadgeVariant(level: string) {
		switch (level) {
			case 'warning': return 'critical';
			case 'suspicious': return 'warning';
			case 'monitoring': return 'online';
			default: return 'neutral';
		}
	}

	function getStateBadgeVariant(state: string) {
		switch (state) {
			case 'open': return 'warning';
			case 'acknowledged': return 'neutral';
			case 'resolved': return 'online';
			default: return 'neutral';
		}
	}

	async function loadAlertDetails() {
		try {
			loading = true;
			const allAlerts = await api.getAlerts();
			const foundAlert = allAlerts.find(a => a.id === id);
			
			if (!foundAlert) {
				error = 'Alert not found';
				return;
			}

			alert = foundAlert;

			// Load node details
			const nodeData = await api.getNode(foundAlert.node_id);
			node = nodeData;

			// Load recent telemetry for this node
			const telemetryData = await api.getTelemetry(foundAlert.node_id, { limit: 100 });
			telemetry = telemetryData;

			error = null;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load alert details';
		} finally {
			loading = false;
		}
	}

	async function acknowledgeAlert() {
		if (!alert) return;
		try {
			await api.acknowledgeAlert(alert.id);
			await loadAlertDetails();
		} catch (err) {
			console.error('Failed to acknowledge alert:', err);
		}
	}

	onMount(() => {
		void loadAlertDetails();
	});
</script>

<svelte:head>
	<title>Alert: {id} — EmberRoot</title>
</svelte:head>

<PageShell
	title={alert ? `Alert: ${alert.level.toUpperCase()}` : 'Alert'}
	subtitle={alert?.node_name || alert?.node_id || 'Loading...'}
	breadcrumb={['EmberRoot', 'Alerts', id]}
>
	{#if error}
		<Card padding="lg" class="error-card">
			<h3>Error</h3>
			<p>{error}</p>
			<Button variant="secondary" onclick={() => void loadAlertDetails()}>Retry</Button>
		</Card>
	{:else if loading}
		<Card padding="lg">
			<p>Loading alert details...</p>
		</Card>
	{:else if !alert}
		<Card padding="lg" class="error-card">
			<h3>Alert not found</h3>
			<p>No alert with ID {id} was found.</p>
			<Button variant="secondary" onclick={() => void goto('/alerts')}>Back to Alerts</Button>
		</Card>
	{:else}
		<div class="details-grid">
			<div class="main-column">
				<!-- Header Card -->
				<Card padding="lg" class="header-card">
					<div class="header-top">
						<Badge variant={getLevelBadgeVariant(alert.level)}>{alert.level}</Badge>
						<Badge variant={getStateBadgeVariant(alert.state)}>{alert.state}</Badge>
					</div>
					<h2 class="title">Alert #{alert.id}</h2>
					<p class="description">{alert.explanation}</p>
					
					<div class="meta-grid">
						<div class="meta-item">
							<span class="meta-label">Created</span>
							<span class="meta-value">{new Date(alert.created_at).toLocaleString()}</span>
						</div>
						<div class="meta-item">
							<span class="meta-label">Level</span>
							<span class="meta-value">{alert.level}</span>
						</div>
						<div class="meta-item">
							<span class="meta-label">State</span>
							<span class="meta-value">{alert.state}</span>
						</div>
						{#if alert.acknowledged_at}
							<div class="meta-item">
								<span class="meta-label">Acknowledged</span>
								<span class="meta-value">{new Date(alert.acknowledged_at).toLocaleString()}</span>
							</div>
						{/if}
					</div>
				</Card>
				
				<!-- Telemetry Charts -->
				{#if telemetry.length > 0}
					<Card padding="lg" class="chart-card">
						<h3>Telemetry History</h3>
						<p class="subtitle">Last 100 readings from node {alert.node_id}</p>
						
						<div class="charts-container">
							<div class="chart-wrapper">
								<h4>Temperature</h4>
								<LineAreaChart series={tempChartSeries} unit="°C" height={220} />
							</div>
							<div class="chart-wrapper">
								<h4>Gas Levels</h4>
								<LineAreaChart series={gasChartSeries} unit="ppm" height={220} />
							</div>
						</div>
					</Card>

					<!-- Summary Statistics -->
					<Card padding="lg" class="stats-card">
						<h3>Telemetry Summary</h3>
						<div class="stats-grid">
							{#if telemetry.some(t => t.co !== null)}
								<div class="stat">
									<div class="stat-label">Avg CO</div>
									<div class="stat-value">{(telemetry.reduce((s, t) => s + (t.co ?? 0), 0) / telemetry.filter(t => t.co !== null).length).toFixed(2)}</div>
									<div class="stat-unit">ppm</div>
								</div>
							{/if}
							{#if telemetry.some(t => t.co2 !== null)}
								<div class="stat">
									<div class="stat-label">Avg CO2</div>
									<div class="stat-value">{(telemetry.reduce((s, t) => s + (t.co2 ?? 0), 0) / telemetry.filter(t => t.co2 !== null).length).toFixed(0)}</div>
									<div class="stat-unit">ppm</div>
								</div>
							{/if}
							{#if telemetry.some(t => t.temp_5 !== null)}
								<div class="stat">
									<div class="stat-label">Avg Temp</div>
									<div class="stat-value">{(telemetry.reduce((s, t) => s + (t.temp_5 ?? 0), 0) / telemetry.filter(t => t.temp_5 !== null).length).toFixed(1)}</div>
									<div class="stat-unit">°C</div>
								</div>
							{/if}
							{#if telemetry.some(t => t.moisture !== null)}
								<div class="stat">
									<div class="stat-label">Avg Moisture</div>
									<div class="stat-value">{(telemetry.reduce((s, t) => s + (t.moisture ?? 0), 0) / telemetry.filter(t => t.moisture !== null).length).toFixed(0)}</div>
									<div class="stat-unit">%</div>
								</div>
							{/if}
						</div>
					</Card>
				{/if}
			</div>

			<div class="side-column">
				<!-- Quick Actions -->
				<Card padding="md" class="actions-card">
					<h3>Actions</h3>
					<div class="action-buttons">
						{#if alert.state === 'open'}
							<Button 
								variant="primary" 
								class="w-full"
								onclick={() => void acknowledgeAlert()}
							>
								Acknowledge Alert
							</Button>
						{:else}
							<Button 
								variant="secondary" 
								class="w-full"
								disabled
							>
								{alert.state === 'acknowledged' ? 'Alert Acknowledged' : 'Alert Resolved'}
							</Button>
						{/if}
						<Button variant="ghost" class="w-full" onclick={() => void goto('/alerts')}>
							Back to Alerts
						</Button>
					</div>
				</Card>
				
				<!-- Node Info -->
				{#if node}
					<Card padding="md" class="node-info-card">
						<h3>Node Details</h3>
						<div class="meta-grid vertical">
							<div class="meta-item">
								<span class="meta-label">Node ID</span>
								<span class="meta-value">{node.id}</span>
							</div>
							<div class="meta-item">
								<span class="meta-label">Node Type</span>
								<span class="meta-value">{node.node_type}</span>
							</div>
							<div class="meta-item">
								<span class="meta-label">Status</span>
								<span class="meta-value">
									<Badge variant={node.status === 'online' ? 'online' : node.status === 'critical' ? 'critical' : 'warning'}>
										{node.status}
									</Badge>
								</span>
							</div>
							{#if node.battery_pct !== null}
								<div class="meta-item">
									<span class="meta-label">Battery</span>
									<span class="meta-value">{node.battery_pct}%</span>
								</div>
							{/if}
							{#if node.last_seen_at}
								<div class="meta-item">
									<span class="meta-label">Last Seen</span>
									<span class="meta-value">{new Date(node.last_seen_at).toLocaleString()}</span>
								</div>
							{/if}
						</div>
					</Card>
				{/if}
			</div>
		</div>
	{/if}
</PageShell>

<style>
	.details-grid {
		display: grid;
		grid-template-columns: 1fr 300px;
		gap: 20px;
		padding: 24px 28px;
	}
	@media (max-width: 900px) {
		.details-grid {
			grid-template-columns: 1fr;
		}
	}
	
	.main-column, .side-column {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}
	
	.header-top {
		display: flex;
		gap: 8px;
		margin-bottom: 12px;
	}
	
	.title {
		font-size: 24px;
		font-weight: 700;
		color: var(--text-primary);
		margin: 0 0 12px 0;
	}
	
	.description {
		font-size: 14px;
		color: var(--text-secondary);
		line-height: 1.6;
		margin-bottom: 24px;
	}
	
	.meta-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
		gap: 16px;
		padding-top: 16px;
		border-top: 1px solid var(--surface-border);
	}
	
	.meta-grid.vertical {
		grid-template-columns: 1fr;
		padding-top: 0;
		border-top: none;
		gap: 12px;
	}

	.meta-item {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.meta-label {
		font-size: 10px;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--text-muted);
	}

	.meta-value {
		font-size: 12px;
		color: var(--text-primary);
	}

	.chart-card {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.chart-card h3 {
		margin: 0;
		font-size: 14px;
	}

	.subtitle {
		font-size: 12px;
		color: var(--text-muted);
		margin: 0 0 12px 0;
	}

	.charts-container {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: 16px;
	}

	.chart-wrapper {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.chart-wrapper h4 {
		margin: 0;
		font-size: 12px;
		color: var(--text-secondary);
	}

	.stats-card {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.stats-card h3 {
		margin: 0;
		font-size: 14px;
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
		gap: 12px;
	}

	.stat {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4px;
		padding: 12px;
		border-radius: 8px;
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid rgba(255, 255, 255, 0.05);
	}

	.stat-label {
		font-size: 10px;
		text-transform: uppercase;
		color: var(--text-muted);
		letter-spacing: 0.05em;
	}

	.stat-value {
		font-size: 18px;
		font-weight: 700;
		color: var(--text-primary);
	}

	.stat-unit {
		font-size: 10px;
		color: var(--text-secondary);
	}

	.action-buttons {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.w-full {
		width: 100%;
	}

	.error-card {
		border-color: var(--status-critical);
		background: color-mix(in srgb, var(--status-critical) 5%, transparent);
	}

	.error-card h3 {
		color: var(--status-critical);
		margin-top: 0;
	}

	.node-info-card h3 {
		margin: 0 0 12px 0;
		font-size: 12px;
	}
</style>
