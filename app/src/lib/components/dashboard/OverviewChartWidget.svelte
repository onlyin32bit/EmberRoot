<!-- OverviewChartWidget — thin wrapper delegating to LineAreaChart -->
<script lang="ts">
	import type { SeriesDef } from '$lib/components/charts';
	import LineAreaChart from '$lib/components/charts/LineAreaChart.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import type { Snippet } from 'svelte';

	interface Props {
		title: string;
		subtitle?: string;
		series: SeriesDef[];
		unit?: string;
		height?: number;
		badge?: { label: string; variant: 'online' | 'warning' | 'critical' | 'ember' | 'neutral' };
		formatValue?: (n: number) => string;
		formatTime?:  (ts: number) => string;
		class?: string;
		toolbar?: Snippet;
		onPointClick?: (info: { seriesId: string; value: number; timestamp: number }) => void;
	}

	let {
		title, subtitle, series, unit = '', height = 180, badge,
		formatValue, formatTime, class: className = '', toolbar, onPointClick
	}: Props = $props();
</script>

<Card padding="md" class="ovc {className}">
	<div class="ovc__header">
		<div class="ovc__titles">
			<h3 class="ovc__title">{title}</h3>
			{#if subtitle}<p class="ovc__subtitle">{subtitle}</p>{/if}
		</div>
		<div class="ovc__actions">
			{#if toolbar}{@render toolbar()}{/if}
			{#if badge}<Badge variant={badge.variant} size="sm">{badge.label}</Badge>{/if}
		</div>
	</div>

	<LineAreaChart
		{series} {unit} {height}
		{formatValue} {formatTime}
		{onPointClick}
		showLegend={series.length > 1}
	/>
</Card>

<style>
	:global(.ovc) { display: flex; flex-direction: column; }
	.ovc__header {
		display: flex; align-items: flex-start; justify-content: space-between;
		margin-bottom: 12px; gap: 8px;
	}
	.ovc__titles { display: flex; flex-direction: column; gap: 2px; }
	.ovc__title {
		font-size: 12px; font-weight: 600; letter-spacing: 0.07em;
		text-transform: uppercase; color: var(--text-primary); margin: 0;
	}
	.ovc__subtitle { font-size: 10px; color: var(--text-muted); margin: 0; }
	.ovc__actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
</style>
