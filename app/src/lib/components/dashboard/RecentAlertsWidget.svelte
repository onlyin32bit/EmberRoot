<!-- ─────────────────────────────────────────────────────────────────────────
  RecentAlertsWidget.svelte
  Scrollable list of the most recent alerts with severity, category, time.
───────────────────────────────────────────────────────────────────────────── -->
<script lang="ts">
	import { mockService } from '$lib/mock';
	import Badge from '$lib/components/ui/Badge.svelte';
	import StatusIndicator from '$lib/components/ui/StatusIndicator.svelte';
	import type { Alert } from '$lib/mock';

	const alerts = mockService.getAlerts().slice(0, 10);

	function timeAgo(ts: number): string {
		const diff = Date.now() - ts;
		const m = Math.floor(diff / 60_000);
		if (m < 60) return `${m}m ago`;
		const h = Math.floor(m / 60);
		if (h < 24) return `${h}h ago`;
		return `${Math.floor(h / 24)}d ago`;
	}

	function severityToStatus(s: Alert['severity']) {
		if (s === 'critical') return 'critical' as const;
		if (s === 'high')     return 'warning'  as const;
		return                       'online'   as const;
	}

	function categoryLabel(cat: string) {
		return cat.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
	}
</script>

<div class="ra">
	<div class="ra__header">
		<span class="ra__title">Recent Alerts</span>
		<a href="/alert-history" class="ra__all-link">See all</a>
	</div>

	<div class="ra__list" role="list">
		{#each alerts as alert (alert.id)}
			<div
				class="ra__item"
				class:ra__item--unread={!alert.acknowledged}
				role="listitem"
			>
				<div class="ra__item-indicator">
					<StatusIndicator
						status={severityToStatus(alert.severity)}
						pulse={!alert.acknowledged && alert.resolvedAt === null}
						size="sm"
					/>
				</div>
				<div class="ra__item-body">
					<div class="ra__item-title-row">
						<span class="ra__item-title">{alert.title}</span>
						{#if alert.resolvedAt === null}
							<Badge variant={alert.severity === 'critical' ? 'critical' : alert.severity === 'high' ? 'warning' : 'neutral'} size="sm">
								Active
							</Badge>
						{:else}
							<Badge variant="neutral" size="sm">Resolved</Badge>
						{/if}
					</div>
					<div class="ra__item-meta">
						<span class="ra__item-cat">{categoryLabel(alert.category)}</span>
						<span class="ra__item-dot" aria-hidden="true">·</span>
						<span class="ra__item-time">{timeAgo(alert.triggeredAt)}</span>
						{#if !alert.acknowledged}
							<span class="ra__item-dot" aria-hidden="true">·</span>
							<span class="ra__item-unack">Unacknowledged</span>
						{/if}
					</div>
				</div>
			</div>
		{/each}
	</div>
</div>

<style>
	.ra { display: flex; flex-direction: column; gap: 12px; height: 100%; }

	.ra__header {
		display: flex; align-items: center; justify-content: space-between;
	}
	.ra__title {
		font-size: 12px; font-weight: 600; letter-spacing: 0.06em;
		text-transform: uppercase; color: var(--text-primary);
	}
	.ra__all-link {
		font-size: 11px; color: var(--ember-300);
		text-decoration: none; font-weight: 500;
		transition: color var(--transition-fast);
	}
	.ra__all-link:hover { color: var(--ember-200); }

	.ra__list {
		display: flex; flex-direction: column;
		overflow-y: auto; flex: 1;
	}

	.ra__item {
		display: flex; align-items: flex-start; gap: 10px;
		padding: 10px 0;
		border-bottom: 1px solid var(--surface-border);
		transition: background var(--transition-fast);
		border-radius: 4px;
		padding: 8px 6px;
		margin: 0 -6px;
	}
	.ra__item:last-child { border-bottom: none; }
	.ra__item:hover { background: var(--surface-raised); }
	.ra__item--unread { border-left: 2px solid var(--ember-500); padding-left: 10px; margin-left: -6px; }

	.ra__item-indicator { padding-top: 3px; flex-shrink: 0; }

	.ra__item-body { display: flex; flex-direction: column; gap: 4px; min-width: 0; flex: 1; }

	.ra__item-title-row {
		display: flex; align-items: center; justify-content: space-between; gap: 8px;
	}
	.ra__item-title {
		font-size: 12px; font-weight: 500; color: var(--text-primary);
		white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
	}

	.ra__item-meta {
		display: flex; align-items: center; gap: 5px;
		font-size: 10px; color: var(--text-muted);
	}
	.ra__item-dot { opacity: 0.5; }
	.ra__item-cat { color: var(--text-secondary); }
	.ra__item-unack { color: var(--status-warning); font-weight: 500; }
</style>
