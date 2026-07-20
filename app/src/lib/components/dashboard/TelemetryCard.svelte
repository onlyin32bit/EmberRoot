<!-- TelemetryCard — small metric card with interactive SparklineChart -->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { TimeSeries } from '$lib/mock';
	import SparklineChart from '$lib/components/charts/SparklineChart.svelte';

	interface Props {
		label: string;
		value: string | number;
		unit?: string;
		variant?: 'default' | 'warning' | 'critical' | 'online';
		trend?: 'up' | 'down' | 'stable';
		trendLabel?: string;
		/** Full TimeSeries with real timestamps — enables accurate hover tooltips */
		sparkSeries?: TimeSeries;
		/** Fallback: plain number array (synthetic timestamps at 30-min intervals) */
		sparkData?: number[];
		class?: string;
		icon?: Snippet;
		formatValue?: (n: number) => string;
		formatTime?:  (ts: number) => string;
	}

	let {
		label, value, unit, variant = 'default',
		trend, trendLabel,
		sparkSeries, sparkData = [],
		class: className = '',
		icon,
		formatValue = (n) => n.toFixed(2),
		formatTime  = (ts) => {
			const d = new Date(ts);
			return `${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
		}
	}: Props = $props();

	// Prefer full TimeSeries; fall back to synthetic timestamps
	const series: TimeSeries = $derived(
		sparkSeries
			? sparkSeries
			: sparkData.map((v, i) => ({
				timestamp: Date.now() - (sparkData.length - 1 - i) * 1_800_000,
				value: v
			}))
	);

	const COLOR: Record<string, string> = {
		default:  'var(--text-secondary)',
		online:   'var(--status-online)',
		warning:  'var(--status-warning)',
		critical: 'var(--status-critical)'
	};
</script>

<div class="tc tc--{variant} {className}">
	<div class="tc__top">
		{#if icon}<div class="tc__icon">{@render icon()}</div>{/if}
		<span class="tc__label">{label}</span>
	</div>

	<div class="tc__value-row">
		<span class="tc__value">{value}</span>
		{#if unit}<span class="tc__unit">{unit}</span>{/if}
	</div>

	{#if series.length >= 3}
		<SparklineChart
			data={series}
			color={COLOR[variant]}
			{unit}
			{formatValue}
			{formatTime}
			height={32}
		/>
	{/if}

	{#if trend || trendLabel}
		<div class="tc__trend tc__trend--{trend ?? 'stable'}">
			{#if trend === 'up'}
				<svg width="10" height="10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 15l7-7 7 7"/></svg>
			{:else if trend === 'down'}
				<svg width="10" height="10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"/></svg>
			{:else}
				<svg width="10" height="10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 12h14"/></svg>
			{/if}
			{#if trendLabel}<span>{trendLabel}</span>{/if}
		</div>
	{/if}
</div>

<style>
	.tc {
		display: flex; flex-direction: column; gap: 6px;
		padding: 14px;
		background: var(--surface-base);
		border: 1px solid var(--surface-border);
		border-radius: 8px;
		position: relative; overflow: hidden;
		transition: border-color var(--transition-fast);
	}
	.tc:hover { border-color: var(--surface-muted); }
	.tc::before {
		content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px;
	}
	.tc--default::before  { background: var(--surface-muted); }
	.tc--online::before   { background: var(--status-online); }
	.tc--warning::before  { background: var(--status-warning); }
	.tc--critical::before { background: var(--status-critical); }

	.tc__top { display: flex; align-items: center; gap: 6px; }
	.tc__icon { display: flex; flex-shrink: 0; color: var(--text-muted); }
	.tc__label {
		font-size: 10px; font-weight: 600;
		text-transform: uppercase; letter-spacing: 0.07em; color: var(--text-secondary);
	}

	.tc__value-row { display: flex; align-items: baseline; gap: 3px; }
	.tc__value {
		font-family: 'JetBrains Mono', monospace;
		font-size: 22px; font-weight: 700; line-height: 1;
		color: var(--text-primary); letter-spacing: -0.5px;
	}
	.tc__unit { font-size: 11px; color: var(--text-muted); }

	.tc__trend {
		display: flex; align-items: center; gap: 3px;
		font-size: 10px; font-weight: 500; margin-top: 2px;
	}
	.tc__trend--up     { color: var(--status-online); }
	.tc__trend--down   { color: var(--status-critical); }
	.tc__trend--stable { color: var(--text-muted); }
</style>
