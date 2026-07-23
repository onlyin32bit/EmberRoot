<!-- ─────────────────────────────────────────────────────────────────────────
  RecentAlertsWidget.svelte
  Scrollable list of the most recent alerts with severity, category, time.
───────────────────────────────────────────────────────────────────────────── -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { api, type ApiAlert } from '$lib/api';
	import Badge from '$lib/components/ui/Badge.svelte';
	import StatusIndicator from '$lib/components/ui/StatusIndicator.svelte';

	let alerts = $state<ApiAlert[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);

	async function loadAlerts() {
		try {
			loading = true;
			error = null;
			const items = await api.getAlerts({ limit: 10 });
			alerts = items;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load recent alerts';
		} finally {
			loading = false;
		}
	}

	function timeAgo(ts: string): string {
		const diff = Date.now() - new Date(ts).getTime();
		const m = Math.floor(diff / 60_000);
		if (m < 60) return `${m}m ago`;
		const h = Math.floor(m / 60);
		if (h < 24) return `${h}h ago`;
		return `${Math.floor(h / 24)}d ago`;
	}

	function severityToStatus(level: ApiAlert['level']) {
		if (level === 'warning') return 'critical' as const;
		if (level === 'suspicious') return 'warning' as const;
		return 'online' as const;
	}

	onMount(() => {
		void loadAlerts();
		const poll = window.setInterval(() => void loadAlerts(), 30_000);
		return () => window.clearInterval(poll);
	});
</script>

<div class="ra">
	<div class="ra__header">
		<span class="ra__title">Recent Alerts</span>
		<a href="/alert-history" class="ra__all-link">See all</a>
	</div>

	{#if loading}
		<div class="ra__empty">Loading recent alerts…</div>
	{:else if error}
		<div class="ra__empty">{error}</div>
	{:else if alerts.length === 0}
		<div class="ra__empty">No alerts received yet.</div>
	{:else}
		<div class="ra__list" role="list">
			{#each alerts as alert (alert.id)}
				<div
					class="ra__item"
					class:ra__item--unread={alert.state === 'open'}
					role="listitem"
				>
					<div class="ra__item-indicator">
						<StatusIndicator
							status={severityToStatus(alert.level)}
							pulse={alert.state === 'open'}
							size="sm"
						/>
					</div>
					<div class="ra__item-body">
						<div class="ra__item-title-row">
							<span class="ra__item-title">{alert.node_name || alert.node_id}</span>
							{#if alert.state === 'open'}
								<Badge variant={alert.level === 'warning' ? 'critical' : alert.level === 'suspicious' ? 'warning' : 'neutral'} size="sm">
									Open
								</Badge>
							{:else}
								<Badge variant="neutral" size="sm">{alert.state}</Badge>
							{/if}
						</div>
						<div class="ra__item-meta">
							<span class="ra__item-cat">{alert.explanation}</span>
							<span class="ra__item-dot" aria-hidden="true">·</span>
							<span class="ra__item-time">{timeAgo(alert.created_at)}</span>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
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

	.ra__empty {
		font-size: 11px;
		color: var(--text-muted);
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
	.ra__item-cat { color: var(--text-secondary); flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
	.ra__item-unack { color: var(--status-warning); font-weight: 500; }
</style>
