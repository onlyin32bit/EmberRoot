<script lang="ts">
	import { mockService, type SensorNode, type NodeHealth } from '$lib/mock';
	import PageShell from '$lib/components/PageShell.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import StatusIndicator from '$lib/components/ui/StatusIndicator.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ProgressBar from '$lib/components/ui/ProgressBar.svelte';
	import SearchBar from '$lib/components/ui/SearchBar.svelte';
	import SideDrawer from '$lib/components/ui/SideDrawer.svelte';

	// Load centralized mock dataset
	const allSensors = mockService.getSensors();
	const regions = mockService.getRegions();
	const regionMap = new Map(regions.map((r) => [r.id, r.name]));

	interface SensorHealthRow {
		sensor: SensorNode;
		health: NodeHealth;
		regionName: string;
	}

	// Combine SensorNode with NodeHealth data
	const nodeData: SensorHealthRow[] = allSensors.map((sensor) => {
		const health = mockService.getNodeHealth(sensor.id) ?? {
			sensorId: sensor.id,
			batteryPct: sensor.batteryPct,
			firmwareVersion: sensor.firmwareVersion,
			calibrationStatus: 'Calibrated',
			signalStrength: sensor.signalStrength,
			sensorDrift: 0.05,
			maintenanceRecommendation: 'Routine inspection',
			lastSeenAt: sensor.lastSeenAt
		};
		return {
			sensor,
			health,
			regionName: regionMap.get(sensor.regionId) ?? sensor.regionId
		};
	});

	// Reactive States
	let searchQuery = $state('');
	let driftThreshold = $state(0.12);
	let regionFilter = $state('all');
	let statusFilter = $state<'all' | 'high-drift' | 'uncalibrated' | 'low-battery' | 'offline'>('all');
	let sortBy = $state<'id' | 'batteryPct' | 'signalStrength' | 'sensorDrift' | 'lastSeenAt' | 'status' | 'calibrationStatus'>('sensorDrift');
	let sortDirection = $state<'asc' | 'desc'>('desc');

	let selectedRow = $state<SensorHealthRow | null>(null);
	let drawerOpen = $state(false);
	let toastMessage = $state<string | null>(null);
	let toastTimeout: ReturnType<typeof setTimeout> | null = null;

	function triggerToast(msg: string) {
		if (toastTimeout) clearTimeout(toastTimeout);
		toastMessage = msg;
		toastTimeout = setTimeout(() => {
			toastMessage = null;
		}, 3500);
	}

	// Derived metrics lists for quick-access panels & summary stats
	const totalNodes = nodeData.length;
	const batteryNeededList = $derived(nodeData.filter((d) => d.health.batteryPct < 20));
	const uncalibratedList = $derived(nodeData.filter((d) => d.health.calibrationStatus !== 'Calibrated'));
	const offlineList = $derived(nodeData.filter((d) => d.sensor.status === 'offline'));
	const highDriftList = $derived(nodeData.filter((d) => d.health.sensorDrift > driftThreshold));

	// Filtered and sorted table view
	const filteredRows = $derived(
		nodeData
			.filter((item) => {
				// Text search
				if (searchQuery.trim()) {
					const q = searchQuery.toLowerCase();
					const matches =
						item.sensor.id.toLowerCase().includes(q) ||
						item.sensor.name.toLowerCase().includes(q) ||
						item.sensor.type.toLowerCase().includes(q) ||
						item.regionName.toLowerCase().includes(q) ||
						item.health.calibrationStatus.toLowerCase().includes(q);
					if (!matches) return false;
				}

				// Region filter
				if (regionFilter !== 'all' && item.sensor.regionId !== regionFilter) {
					return false;
				}

				// Category issue filter
				if (statusFilter === 'offline' && item.sensor.status !== 'offline') return false;
				if (statusFilter === 'uncalibrated' && item.health.calibrationStatus === 'Calibrated') return false;
				if (statusFilter === 'low-battery' && item.health.batteryPct >= 20) return false;
				if (statusFilter === 'high-drift' && item.health.sensorDrift <= driftThreshold) return false;

				return true;
			})
			.sort((a, b) => {
				let valA: string | number = '';
				let valB: string | number = '';

				if (sortBy === 'id') {
					valA = a.sensor.id;
					valB = b.sensor.id;
				} else if (sortBy === 'batteryPct') {
					valA = a.health.batteryPct;
					valB = b.health.batteryPct;
				} else if (sortBy === 'signalStrength') {
					valA = a.health.signalStrength;
					valB = b.health.signalStrength;
				} else if (sortBy === 'sensorDrift') {
					valA = a.health.sensorDrift;
					valB = b.health.sensorDrift;
				} else if (sortBy === 'lastSeenAt') {
					valA = a.health.lastSeenAt;
					valB = b.health.lastSeenAt;
				} else if (sortBy === 'status') {
					valA = a.sensor.status;
					valB = b.sensor.status;
				} else if (sortBy === 'calibrationStatus') {
					valA = a.health.calibrationStatus;
					valB = b.health.calibrationStatus;
				}

				if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
				if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
				return 0;
			})
	);

	function setSort(col: typeof sortBy) {
		if (sortBy === col) {
			sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
		} else {
			sortBy = col;
			sortDirection = 'desc';
		}
	}

	function inspectNode(row: SensorHealthRow) {
		selectedRow = row;
		drawerOpen = true;
	}

	function formatLastSeen(timestamp: number): string {
		const diffMs = Date.now() - timestamp;
		const diffMin = Math.floor(diffMs / 60000);
		if (diffMin < 1) return 'Just now';
		if (diffMin < 60) return `${diffMin}m ago`;
		const diffHr = Math.floor(diffMin / 60);
		if (diffHr < 24) return `${diffHr}h ago`;
		const diffDays = Math.floor(diffHr / 24);
		return `${diffDays}d ago`;
	}

	function getSignalQuality(dbm: number): { label: string; color: string } {
		if (dbm >= -65) return { label: 'Excellent', color: 'var(--status-online)' };
		if (dbm >= -80) return { label: 'Good', color: 'var(--status-online)' };
		if (dbm >= -95) return { label: 'Fair', color: 'var(--status-warning)' };
		return { label: 'Poor', color: 'var(--status-critical)' };
	}

	function getSensorTypeBadge(type: SensorNode['type']) {
		switch (type) {
			case 'thermal': return { icon: '🔥', label: 'Thermal' };
			case 'smoke': return { icon: '💨', label: 'Smoke' };
			case 'wind': return { icon: '🌬️', label: 'Wind' };
			case 'humidity': return { icon: '💧', label: 'Humidity' };
			case 'co2': return { icon: '☁️', label: 'CO₂' };
			case 'seismic': return { icon: '📉', label: 'Seismic' };
			case 'visual': return { icon: '👁️', label: 'Visual' };
			case 'lidar': return { icon: '📡', label: 'LiDAR' };
			default: return { icon: '⚙️', label: type };
		}
	}
