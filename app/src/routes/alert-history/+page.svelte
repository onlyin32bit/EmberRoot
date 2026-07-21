<script lang="ts">
	import PageShell from '$lib/components/PageShell.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import SearchBar from '$lib/components/ui/SearchBar.svelte';
	import Dropdown from '$lib/components/ui/Dropdown.svelte';
	import ProgressBar from '$lib/components/ui/ProgressBar.svelte';
	import SideDrawer from '$lib/components/ui/SideDrawer.svelte';
	import { mockService } from '$lib/mock';
	import type { Incident, IncidentStatus, IncidentType, Region, Severity } from '$lib/mock/types';

	// Load data from mock service
	const incidents: Incident[] = mockService.getIncidents();
	const regions: Region[] = mockService.getRegions();
	const regionMap = new Map<string, Region>(regions.map((r) => [r.id, r]));

	// State for filters & search
	let searchQuery = $state('');
	let selectedSeverity = $state('');
	let selectedRegion = $state('');
	let selectedStatus = $state('');
	let selectedDateRange = $state('');
	let sortBy = $state<'date-desc' | 'date-asc' | 'severity-desc' | 'containment-desc'>('date-desc');

	// State for expandable rows and side drawer
	let expandedRowId = $state<string | null>(null);
	let drawerIncident = $state<Incident | null>(null);
	let drawerOpen = $state(false);

	// Action feedback toast state
	let toastMessage = $state<string | null>(null);
	function showToast(msg: string) {
		toastMessage = msg;
		setTimeout(() => {
			if (toastMessage === msg) toastMessage = null;
		}, 3000);
	}

	// Dropdown filter options
	const severityOptions = [
		{ value: '', label: 'All Severities' },
		{ value: 'critical', label: 'Critical' },
		{ value: 'high', label: 'High' },
		{ value: 'medium', label: 'Medium' },
		{ value: 'low', label: 'Low' }
	];

	const regionOptions = [
		{ value: '', label: 'All Regions' },
		...regions.map((r) => ({ value: r.id, label: `${r.name} (${r.code})` }))
	];

	const statusOptions = [
		{ value: '', label: 'All Statuses' },
		{ value: 'active', label: 'Active' },
		{ value: 'monitoring', label: 'Monitoring' },
		{ value: 'contained', label: 'Contained' },
		{ value: 'resolved', label: 'Resolved' }
	];

	const dateRangeOptions = [
		{ value: '', label: 'All Time' },
		{ value: '24h', label: 'Last 24 Hours' },
		{ value: '7d', label: 'Last 7 Days' },
		{ value: '30d', label: 'Last 30 Days' }
	];

	const sortOptions = [
		{ value: 'date-desc', label: 'Date (Newest)' },
		{ value: 'date-asc', label: 'Date (Oldest)' },
		{ value: 'severity-desc', label: 'Severity (Highest)' },
		{ value: 'containment-desc', label: 'Containment % (Highest)' }
	];

	// Severity weights for sorting
	const severityWeight: Record<Severity, number> = {
		critical: 4,
		high: 3,
		medium: 2,
		low: 1
	};

	// Filtered and sorted dataset derivation
	const filteredIncidents = $derived(
		incidents
			.filter((item) => {
				// Search filter
				if (searchQuery.trim()) {
					const q = searchQuery.toLowerCase();
					const matchTitle = item.title.toLowerCase().includes(q);
					const matchId = item.id.toLowerCase().includes(q);
					const matchDesc = item.description.toLowerCase().includes(q);
					const matchType = item.type.toLowerCase().includes(q);
					const matchUnits = item.assignedUnits.some((u) => u.toLowerCase().includes(q));
					const regName = regionMap.get(item.regionId)?.name.toLowerCase() ?? '';
					const matchRegion = regName.includes(q);

					if (!matchTitle && !matchId && !matchDesc && !matchType && !matchUnits && !matchRegion) {
						return false;
					}
				}

				// Severity filter
				if (selectedSeverity && item.severity !== selectedSeverity) {
					return false;
				}

				// Region filter
				if (selectedRegion && item.regionId !== selectedRegion) {
					return false;
				}

				// Status filter
				if (selectedStatus && item.status !== selectedStatus) {
					return false;
				}

				// Date filter
				if (selectedDateRange) {
					const now = Date.now();
					const ageMs = now - item.reportedAt;
					if (selectedDateRange === '24h' && ageMs > 86_400_000) return false;
					if (selectedDateRange === '7d' && ageMs > 7 * 86_400_000) return false;
					if (selectedDateRange === '30d' && ageMs > 30 * 86_400_000) return false;
				}

				return true;
			})
			.sort((a, b) => {
				if (sortBy === 'date-desc') return b.reportedAt - a.reportedAt;
				if (sortBy === 'date-asc') return a.reportedAt - b.reportedAt;
				if (sortBy === 'severity-desc')
					return severityWeight[b.severity] - severityWeight[a.severity];
				if (sortBy === 'containment-desc') return b.containmentPct - a.containmentPct;
				return 0;
			})
	);

	// Summary Stats
	const totalCount = $derived(incidents.length);
	const activeCount = $derived(incidents.filter((i) => i.status === 'active').length);
	const criticalCount = $derived(incidents.filter((i) => i.severity === 'critical').length);
	const totalEvacuated = $derived(incidents.reduce((sum, i) => sum + i.evacuated, 0));
	const totalAreaAffected = $derived(
		incidents.reduce((sum, i) => sum + i.affectedAreaKm2, 0).toFixed(1)
	);
	const avgContainment = $derived(
		Math.round(incidents.reduce((sum, i) => sum + i.containmentPct, 0) / (incidents.length || 1))
	);

	// Helper formatting functions
	function formatType(type: IncidentType): string {
		switch (type) {
			case 'wildfire':
				return '🔥 Wildfire';
			case 'structural':
				return '🏢 Structural';
			case 'hazmat':
				return '☣️ Hazmat';
			case 'search_rescue':
				return '🛟 Search & Rescue';
			case 'flood':
				return '🌊 Flood';
			default:
				return type;
		}
	}

	function getSeverityBadgeVariant(severity: Severity): 'critical' | 'ember' | 'warning' | 'neutral' {
		switch (severity) {
			case 'critical':
				return 'critical';
			case 'high':
				return 'ember';
			case 'medium':
				return 'warning';
			case 'low':
			default:
				return 'neutral';
		}
	}

	function getStatusBadgeVariant(status: IncidentStatus): 'critical' | 'warning' | 'online' | 'neutral' {
		switch (status) {
			case 'active':
				return 'critical';
			case 'monitoring':
				return 'warning';
			case 'contained':
				return 'online';
			case 'resolved':
			default:
				return 'neutral';
		}
	}

	function formatDate(timestamp: number): string {
		const date = new Date(timestamp);
		return date.toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
			hour12: false
		});
	}

	function formatTimeAgo(timestamp: number): string {
		const diffMs = Date.now() - timestamp;
		const diffHours = Math.floor(diffMs / 3_600_000);
		if (diffHours < 1) return 'Just now';
		if (diffHours < 24) return `${diffHours}h ago`;
		const diffDays = Math.floor(diffHours / 24);
		return `${diffDays}d ago`;
	}

	function toggleExpandRow(id: string) {
		expandedRowId = expandedRowId === id ? null : id;
	}

	function openDrawer(incident: Incident, event?: Event) {
		if (event) event.stopPropagation();
		drawerIncident = incident;
		drawerOpen = true;
	}

	function resetFilters() {
		searchQuery = '';
		selectedSeverity = '';
		selectedRegion = '';
		selectedStatus = '';
		selectedDateRange = '';
		sortBy = 'date-desc';
	}
