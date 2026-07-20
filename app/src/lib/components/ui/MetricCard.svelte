<!-- ────────────────────────────────────────────────────────────────
  MetricCard.svelte — EmberRoot Design System
  A KPI-focused card: label, value, unit, trend, optional icon.
──────────────────────────────────────────────────────────────── -->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import Card from './Card.svelte';

	interface Props {
		title: string;
		value: string | number;
		unit?: string;
		trend?: 'up' | 'down' | 'neutral';
		trendValue?: string;
		icon?: Snippet;
		class?: string;
	}

	let { title, value, unit, trend, trendValue, icon, class: className = '' }: Props = $props();
</script>

<Card class="er-metric {className}" padding="md">
	<div class="er-metric__header">
		<span class="er-metric__label">{title}</span>
		{#if icon}
			<div class="er-metric__icon">{@render icon()}</div>
		{/if}
	</div>

	<div class="er-metric__value-row">
		<span class="er-metric__value">{value}</span>
		{#if unit}
			<span class="er-metric__unit">{unit}</span>
		{/if}
	</div>

	{#if trend || trendValue}
		<div class="er-metric__trend er-metric__trend--{trend ?? 'neutral'}">
			{#if trend === 'up'}
				<svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 10l7-7m0 0l7 7m-7-7v18" />
				</svg>
			{:else if trend === 'down'}
				<svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
				</svg>
			{:else}
				<svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 12h14" />
				</svg>
			{/if}
			{#if trendValue}
				<span>{trendValue}</span>
			{/if}
		</div>
	{/if}
</Card>

<style>
	:global(.er-metric) {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.er-metric__header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.er-metric__label {
		font-size: 11px;
		font-weight: 500;
		letter-spacing: 0.07em;
		text-transform: uppercase;
		color: var(--text-secondary);
	}

	.er-metric__icon {
		color: var(--text-muted);
		display: flex;
	}

	.er-metric__value-row {
		display: flex;
		align-items: baseline;
		gap: 4px;
		margin-top: 2px;
	}

	.er-metric__value {
		font-family: 'JetBrains Mono', monospace;
		font-size: 26px;
		font-weight: 700;
		letter-spacing: -0.5px;
		line-height: 1;
		color: var(--text-primary);
	}

	.er-metric__unit {
		font-size: 12px;
		color: var(--text-muted);
		font-weight: 400;
	}

	.er-metric__trend {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		font-size: 11px;
		font-weight: 500;
		margin-top: 4px;
	}

	.er-metric__trend--up    { color: var(--status-online); }
	.er-metric__trend--down  { color: var(--status-critical); }
	.er-metric__trend--neutral { color: var(--text-muted); }
</style>
