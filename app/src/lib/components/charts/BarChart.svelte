<!-- ──────────────────────────────────────────────────────────────────────────
  BarChart.svelte — Interactive horizontal / vertical bar chart.

  Features:
  · Hover: bar brightens + scale expand + glow shadow
  · Tooltip on hover (value, label, sub-note)
  · Click to select/deselect a bar → onBarClick callback
  · Smooth fill animation via CSS transition
  · Responsive via container flex layout
────────────────────────────────────────────────────────────────────────────── -->
<script lang="ts">
	import ChartTooltip from './ChartTooltip.svelte';
	import type { TooltipItem, BarDef } from './types.js';

	interface Props {
		bars: BarDef[];
		orientation?: 'horizontal' | 'vertical';
		unit?: string;
		showValues?: boolean;
		maxValue?: number;
		formatValue?: (n: number) => string;
		onBarClick?: (bar: BarDef) => void;
	}

	let {
		bars,
		orientation = 'horizontal',
		unit = '',
		showValues = true,
		maxValue,
		formatValue = (n) => n % 1 === 0 ? String(n) : n.toFixed(1),
		onBarClick
	}: Props = $props();

	const PALETTE = [
		'var(--ember-400)', 'var(--status-online)',
		'var(--status-warning)', 'var(--status-critical)', 'var(--text-secondary)'
	];

	const resolvedMax = $derived(maxValue ?? Math.max(...bars.map(b => b.value), 1));
	function pct(v: number) { return Math.min(100, (v / resolvedMax) * 100); }

	// ── Hover / selection state ────────────────────────────────────────────────
	let hovId = $state<string|null>(null);
	let selId = $state<string|null>(null);
	let tipVis  = $state(false);
	let tipX = $state(0), tipY = $state(0);
	let tipItems = $state<TooltipItem[]>([]);
	let tipTitle = $state('');
	let wrapEl: HTMLDivElement;

	function enter(e: MouseEvent, bar: BarDef) {
		hovId = bar.id; tipVis = true;
		update(e, bar);
	}
	function leave() { hovId = null; tipVis = false; }
	function move(e: MouseEvent, bar: BarDef) { update(e, bar); }

	function update(e: MouseEvent, bar: BarDef) {
		const r = wrapEl.getBoundingClientRect();
		tipX = e.clientX - r.left;
		tipY = e.clientY - r.top;
		tipTitle = bar.label;
		tipItems = [{ label: 'Value', value: `${formatValue(bar.value)}${unit}`, color: bar.color ?? PALETTE[0], sub: bar.sub }];
	}

	function click(bar: BarDef) {
		selId = selId === bar.id ? null : bar.id;
		onBarClick?.(bar);
	}

	function color(bar: BarDef, i: number) { return bar.color ?? PALETTE[i % PALETTE.length]; }
</script>

