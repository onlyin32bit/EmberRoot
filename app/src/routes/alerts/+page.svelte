<script lang="ts">
	import { onMount } from 'svelte';
	import { api, type ApiAlert } from '$lib/api';
	import { selectedRegionId } from '$lib/stores/regionContext';
	import PageShell from '$lib/components/PageShell.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import SearchBar from '$lib/components/ui/SearchBar.svelte';
	import { goto } from '$app/navigation';

	let allAlerts = $state<ApiAlert[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let searchQuery = $state('');
	let levelFilter = $state<'all' | 'warning' | 'suspicious' | 'monitoring'>('all');
	let stateFilter = $state<'all' | 'open' | 'acknowledged' | 'resolved'>('all');

	const filteredAlerts = $derived.by(() => {
		let results = allAlerts;

		// Filter by level
		if (levelFilter !== 'all') {
			results = results.filter(a => a.level === levelFilter);
		}

		// Filter by state
		if (stateFilter !== 'all') {
			results = results.filter(a => a.state === stateFilter);
		}

		// Filter by search query
		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase();
			results = results.filter(a =>
				a.id.toLowerCase().includes(q) ||
				a.node_id.toLowerCase().includes(q) ||
				a.node_name?.toLowerCase().includes(q) ||
				a.explanation.toLowerCase().includes(q)
			);
		}

		return results;
	});

	const levelCounts = $derived.by(() => ({
		warning: allAlerts.filter(a => a.level === 'warning').length,
		suspicious: allAlerts.filter(a => a.level === 'suspicious').length,
		monitoring: allAlerts.filter(a => a.level === 'monitoring').length,
	}));

	const stateCounts = $derived.by(() => ({
		open: allAlerts.filter(a => a.state === 'open').length,
		acknowledged: allAlerts.filter(a => a.state === 'acknowledged').length,
		resolved: allAlerts.filter(a => a.state === 'resolved').length,
	}));

	async function loadAlerts() {
		try {
			loading = true;
			allAlerts = await api.getAlerts();
			error = null;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load alerts';
		} finally {
			loading = false;
		}
	}

	async function acknowledgeAlert(alertId: string) {
		try {
			await api.acknowledgeAlert(alertId);
			await loadAlerts();
		} catch (err) {
			console.error('Failed to acknowledge alert:', err);
		}
	}

	function getLevelBadgeVariant(level: string) {
		switch (level) {
			case 'warning': return 'critical';
			case 'suspicious': return 'warning';
			case 'monitoring': return 'online';
			default: return 'neutral';
		}
	}

	function formatAlertLevel(level: string) {
		switch (level) {
			case 'warning': return 'Critical';
			case 'suspicious': return 'Suspicious';
			case 'monitoring': return 'Monitoring';
			default: return 'Unknown';
		}
	}

	function formatAlertState(state: string) {
		switch (state) {
			case 'open': return 'Open';
			case 'acknowledged': return 'Acknowledged';
			case 'resolved': return 'Resolved';
			default: return 'Unknown';
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

	onMount(() => {
		void loadAlerts();
		const poll = window.setInterval(() => void loadAlerts(), 30_000);
		return () => window.clearInterval(poll);
	});
</script>

<svelte:head>
	<title>Alerts — EmberRoot</title>
	<meta name="description" content="EmberRoot alerts — view, filter, and manage active alerts from your monitoring network." />
</svelte:head>

<PageShell title="Alerts" subtitle="Monitor and manage alerts across your network">
	<div class="alerts-page">
		{#if error}
			<Card padding="lg" class="error-card">
				<h3>Error Loading Alerts</h3>
				<p>{error}</p>
				<Button variant="primary" onclick={() => void loadAlerts()}>Retry</Button>
			</Card>
		{/if}

		<div class="filters-section">
			<SearchBar placeholder="Search by node ID, alert ID, or message..." bind:value={searchQuery} />

			<div class="filter-controls">
				<div class="filter-group">
					<span class="filter-group__label">Severity</span>
					<div class="filter-buttons">
						<button class:active={levelFilter === 'all'} onclick={() => levelFilter = 'all'}>
							All ({allAlerts.length})
						</button>
						<button class:active={levelFilter === 'warning'} onclick={() => levelFilter = 'warning'}>
							Critical ({levelCounts.warning})
						</button>
						<button class:active={levelFilter === 'suspicious'} onclick={() => levelFilter = 'suspicious'}>
							Suspicious ({levelCounts.suspicious})
						</button>
						<button class:active={levelFilter === 'monitoring'} onclick={() => levelFilter = 'monitoring'}>
							Monitoring ({levelCounts.monitoring})
						</button>
					</div>
				</div>

				<div class="filter-group">
					<span class="filter-group__label">Status</span>
					<div class="filter-buttons">
						<button class:active={stateFilter === 'all'} onclick={() => stateFilter = 'all'}>
							All
						</button>
						<button class:active={stateFilter === 'open'} onclick={() => stateFilter = 'open'}>
							Open ({stateCounts.open})
						</button>
						<button class:active={stateFilter === 'acknowledged'} onclick={() => stateFilter = 'acknowledged'}>
							Acknowledged ({stateCounts.acknowledged})
						</button>
						<button class:active={stateFilter === 'resolved'} onclick={() => stateFilter = 'resolved'}>
							Resolved ({stateCounts.resolved})
						</button>
					</div>
				</div>
			</div>
		</div>

		<div class="alerts-section">
			{#if loading}
				<Card padding="lg">
					<p>Loading alert feed...</p>
				</Card>
			{:else if filteredAlerts.length === 0}
				<Card padding="lg" class="empty-state">
					<p>No alerts match the current filters.</p>
				</Card>
			{:else}
				<div class="alerts-list">
					{#each filteredAlerts as alert (alert.id)}
						<Card
							padding="md"
							class={`alert-card${alert.level === 'warning' ? ' alert-warning' : ''}${alert.level === 'suspicious' ? ' alert-suspicious' : ''}`}
						>
							<div class="alert-card-header">
								<div class="alert-card-left">
									<Badge variant={getLevelBadgeVariant(alert.level)}>{formatAlertLevel(alert.level)}</Badge>
									<Badge variant={getStateBadgeVariant(alert.state)}>{formatAlertState(alert.state)}</Badge>
								</div>
								<div class="alert-card-time">
									{new Date(alert.created_at).toLocaleString()}
								</div>
							</div>

							<div class="alert-card-content">
								<div class="alert-node">
									<strong>{alert.node_name || alert.node_id}</strong>
									<code>{alert.node_id}</code>
								</div>
								<p class="alert-explanation">{alert.explanation}</p>
							</div>

							<div class="alert-card-footer">
								<div class="alert-meta">
									<span class="meta-item">
										<span class="label">Alert ID:</span>
										<code>{alert.id}</code>
									</span>
									{#if alert.acknowledged_at}
										<span class="meta-item">
											<span class="label">Acknowledged:</span>
											{new Date(alert.acknowledged_at).toLocaleString()}
										</span>
									{/if}
								</div>

								<div class="alert-actions">
									{#if alert.state === 'open'}
										<Button 
											variant="secondary" 
											size="sm"
											onclick={() => void acknowledgeAlert(alert.id)}
										>
											Acknowledge
										</Button>
									{/if}
									<Button 
										variant="ghost" 
											size="sm"
										onclick={() => goto(`/alerts/${alert.id}`)}
									>
										View Details
									</Button>
								</div>
							</div>
						</Card>
					{/each}
				</div>
			{/if}
		</div>
	</div>
</PageShell>

<style>
	.alerts-page {
		display: flex;
		flex-direction: column;
		gap: 24px;
		padding: 24px 28px;
	}

	.filters-section {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.filter-controls {
		display: flex;
		flex-direction: column;
		gap: 16px;
		padding: 16px;
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid var(--surface-border);
		border-radius: 12px;
	}

	.filter-group {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.filter-group__label {
		font-size: 12px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--text-muted);
	}

	.filter-buttons {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	.filter-buttons button {
		padding: 8px 12px;
		border: 1px solid var(--surface-border);
		border-radius: 8px;
		background: transparent;
		color: var(--text-secondary);
		font-size: 12px;
		cursor: pointer;
		transition: all 200ms ease;
	}

	.filter-buttons button:hover {
		background: rgba(255, 255, 255, 0.05);
		color: var(--text-primary);
	}

	.filter-buttons button.active {
		background: var(--ember-400);
		border-color: var(--ember-400);
		color: white;
	}

	.alerts-section {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.alerts-list {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	:global(.alert-card) {
		display: flex;
		flex-direction: column;
		gap: 12px;
		border-left: 4px solid var(--surface-border);
		transition: all 200ms ease;
	}

	:global(.alert-card:hover) {
		background: rgba(255, 255, 255, 0.04);
		transform: translateX(2px);
	}

	:global(.alert-card.alert-warning) {
		border-left-color: var(--status-critical);
		background: color-mix(in srgb, var(--status-critical) 5%, transparent);
	}

	:global(.alert-card.alert-suspicious) {
		border-left-color: var(--status-warning);
		background: color-mix(in srgb, var(--status-warning) 5%, transparent);
	}

	.alert-card-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
	}

	.alert-card-left {
		display: flex;
		gap: 8px;
	}

	.alert-card-time {
		font-size: 11px;
		color: var(--text-muted);
		white-space: nowrap;
	}

	.alert-card-content {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.alert-node {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.alert-node strong {
		font-size: 13px;
		color: var(--text-primary);
	}

	.alert-node code {
		font-size: 11px;
		color: var(--text-secondary);
		font-family: var(--font-mono);
		background: rgba(255, 255, 255, 0.04);
		padding: 2px 6px;
		border-radius: 4px;
		width: fit-content;
	}

	.alert-explanation {
		font-size: 12px;
		color: var(--text-secondary);
		line-height: 1.5;
		margin: 0;
	}

	.alert-card-footer {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
		padding-top: 8px;
		border-top: 1px solid rgba(255, 255, 255, 0.05);
	}

	.alert-meta {
		display: flex;
		flex-wrap: wrap;
		gap: 16px;
		font-size: 11px;
	}

	.meta-item {
		display: flex;
		gap: 4px;
		align-items: center;
		color: var(--text-secondary);
	}

	.meta-item .label {
		color: var(--text-muted);
		text-transform: uppercase;
		font-size: 10px;
		letter-spacing: 0.05em;
	}

	.meta-item code {
		font-family: var(--font-mono);
		background: rgba(255, 255, 255, 0.04);
		padding: 2px 4px;
		border-radius: 3px;
	}

	.alert-actions {
		display: flex;
		gap: 8px;
	}

	:global(.empty-state) {
		text-align: center;
		color: var(--text-muted);
	}

	:global(.error-card) {
		border-color: var(--status-critical);
		background: color-mix(in srgb, var(--status-critical) 5%, transparent);
	}

	:global(.error-card h3) {
		color: var(--status-critical);
		margin-top: 0;
	}

	@media (max-width: 900px) {
		.alert-card-footer {
			flex-direction: column;
			align-items: flex-start;
		}

		.alert-actions {
			width: 100%;
		}
	}
</style>