</script>

<svelte:head>
	<title>Maintenance Dashboard — EmberRoot</title>
	<meta name="description" content="Node health overview, sensor drift analysis, battery status, and calibration management for EmberRoot deployments." />
</svelte:head>

<PageShell
	title="Sensor Network Maintenance"
	subtitle="Node health overview, sensor drift analysis, battery diagnostics & calibration schedules"
	breadcrumb={['EmberRoot', 'Operations', 'Sensor Network']}
>
	<div class="maint-dashboard">
		<!-- ── Top Stats Cards Row ─────────────────────────────────────────── -->
		<div class="stats-grid">
			<Card padding="sm" class="stat-card">
				<div class="stat-card__icon stat-card__icon--total">
					<svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
					</svg>
				</div>
				<div class="stat-card__content">
					<span class="stat-card__label">Total Nodes</span>
					<span class="stat-card__value">{totalNodes}</span>
				</div>
			</Card>

			<Card padding="sm" class="stat-card {highDriftList.length > 0 ? 'stat-card--highlight-ember' : ''}">
				<div class="stat-card__icon stat-card__icon--drift">
					<svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
					</svg>
				</div>
				<div class="stat-card__content">
					<span class="stat-card__label">High Drift (&gt; {driftThreshold.toFixed(2)})</span>
					<div class="stat-card__value-row">
						<span class="stat-card__value {highDriftList.length > 0 ? 'text-ember' : ''}">{highDriftList.length}</span>
						{#if highDriftList.length > 0}
							<Badge variant="ember" size="sm">Attention</Badge>
						{/if}
					</div>
				</div>
			</Card>

			<Card padding="sm" class="stat-card {uncalibratedList.length > 0 ? 'stat-card--highlight-warning' : ''}">
				<div class="stat-card__icon stat-card__icon--calibration">
					<svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
					</svg>
				</div>
				<div class="stat-card__content">
					<span class="stat-card__label">Calibration Required</span>
					<div class="stat-card__value-row">
						<span class="stat-card__value {uncalibratedList.length > 0 ? 'text-warning' : ''}">{uncalibratedList.length}</span>
						{#if uncalibratedList.length > 0}
							<Badge variant="warning" size="sm">Action Req</Badge>
						{/if}
					</div>
				</div>
			</Card>

			<Card padding="sm" class="stat-card {batteryNeededList.length > 0 ? 'stat-card--highlight-critical' : ''}">
				<div class="stat-card__icon stat-card__icon--battery">
					<svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
					</svg>
				</div>
				<div class="stat-card__content">
					<span class="stat-card__label">Battery Low (&lt; 20%)</span>
					<div class="stat-card__value-row">
						<span class="stat-card__value {batteryNeededList.length > 0 ? 'text-critical' : ''}">{batteryNeededList.length}</span>
						{#if batteryNeededList.length > 0}
							<Badge variant="critical" size="sm">Replace</Badge>
						{/if}
					</div>
				</div>
			</Card>

			<Card padding="sm" class="stat-card {offlineList.length > 0 ? 'stat-card--highlight-offline' : ''}">
				<div class="stat-card__icon stat-card__icon--offline">
					<svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a5 5 0 010-7.072m0 0l2.829 2.829m-4.243-2.829L3 3" />
					</svg>
				</div>
				<div class="stat-card__content">
					<span class="stat-card__label">Offline Nodes</span>
					<div class="stat-card__value-row">
						<span class="stat-card__value {offlineList.length > 0 ? 'text-muted' : ''}">{offlineList.length}</span>
						{#if offlineList.length > 0}
							<Badge variant="neutral" size="sm">Offline</Badge>
						{/if}
					</div>
				</div>
			</Card>
		</div>

		<!-- ── Quick Maintenance Issues Grid ─────────────────────────────── -->
		<div class="issues-grid">
			<!-- 1. High Drift Card -->
			<Card padding="md" class="issue-card">
				<div class="issue-card__header">
					<div class="issue-card__title-row">
						<span class="issue-card__icon text-ember">📈</span>
						<div>
							<h3 class="issue-card__title">High Sensor Drift (&gt; {driftThreshold.toFixed(2)})</h3>
							<p class="issue-card__subtitle">{highDriftList.length} node(s) exceeding precision tolerance</p>
						</div>
					</div>
					<Button variant="secondary" size="sm" onclick={() => (statusFilter = 'high-drift')}>View All</Button>
				</div>

				<div class="issue-card__list">
					{#if highDriftList.length === 0}
						<div class="issue-card__empty">No nodes currently exceed drift threshold.</div>
					{:else}
						{#each highDriftList.slice(0, 4) as item}
							<div class="issue-item">
								<div class="issue-item__info">
									<span class="issue-item__id">{item.sensor.id} ({item.sensor.name})</span>
									<span class="issue-item__region">{item.regionName}</span>
								</div>
								<div class="issue-item__meta">
									<Badge variant="ember" size="sm">Drift: {item.health.sensorDrift.toFixed(2)}</Badge>
									<Button variant="ghost" size="sm" onclick={() => inspectNode(item)}>Inspect</Button>
								</div>
							</div>
						{/each}
					{/if}
				</div>
			</Card>

			<!-- 2. Uncalibrated Card -->
			<Card padding="md" class="issue-card">
				<div class="issue-card__header">
					<div class="issue-card__title-row">
						<span class="issue-card__icon text-warning">🛠️</span>
						<div>
							<h3 class="issue-card__title">Calibration Required</h3>
							<p class="issue-card__subtitle">{uncalibratedList.length} node(s) with uncalibrated status</p>
						</div>
					</div>
					<Button variant="secondary" size="sm" onclick={() => (statusFilter = 'uncalibrated')}>View All</Button>
				</div>

				<div class="issue-card__list">
					{#if uncalibratedList.length === 0}
						<div class="issue-card__empty">All sensors are fully calibrated.</div>
					{:else}
						{#each uncalibratedList.slice(0, 4) as item}
							<div class="issue-item">
								<div class="issue-item__info">
									<span class="issue-item__id">{item.sensor.id} ({item.sensor.name})</span>
									<span class="issue-item__note">{item.health.maintenanceRecommendation}</span>
								</div>
								<div class="issue-item__meta">
									<Badge variant={item.health.calibrationStatus === 'Recalibration Needed' ? 'critical' : 'warning'} size="sm">
										{item.health.calibrationStatus}
									</Badge>
									<Button variant="ghost" size="sm" onclick={() => triggerToast(`Calibration queued for ${item.sensor.id}`)}>Schedule</Button>
								</div>
							</div>
						{/each}
					{/if}
				</div>
			</Card>

			<!-- 3. Battery Replacements Card -->
			<Card padding="md" class="issue-card">
				<div class="issue-card__header">
					<div class="issue-card__title-row">
						<span class="issue-card__icon text-critical">⚡</span>
						<div>
							<h3 class="issue-card__title">Battery Replacements Needed</h3>
							<p class="issue-card__subtitle">{batteryNeededList.length} node(s) below 20% power threshold</p>
						</div>
					</div>
					<Button variant="secondary" size="sm" onclick={() => (statusFilter = 'low-battery')}>View All</Button>
				</div>

				<div class="issue-card__list">
					{#if batteryNeededList.length === 0}
						<div class="issue-card__empty">No battery replacements needed.</div>
					{:else}
						{#each batteryNeededList.slice(0, 4) as item}
							<div class="issue-item">
								<div class="issue-item__info">
									<span class="issue-item__id">{item.sensor.id} ({item.sensor.name})</span>
									<span class="issue-item__region">{item.regionName} · {formatLastSeen(item.health.lastSeenAt)}</span>
								</div>
								<div class="issue-item__meta">
									<span class="battery-tag text-critical">{item.health.batteryPct}%</span>
									<Button variant="ghost" size="sm" onclick={() => triggerToast(`Battery dispatch ticket created for ${item.sensor.id}`)}>Replace</Button>
								</div>
							</div>
						{/each}
					{/if}
				</div>
			</Card>

			<!-- 4. Offline Nodes Card -->
			<Card padding="md" class="issue-card">
				<div class="issue-card__header">
					<div class="issue-card__title-row">
						<span class="issue-card__icon text-muted">📡</span>
						<div>
							<h3 class="issue-card__title">Offline Nodes</h3>
							<p class="issue-card__subtitle">{offlineList.length} node(s) unreachable or powered down</p>
						</div>
					</div>
					<Button variant="secondary" size="sm" onclick={() => (statusFilter = 'offline')}>View All</Button>
				</div>

				<div class="issue-card__list">
					{#if offlineList.length === 0}
						<div class="issue-card__empty">All sensor nodes are currently online.</div>
					{:else}
						{#each offlineList.slice(0, 4) as item}
							<div class="issue-item">
								<div class="issue-item__info">
									<span class="issue-item__id">{item.sensor.id} ({item.sensor.name})</span>
									<span class="issue-item__region">{item.regionName} · Last seen {formatLastSeen(item.health.lastSeenAt)}</span>
								</div>
								<div class="issue-item__meta">
									<Badge variant="neutral" size="sm">Offline</Badge>
									<Button variant="ghost" size="sm" onclick={() => triggerToast(`Ping request transmitted to ${item.sensor.id}`)}>Ping</Button>
								</div>
							</div>
						{/each}
					{/if}
				</div>
			</Card>
		</div>

		<!-- ── Node Health Overview Table Section ──────────────────────────── -->
		<Card padding="none" class="table-card">
			<!-- Controls Header -->
			<div class="table-controls">
				<div class="table-controls__left">
					<div class="search-wrap">
						<SearchBar bind:value={searchQuery} placeholder="Search nodes by ID, name, region, type..." />
					</div>

					<div class="filter-tabs">
						<button class="filter-tab" class:filter-tab--active={statusFilter === 'all'} onclick={() => (statusFilter = 'all')}>
							All ({totalNodes})
						</button>
						<button class="filter-tab filter-tab--ember" class:filter-tab--active={statusFilter === 'high-drift'} onclick={() => (statusFilter = 'high-drift')}>
							High Drift ({highDriftList.length})
						</button>
						<button class="filter-tab filter-tab--warning" class:filter-tab--active={statusFilter === 'uncalibrated'} onclick={() => (statusFilter = 'uncalibrated')}>
							Calibration ({uncalibratedList.length})
						</button>
						<button class="filter-tab filter-tab--critical" class:filter-tab--active={statusFilter === 'low-battery'} onclick={() => (statusFilter = 'low-battery')}>
							Low Battery ({batteryNeededList.length})
						</button>
						<button class="filter-tab filter-tab--offline" class:filter-tab--active={statusFilter === 'offline'} onclick={() => (statusFilter = 'offline')}>
							Offline ({offlineList.length})
						</button>
					</div>
				</div>

				<div class="table-controls__right">
					<div class="drift-slider-box">
						<label for="drift-slider" class="drift-slider-label">
							Drift Threshold: <strong class="text-ember">&gt; {driftThreshold.toFixed(2)}</strong>
						</label>
						<input
							id="drift-slider"
							type="range"
							min="0.04"
							max="0.20"
							step="0.01"
							bind:value={driftThreshold}
							class="drift-range"
						/>
					</div>

					<select bind:value={regionFilter} class="region-select" aria-label="Filter by region">
						<option value="all">All Regions ({regions.length})</option>
						{#each regions as reg}
							<option value={reg.id}>{reg.name}</option>
						{/each}
					</select>
				</div>
			</div>

			<!-- Main Table -->
			<div class="table-container">
				<table class="health-table">
					<thead>
						<tr>
							<th onclick={() => setSort('id')} class="sortable">
								Sensor Node {sortBy === 'id' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
							</th>
							<th>Region</th>
							<th onclick={() => setSort('status')} class="sortable">
								Status {sortBy === 'status' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
							</th>
							<th onclick={() => setSort('batteryPct')} class="sortable">
								Battery {sortBy === 'batteryPct' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
							</th>
							<th onclick={() => setSort('signalStrength')} class="sortable">
								Signal {sortBy === 'signalStrength' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
							</th>
							<th onclick={() => setSort('calibrationStatus')} class="sortable">
								Calibration {sortBy === 'calibrationStatus' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
							</th>
							<th onclick={() => setSort('sensorDrift')} class="sortable">
								Sensor Drift {sortBy === 'sensorDrift' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
							</th>
							<th onclick={() => setSort('lastSeenAt')} class="sortable">
								Last Seen {sortBy === 'lastSeenAt' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
							</th>
							<th class="text-right">Actions</th>
						</tr>
					</thead>
					<tbody>
						{#if filteredRows.length === 0}
							<tr>
								<td colspan="9" class="table-empty">
									No sensor nodes match your current filters or search criteria.
								</td>
							</tr>
						{:else}
							{#each filteredRows as row}
								{@const isHighDrift = row.health.sensorDrift > driftThreshold}
								{@const isLowBattery = row.health.batteryPct < 20}
								{@const isUncalibrated = row.health.calibrationStatus !== 'Calibrated'}
								{@const typeMeta = getSensorTypeBadge(row.sensor.type)}
								{@const sigQual = getSignalQuality(row.health.signalStrength)}

								<tr
									class="health-row"
									class:health-row--high-drift={isHighDrift}
									class:health-row--low-battery={isLowBattery && !isHighDrift}
									class:health-row--offline={row.sensor.status === 'offline'}
									onclick={() => inspectNode(row)}
								>
									<!-- Sensor ID & Type -->
									<td>
										<div class="node-cell">
											<span class="type-icon" title={typeMeta.label}>{typeMeta.icon}</span>
											<div class="node-cell__meta">
												<span class="node-id">{row.sensor.id}</span>
												<span class="node-name">{row.sensor.name}</span>
											</div>
										</div>
									</td>

									<!-- Region -->
									<td>
										<span class="region-text">{row.regionName}</span>
									</td>

									<!-- Status -->
									<td>
										<StatusIndicator
											status={row.sensor.status}
											label={row.sensor.status}
											pulse={row.sensor.status === 'online'}
											size="sm"
										/>
									</td>

									<!-- Battery % -->
									<td>
										<div class="battery-cell">
											<ProgressBar
												value={row.health.batteryPct}
												size="sm"
												variant={row.health.batteryPct < 20 ? 'critical' : row.health.batteryPct < 40 ? 'warning' : 'online'}
											/>
											<span class="battery-pct-text" class:text-critical={isLowBattery}>
												{row.health.batteryPct}%
											</span>
										</div>
									</td>

									<!-- Signal -->
									<td>
										<div class="signal-cell" title="{row.health.signalStrength} dBm ({sigQual.label})">
											<span class="signal-dbm">{row.health.signalStrength} dBm</span>
											<span class="signal-badge" style="color: {sigQual.color}">{sigQual.label}</span>
										</div>
									</td>

									<!-- Calibration Status -->
									<td>
										<Badge
											variant={row.health.calibrationStatus === 'Calibrated' ? 'online' : row.health.calibrationStatus === 'Drifted' ? 'warning' : 'critical'}
											size="sm"
										>
											{row.health.calibrationStatus}
										</Badge>
									</td>

									<!-- Sensor Drift (Highlighted if > threshold) -->
									<td>
										<div class="drift-cell">
											<span class="drift-value" class:drift-value--highlight={isHighDrift}>
												{row.health.sensorDrift.toFixed(2)}
											</span>
											{#if isHighDrift}
												<Badge variant="ember" size="sm" class="drift-tag">&gt; THR</Badge>
											{/if}
										</div>
									</td>

									<!-- Last Seen -->
									<td>
										<span class="time-text">{formatLastSeen(row.health.lastSeenAt)}</span>
									</td>

									<!-- Actions -->
									<td class="text-right" onclick={(e) => e.stopPropagation()}>
										<Button variant="secondary" size="sm" onclick={() => inspectNode(row)}>
											Inspect
										</Button>
									</td>
								</tr>
							{/each}
						{/if}
					</tbody>
				</table>
			</div>
		</Card>

		<!-- ── Side Drawer Node Inspector ─────────────────────────────────── -->
		<SideDrawer bind:open={drawerOpen} title="Node Health Diagnostics" width="lg">
			{#if selectedRow}
				{@const r = selectedRow}
				{@const typeMeta = getSensorTypeBadge(r.sensor.type)}
				{@const isHighDrift = r.health.sensorDrift > driftThreshold}
				{@const sigQual = getSignalQuality(r.health.signalStrength)}

				<div class="drawer-content">
					<!-- Node Title Header -->
					<div class="drawer-header-card">
						<div class="drawer-header-card__top">
							<span class="drawer-header-card__icon">{typeMeta.icon}</span>
							<div>
								<h2 class="drawer-header-card__id">{r.sensor.id}</h2>
								<p class="drawer-header-card__sub">{r.sensor.name} · {typeMeta.label} Sensor</p>
							</div>
						</div>
						<div class="drawer-header-card__badges">
							<StatusIndicator status={r.sensor.status} label={r.sensor.status} pulse={r.sensor.status === 'online'} />
							<Badge variant={r.health.calibrationStatus === 'Calibrated' ? 'online' : 'warning'}>
								{r.health.calibrationStatus}
							</Badge>
						</div>
					</div>

					<!-- Key Metrics Grid -->
					<div class="drawer-metrics">
						<!-- Drift Meter Card -->
						<div class="drawer-metric-card {isHighDrift ? 'drawer-metric-card--alert' : ''}">
							<span class="drawer-metric-card__label">Sensor Drift Score</span>
							<div class="drawer-metric-card__val-row">
								<span class="drawer-metric-card__val {isHighDrift ? 'text-ember' : ''}">
									{r.health.sensorDrift.toFixed(2)}
								</span>
								<span class="drawer-metric-card__thr">Target &lt; {driftThreshold.toFixed(2)}</span>
							</div>
							<ProgressBar
								value={Math.min(100, (r.health.sensorDrift / 0.20) * 100)}
								size="sm"
								variant={isHighDrift ? 'ember' : 'online'}
							/>
							{#if isHighDrift}
								<p class="drawer-metric-card__warning-note">⚠️ Drift exceeds maintenance tolerance. Calibration baseline check required.</p>
							{/if}
						</div>

						<!-- Battery Diagnostic -->
						<div class="drawer-metric-card {r.health.batteryPct < 20 ? 'drawer-metric-card--critical' : ''}">
							<span class="drawer-metric-card__label">Battery State of Charge</span>
							<div class="drawer-metric-card__val-row">
								<span class="drawer-metric-card__val {r.health.batteryPct < 20 ? 'text-critical' : ''}">
									{r.health.batteryPct}%
								</span>
								<span class="drawer-metric-card__thr">{r.health.batteryPct < 20 ? 'Critical Low' : 'Normal'}</span>
							</div>
							<ProgressBar
								value={r.health.batteryPct}
								size="sm"
								variant={r.health.batteryPct < 20 ? 'critical' : r.health.batteryPct < 40 ? 'warning' : 'online'}
							/>
						</div>
					</div>

					<!-- Technical Specs List -->
					<div class="drawer-section">
						<h3 class="drawer-section__title">Hardware & Signal Specs</h3>
						<div class="spec-grid">
							<div class="spec-item">
								<span class="spec-label">Region</span>
								<span class="spec-value">{r.regionName} ({r.sensor.regionId})</span>
							</div>
							<div class="spec-item">
								<span class="spec-label">Firmware Version</span>
								<span class="spec-value font-mono">v{r.health.firmwareVersion}</span>
							</div>
							<div class="spec-item">
								<span class="spec-label">Signal Strength</span>
								<span class="spec-value font-mono">{r.health.signalStrength} dBm ({sigQual.label})</span>
							</div>
							<div class="spec-item">
								<span class="spec-label">Coordinates</span>
								<span class="spec-value font-mono">{r.sensor.location.lat.toFixed(4)}, {r.sensor.location.lon.toFixed(4)}</span>
							</div>
							<div class="spec-item">
								<span class="spec-label">Elevation</span>
								<span class="spec-value">{r.sensor.elevation} m ASL</span>
							</div>
							<div class="spec-item">
								<span class="spec-label">Last Telemetry</span>
								<span class="spec-value">{formatLastSeen(r.health.lastSeenAt)}</span>
							</div>
						</div>
					</div>

					<!-- Maintenance Recommendation -->
					<div class="drawer-section">
						<h3 class="drawer-section__title">Maintenance Action Notes</h3>
						<div class="recommendation-box">
							<span class="rec-icon">📋</span>
							<div class="rec-text">
								<strong class="rec-title">{r.health.maintenanceRecommendation}</strong>
								<p class="rec-desc">Scheduled diagnostic protocol for field robotics maintenance crew.</p>
							</div>
						</div>
					</div>

					<!-- Actions Footer -->
					<div class="drawer-actions">
						<Button variant="primary" onclick={() => triggerToast(`Field maintenance order dispatched for ${r.sensor.id}`)}>
							Dispatch Field Tech
						</Button>
						{#if r.health.calibrationStatus !== 'Calibrated' || isHighDrift}
							<Button variant="secondary" onclick={() => triggerToast(`Remote calibration initiated for ${r.sensor.id}`)}>
								Remote Recalibrate
							</Button>
						{/if}
						<Button variant="ghost" onclick={() => (drawerOpen = false)}>
							Close
						</Button>
					</div>
				</div>
			{/if}
		</SideDrawer>

		<!-- ── Notification Toast ────────────────────────────────────────── -->
		{#if toastMessage}
			<div class="toast-popup">
				<span class="toast-icon">ℹ️</span>
				<span class="toast-text">{toastMessage}</span>
			</div>
		{/if}
	</div>
</PageShell>

<style>
	.maint-dashboard {
		display: flex;
		flex-direction: column;
		gap: 24px;
	}

	/* ── Top Stats Cards Grid ────────────────────────────────────────── */
	.stats-grid {
		display: grid;
		grid-template-columns: repeat(5, 1fr);
		gap: 16px;
	}

	@media (max-width: 1200px) {
		.stats-grid {
			grid-template-columns: repeat(3, 1fr);
		}
	}
	@media (max-width: 768px) {
		.stats-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	.stat-card {
		display: flex;
		align-items: center;
		gap: 12px;
		transition: border-color var(--transition-fast), transform var(--transition-fast);
	}
	.stat-card:hover {
		border-color: var(--surface-muted);
		transform: translateY(-1px);
	}

	.stat-card--highlight-ember {
		border-color: rgba(240, 120, 64, 0.4);
		background: linear-gradient(135deg, var(--surface-base), rgba(240, 120, 64, 0.05));
	}
	.stat-card--highlight-warning {
		border-color: rgba(240, 179, 64, 0.4);
	}
	.stat-card--highlight-critical {
		border-color: rgba(240, 80, 80, 0.4);
	}
	.stat-card--highlight-offline {
		border-color: var(--surface-muted);
	}

	.stat-card__icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 38px;
		height: 38px;
		border-radius: 8px;
		background: var(--surface-overlay);
		color: var(--text-secondary);
		flex-shrink: 0;
	}
	.stat-card__icon--drift { color: var(--ember-300); background: rgba(240, 120, 64, 0.15); }
	.stat-card__icon--calibration { color: var(--status-warning); background: rgba(240, 179, 64, 0.15); }
	.stat-card__icon--battery { color: var(--status-critical); background: rgba(240, 80, 80, 0.15); }
	.stat-card__icon--offline { color: var(--text-muted); background: var(--surface-raised); }

	.stat-card__content {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
		flex: 1;
	}
	.stat-card__label {
		font-size: 11px;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-muted);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.stat-card__value-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
	}
	.stat-card__value {
		font-family: 'JetBrains Mono', monospace;
		font-size: 20px;
		font-weight: 700;
		color: var(--text-primary);
		line-height: 1.2;
	}

	/* ── Quick Issues Grid ───────────────────────────────────────────── */
	.issues-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 16px;
	}
	@media (max-width: 1024px) {
		.issues-grid {
			grid-template-columns: 1fr;
		}
	}

	.issue-card {
		display: flex;
		flex-direction: column;
		gap: 14px;
	}
	.issue-card__header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		border-bottom: 1px solid var(--surface-border);
		padding-bottom: 10px;
	}
	.issue-card__title-row {
		display: flex;
		align-items: center;
		gap: 10px;
	}
	.issue-card__icon {
		font-size: 18px;
	}
	.issue-card__title {
		font-size: 13px;
		font-weight: 600;
		color: var(--text-primary);
	}
	.issue-card__subtitle {
		font-size: 11px;
		color: var(--text-muted);
	}

	.issue-card__list {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.issue-card__empty {
		font-size: 12px;
		color: var(--text-muted);
		font-style: italic;
		padding: 12px 0;
		text-align: center;
	}

	.issue-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 8px 12px;
		border-radius: 6px;
		background: var(--surface-raised);
		border: 1px solid var(--surface-border);
	}
	.issue-item__info {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.issue-item__id {
		font-size: 12px;
		font-weight: 600;
		color: var(--text-primary);
		font-family: 'JetBrains Mono', monospace;
	}
	.issue-item__region, .issue-item__note {
		font-size: 11px;
		color: var(--text-secondary);
	}
	.issue-item__meta {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.battery-tag {
		font-family: 'JetBrains Mono', monospace;
		font-size: 12px;
		font-weight: 700;
	}

	/* ── Table Section ───────────────────────────────────────────────── */
	.table-card {
		overflow: hidden;
	}

	.table-controls {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 16px 20px;
		background: var(--surface-raised);
		border-bottom: 1px solid var(--surface-border);
		gap: 16px;
		flex-wrap: wrap;
	}
	.table-controls__left {
		display: flex;
		align-items: center;
		gap: 16px;
		flex: 1;
		flex-wrap: wrap;
	}
	.search-wrap {
		width: 280px;
	}

	.filter-tabs {
		display: flex;
		align-items: center;
		gap: 4px;
		background: var(--surface-base);
		padding: 3px;
		border-radius: 8px;
		border: 1px solid var(--surface-border);
	}
	.filter-tab {
		background: transparent;
		border: none;
		color: var(--text-muted);
		font-size: 11px;
		font-weight: 600;
		padding: 5px 10px;
		border-radius: 6px;
		cursor: pointer;
		transition: all var(--transition-fast);
		white-space: nowrap;
	}
	.filter-tab:hover {
		color: var(--text-primary);
	}
	.filter-tab--active {
		background: var(--surface-overlay);
		color: var(--text-primary);
	}
	.filter-tab--ember.filter-tab--active {
		background: rgba(240, 120, 64, 0.2);
		color: var(--ember-300);
	}
	.filter-tab--warning.filter-tab--active {
		background: rgba(240, 179, 64, 0.2);
		color: var(--status-warning);
	}
	.filter-tab--critical.filter-tab--active {
		background: rgba(240, 80, 80, 0.2);
		color: var(--status-critical);
	}

	.table-controls__right {
		display: flex;
		align-items: center;
		gap: 16px;
	}

	.drift-slider-box {
		display: flex;
		align-items: center;
		gap: 10px;
		background: var(--surface-base);
		padding: 6px 12px;
		border-radius: 8px;
		border: 1px solid var(--surface-border);
	}
	.drift-slider-label {
		font-size: 11px;
		color: var(--text-secondary);
		white-space: nowrap;
	}
	.drift-range {
		width: 90px;
		accent-color: var(--ember-400);
		cursor: pointer;
	}

	.region-select {
		background: var(--surface-base);
		border: 1px solid var(--surface-border);
		color: var(--text-primary);
		font-size: 12px;
		padding: 6px 10px;
		border-radius: 6px;
		outline: none;
		cursor: pointer;
	}
	.region-select:focus {
		border-color: var(--ember-400);
	}

	/* Table Layout */
	.table-container {
		overflow-x: auto;
	}
	.health-table {
		width: 100%;
		border-collapse: collapse;
		text-align: left;
		font-size: 12px;
	}
	.health-table th {
		background: var(--surface-base);
		color: var(--text-muted);
		font-size: 11px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		padding: 12px 16px;
		border-bottom: 1px solid var(--surface-border);
		white-space: nowrap;
	}
	.health-table th.sortable {
		cursor: pointer;
		user-select: none;
	}
	.health-table th.sortable:hover {
		color: var(--text-primary);
	}

	.health-row {
		border-bottom: 1px solid var(--surface-border);
		cursor: pointer;
		transition: background var(--transition-fast);
	}
	.health-row:hover {
		background: var(--surface-raised);
	}

	/* Row Highlighting for threshold breach */
	.health-row--high-drift {
		background: rgba(240, 120, 64, 0.08);
	}
	.health-row--high-drift:hover {
		background: rgba(240, 120, 64, 0.14);
	}

	.health-row--low-battery {
		background: rgba(240, 80, 80, 0.04);
	}

	.health-row--offline {
		opacity: 0.65;
	}

	.health-table td {
		padding: 12px 16px;
		vertical-align: middle;
	}

	.node-cell {
		display: flex;
		align-items: center;
		gap: 10px;
	}
	.type-icon {
		font-size: 16px;
	}
	.node-cell__meta {
		display: flex;
		flex-direction: column;
	}
	.node-id {
		font-family: 'JetBrains Mono', monospace;
		font-weight: 600;
		color: var(--text-primary);
	}
	.node-name {
		font-size: 11px;
		color: var(--text-muted);
	}

	.region-text {
		color: var(--text-secondary);
		font-weight: 500;
	}

	.battery-cell {
		display: flex;
		align-items: center;
		gap: 10px;
		width: 120px;
	}
	.battery-pct-text {
		font-family: 'JetBrains Mono', monospace;
		font-size: 11px;
		font-weight: 600;
		width: 32px;
		text-align: right;
	}

	.signal-cell {
		display: flex;
		flex-direction: column;
		gap: 1px;
	}
	.signal-dbm {
		font-family: 'JetBrains Mono', monospace;
		font-size: 11px;
		color: var(--text-primary);
	}
	.signal-badge {
		font-size: 10px;
		font-weight: 600;
	}

	.drift-cell {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.drift-value {
		font-family: 'JetBrains Mono', monospace;
		font-weight: 600;
		color: var(--text-primary);
	}
	.drift-value--highlight {
		color: var(--ember-300);
		font-weight: 700;
		font-size: 13px;
	}

	.time-text {
		color: var(--text-muted);
		font-size: 11px;
	}

	.table-empty {
		text-align: center;
		padding: 32px;
		color: var(--text-muted);
		font-style: italic;
	}

	/* ── Side Drawer Styling ─────────────────────────────────────────── */
	.drawer-content {
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	.drawer-header-card {
		display: flex;
		flex-direction: column;
		gap: 12px;
		padding: 16px;
		background: var(--surface-raised);
		border-radius: 8px;
		border: 1px solid var(--surface-border);
	}
	.drawer-header-card__top {
		display: flex;
		align-items: center;
		gap: 12px;
	}
	.drawer-header-card__icon {
		font-size: 24px;
	}
	.drawer-header-card__id {
		font-family: 'JetBrains Mono', monospace;
		font-size: 18px;
		font-weight: 700;
		color: var(--text-primary);
	}
	.drawer-header-card__sub {
		font-size: 12px;
		color: var(--text-muted);
	}
	.drawer-header-card__badges {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.drawer-metrics {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	.drawer-metric-card {
		display: flex;
		flex-direction: column;
		gap: 6px;
		padding: 12px 14px;
		background: var(--surface-raised);
		border: 1px solid var(--surface-border);
		border-radius: 8px;
	}
	.drawer-metric-card--alert {
		border-color: rgba(240, 120, 64, 0.5);
		background: rgba(240, 120, 64, 0.06);
	}
	.drawer-metric-card--critical {
		border-color: rgba(240, 80, 80, 0.5);
		background: rgba(240, 80, 80, 0.06);
	}
	.drawer-metric-card__label {
		font-size: 11px;
		font-weight: 600;
		text-transform: uppercase;
		color: var(--text-muted);
	}
	.drawer-metric-card__val-row {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
	}
	.drawer-metric-card__val {
		font-family: 'JetBrains Mono', monospace;
		font-size: 22px;
		font-weight: 700;
		color: var(--text-primary);
	}
	.drawer-metric-card__thr {
		font-size: 11px;
		color: var(--text-secondary);
	}
	.drawer-metric-card__warning-note {
		font-size: 11px;
		color: var(--ember-300);
		margin-top: 4px;
	}

	.drawer-section {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.drawer-section__title {
		font-size: 11px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--text-muted);
	}

	.spec-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 10px;
		background: var(--surface-raised);
		padding: 12px;
		border-radius: 8px;
		border: 1px solid var(--surface-border);
	}
	.spec-item {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.spec-label {
		font-size: 10px;
		color: var(--text-muted);
		text-transform: uppercase;
	}
	.spec-value {
		font-size: 12px;
		color: var(--text-primary);
		font-weight: 500;
	}

	.recommendation-box {
		display: flex;
		gap: 12px;
		background: var(--surface-raised);
		padding: 12px;
		border-radius: 8px;
		border: 1px solid var(--surface-border);
	}
	.rec-icon {
		font-size: 20px;
	}
	.rec-text {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.rec-title {
		font-size: 12px;
		color: var(--text-primary);
	}
	.rec-desc {
		font-size: 11px;
		color: var(--text-muted);
	}

	.drawer-actions {
		display: flex;
		flex-direction: column;
		gap: 8px;
		margin-top: 8px;
	}

	/* ── Toast ───────────────────────────────────────────────────────── */
	.toast-popup {
		position: fixed;
		bottom: 24px;
		right: 24px;
		background: var(--surface-overlay);
		border: 1px solid var(--ember-500);
		box-shadow: var(--glow-ember);
		color: var(--text-primary);
		padding: 12px 18px;
		border-radius: 8px;
		display: flex;
		align-items: center;
		gap: 10px;
		font-size: 12px;
		font-weight: 500;
		z-index: 100;
		animation: toastIn 200ms cubic-bezier(0.4, 0, 0.2, 1);
	}

	@keyframes toastIn {
		from { transform: translateY(100%); opacity: 0; }
		to { transform: translateY(0); opacity: 1; }
	}

	/* Utilities */
	.text-right { text-align: right; }
	.font-mono { font-family: 'JetBrains Mono', monospace; }
	.text-ember { color: var(--ember-300); }
	.text-warning { color: var(--status-warning); }
	.text-critical { color: var(--status-critical); }
	.text-muted { color: var(--text-muted); }
</style>
