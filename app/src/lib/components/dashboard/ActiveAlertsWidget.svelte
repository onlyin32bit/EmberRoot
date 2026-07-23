<!-- ActiveAlertsWidget — uses BarChart for severity breakdown -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { api, type ApiAlert } from '$lib/api';
	import BarChart from '$lib/components/charts/BarChart.svelte';
	import type { BarDef } from '$lib/components/charts';
	import Badge from '$lib/components/ui/Badge.svelte';
	import StatusIndicator from '$lib/components/ui/StatusIndicator.svelte';

	let alerts = $state<ApiAlert[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);

	async function loadAlerts() {
		try {
			loading = true;
			error = null;
			alerts = await api.getAlerts({ limit: 200 });
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load alerts';
		} finally {
			loading = false;
		}
	}

	const critical = $derived(alerts.filter((alert) => alert.level === 'warning').length);
	const high = $derived(alerts.filter((alert) => alert.level === 'suspicious').length);
	const medium = $derived(alerts.filter((alert) => alert.level === 'monitoring').length);
	const unack = $derived(alerts.filter((alert) => alert.state === 'open').length);

	const bars = $derived<BarDef[]>([
		{ id: 'critical', label: 'Critical', value: critical, color: 'var(--status-critical)', sub: 'Immediate action required' },
		{ id: 'high', label: 'High', value: high, color: 'var(--status-warning)', sub: 'Prompt attention needed' },
		{ id: 'medium', label: 'Medium', value: medium, color: 'var(--text-secondary)', sub: 'Monitor closely' },
		{ id: 'low', label: 'Low', value: 0, color: 'var(--surface-muted)', sub: 'Informational' },
	]);

	let selected = $state<BarDef | null>(null);

	onMount(() => {
		void loadAlerts();
		const poll = window.setInterval(() => void loadAlerts(), 30_000);
		return () => window.clearInterval(poll);
	});
</script>

<div class="aa">
	<div class="aa__header">
		<div class="aa__title-block">
			<div class="aa__title-row">
				{#if critical > 0}<StatusIndicator status="critical" pulse size="md" />{/if}
				<span class="aa__title">Active Alerts</span>
			</div>
			<span class="aa__subtitle">Open alerts: {unack}</span>
		</div>
		<span class="aa__total">{alerts.length}</span>
	</div>

	{#if loading}
		<div class="aa__loading">Loading alerts…</div>
	{:else if error}
		<div class="aa__error">{error}</div>
	{:else}
		<BarChart {bars} orientation="horizontal" showValues
			onBarClick={(b) => selected = selected?.id === b.id ? null : b} />

		{#if selected}
			<div class="aa__detail">
				<span class="aa__detail-label">{selected.label} alerts</span>
				<span class="aa__detail-count" style="color:{selected.color}">{selected.value}</span>
			</div>
		{/if}
	{/if}

	<div class="aa__footer">
		<a href="/alert-history" class="aa__link">
			View all
			<svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
			</svg>
		</a>
		{#if critical > 0}<Badge variant="critical">{critical} critical</Badge>{/if}
	</div>
</div>

<style>
	.aa { display: flex; flex-direction: column; gap: 14px; height: 100%; }
	.aa__header { display: flex; align-items: flex-start; justify-content: space-between; }
	.aa__title-block { display: flex; flex-direction: column; gap: 3px; }
	.aa__title-row { display: flex; align-items: center; gap: 6px; }
	.aa__title {
		font-size: 12px; font-weight: 600; letter-spacing: 0.06em;
		text-transform: uppercase; color: var(--text-primary);
	}
	.aa__subtitle { font-size: 10px; color: var(--text-muted); }
	.aa__total {
		font-family: 'JetBrains Mono', monospace;
		font-size: 44px; font-weight: 800; line-height: 1; letter-spacing: -2px;
		color: var(--text-primary);
	}
	.aa__detail {
		display: flex; align-items: center; justify-content: space-between;
		padding: 7px 10px; border-radius: 6px;
		background: var(--surface-raised); border: 1px solid var(--surface-border);
		font-size: 11px;
	}
	.aa__detail-label { color: var(--text-secondary); }
	.aa__detail-count {
		font-family: 'JetBrains Mono', monospace; font-size: 18px; font-weight: 700;
	}
	.aa__footer { display: flex; align-items: center; justify-content: space-between; margin-top: auto; }
	.aa__link {
		display: inline-flex; align-items: center; gap: 4px;
		font-size: 11px; color: var(--ember-300); text-decoration: none; font-weight: 500;
		transition: color var(--transition-fast);
	}
	.aa__link:hover { color: var(--ember-200); }
	.aa__loading, .aa__error {
		font-size: 11px;
		color: var(--text-muted);
	}
</style>
