<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import PageShell from '$lib/components/PageShell.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import StatusIndicator from '$lib/components/ui/StatusIndicator.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ProgressBar from '$lib/components/ui/ProgressBar.svelte';

	// ─────────────────────────────────────────────────────────────────────────────
	// Simulated Health & Latency State
	// ─────────────────────────────────────────────────────────────────────────────
	let backendLatency = $state(24);
	let gatewayLatency = $state(7);
	let dbLatency = $state(3);

	let lastSyncSeconds = $state(0);
	let isSyncing = $state(false);
	let totalSyncedPackets = $state(1482910);
	let lastSyncTimeStr = $state(new Date().toLocaleTimeString('en-US', { hour12: false }));

	interface LogEntry {
		id: number;
		time: string;
		level: 'INFO' | 'SYNC' | 'PING' | 'WARN';
		message: string;
	}

	let logs = $state<LogEntry[]>([
		{
			id: 1,
			time: new Date().toLocaleTimeString('en-US', { hour12: false }),
			level: 'INFO',
			message: 'System Status diagnostic suite initialized. All heartbeat monitors active.'
		},
		{
			id: 2,
			time: new Date().toLocaleTimeString('en-US', { hour12: false }),
			level: 'PING',
			message: 'Ingress Gateway handshake verified — 1,482 active node connections.'
		},
		{
			id: 3,
			time: new Date().toLocaleTimeString('en-US', { hour12: false }),
			level: 'SYNC',
			message: 'TimescaleDB persistence stream active — zero dropped frames.'
		}
	]);

	let logIdCounter = 4;
	let secondTimer: ReturnType<typeof setInterval> | null = null;
	let latencyTimer: ReturnType<typeof setInterval> | null = null;

	function triggerManualSync() {
		if (isSyncing) return;
		isSyncing = true;
		setTimeout(() => {
			lastSyncSeconds = 0;
			totalSyncedPackets += Math.floor(Math.random() * 25) + 35;
			lastSyncTimeStr = new Date().toLocaleTimeString('en-US', { hour12: false });
			isSyncing = false;
			addLog('SYNC', `Manual pulse completed — ${totalSyncedPackets.toLocaleString()} packets committed.`);
		}, 550);
	}

	function addLog(level: LogEntry['level'], message: string) {
		const newLog: LogEntry = {
			id: logIdCounter++,
			time: new Date().toLocaleTimeString('en-US', { hour12: false }),
			level,
			message
		};
		logs = [newLog, ...logs.slice(0, 15)];
	}

	onMount(() => {
		// Increment seconds since last sync
		secondTimer = setInterval(() => {
			lastSyncSeconds += 1;
			if (lastSyncSeconds >= 15) {
				lastSyncSeconds = 0;
				totalSyncedPackets += Math.floor(Math.random() * 20) + 30;
				lastSyncTimeStr = new Date().toLocaleTimeString('en-US', { hour12: false });
				addLog('SYNC', `Heartbeat auto-sync cycle executed (${totalSyncedPackets.toLocaleString()} total frames).`);
			}
		}, 1000);

		// Dynamic latency simulation every 2.2s
		latencyTimer = setInterval(() => {
			backendLatency = Math.max(14, Math.min(45, Math.round(backendLatency + (Math.random() * 6 - 3))));
			gatewayLatency = Math.max(4, Math.min(16, Math.round(gatewayLatency + (Math.random() * 4 - 2))));
			dbLatency = Math.max(1, Math.min(7, Math.round(dbLatency + (Math.random() * 2 - 1))));

			if (Math.random() > 0.65) {
				addLog(
					'PING',
					`Telemetry ping response: Backend ${backendLatency}ms | Gateway ${gatewayLatency}ms | DB ${dbLatency}ms`
				);
			}
		}, 2200);
	});

	onDestroy(() => {
		if (secondTimer) clearInterval(secondTimer);
		if (latencyTimer) clearInterval(latencyTimer);
	});

	const avgLatency = $derived(Math.round((backendLatency + gatewayLatency + dbLatency) / 3));

	const lastSyncText = $derived(
		lastSyncSeconds === 0 ? 'Just now' : `${lastSyncSeconds}s ago`
	);

	const countdownSeconds = $derived(Math.max(0, 15 - (lastSyncSeconds % 15)));
</script>

<svelte:head>
	<title>System Status — EmberRoot</title>
	<meta name="description" content="High-tech system status dashboard showing real-time latency, gateway telemetry, database health, and interval sync heartbeat." />