<div class="bc bc--{orientation}" bind:this={wrapEl} style="position:relative">
	{#if orientation === 'horizontal'}
		<div class="bc__h">
			{#each bars as bar, i}
				{@const c = color(bar, i)}
				{@const p = pct(bar.value)}
				{@const hov = hovId === bar.id}
				{@const sel = selId === bar.id}
				<!-- svelte-ignore a11y_interactive_supports_focus -->
				<div class="bc__h-row">
					<span class="bc__h-label" title={bar.label}>{bar.label}</span>
					<div class="bc__h-track">
						<div
							class="bc__h-fill"
							class:bc__h-fill--hov={hov}
							class:bc__h-fill--sel={sel}
							style="width:{p}%; background:{c}; box-shadow:{hov ? `0 0 14px -2px ${c}` : 'none'}"
							role="button"
							tabindex="0"
							aria-label="{bar.label}: {formatValue(bar.value)}{unit}"
							onmouseenter={(e) => enter(e, bar)}
							onmouseleave={leave}
							onmousemove={(e) => move(e, bar)}
							onclick={() => click(bar)}
							onkeydown={(e) => e.key === 'Enter' && click(bar)}
						></div>
					</div>
					{#if showValues}
						<span class="bc__h-val" style="color:{c}">{formatValue(bar.value)}{unit}</span>
					{/if}
				</div>
			{/each}
		</div>
	{:else}
		<div class="bc__v">
			{#each bars as bar, i}
				{@const c = color(bar, i)}
				{@const p = pct(bar.value)}
				{@const hov = hovId === bar.id}
				<!-- svelte-ignore a11y_interactive_supports_focus -->
				<div class="bc__v-col">
					{#if showValues}
						<span class="bc__v-val" style="color:{c}">{formatValue(bar.value)}{unit}</span>
					{/if}
					<div class="bc__v-track">
						<div
							class="bc__v-fill"
							class:bc__v-fill--hov={hov}
							style="height:{p}%; background:{c}; box-shadow:{hov ? `0 -4px 14px -2px ${c}` : 'none'}"
							role="button"
							tabindex="0"
							aria-label="{bar.label}: {formatValue(bar.value)}{unit}"
							onmouseenter={(e) => enter(e, bar)}
							onmouseleave={leave}
							onmousemove={(e) => move(e, bar)}
							onclick={() => click(bar)}
							onkeydown={(e) => e.key === 'Enter' && click(bar)}
						></div>
					</div>
					<span class="bc__v-label">{bar.label}</span>
				</div>
			{/each}
		</div>
	{/if}

	<ChartTooltip
		visible={tipVis}
		x={tipX} y={tipY}
		title={tipTitle}
		items={tipItems}
		align={tipX > 160 ? 'right' : 'left'}
	/>
</div>

<style>
	.bc { width: 100%; }

	/* Horizontal */
	.bc__h { display: flex; flex-direction: column; gap: 7px; }
	.bc__h-row {
		display: grid;
		grid-template-columns: 64px 1fr auto;
		align-items: center; gap: 8px;
	}
	.bc__h-label {
		font-size: 10px; color: var(--text-secondary);
		text-transform: uppercase; letter-spacing: 0.05em;
		white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
	}
	.bc__h-track {
		height: 8px; background: var(--surface-overlay);
		border-radius: 4px; overflow: hidden; cursor: pointer;
	}
	.bc__h-fill {
		height: 100%; border-radius: 4px;
		transition: width 550ms cubic-bezier(.4,0,.2,1), filter 140ms, transform 140ms;
		transform-origin: left center;
	}
	.bc__h-fill--hov { filter: brightness(1.3); transform: scaleY(1.35); }
	.bc__h-fill--sel { outline: 2px solid currentColor; outline-offset: 2px; filter: brightness(1.45); }
	.bc__h-val {
		font-family: 'JetBrains Mono', monospace;
		font-size: 11px; font-weight: 600; min-width: 36px; text-align: right;
	}

	/* Vertical */
	.bc__v {
		display: flex; align-items: flex-end; gap: 8px;
		height: 80px; width: 100%;
	}
	.bc__v-col { display: flex; flex-direction: column; align-items: center; gap: 4px; flex: 1; }
	.bc__v-val { font-family: 'JetBrains Mono', monospace; font-size: 10px; font-weight: 600; }
	.bc__v-track {
		width: 100%; flex: 1;
		background: var(--surface-overlay);
		border-radius: 4px 4px 0 0;
		display: flex; align-items: flex-end;
		overflow: hidden; cursor: pointer; min-height: 50px;
	}
	.bc__v-fill {
		width: 100%; border-radius: 4px 4px 0 0;
		transition: height 550ms cubic-bezier(.4,0,.2,1), filter 140ms, transform 140ms;
		transform-origin: center bottom;
	}
	.bc__v-fill--hov { filter: brightness(1.3); transform: scaleX(1.06); }
	.bc__v-label {
		font-size: 9px; color: var(--text-muted);
		text-transform: uppercase; letter-spacing: 0.04em; text-align: center;
	}
</style>
