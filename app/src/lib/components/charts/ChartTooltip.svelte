<!-- ──────────────────────────────────────────────────────────────────────────
  ChartTooltip.svelte — Shared floating HTML tooltip for all chart types.
  Parent container must have position:relative.
────────────────────────────────────────────────────────────────────────────── -->
<script lang="ts">
	import type { TooltipItem } from './types.js';

	interface Props {
		visible: boolean;
		x: number;
		y: number;
		title?: string;
		items: TooltipItem[];
		align?: 'left' | 'right';
	}

	let { visible, x, y, title, items, align = 'left' }: Props = $props();
</script>

{#if visible && items.length > 0}
	<div
		class="ct"
		style="
			left: {align === 'right' ? x - 14 : x + 14}px;
			top: {y}px;
			transform: translateX({align === 'right' ? '-100%' : '0'}) translateY(-50%);
		"
		role="tooltip"
	>
		{#if title}
			<div class="ct__title">{title}</div>
		{/if}
		{#each items as item}
			<div class="ct__row">
				{#if item.color}
					<span class="ct__swatch" style="background:{item.color}"></span>
				{/if}
				<div class="ct__content">
					<span class="ct__label">{item.label}</span>
					<span class="ct__value">{item.value}</span>
				</div>
			</div>
			{#if item.sub}
				<div class="ct__sub">{item.sub}</div>
			{/if}
		{/each}
	</div>
{/if}

<style>
	.ct {
		position: absolute;
		z-index: 300;
		pointer-events: none;
		background: rgba(10, 14, 20, 0.97);
		border: 1px solid rgba(255,255,255,0.1);
		border-radius: 6px;
		padding: 8px 10px;
		min-width: 128px;
		max-width: 220px;
		box-shadow: 0 8px 32px rgba(0,0,0,0.7), 0 0 0 1px rgba(240,120,64,0.08);
		backdrop-filter: blur(12px);
	}
	.ct__title {
		font-family: 'JetBrains Mono', monospace;
		font-size: 9px; letter-spacing: 0.04em;
		color: var(--text-muted);
		margin-bottom: 6px; padding-bottom: 5px;
		border-bottom: 1px solid rgba(255,255,255,0.08);
		white-space: nowrap;
	}
	.ct__row {
		display: flex; align-items: center; gap: 6px;
		margin-top: 4px;
	}
	.ct__row:first-of-type { margin-top: 0; }
	.ct__swatch {
		width: 8px; height: 8px; border-radius: 2px; flex-shrink: 0;
	}
	.ct__content {
		display: flex; justify-content: space-between; align-items: baseline;
		gap: 8px; flex: 1; min-width: 0;
	}
	.ct__label {
		font-size: 10px; color: var(--text-secondary);
		white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
	}
	.ct__value {
		font-family: 'JetBrains Mono', monospace;
		font-size: 11px; font-weight: 600; color: var(--text-primary);
		white-space: nowrap; flex-shrink: 0;
	}
	.ct__sub {
		font-size: 9px; color: var(--text-muted);
		margin-left: 14px; margin-top: 1px; font-style: italic;
	}
</style>