</script>

<svelte:head>
	<title>Incident Management — EmberRoot</title>
	<meta
		name="description"
		content="Comprehensive incident log, active alert management, and resolution timeline for EmberRoot."
	/>
</svelte:head>

<PageShell
	title="Incident Management"
	subtitle="Active incident monitoring, historical alert log, unit dispatch, and containment status"
	breadcrumb={['EmberRoot', 'Operations', 'Incident Management']}
>
	<!-- Toast notification -->
	{#if toastMessage}
		<div class="toast-banner" role="alert">
			<svg class="toast-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
			</svg>
			<span>{toastMessage}</span>
		</div>
	{/if}

	<div class="incidents-page">
		<!-- Summary Stat Cards -->
		<div class="stats-row">
			<Card padding="md" class="stat-card">
				<div class="stat-header">
					<span class="stat-label">Total Incidents</span>
					<span class="stat-icon-bg">📋</span>
				</div>
				<div class="stat-body">
					<span class="stat-value">{totalCount}</span>
					<span class="stat-sub">
						<strong class="text-critical">{activeCount}</strong> active ·
						<strong class="text-online">{incidents.length - activeCount}</strong> contained/resolved
					</span>
				</div>
			</Card>

			<Card padding="md" class="stat-card">
				<div class="stat-header">
					<span class="stat-label">Critical & High Threats</span>
					<span class="stat-icon-bg">⚠️</span>
				</div>
				<div class="stat-body">
					<span class="stat-value text-critical">{criticalCount}</span>
					<span class="stat-sub">Requires immediate command attention</span>
				</div>
			</Card>

			<Card padding="md" class="stat-card">
				<div class="stat-header">
					<span class="stat-label">Evacuated Residents</span>
					<span class="stat-icon-bg">🚨</span>
				</div>
				<div class="stat-body">
					<span class="stat-value text-ember">{totalEvacuated.toLocaleString()}</span>
					<span class="stat-sub">Across {totalAreaAffected} km² affected area</span>
				</div>
			</Card>

			<Card padding="md" class="stat-card">
				<div class="stat-header">
					<span class="stat-label">Avg. Containment Rate</span>
					<span class="stat-icon-bg">🛡️</span>
				</div>
				<div class="stat-body">
					<div class="containment-summary">
						<span class="stat-value text-online">{avgContainment}%</span>
					</div>
					<ProgressBar value={avgContainment} variant={avgContainment > 60 ? 'online' : 'warning'} size="sm" />
				</div>
			</Card>
		</div>

		<!-- Control Toolbar: Filters and Search -->
		<Card padding="md" class="filters-card">
			<div class="toolbar-wrapper">
				<div class="search-box">
					<SearchBar
						placeholder="Search by title, ID, type, units, region..."
						bind:value={searchQuery}
					/>
				</div>

				<div class="filters-group">
					<Dropdown options={severityOptions} bind:value={selectedSeverity} placeholder="Severity" />
					<Dropdown options={regionOptions} bind:value={selectedRegion} placeholder="Region" />
					<Dropdown options={statusOptions} bind:value={selectedStatus} placeholder="Status" />
					<Dropdown options={dateRangeOptions} bind:value={selectedDateRange} placeholder="Time Period" />
					<Dropdown options={sortOptions} bind:value={sortBy} placeholder="Sort By" />

					{#if searchQuery || selectedSeverity || selectedRegion || selectedStatus || selectedDateRange}
						<Button variant="ghost" size="sm" onclick={resetFilters}>
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
							</svg>
							Clear
						</Button>
					{/if}
				</div>
			</div>

			<div class="results-meta">
				<span>
					Showing <strong>{filteredIncidents.length}</strong> of <strong>{totalCount}</strong> incidents
				</span>
				{#if selectedSeverity || selectedRegion || selectedStatus || selectedDateRange || searchQuery}
					<span class="active-filter-pills">
						{#if selectedSeverity}<Badge variant="ember">Severity: {selectedSeverity}</Badge>{/if}
						{#if selectedRegion}<Badge variant="neutral">Region: {regionMap.get(selectedRegion)?.name ?? selectedRegion}</Badge>{/if}
						{#if selectedStatus}<Badge variant="neutral">Status: {selectedStatus}</Badge>{/if}
						{#if selectedDateRange}<Badge variant="neutral">Time: {selectedDateRange}</Badge>{/if}
					</span>
				{/if}
			</div>
		</Card>

		<!-- Incidents Table -->
		<Card padding="none" class="table-card">
			{#if filteredIncidents.length === 0}
				<div class="empty-state">
					<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" class="empty-icon">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
					</svg>
					<h3>No incidents found</h3>
					<p>Try adjusting your search terms or filters to view log results.</p>
					<Button variant="secondary" size="sm" onclick={resetFilters}>Reset All Filters</Button>
				</div>
			{:else}
				<div class="table-scroll-container">
					<table class="incidents-table">
						<thead>
							<tr>
								<th class="th-expand"></th>
								<th class="th-title">Incident Title & ID</th>
								<th class="th-type">Type</th>
								<th class="th-severity">Severity</th>
								<th class="th-status">Status</th>
								<th class="th-region">Region</th>
								<th class="th-containment">Containment</th>
								<th class="th-date">Reported Date</th>
								<th class="th-actions">Actions</th>
							</tr>
						</thead>
						<tbody>
							{#each filteredIncidents as incident (incident.id)}
								{@const isExpanded = expandedRowId === incident.id}
								{@const region = regionMap.get(incident.regionId)}

								<!-- Main Table Row -->
								<tr
									class="incident-row"
									class:row-expanded={isExpanded}
									class:row-critical={incident.severity === 'critical'}
									onclick={() => toggleExpandRow(incident.id)}
								>
									<td class="td-expand">
										<button
											class="expand-btn"
											aria-label={isExpanded ? 'Collapse row' : 'Expand row'}
											onclick={(e) => {
												e.stopPropagation();
												toggleExpandRow(incident.id);
											}}
										>
											<svg
												width="14"
												height="14"
												viewBox="0 0 24 24"
												fill="none"
												stroke="currentColor"
												class="chevron-icon"
												class:chevron-rotated={isExpanded}
											>
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
											</svg>
										</button>
									</td>

									<td class="td-title">
										<div class="title-cell">
											<span class="incident-name">{incident.title}</span>
											<span class="incident-id">{incident.id}</span>
										</div>
									</td>

									<td class="td-type">
										<span class="type-tag">{formatType(incident.type)}</span>
									</td>

									<td class="td-severity">
										<Badge variant={getSeverityBadgeVariant(incident.severity)}>
											{incident.severity}
										</Badge>
									</td>

									<td class="td-status">
										<Badge variant={getStatusBadgeVariant(incident.status)}>
											{#if incident.status === 'active'}
												<span class="live-dot"></span>
											{/if}
											{incident.status}
										</Badge>
									</td>

									<td class="td-region">
										<div class="region-cell">
											<span class="region-name">{region?.name ?? incident.regionId}</span>
											<span class="region-code">{region?.code ?? ''}</span>
										</div>
									</td>

									<td class="td-containment">
										<div class="containment-cell">
											<div class="pct-bar">
												<ProgressBar
													value={incident.containmentPct}
													variant={incident.containmentPct >= 80 ? 'online' : incident.containmentPct >= 40 ? 'warning' : 'critical'}
													size="sm"
												/>
											</div>
											<span class="pct-num">{incident.containmentPct}%</span>
										</div>
									</td>

									<td class="td-date">
										<div class="date-cell">
											<span class="date-full">{formatDate(incident.reportedAt)}</span>
											<span class="date-relative">{formatTimeAgo(incident.reportedAt)}</span>
										</div>
									</td>

									<td class="td-actions">
										<div class="actions-cell" onclick={(e) => e.stopPropagation()}>
											<Button
												variant="secondary"
												size="sm"
												onclick={(e) => openDrawer(incident, e)}
											>
												Details
											</Button>
										</div>
									</td>
								</tr>

								<!-- Expandable Detail Row -->
								{#if isExpanded}
									<tr class="detail-row">
										<td colspan="9">
											<div class="detail-container">
												<div class="detail-grid">
													<!-- Left Column: Description & Parameters -->
													<div class="detail-card">
														<h4 class="detail-heading">Incident Overview & Location</h4>
														<p class="detail-desc">{incident.description}</p>

														<div class="param-grid">
															<div class="param-item">
																<span class="param-label">Origin Coordinates</span>
																<span class="param-value font-mono">
																	{incident.origin.lat.toFixed(4)}°N, {incident.origin.lon.toFixed(4)}°W
																</span>
															</div>

															<div class="param-item">
																<span class="param-label">Affected Area</span>
																<span class="param-value">{incident.affectedAreaKm2.toFixed(1)} km²</span>
															</div>

															<div class="param-item">
																<span class="param-label">Evacuated</span>
																<span class="param-value">{incident.evacuated.toLocaleString()} persons</span>
															</div>

															<div class="param-item">
																<span class="param-label">Casualties</span>
																<span class="param-value">{incident.casualties}</span>
															</div>

															{#if incident.estimatedControlAt}
																<div class="param-item">
																	<span class="param-label">Est. Control Time</span>
																	<span class="param-value text-online">{formatDate(incident.estimatedControlAt)}</span>
																</div>
															{/if}
														</div>

														<div class="units-block">
															<span class="param-label">Assigned Tactical Units:</span>
															<div class="units-list">
																{#each incident.assignedUnits as unit}
																	<Badge variant="ember" size="sm">⚡ {unit}</Badge>
																{/each}
															</div>
														</div>
													</div>

													<!-- Right Column: Timeline Updates -->
													<div class="detail-card">
														<h4 class="detail-heading">Dispatch & Status Updates ({incident.updates.length})</h4>
														<div class="timeline-wrapper">
															{#each incident.updates as update}
																<div class="timeline-item">
																	<div class="timeline-dot"></div>
																	<div class="timeline-content">
																		<div class="timeline-meta">
																			<span class="timeline-author">{update.authorId}</span>
																			<span class="timeline-time">{formatDate(update.timestamp)}</span>
																		</div>
																		<p class="timeline-msg">{update.message}</p>
																	</div>
																</div>
															{/each}
														</div>
													</div>
												</div>

												<!-- Action buttons toolbar inside detail row -->
												<div class="detail-actions-bar">
													<div class="left-actions">
														<Button
															variant="secondary"
															size="sm"
															onclick={() => showToast(`Exported incident record ${incident.id} to PDF.`)}
														>
															📄 Export PDF Log
														</Button>
														<Button
															variant="secondary"
															size="sm"
															onclick={() => showToast(`Dispatched additional aerial surveillance to ${incident.title}.`)}
														>
															🚁 Dispatch Drone Recon
														</Button>
													</div>
													<div class="right-actions">
														<Button
															variant="primary"
															size="sm"
															onclick={() => openDrawer(incident)}
														>
															Open Full Command View
														</Button>
													</div>
												</div>
											</div>
										</td>
									</tr>
								{/if}
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</Card>
	</div>
</PageShell>

<!-- Side Drawer Detail View -->
{#if drawerIncident}
	<SideDrawer
		bind:open={drawerOpen}
		title="Incident Command View — {drawerIncident.id}"
		width="xl"
		onclose={() => (drawerIncident = null)}
	>
		<div class="drawer-body">
			<!-- Header Banner -->
			<div class="drawer-header-card">
				<div class="drawer-header-top">
					<Badge variant={getSeverityBadgeVariant(drawerIncident.severity)}>
						{drawerIncident.severity}
					</Badge>
					<Badge variant={getStatusBadgeVariant(drawerIncident.status)}>
						{drawerIncident.status}
					</Badge>
					<span class="type-tag">{formatType(drawerIncident.type)}</span>
				</div>
				<h2 class="drawer-title">{drawerIncident.title}</h2>
				<p class="drawer-desc">{drawerIncident.description}</p>
			</div>

			<!-- Containment Progress Section -->
			<div class="drawer-section">
				<div class="section-title">Containment Progress</div>
				<div class="progress-box">
					<ProgressBar
						value={drawerIncident.containmentPct}
						variant={drawerIncident.containmentPct >= 80 ? 'online' : drawerIncident.containmentPct >= 40 ? 'warning' : 'critical'}
						showValue={true}
						size="lg"
						label="Overall Containment Line"
					/>
				</div>
			</div>

			<!-- Core Key Stats -->
			<div class="drawer-section">
				<div class="section-title">Key Incident Metrics</div>
				<div class="drawer-stats-grid">
					<div class="drawer-stat-item">
						<span class="d-stat-label">Region</span>
						<span class="d-stat-val">
							{regionMap.get(drawerIncident.regionId)?.name ?? drawerIncident.regionId}
						</span>
					</div>
					<div class="drawer-stat-item">
						<span class="d-stat-label">Origin Coordinates</span>
						<span class="d-stat-val font-mono">
							{drawerIncident.origin.lat.toFixed(4)}, {drawerIncident.origin.lon.toFixed(4)}
						</span>
					</div>
					<div class="drawer-stat-item">
						<span class="d-stat-label">Affected Area</span>
						<span class="d-stat-val">{drawerIncident.affectedAreaKm2.toFixed(1)} km²</span>
					</div>
					<div class="drawer-stat-item">
						<span class="d-stat-label">Evacuated</span>
						<span class="d-stat-val text-ember">{drawerIncident.evacuated.toLocaleString()}</span>
					</div>
					<div class="drawer-stat-item">
						<span class="d-stat-label">Reported Time</span>
						<span class="d-stat-val">{formatDate(drawerIncident.reportedAt)}</span>
					</div>
					<div class="drawer-stat-item">
						<span class="d-stat-label">Last Updated</span>
						<span class="d-stat-val">{formatDate(drawerIncident.updatedAt)}</span>
					</div>
				</div>
			</div>

			<!-- Assigned Units -->
			<div class="drawer-section">
				<div class="section-title">Deployed Units & Assets</div>
				<div class="drawer-units-list">
					{#each drawerIncident.assignedUnits as unit}
						<div class="unit-card">
							<span class="unit-icon">🚒</span>
							<span class="unit-name">{unit}</span>
							<span class="unit-status">Deployed</span>
						</div>
					{/each}
				</div>
			</div>

			<!-- Incident Timeline Stream -->
			<div class="drawer-section">
				<div class="section-title">Operational Timeline Log</div>
				<div class="drawer-timeline">
					{#each drawerIncident.updates as update}
						<div class="d-timeline-item">
							<div class="d-timeline-dot"></div>
							<div class="d-timeline-body">
								<div class="d-timeline-meta">
									<span class="d-author">{update.authorId}</span>
									<span class="d-time">{formatDate(update.timestamp)}</span>
								</div>
								<p class="d-msg">{update.message}</p>
							</div>
						</div>
					{/each}
				</div>
			</div>

			<!-- Command Footer Actions -->
			<div class="drawer-footer">
				<Button
					variant="primary"
					class="w-full"
					onclick={() => {
						showToast(`Command status updated for incident ${drawerIncident?.id}.`);
						drawerOpen = false;
					}}
				>
					Update Incident Status
				</Button>
			</div>
		</div>
	</SideDrawer>
{/if}

<style>
	/* Toast notification */
	.toast-banner {
		position: fixed;
		bottom: 24px;
		right: 24px;
		z-index: 100;
		display: flex;
		align-items: center;
		gap: 10px;
		background: var(--surface-overlay);
		border: 1px solid var(--status-online);
		color: var(--text-primary);
		padding: 12px 18px;
		border-radius: 8px;
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
		font-size: 13px;
		font-weight: 500;
		animation: slideUp 200ms cubic-bezier(0.4, 0, 0.2, 1);
	}
	.toast-icon {
		color: var(--status-online);
	}

	@keyframes slideUp {
		from {
			transform: translateY(12px);
			opacity: 0;
		}
		to {
			transform: translateY(0);
			opacity: 1;
		}
	}

	.incidents-page {
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	/* Summary Stat Cards */
	.stats-row {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 16px;
	}

	@media (max-width: 1024px) {
		.stats-row {
			grid-template-columns: repeat(2, 1fr);
		}
	}
	@media (max-width: 640px) {
		.stats-row {
			grid-template-columns: 1fr;
		}
	}

	.stat-card {
		display: flex;
		flex-direction: column;
		gap: 12px;
		background: var(--surface-base);
	}

	.stat-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.stat-label {
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--text-secondary);
	}

	.stat-icon-bg {
		font-size: 16px;
		opacity: 0.8;
	}

	.stat-body {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.stat-value {
		font-size: 26px;
		font-weight: 700;
		letter-spacing: -0.5px;
		color: var(--text-primary);
		line-height: 1.1;
	}

	.stat-sub {
		font-size: 12px;
		color: var(--text-muted);
	}

	.containment-summary {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.text-critical {
		color: var(--status-critical);
	}
	.text-online {
		color: var(--status-online);
	}
	.text-ember {
		color: var(--ember-300);
	}

	/* Filters & Toolbar */
	.filters-card {
		background: var(--surface-base);
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.toolbar-wrapper {
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
		align-items: center;
		justify-content: space-between;
	}

	.search-box {
		flex: 1;
		min-width: 240px;
	}

	.filters-group {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		align-items: center;
	}

	.results-meta {
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-size: 12px;
		color: var(--text-secondary);
		padding-top: 8px;
		border-top: 1px solid var(--surface-border);
	}

	.active-filter-pills {
		display: flex;
		gap: 6px;
		flex-wrap: wrap;
	}

	/* Table container */
	.table-card {
		background: var(--surface-base);
		border-radius: 8px;
		overflow: hidden;
	}

	.table-scroll-container {
		width: 100%;
		overflow-x: auto;
	}

	.incidents-table {
		width: 100%;
		border-collapse: collapse;
		text-align: left;
		font-size: 13px;
	}

	.incidents-table th {
		background: var(--surface-raised);
		color: var(--text-secondary);
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		padding: 12px 14px;
		border-bottom: 1px solid var(--surface-border);
		white-space: nowrap;
	}

	.th-expand {
		width: 36px;
	}
	.th-title {
		min-width: 180px;
	}
	.th-type {
		min-width: 130px;
	}
	.th-severity {
		min-width: 100px;
	}
	.th-status {
		min-width: 110px;
	}
	.th-region {
		min-width: 140px;
	}
	.th-containment {
		min-width: 140px;
	}
	.th-date {
		min-width: 150px;
	}
	.th-actions {
		min-width: 80px;
		text-align: right;
	}

	.incident-row {
		border-bottom: 1px solid var(--surface-border);
		cursor: pointer;
		transition: background var(--transition-fast);
	}

	.incident-row:hover {
		background: var(--surface-raised);
	}

	.row-expanded {
		background: var(--surface-raised);
	}

	.row-critical {
		border-left: 3px solid var(--status-critical);
	}

	.incidents-table td {
		padding: 14px;
		vertical-align: middle;
	}

	.td-expand {
		padding-left: 14px;
		padding-right: 4px;
	}

	.expand-btn {
		background: transparent;
		border: none;
		color: var(--text-muted);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 24px;
		height: 24px;
		border-radius: 4px;
		transition: background var(--transition-fast), color var(--transition-fast);
	}

	.expand-btn:hover {
		background: var(--surface-overlay);
		color: var(--text-primary);
	}

	.chevron-icon {
		transition: transform var(--transition-fast);
	}
	.chevron-rotated {
		transform: rotate(90deg);
	}

	.title-cell {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.incident-name {
		font-weight: 600;
		color: var(--text-primary);
	}

	.incident-id {
		font-family: 'JetBrains Mono', monospace;
		font-size: 11px;
		color: var(--text-muted);
	}

	.type-tag {
		font-size: 12px;
		color: var(--text-secondary);
		white-space: nowrap;
	}

	.live-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: var(--status-critical);
		box-shadow: 0 0 8px var(--status-critical);
		display: inline-block;
		margin-right: 4px;
		animation: pulse 1.5s infinite;
	}

	@keyframes pulse {
		0% {
			opacity: 1;
		}
		50% {
			opacity: 0.3;
		}
		100% {
			opacity: 1;
		}
	}

	.region-cell {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.region-name {
		color: var(--text-primary);
		font-weight: 500;
	}
	.region-code {
		font-size: 11px;
		color: var(--text-muted);
	}

	.containment-cell {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.pct-bar {
		flex: 1;
		min-width: 70px;
	}
	.pct-num {
		font-family: 'JetBrains Mono', monospace;
		font-size: 11px;
		font-weight: 600;
		color: var(--text-secondary);
	}

	.date-cell {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.date-full {
		color: var(--text-secondary);
		font-size: 12px;
	}
	.date-relative {
		color: var(--text-muted);
		font-size: 11px;
	}

	.actions-cell {
		display: flex;
		justify-content: flex-end;
	}

	/* Expandable Detail Content */
	.detail-row {
		background: var(--surface-overlay);
		border-bottom: 1px solid var(--surface-border);
	}

	.detail-container {
		padding: 20px;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.detail-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 16px;
	}

	@media (max-width: 900px) {
		.detail-grid {
			grid-template-columns: 1fr;
		}
	}

	.detail-card {
		background: var(--surface-base);
		border: 1px solid var(--surface-border);
		border-radius: 6px;
		padding: 16px;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.detail-heading {
		font-size: 12px;
		font-weight: 600;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--text-primary);
		padding-bottom: 8px;
		border-bottom: 1px solid var(--surface-border);
	}

	.detail-desc {
		font-size: 13px;
		color: var(--text-secondary);
		line-height: 1.5;
	}

	.param-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 10px;

		padding: 10px;
		background: var(--surface-raised);
		border-radius: 6px;
	}

	.param-item {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.param-label {
		font-size: 11px;
		color: var(--text-muted);
	}

	.param-value {
		font-size: 12px;
		font-weight: 600;
		color: var(--text-primary);
	}

	.font-mono {
		font-family: 'JetBrains Mono', monospace;
	}

	.units-block {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.units-list {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}

	/* Timeline */
	.timeline-wrapper {
		display: flex;
		flex-direction: column;
		gap: 12px;
		max-height: 240px;
		overflow-y: auto;
		padding-right: 6px;
	}

	.timeline-item {
		display: flex;
		gap: 12px;
		position: relative;
	}

	.timeline-item:not(:last-child)::before {
		content: '';
		position: absolute;
		left: 5px;
		top: 14px;
		bottom: -12px;
		width: 1px;
		background: var(--surface-muted);
	}

	.timeline-dot {
		width: 11px;
		height: 11px;
		border-radius: 50%;
		background: var(--ember-400);
		border: 2px solid var(--surface-base);
		margin-top: 3px;
		flex-shrink: 0;
	}

	.timeline-content {
		display: flex;
		flex-direction: column;
		gap: 2px;
		flex: 1;
	}

	.timeline-meta {
		display: flex;
		justify-content: space-between;
		font-size: 11px;
	}

	.timeline-author {
		font-weight: 600;
		color: var(--ember-300);
	}

	.timeline-time {
		color: var(--text-muted);
	}

	.timeline-msg {
		font-size: 12px;
		color: var(--text-secondary);
		line-height: 1.4;
	}

	.detail-actions-bar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding-top: 12px;
		border-top: 1px solid var(--surface-border);
		gap: 12px;
		flex-wrap: wrap;
	}

	.left-actions,
	.right-actions {
		display: flex;
		gap: 8px;
	}

	/* Empty state */
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 48px 24px;
		gap: 12px;
		text-align: center;
	}

	.empty-icon {
		color: var(--text-muted);
	}

	.empty-state h3 {
		font-size: 16px;
		font-weight: 600;
		color: var(--text-primary);
	}

	.empty-state p {
		font-size: 13px;
		color: var(--text-secondary);
		max-width: 360px;
	}

	/* Drawer Details Styling */
	.drawer-body {
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	.drawer-header-card {
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 16px;
		background: var(--surface-raised);
		border-radius: 6px;
		border: 1px solid var(--surface-border);
	}

	.drawer-header-top {
		display: flex;
		gap: 8px;
		align-items: center;
	}

	.drawer-title {
		font-size: 18px;
		font-weight: 700;
		color: var(--text-primary);
	}

	.drawer-desc {
		font-size: 13px;
		color: var(--text-secondary);
		line-height: 1.5;
	}

	.drawer-section {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.section-title {
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--text-secondary);
		border-bottom: 1px solid var(--surface-border);
		padding-bottom: 6px;
	}

	.progress-box {
		padding: 12px;
		background: var(--surface-raised);
		border-radius: 6px;
	}

	.drawer-stats-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 10px;
	}

	.drawer-stat-item {
		display: flex;
		flex-direction: column;
		padding: 10px;
		background: var(--surface-raised);
		border-radius: 6px;
		gap: 2px;
	}

	.d-stat-label {
		font-size: 11px;
		color: var(--text-muted);
	}

	.d-stat-val {
		font-size: 13px;
		font-weight: 600;
		color: var(--text-primary);
	}

	.drawer-units-list {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.unit-card {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 10px 12px;
		background: var(--surface-raised);
		border: 1px solid var(--surface-border);
		border-radius: 6px;
	}

	.unit-icon {
		font-size: 14px;
	}

	.unit-name {
		font-weight: 600;
		color: var(--text-primary);
		flex: 1;
	}

	.unit-status {
		font-size: 11px;
		color: var(--status-online);
		font-weight: 500;
	}

	.drawer-timeline {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.d-timeline-item {
		display: flex;
		gap: 12px;
		position: relative;
	}

	.d-timeline-item:not(:last-child)::before {
		content: '';
		position: absolute;
		left: 5px;
		top: 14px;
		bottom: -12px;
		width: 1px;
		background: var(--surface-muted);
	}

	.d-timeline-dot {
		width: 11px;
		height: 11px;
		border-radius: 50%;
		background: var(--ember-400);
		border: 2px solid var(--surface-base);
		margin-top: 3px;
		flex-shrink: 0;
	}

	.d-timeline-body {
		display: flex;
		flex-direction: column;
		gap: 2px;
		flex: 1;
	}

	.d-timeline-meta {
		display: flex;
		justify-content: space-between;
		font-size: 11px;
	}

	.d-author {
		font-weight: 600;
		color: var(--ember-300);
	}

	.d-time {
		color: var(--text-muted);
	}

	.d-msg {
		font-size: 12px;
		color: var(--text-secondary);
		line-height: 1.4;
	}

	.drawer-footer {
		padding-top: 16px;
		border-top: 1px solid var(--surface-border);
	}

	.w-full {
		width: 100%;
	}
</style>
