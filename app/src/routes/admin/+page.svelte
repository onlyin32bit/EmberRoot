<script lang="ts">
	import { onMount } from 'svelte';
	import { api, type ApiNode, type ApiRegion, type ApiAlert } from '$lib/api';
	import PageShell from '$lib/components/PageShell.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';

	let nodes = $state<ApiNode[]>([]);
	let regions = $state<ApiRegion[]>([]);
	let openAlerts = $state<ApiAlert[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);

	let activeTab = $state<'nodes' | 'alerts'>('nodes');

	// Node Form State
	let newNodeId = $state('');
	let newNodeName = $state('');
	let newRegionId = $state('');
	let newNodeType = $state('light');
	let newLatitude = $state('');
	let newLongitude = $state('');
	let creatingNode = $state(false);

	async function loadData() {
		try {
			loading = true;
			error = null;
			
			const [fetchedNodes, fetchedRegions, fetchedAlerts] = await Promise.all([
				api.getAdminNodes(),
				api.getRegions(),
				api.getAlerts({ state: 'open' })
			]);

			nodes = fetchedNodes;
			regions = fetchedRegions;
			openAlerts = fetchedAlerts;

			if (regions.length > 0 && !newRegionId) {
				newRegionId = regions[0].id;
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load data';
		} finally {
			loading = false;
		}
	}

	async function createNode(e: Event) {
		e.preventDefault();
		creatingNode = true;
		try {
			const lat = parseFloat(newLatitude);
			const lon = parseFloat(newLongitude);
			
			await api.createAdminNode({
				id: newNodeId,
				name: newNodeName,
				regionId: newRegionId,
				nodeType: newNodeType,
				latitude: isNaN(lat) ? undefined : lat,
				longitude: isNaN(lon) ? undefined : lon
			});

			// Reset form & reload data
			newNodeId = '';
			newNodeName = '';
			newLatitude = '';
			newLongitude = '';
			
			await loadData();
		} catch (err) {
			alert(err instanceof Error ? err.message : 'Failed to create node');
		} finally {
			creatingNode = false;
		}
	}

	async function handleAcknowledge(id: string) {
		try {
			await api.acknowledgeAlert(id);
			await loadData();
		} catch (err) {
			alert(err instanceof Error ? err.message : 'Failed to acknowledge alert');
		}
	}

	function logout() {
		api.logout();
		window.location.href = '/admin/login';
	}

	onMount(() => {
		void loadData();
	});
</script>

<svelte:head>
	<title>Admin Dashboard — EmberRoot</title>
</svelte:head>

<PageShell
	title="Admin Management"
	subtitle="Manage sensor nodes, regions, and system alerts"
	breadcrumb={['EmberRoot', 'Admin', 'Dashboard']}
>
	<div class="admin-header">
		<div class="tabs">
			<button class="tab-btn" class:active={activeTab === 'nodes'} onclick={() => activeTab = 'nodes'}>Nodes</button>
			<button class="tab-btn" class:active={activeTab === 'alerts'} onclick={() => activeTab = 'alerts'}>
				Alerts 
				{#if openAlerts.length > 0}
					<span class="alert-badge">{openAlerts.length}</span>
				{/if}
			</button>
		</div>
		<Button variant="danger" size="sm" onclick={logout}>Logout</Button>
	</div>

	{#if error}
		<Card padding="lg" class="error-card">
			<h3>Error</h3>
			<p>{error}</p>
		</Card>
	{/if}

	{#if loading && nodes.length === 0}
		<Card padding="lg"><p>Loading admin data...</p></Card>
	{:else}
		<div class="admin-content">
			{#if activeTab === 'nodes'}
				<div class="nodes-grid">
					<!-- Create Node Form -->
					<Card padding="lg" class="form-card">
						<h3>Create New Node</h3>
						<form onsubmit={createNode} class="admin-form">
							<div class="input-row">
								<div class="input-group">
									<label for="nodeId">Node ID</label>
									<input id="nodeId" bind:value={newNodeId} required class="er-input" placeholder="e.g. node-001" />
								</div>
								<div class="input-group">
									<label for="nodeName">Node Name</label>
									<input id="nodeName" bind:value={newNodeName} required class="er-input" placeholder="e.g. Alpha Sector Sensor" />
								</div>
							</div>
							
							<div class="input-row">
								<div class="input-group">
									<label for="regionId">Region</label>
									<select id="regionId" bind:value={newRegionId} class="er-input" required>
										{#each regions as region}
											<option value={region.id}>{region.name}</option>
										{/each}
									</select>
								</div>
								<div class="input-group">
									<label for="nodeType">Node Type</label>
									<select id="nodeType" bind:value={newNodeType} class="er-input" required>
										<option value="light">Light</option>
										<option value="full">Full</option>
										<option value="fence">Fence</option>
									</select>
								</div>
							</div>

							<div class="input-row">
								<div class="input-group">
									<label for="lat">Latitude (Optional)</label>
									<input id="lat" type="number" step="any" bind:value={newLatitude} class="er-input" placeholder="e.g. 34.0522" />
								</div>
								<div class="input-group">
									<label for="lon">Longitude (Optional)</label>
									<input id="lon" type="number" step="any" bind:value={newLongitude} class="er-input" placeholder="e.g. -118.2437" />
								</div>
							</div>

							<div style="margin-top: 8px;">
								<Button variant="primary" type="submit" disabled={creatingNode}>
									{creatingNode ? 'Creating...' : 'Create Node'}
								</Button>
							</div>
						</form>
					</Card>

					<!-- Node List -->
					<Card padding="lg" class="list-card">
						<h3>All Nodes ({nodes.length})</h3>
						<div class="table-container">
							<table class="er-table">
								<thead>
									<tr>
										<th>Status</th>
										<th>ID</th>
										<th>Name</th>
										<th>Region</th>
										<th>Type</th>
										<th>Last Seen</th>
									</tr>
								</thead>
								<tbody>
									{#each nodes as node}
										<tr>
											<td>
												<Badge variant={node.status === 'online' ? 'online' : (node.status === 'offline' ? 'neutral' : 'warning')}>
													{node.status}
												</Badge>
											</td>
											<td class="font-mono">{node.id}</td>
											<td>{node.name}</td>
											<td>{node.region_id}</td>
											<td><Badge variant="neutral">{node.node_type}</Badge></td>
											<td class="font-mono text-muted">
												{node.last_seen_at ? new Date(node.last_seen_at).toLocaleString() : 'Never'}
											</td>
										</tr>
									{/each}
									{#if nodes.length === 0}
										<tr>
											<td colspan="6" class="text-center text-muted py-4">No nodes found in the database.</td>
										</tr>
									{/if}
								</tbody>
							</table>
						</div>
					</Card>
				</div>
			{:else if activeTab === 'alerts'}
				<Card padding="lg" class="list-card">
					<h3>Open Alerts ({openAlerts.length})</h3>
					<div class="table-container">
						<table class="er-table">
							<thead>
								<tr>
									<th>Level</th>
									<th>Node</th>
									<th>Explanation</th>
									<th>Created At</th>
									<th>Action</th>
								</tr>
							</thead>
							<tbody>
								{#each openAlerts as alert}
									<tr>
										<td>
											<Badge variant={alert.level === 'monitoring' ? 'online' : (alert.level === 'suspicious' ? 'warning' : 'critical')}>
												{alert.level}
											</Badge>
										</td>
										<td>
											<div class="alert-node">
												<strong>{alert.node_name || alert.node_id}</strong>
												<span class="text-muted text-xs block">{alert.node_id}</span>
											</div>
										</td>
										<td class="alert-desc">{alert.explanation}</td>
										<td class="font-mono text-muted">
											{new Date(alert.created_at).toLocaleString()}
										</td>
										<td>
											<Button variant="secondary" size="sm" onclick={() => handleAcknowledge(alert.id)}>
												Acknowledge
											</Button>
										</td>
									</tr>
								{/each}
								{#if openAlerts.length === 0}
									<tr>
										<td colspan="5" class="text-center text-muted py-4">No open alerts at this time.</td>
									</tr>
								{/if}
							</tbody>
						</table>
					</div>
				</Card>
			{/if}
		</div>
	{/if}
</PageShell>

<style>
	.admin-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 8px;
	}

	.tabs {
		display: flex;
		gap: 8px;
		background: rgba(0, 0, 0, 0.2);
		padding: 4px;
		border-radius: 8px;
		border: 1px solid rgba(255, 255, 255, 0.05);
	}

	.tab-btn {
		background: transparent;
		border: none;
		color: var(--text-muted);
		padding: 8px 16px;
		font-size: 14px;
		font-weight: 600;
		border-radius: 6px;
		cursor: pointer;
		transition: all 0.2s ease;
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.tab-btn.active {
		background: var(--surface-raised);
		color: var(--text-primary);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
	}

	.alert-badge {
		background: var(--status-critical);
		color: white;
		font-size: 11px;
		padding: 2px 6px;
		border-radius: 999px;
		font-weight: 800;
	}

	.admin-content {
		display: flex;
		flex-direction: column;
		gap: 24px;
	}

	.nodes-grid {
		display: flex;
		flex-direction: column;
		gap: 24px;
	}

	.admin-form {
		display: flex;
		flex-direction: column;
		gap: 16px;
		margin-top: 16px;
	}

	.input-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 16px;
	}

	.input-group {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.input-group label {
		font-size: 12px;
		font-weight: 600;
		color: var(--text-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.er-input {
		background: var(--surface-base);
		color: var(--text-primary);
		border: 1px solid var(--surface-border);
		border-radius: 6px;
		padding: 10px 14px;
		font-size: 14px;
		font-family: inherit;
		outline: none;
		transition: all 0.2s ease;
	}

	.er-input:focus {
		border-color: var(--ember-400);
	}

	.table-container {
		overflow-x: auto;
		margin-top: 16px;
	}

	.er-table {
		width: 100%;
		border-collapse: collapse;
		text-align: left;
		font-size: 14px;
	}

	.er-table th {
		padding: 12px 16px;
		font-size: 12px;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-muted);
		border-bottom: 1px solid var(--surface-border);
		font-weight: 600;
	}

	.er-table td {
		padding: 14px 16px;
		border-bottom: 1px solid rgba(255, 255, 255, 0.05);
		color: var(--text-secondary);
	}

	.er-table tbody tr:hover td {
		background: rgba(255, 255, 255, 0.02);
	}

	.font-mono {
		font-family: var(--font-mono);
		font-size: 13px;
	}

	.text-muted {
		color: var(--text-muted);
	}

	.text-xs {
		font-size: 11px;
	}

	.text-center {
		text-align: center;
	}

	.py-4 {
		padding-top: 32px !important;
		padding-bottom: 32px !important;
	}

	.block {
		display: block;
	}

	.alert-desc {
		max-width: 300px;
		line-height: 1.5;
	}

	.error-card {
		border-color: var(--status-critical);
		background: color-mix(in srgb, var(--status-critical) 5%, transparent);
	}

	.error-card h3 {
		color: var(--status-critical);
		margin: 0 0 8px 0;
	}

	h3 {
		margin: 0;
		font-size: 18px;
		color: var(--text-primary);
	}

	@media (max-width: 768px) {
		.input-row {
			grid-template-columns: 1fr;
		}
	}
</style>
