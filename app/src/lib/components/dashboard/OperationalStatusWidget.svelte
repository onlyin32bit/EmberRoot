<!-- ─────────────────────────────────────────────────────────────────────────
  OperationalStatusWidget.svelte
  Shows system-wide health: sensor online/offline counts + region risk totals.
───────────────────────────────────────────────────────────────────────────── -->
<script lang="ts">
	import { mockService } from '$lib/mock';
	import StatusIndicator from '$lib/components/ui/StatusIndicator.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';

	const stats = mockService.getSummaryStats();
	const regions = mockService.getRegions();
	const highRisk = regions.filter(r => r.riskLevel === 'critical' || r.riskLevel === 'high').length;
	const allOnline = stats.offlineSensors === 0 && stats.criticalSensors === 0;
	const systemLabel = stats.criticalAlerts > 0 ? 'Elevated' : allOnline ? 'All Systems Nominal' : 'Degraded';
	const systemStatus = stats.criticalAlerts > 0 ? 'critical' : allOnline ? 'online' : 'warning';
	const total = stats.totalSensors || 1;
</script>

<div class="ops-status">
	<div class="ops-status__header">
		<div class="ops-status__title-row">
			<StatusIndicator status={systemStatus} pulse size="lg" />
			<span class="ops-status__title">Operational Status</span>
		</div>
		<Badge variant={systemStatus === 'online' ? 'online' : systemStatus === 'warning' ? 'warning' : 'critical'}>
			{systemLabel}
		</Badge>
	</div>

	<div class="ops-status__grid">
		<div class="ops-status__stat">
			<span class="ops-status__stat-value ops-status__stat-value--online">{stats.onlineSensors}</span>
			<span class="ops-status__stat-label">Online</span>
		</div>
		<div class="ops-status__stat">
			<span class="ops-status__stat-value ops-status__stat-value--warning">{stats.warningSensors}</span>
			<span class="ops-status__stat-label">Warning</span>
		</div>
		<div class="ops-status__stat">
			<span class="ops-status__stat-value ops-status__stat-value--critical">{stats.offlineSensors + stats.criticalSensors}</span>
			<span class="ops-status__stat-label">Offline/Crit</span>
		</div>
		<div class="ops-status__stat">
			<span class="ops-status__stat-value ops-status__stat-value--ember">{highRisk}</span>
			<span class="ops-status__stat-label">High Risk Zones</span>
		</div>
	</div>

	<!-- Sensor health bar -->
	<div class="ops-status__bar-wrap" title="Sensor fleet health distribution">
		<div class="ops-status__bar">
			<div class="ops-status__bar-seg ops-status__bar-seg--online"  style="width:{(stats.onlineSensors   /total*100).toFixed(1)}%"></div>
			<div class="ops-status__bar-seg ops-status__bar-seg--warning" style="width:{(stats.warningSensors  /total*100).toFixed(1)}%"></div>
			<div class="ops-status__bar-seg ops-status__bar-seg--critical"style="width:{((stats.criticalSensors+stats.offlineSensors)/total*100).toFixed(1)}%"></div>
		</div>
		<div class="ops-status__bar-legend">
			<span class="ops-status__legend-dot ops-status__legend-dot--online"></span>Online
			<span class="ops-status__legend-dot ops-status__legend-dot--warning"></span>Warning
			<span class="ops-status__legend-dot ops-status__legend-dot--critical"></span>Critical/Offline
		</div>
	</div>

	<p class="ops-status__regions-note">
		<svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
		{stats.totalRegions} monitored regions — {highRisk} at elevated risk
	</p>
</div>

<style>
	.ops-status {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.ops-status__header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
	}
	.ops-status__title-row {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.ops-status__title {
		font-size: 13px;
		font-weight: 600;
		color: var(--text-primary);
		letter-spacing: 0.01em;
	}

	.ops-status__grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 12px;
	}
	.ops-status__stat {
		display: flex;
		flex-direction: column;
		gap: 3px;
	}
	.ops-status__stat-value {
		font-family: 'JetBrains Mono', monospace;
		font-size: 22px;
		font-weight: 700;
		line-height: 1;
	}
	.ops-status__stat-value--online   { color: var(--status-online); }
	.ops-status__stat-value--warning  { color: var(--status-warning); }
	.ops-status__stat-value--critical { color: var(--status-critical); }
	.ops-status__stat-value--ember    { color: var(--ember-300); }
	.ops-status__stat-label {
		font-size: 10px;
		font-weight: 500;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--text-muted);
	}

	/* Health bar */
	.ops-status__bar-wrap {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.ops-status__bar {
		display: flex;
		height: 6px;
		border-radius: 3px;
		overflow: hidden;
		background: var(--surface-overlay);
		gap: 1px;
	}
	.ops-status__bar-seg { height: 100%; transition: width 600ms ease; }
	.ops-status__bar-seg--online   { background: var(--status-online); }
	.ops-status__bar-seg--warning  { background: var(--status-warning); }
	.ops-status__bar-seg--critical { background: var(--status-critical); }

	.ops-status__bar-legend {
		display: flex;
		align-items: center;
		gap: 10px;
		font-size: 10px;
		color: var(--text-muted);
	}
	.ops-status__legend-dot {
		display: inline-block;
		width: 7px; height: 7px;
		border-radius: 50%;
	}
	.ops-status__legend-dot--online   { background: var(--status-online); }
	.ops-status__legend-dot--warning  { background: var(--status-warning); }
	.ops-status__legend-dot--critical { background: var(--status-critical); }

	.ops-status__regions-note {
		display: flex;
		align-items: center;
		gap: 5px;
		font-size: 11px;
		color: var(--text-muted);
		margin: 0;
	}
	.ops-status__regions-note svg { flex-shrink: 0; color: var(--text-muted); }
</style>