</svelte:head>

<PageShell
	title="System Status"
	subtitle="Live infrastructure diagnostics, subsystem latency metrics, and telemetry sync heartbeat"
	breadcrumb={['EmberRoot', 'Infrastructure', 'System Status']}
>
	<div class="sys-dash">
		<!-- ── Top Status Overview Bar ─────────────────────────────────────────── -->
		<Card variant="raised" padding="md" class="sys-dash__banner">
			<div class="sys-dash__banner-left">
				<div class="sys-dash__pulse-badge">
					<StatusIndicator status="online" pulse={true} size="lg" />
					<div class="sys-dash__banner-title-group">
						<span class="sys-dash__banner-status">ALL SUBSYSTEMS OPERATIONAL</span>
						<span class="sys-dash__banner-subtext">4 of 4 core modules synchronized · Zero critical alarms</span>
					</div>
				</div>
			</div>

			<div class="sys-dash__banner-stats">
				<div class="sys-dash__stat-pill">
					<span class="sys-dash__stat-label">AVG LATENCY</span>
					<span class="sys-dash__stat-value">{avgLatency} ms</span>
				</div>
				<div class="sys-dash__stat-pill">
					<span class="sys-dash__stat-label">INGRESS SPEED</span>
					<span class="sys-dash__stat-value">14.8 MB/s</span>
				</div>
				<div class="sys-dash__stat-pill">
					<span class="sys-dash__stat-label">UPTIME</span>
					<span class="sys-dash__stat-value">99.98%</span>
				</div>
				<Button variant="primary" size="sm" onclick={triggerManualSync} disabled={isSyncing}>
					{#if isSyncing}
						<span class="sys-dash__spin">↻</span> Syncing...
					{:else}
						⚡ Force Sync
					{/if}
				</Button>
			</div>
		</Card>

		<!-- ── Core 4 Status Cards Grid ────────────────────────────────────────── -->
		<div class="sys-dash__grid">
			<!-- CARD 1: BACKEND -->
			<Card variant="default" padding="md" class="sys-dash__card {backendLatency > 35 ? 'sys-dash__card--warn' : ''}">
				<div class="sys-dash__card-header">
					<div class="sys-dash__card-title-row">
						<div class="sys-dash__icon-box">
							<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
							</svg>
						</div>
						<div>
							<h3 class="sys-dash__card-title">Backend Core</h3>
							<span class="sys-dash__card-subtitle">Node.js API & Worker Nodes</span>
						</div>
					</div>
					<StatusIndicator status="online" pulse={true} label="Healthy" />
				</div>

				<div class="sys-dash__metric-block">
					<div class="sys-dash__latency-display">
						<span class="sys-dash__metric-num">{backendLatency}</span>
						<span class="sys-dash__metric-unit">ms</span>
					</div>
					<Badge variant="online" size="sm">RESPONSE OK</Badge>
				</div>

				<div class="sys-dash__sparkline-wrap" title="Simulated latency stability">
					<div class="sys-dash__bar-chart">
						<div class="sys-dash__bar" style="height: 60%"></div>
						<div class="sys-dash__bar" style="height: 75%"></div>
						<div class="sys-dash__bar" style="height: 50%"></div>
						<div class="sys-dash__bar" style="height: 90%"></div>
						<div class="sys-dash__bar" style="height: 65%"></div>
						<div class="sys-dash__bar sys-dash__bar--active" style="height: {(backendLatency / 50) * 100}%"></div>
					</div>
				</div>

				<div class="sys-dash__specs-list">
					<div class="sys-dash__spec-item">
						<span>Active Workers</span>
						<span class="sys-dash__spec-val">4 / 4 Nodes</span>
					</div>
					<div class="sys-dash__spec-item">
						<span>CPU Load</span>
						<span class="sys-dash__spec-val">18.4%</span>
					</div>
					<div class="sys-dash__spec-item">
						<span>Memory Usage</span>
						<span class="sys-dash__spec-val">412 MB / 1 GB</span>
					</div>
				</div>
			</Card>

			<!-- CARD 2: GATEWAY -->
			<Card variant="default" padding="md" class="sys-dash__card">
				<div class="sys-dash__card-header">
					<div class="sys-dash__card-title-row">
						<div class="sys-dash__icon-box">
							<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071a10 10 0 0114.142 0M2.828 9.9a15 15 0 0121.344 0" />
							</svg>
						</div>
						<div>
							<h3 class="sys-dash__card-title">Edge Gateway</h3>
							<span class="sys-dash__card-subtitle">MQTT & WebSocket Broker</span>
						</div>
					</div>
					<StatusIndicator status="online" pulse={true} label="Operational" />
				</div>

				<div class="sys-dash__metric-block">
					<div class="sys-dash__latency-display">
						<span class="sys-dash__metric-num">{gatewayLatency}</span>
						<span class="sys-dash__metric-unit">ms</span>
					</div>
					<Badge variant="online" size="sm">INGRESS ACTIVE</Badge>
				</div>

				<div class="sys-dash__sparkline-wrap">
					<div class="sys-dash__bar-chart">
						<div class="sys-dash__bar" style="height: 40%"></div>
						<div class="sys-dash__bar" style="height: 45%"></div>
						<div class="sys-dash__bar" style="height: 30%"></div>
						<div class="sys-dash__bar" style="height: 50%"></div>
						<div class="sys-dash__bar" style="height: 35%"></div>
						<div class="sys-dash__bar sys-dash__bar--active" style="height: {(gatewayLatency / 20) * 100}%"></div>
					</div>
				</div>

				<div class="sys-dash__specs-list">
					<div class="sys-dash__spec-item">
						<span>Sensor Connections</span>
						<span class="sys-dash__spec-val">1,482 Active</span>
					</div>
					<div class="sys-dash__spec-item">
						<span>Packet Loss Rate</span>
						<span class="sys-dash__spec-val">0.0001%</span>
					</div>
					<div class="sys-dash__spec-item">
						<span>Edge Relay Relays</span>
						<span class="sys-dash__spec-val">3 Geographic Relays</span>
					</div>
				</div>
			</Card>

			<!-- CARD 3: DATABASE -->
			<Card variant="default" padding="md" class="sys-dash__card">
				<div class="sys-dash__card-header">
					<div class="sys-dash__card-title-row">
						<div class="sys-dash__icon-box">
							<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
							</svg>
						</div>
						<div>
							<h3 class="sys-dash__card-title">Database</h3>
							<span class="sys-dash__card-subtitle">TimescaleDB Cluster</span>
						</div>
					</div>
					<StatusIndicator status="online" pulse={true} label="Healthy" />
				</div>

				<div class="sys-dash__metric-block">
					<div class="sys-dash__latency-display">
						<span class="sys-dash__metric-num">{dbLatency}</span>
						<span class="sys-dash__metric-unit">ms</span>
					</div>
					<Badge variant="online" size="sm">READ/WRITE FAST</Badge>
				</div>

				<div class="sys-dash__sparkline-wrap">
					<div class="sys-dash__bar-chart">
						<div class="sys-dash__bar" style="height: 25%"></div>
						<div class="sys-dash__bar" style="height: 30%"></div>
						<div class="sys-dash__bar" style="height: 20%"></div>
						<div class="sys-dash__bar" style="height: 35%"></div>
						<div class="sys-dash__bar" style="height: 25%"></div>
						<div class="sys-dash__bar sys-dash__bar--active" style="height: {(dbLatency / 10) * 100}%"></div>
					</div>
				</div>

				<div class="sys-dash__specs-list">
					<div class="sys-dash__spec-item">
						<span>Active Connections</span>
						<span class="sys-dash__spec-val">24 / 100</span>
					</div>
					<div class="sys-dash__spec-item">
						<span>Storage Utilized</span>
						<span class="sys-dash__spec-val">342.6 GB / 2 TB</span>
					</div>
					<div class="sys-dash__spec-item">
						<span>Replication Lag</span>
						<span class="sys-dash__spec-val">&lt; 1 ms</span>
					</div>
				</div>
			</Card>

			<!-- CARD 4: LAST SYNC -->
			<Card variant="default" padding="md" class="sys-dash__card sys-dash__card--sync {isSyncing ? 'sys-dash__card--syncing' : ''}">
				<div class="sys-dash__card-header">
					<div class="sys-dash__card-title-row">
						<div class="sys-dash__icon-box sys-dash__icon-box--ember">
							<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
							</svg>
						</div>
						<div>
							<h3 class="sys-dash__card-title">Last Sync</h3>
							<span class="sys-dash__card-subtitle">Heartbeat Cycle</span>
						</div>
					</div>
					<StatusIndicator
						status={isSyncing ? 'warning' : 'online'}
						pulse={true}
						label={isSyncing ? 'Syncing...' : 'In Sync'}
					/>
				</div>

				<div class="sys-dash__metric-block">
					<div class="sys-dash__latency-display">
						<span class="sys-dash__metric-num sys-dash__metric-num--accent">{lastSyncText}</span>
					</div>
					<Badge variant={lastSyncSeconds > 10 ? 'warning' : 'ember'} size="sm">
						{lastSyncTimeStr}
					</Badge>
				</div>

				<!-- Countdown progress bar -->
				<div class="sys-dash__sync-progress">
					<ProgressBar
						value={15 - countdownSeconds}
						max={15}
						label={`Next auto-sync in ${countdownSeconds}s`}
						variant="ember"
						size="sm"
					/>
				</div>

				<div class="sys-dash__specs-list">
					<div class="sys-dash__spec-item">
						<span>Total Packets Synced</span>
						<span class="sys-dash__spec-val sys-dash__mono">{totalSyncedPackets.toLocaleString()}</span>
					</div>
					<div class="sys-dash__spec-item">
						<span>Sync Interval</span>
						<span class="sys-dash__spec-val">15 seconds</span>
					</div>
					<div class="sys-dash__spec-item">
						<span>Pending Queue</span>
						<span class="sys-dash__spec-val">0 msgs</span>
					</div>
				</div>
			</Card>
		</div>

		<!-- ── Middle Row: Subservices Matrix + Live Diagnostics Console ──────────── -->
		<div class="sys-dash__bottom-row">
			<!-- Subservice Health Breakdown Matrix -->
			<Card variant="raised" padding="md" class="sys-dash__matrix-card">
				<div class="sys-dash__section-title">
					<h3>Subservice Endpoint Matrix</h3>
					<Badge variant="neutral" size="sm">6 MONITORED</Badge>
				</div>

				<div class="sys-dash__matrix-table">
					<div class="sys-dash__matrix-header">
						<span>SERVICE NAME</span>
						<span>ENDPOINT</span>
						<span>STATUS</span>
						<span>LATENCY</span>
					</div>

					<div class="sys-dash__matrix-row">
						<div class="sys-dash__matrix-name">
							<StatusIndicator status="online" size="sm" />
							<span>Auth & IAM Guard</span>
						</div>
						<code class="sys-dash__code">/api/v1/auth</code>
						<span class="sys-dash__badge-ok">200 OK</span>
						<span class="sys-dash__mono">{Math.round(backendLatency * 0.6)} ms</span>
					</div>

					<div class="sys-dash__matrix-row">
						<div class="sys-dash__matrix-name">
							<StatusIndicator status="online" size="sm" />
							<span>Telemetry Pipeline</span>
						</div>
						<code class="sys-dash__code">/api/v1/telemetry</code>
						<span class="sys-dash__badge-ok">200 OK</span>
						<span class="sys-dash__mono">{gatewayLatency} ms</span>
					</div>

					<div class="sys-dash__matrix-row">
						<div class="sys-dash__matrix-name">
							<StatusIndicator status="online" size="sm" />
							<span>Spatial Mapping Server</span>
						</div>
						<code class="sys-dash__code">/api/v1/spatial</code>
						<span class="sys-dash__badge-ok">200 OK</span>
						<span class="sys-dash__mono">{Math.round(backendLatency * 1.2)} ms</span>
					</div>

					<div class="sys-dash__matrix-row">
						<div class="sys-dash__matrix-name">
							<StatusIndicator status="online" size="sm" />
							<span>Alert Evaluation Engine</span>
						</div>
						<code class="sys-dash__code">/api/v1/alerts/evaluate</code>
						<span class="sys-dash__badge-ok">200 OK</span>
						<span class="sys-dash__mono">{Math.round(backendLatency * 0.5)} ms</span>
					</div>

					<div class="sys-dash__matrix-row">
						<div class="sys-dash__matrix-name">
							<StatusIndicator status="warning" size="sm" />
							<span>FIRMS Satellite Ingest</span>
						</div>
						<code class="sys-dash__code">/ext/nasa-firm</code>
						<span class="sys-dash__badge-warn">CACHE ONLY</span>
						<span class="sys-dash__mono">142 ms</span>
					</div>

					<div class="sys-dash__matrix-row">
						<div class="sys-dash__matrix-name">
							<StatusIndicator status="online" size="sm" />
							<span>Drone Swarm Telemetry</span>
						</div>
						<code class="sys-dash__code">/ws/drone-relay</code>
						<span class="sys-dash__badge-ok">200 OK</span>
						<span class="sys-dash__mono">{gatewayLatency + 3} ms</span>
					</div>
				</div>
			</Card>

			<!-- Live Log Console -->
			<Card variant="raised" padding="md" class="sys-dash__log-card">
				<div class="sys-dash__section-title">
					<div class="sys-dash__log-title">
						<span class="sys-dash__terminal-dot"></span>
						<h3>Diagnostic Stream Log</h3>
					</div>
					<Badge variant="ember" size="sm">LIVE STREAM</Badge>
				</div>

				<div class="sys-dash__terminal">
					{#each logs as log (log.id)}
						<div class="sys-dash__log-item">
							<span class="sys-dash__log-time">[{log.time}]</span>
							<span class="sys-dash__log-level sys-dash__log-level--{log.level}">{log.level}</span>
							<span class="sys-dash__log-msg">{log.message}</span>
						</div>
					{/each}
				</div>
			</Card>
		</div>
	</div>
</PageShell>

<style>
	.sys-dash {
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	/* ── Top Overview Banner ────────────────────────────────────────────── */
	:global(.sys-dash__banner) {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		flex-wrap: wrap;
		background: linear-gradient(135deg, rgba(22, 28, 34, 0.9) 0%, rgba(16, 21, 25, 0.95) 100%);
		border: 1px solid var(--surface-border);
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
	}

	.sys-dash__pulse-badge {
		display: flex;
		align-items: center;
		gap: 14px;
	}

	.sys-dash__banner-title-group {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.sys-dash__banner-status {
		font-size: 13px;
		font-weight: 700;
		letter-spacing: 0.08em;
		color: var(--status-online);
	}

	.sys-dash__banner-subtext {
		font-size: 12px;
		color: var(--text-secondary);
	}

	.sys-dash__banner-stats {
		display: flex;
		align-items: center;
		gap: 16px;
		flex-wrap: wrap;
	}

	.sys-dash__stat-pill {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		padding: 4px 12px;
		background: var(--surface-base);
		border: 1px solid var(--surface-border);
		border-radius: 6px;
	}

	.sys-dash__stat-label {
		font-size: 9px;
		font-weight: 600;
		letter-spacing: 0.08em;
		color: var(--text-muted);
	}

	.sys-dash__stat-value {
		font-family: 'JetBrains Mono', monospace;
		font-size: 13px;
		font-weight: 600;
		color: var(--text-primary);
	}

	.sys-dash__spin {
		display: inline-block;
		animation: sys-spin 1s linear infinite;
	}

	@keyframes sys-spin {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
	}

	/* ── 4 Primary Cards Grid ────────────────────────────────────────────── */
	.sys-dash__grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
		gap: 16px;
	}

	:global(.sys-dash__card) {
		display: flex;
		flex-direction: column;
		gap: 16px;
		transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
	}

	:global(.sys-dash__card:hover) {
		border-color: var(--surface-muted);
	}

	:global(.sys-dash__card--syncing) {
		border-color: var(--ember-400) !important;
		box-shadow: var(--glow-ember) !important;
	}

	.sys-dash__card-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 8px;
	}

	.sys-dash__card-title-row {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.sys-dash__icon-box {
		width: 34px;
		height: 34px;
		border-radius: 6px;
		background: var(--surface-raised);
		border: 1px solid var(--surface-border);
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--text-secondary);
		flex-shrink: 0;
	}

	.sys-dash__icon-box--ember {
		color: var(--ember-400);
		background: rgba(240, 120, 64, 0.1);
		border-color: rgba(240, 120, 64, 0.3);
	}

	.sys-dash__card-title {
		font-size: 14px;
		font-weight: 600;
		color: var(--text-primary);
		line-height: 1.2;
	}

	.sys-dash__card-subtitle {
		font-size: 11px;
		color: var(--text-muted);
	}

	.sys-dash__metric-block {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		margin-top: 4px;
	}

	.sys-dash__latency-display {
		display: flex;
		align-items: baseline;
		gap: 4px;
	}

	.sys-dash__metric-num {
		font-family: 'JetBrains Mono', monospace;
		font-size: 28px;
		font-weight: 700;
		color: var(--text-primary);
		letter-spacing: -0.5px;
		line-height: 1;
	}

	.sys-dash__metric-num--accent {
		color: var(--ember-300);
		font-size: 24px;
	}

	.sys-dash__metric-unit {
		font-size: 12px;
		font-weight: 500;
		color: var(--text-muted);
	}

	/* Sparkline Mini Bar Visual */
	.sys-dash__sparkline-wrap {
		height: 32px;
		background: var(--surface-bg);
		border: 1px solid var(--surface-border);
		border-radius: 4px;
		padding: 4px 8px;
		display: flex;
		align-items: flex-end;
	}

	.sys-dash__bar-chart {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: flex-end;
		gap: 4px;
	}

	.sys-dash__bar {
		flex: 1;
		background: var(--surface-muted);
		border-radius: 2px 2px 0 0;
		transition: height 300ms ease;
	}

	.sys-dash__bar--active {
		background: var(--status-online);
		box-shadow: 0 0 6px rgba(34, 211, 160, 0.5);
	}

	/* Tech Specs List */
	.sys-dash__specs-list {
		display: flex;
		flex-direction: column;
		gap: 6px;
		padding-top: 10px;
		border-top: 1px dashed var(--surface-border);
	}

	.sys-dash__spec-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 11px;
		color: var(--text-muted);
	}

	.sys-dash__spec-val {
		color: var(--text-secondary);
		font-weight: 500;
	}

	.sys-dash__mono {
		font-family: 'JetBrains Mono', monospace;
	}

	.sys-dash__sync-progress {
		margin-top: -4px;
	}

	/* ── Bottom Section ─────────────────────────────────────────────────── */
	.sys-dash__bottom-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 16px;
	}

	@media (max-width: 900px) {
		.sys-dash__bottom-row {
			grid-template-columns: 1fr;
		}
	}

	:global(.sys-dash__matrix-card),
	:global(.sys-dash__log-card) {
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	.sys-dash__section-title {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.sys-dash__section-title h3 {
		font-size: 13px;
		font-weight: 600;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: var(--text-secondary);
	}

	/* Matrix Table */
	.sys-dash__matrix-table {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.sys-dash__matrix-header {
		display: grid;
		grid-template-columns: 1.5fr 1.5fr 1fr 0.8fr;
		font-size: 10px;
		font-weight: 600;
		letter-spacing: 0.08em;
		color: var(--text-muted);
		padding: 4px 8px;
		border-bottom: 1px solid var(--surface-border);
	}

	.sys-dash__matrix-row {
		display: grid;
		grid-template-columns: 1.5fr 1.5fr 1fr 0.8fr;
		align-items: center;
		padding: 6px 8px;
		background: var(--surface-base);
		border: 1px solid var(--surface-border);
		border-radius: 4px;
		font-size: 12px;
	}

	.sys-dash__matrix-name {
		display: flex;
		align-items: center;
		gap: 8px;
		color: var(--text-primary);
		font-weight: 500;
	}

	.sys-dash__code {
		font-family: 'JetBrains Mono', monospace;
		font-size: 11px;
		color: var(--ember-300);
	}

	.sys-dash__badge-ok {
		font-size: 10px;
		font-weight: 600;
		color: var(--status-online);
	}

	.sys-dash__badge-warn {
		font-size: 10px;
		font-weight: 600;
		color: var(--status-warning);
	}

	/* Terminal Log Stream */
	.sys-dash__log-title {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.sys-dash__terminal-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--ember-400);
		box-shadow: var(--glow-ember);
	}

	.sys-dash__terminal {
		background: #080b0e;
		border: 1px solid var(--surface-border);
		border-radius: 6px;
		padding: 12px;
		font-family: 'JetBrains Mono', monospace;
		font-size: 11px;
		height: 220px;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.sys-dash__log-item {
		display: flex;
		align-items: flex-start;
		gap: 8px;
		line-height: 1.4;
	}

	.sys-dash__log-time {
		color: var(--text-muted);
		flex-shrink: 0;
	}

	.sys-dash__log-level {
		font-weight: 700;
		font-size: 9px;
		padding: 1px 4px;
		border-radius: 3px;
		flex-shrink: 0;
	}

	.sys-dash__log-level--INFO { background: rgba(143, 163, 179, 0.15); color: var(--text-secondary); }
	.sys-dash__log-level--SYNC { background: rgba(240, 120, 64, 0.2); color: var(--ember-300); }
	.sys-dash__log-level--PING { background: rgba(34, 211, 160, 0.15); color: var(--status-online); }
	.sys-dash__log-level--WARN { background: rgba(240, 179, 64, 0.2); color: var(--status-warning); }

	.sys-dash__log-msg {
		color: var(--text-primary);
		word-break: break-word;
	}
</style>
