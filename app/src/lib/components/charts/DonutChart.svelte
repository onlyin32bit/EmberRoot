<!-- ──────────────────────────────────────────────────────────────────────────
  DonutChart.svelte — Interactive SVG donut with segment hover + click.
  Features: hover expands stroke + glows, tooltip, click-to-select.
────────────────────────────────────────────────────────────────────────────── -->
<script lang="ts">
	import ChartTooltip from './ChartTooltip.svelte';
	import type { TooltipItem, SegmentDef } from './types.js';

	interface Props {
		segments: SegmentDef[];
		size?: number;
		strokeWidth?: number;
		centerLabel?: string;
		centerSub?: string;
		unit?: string;
		formatValue?: (n: number) => string;
		onSegmentClick?: (seg: SegmentDef) => void;
	}

	let {
		segments, size = 88, strokeWidth = 10,
		centerLabel = '', centerSub = '', unit = '',
		formatValue = (n) => String(Math.round(n)),
		onSegmentClick
	}: Props = $props();

	const total = $derived(segments.reduce((s, g) => s + g.value, 0) || 1);
	const cx = $derived(size / 2);
	const cy = $derived(size / 2);
	const r  = $derived((size - strokeWidth * 2) / 2);
	const C  = $derived(2 * Math.PI * r);

	function dash(v: number)   { const l = (v/total)*C; return `${l.toFixed(2)} ${(C-l).toFixed(2)}`; }
	function offset(i: number) { let p=0; for(let j=0;j<i;j++) p+=segments[j].value/total; return (-C*p).toFixed(2); }

	// Hover / select
	let hovId  = $state<string|null>(null);
	let selId  = $state<string|null>(null);
	let tipVis = $state(false);
	let tipX = $state(0), tipY = $state(0);
	let tipItems = $state<TooltipItem[]>([]);
	let tipTitle = $state('');
	let wrapEl: HTMLDivElement;

	function enter(e: MouseEvent, seg: SegmentDef) { hovId = seg.id; tipVis = true; upd(e, seg); }
	function mv(e: MouseEvent, seg: SegmentDef)    { upd(e, seg); }
	function leave()                                { hovId = null; tipVis = false; }
	function click(seg: SegmentDef)                 { selId = selId === seg.id ? null : seg.id; onSegmentClick?.(seg); }

	function upd(e: MouseEvent, seg: SegmentDef) {
		const r2 = wrapEl.getBoundingClientRect();
		tipX = e.clientX - r2.left; tipY = e.clientY - r2.top;
		tipTitle = seg.label;
		tipItems = [{ label: 'Count', value: `${formatValue(seg.value)}${unit}`, color: seg.color, sub: `${((seg.value/total)*100).toFixed(1)}% of total${seg.sub ? ' · '+seg.sub : ''}` }];
	}
</script>

<div class="dc" bind:this={wrapEl} style="position:relative; width:{size}px; height:{size}px; flex-shrink:0">
	<svg width={size} height={size} viewBox="0 0 {size} {size}"
		style="transform:rotate(-90deg)"
		role="img" aria-label="Donut chart">
		<!-- Track -->
		<circle {cx} {cy} r={r} fill="none"
			stroke="var(--surface-overlay)" stroke-width={strokeWidth}/>
		<!-- Segments -->
		{#each segments as seg, i}
			{@const hov = hovId === seg.id}
			{@const sel = selId === seg.id}
			<!-- svelte-ignore a11y_interactive_supports_focus -->
			<circle
				{cx} {cy} r={r}
				fill="none"
				stroke={seg.color}
				stroke-width={hov || sel ? strokeWidth + 4 : strokeWidth}
				stroke-dasharray={dash(seg.value)}
				stroke-dashoffset={offset(i)}
				stroke-linecap="round"
				style="
					transition: stroke-width 180ms, filter 180ms;
					filter:{hov ? 'brightness(1.35)' : sel ? 'brightness(1.2)' : 'none'};
					cursor:pointer;
				"
				role="button"
				tabindex="0"
				aria-label="{seg.label}: {formatValue(seg.value)}{unit}"
				onmouseenter={(e) => enter(e, seg)}
				onmouseleave={leave}
				onmousemove={(e) => mv(e, seg)}
				onclick={() => click(seg)}
				onkeydown={(e) => e.key === 'Enter' && click(seg)}
			/>
		{/each}
	</svg>

	<!-- Center (counter-rotate to cancel SVG rotation) -->
	<div class="dc__center" style="width:{size}px; height:{size}px">
		{#if centerLabel}<span class="dc__val">{centerLabel}</span>{/if}
		{#if centerSub}<span class="dc__sub">{centerSub}</span>{/if}
	</div>

	<ChartTooltip
		visible={tipVis}
		x={tipX} y={tipY}
		title={tipTitle}
		items={tipItems}
		align={tipX > size * 0.6 ? 'right' : 'left'}
	/>
</div>

<style>
	.dc { position: relative; }
	.dc__center {
		position: absolute; inset: 0;
		display: flex; flex-direction: column;
		align-items: center; justify-content: center;
		gap: 2px; pointer-events: none;
	}
	.dc__val {
		font-family: 'JetBrains Mono', monospace;
		font-size: 17px; font-weight: 700; color: var(--text-primary); line-height: 1;
	}
	.dc__sub {
		font-size: 8px; color: var(--text-muted);
		text-transform: uppercase; letter-spacing: 0.04em;
	}
</style>
