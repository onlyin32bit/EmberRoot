<!-- ──────────────────────────────────────────────────────────────────────────
  LineAreaChart.svelte
  Fully interactive multi-series SVG line/area chart.

  Features:
  · Hover crosshair + nearest-point snap per series
  · Floating HTML tooltip (value + formatted timestamp)
  · Animated point highlight (scale-in ring + dot)
  · Click selects a data point → onPointClick callback
  · Toggleable legend per series
  · Responsive via ResizeObserver
  · Configurable formatValue / formatTime
────────────────────────────────────────────────────────────────────────────── -->
<script lang="ts">
	import { onMount } from 'svelte';
	import ChartTooltip from './ChartTooltip.svelte';
	import type { TooltipItem } from './types.js';
	import type { SeriesDef } from './types.js';
	import type { TimeSeries } from '$lib/mock';

	interface Props {
		series: SeriesDef[];
		unit?: string;
		height?: number;
		showLegend?: boolean;
		formatValue?: (n: number) => string;
		formatTime?: (ts: number) => string;
		onPointClick?: (info: { seriesId: string; value: number; timestamp: number }) => void;
	}

	let {
		series,
		unit = '',
		height = 180,
		showLegend = true,
		formatValue = (n) => n.toFixed(2),
		formatTime  = (ts) => {
			const d = new Date(ts);
			return `${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
		},
		onPointClick
	}: Props = $props();

	// ── Legend toggles ─────────────────────────────────────────────────────────
	let hiddenSet = $state(new Set<string>());
	const visible = $derived(series.filter(s => !hiddenSet.has(s.id)));
	function toggle(id: string) {
		const n = new Set(hiddenSet);
		n.has(id) ? n.delete(id) : n.add(id);
		hiddenSet = n;
	}

	// ── Responsive container ───────────────────────────────────────────────────
	let wrapEl: HTMLDivElement;
	let W = $state(600);
	onMount(() => {
		W = wrapEl.clientWidth || 600;
		const ro = new ResizeObserver(es => { W = es[0].contentRect.width; });
		ro.observe(wrapEl);
		return () => ro.disconnect();
	});

	// ── Layout constants ───────────────────────────────────────────────────────
	const PAD = { t: 10, r: 14, b: 26, l: 40 };
	const cW = $derived(Math.max(W - PAD.l - PAD.r, 10));
	const cH = $derived(Math.max(height - PAD.t - PAD.b, 10));

	// ── Data bounds ────────────────────────────────────────────────────────────
	const allPts  = $derived(visible.flatMap(s => s.data));
	const minV = $derived(allPts.length ? Math.min(...allPts.map(p => p.value)) : 0);
	const maxV = $derived(allPts.length ? Math.max(...allPts.map(p => p.value)) : 1);
	const minT = $derived(allPts.length ? Math.min(...allPts.map(p => p.timestamp)) : 0);
	const maxT = $derived(allPts.length ? Math.max(...allPts.map(p => p.timestamp)) : 1);
	const vR = $derived((maxV - minV) || 1);
	const tR = $derived((maxT - minT) || 1);

	function tx(t: number) { return PAD.l + ((t - minT) / tR) * cW; }
	function ty(v: number) { return PAD.t + cH - ((v - minV) / vR) * cH; }

	function makeLine(data: TimeSeries) {
		if (!data.length) return '';
		return data.map((p, i) => `${i ? 'L' : 'M'}${tx(p.timestamp).toFixed(1)},${ty(p.value).toFixed(1)}`).join(' ');
	}
	function makeArea(data: TimeSeries) {
		if (data.length < 2) return '';
		const pts = data.map(p => `${tx(p.timestamp).toFixed(1)},${ty(p.value).toFixed(1)}`).join(' L ');
		const bY = (PAD.t + cH).toFixed(1);
		return `M${tx(data[0].timestamp).toFixed(1)},${bY} L ${pts} L${tx(data[data.length-1].timestamp).toFixed(1)},${bY}Z`;
	}

	// ── Axis ticks ─────────────────────────────────────────────────────────────
	const yTicks = $derived(Array.from({ length: 4 }, (_, i) => {
		const v = minV + vR * i / 3;
		return { y: ty(v), label: formatValue(v) };
	}));
	const xTicks = $derived(Array.from({ length: 5 }, (_, i) => {
		const t = minT + tR * i / 4;
		return { x: tx(t), label: formatTime(t) };
	}));

	// ── Hover state ────────────────────────────────────────────────────────────
	let hovering   = $state(false);
	let mouseX     = $state(0);
	let mouseY     = $state(0);
	let crossX     = $state(0);
	let tipAlign   = $state<'left'|'right'>('left');

	interface HovPt { sid: string; px: number; py: number; value: number; ts: number; color: string; label: string; }
	let hovPts = $state<HovPt[]>([]);

	function onMove(e: MouseEvent) {
		const rect = (e.currentTarget as SVGElement).getBoundingClientRect();
		mouseX = e.clientX - rect.left;
		mouseY = e.clientY - rect.top;
		const svgX = Math.max(PAD.l, Math.min(mouseX, PAD.l + cW));
		crossX = svgX;
		tipAlign = mouseX > W * 0.62 ? 'right' : 'left';
		const tCursor = minT + ((svgX - PAD.l) / cW) * tR;

		hovPts = visible.map(s => {
			if (!s.data.length) return null;
			let best = s.data[0], bestD = Infinity;
			for (const p of s.data) {
				const d = Math.abs(p.timestamp - tCursor);
				if (d < bestD) { bestD = d; best = p; }
			}
			return { sid: s.id, px: tx(best.timestamp), py: ty(best.value), value: best.value, ts: best.timestamp, color: s.color, label: s.label };
		}).filter((p): p is HovPt => p !== null);
	}

	function onLeave() { hovering = false; hovPts = []; }
	function onEnter() { hovering = true; }
	function onClick() {
		if (!onPointClick) return;
		for (const p of hovPts) onPointClick({ seriesId: p.sid, value: p.value, timestamp: p.ts });
	}

	const tipTitle = $derived(hovPts[0] ? formatTime(hovPts[0].ts) : '');
	const tipItems = $derived<TooltipItem[]>(hovPts.map(p => ({ label: p.label, value: `${formatValue(p.value)}${unit}`, color: p.color })));

	function gid(id: string) { return `lac_${id.replace(/\W/g,'_')}`; }
</script>

<div class="lac" bind:this={wrapEl}>
	<!-- Legend -->
	{#if showLegend && series.length > 1}
		<div class="lac__legend" role="list">
			{#each series as s}
				<button
					class="lac__leg-btn"
					class:lac__leg-btn--off={hiddenSet.has(s.id)}
					onclick={() => toggle(s.id)}
					role="listitem"
					aria-pressed={!hiddenSet.has(s.id)}
				>
					<span class="lac__leg-swatch" style="background:{s.color};opacity:{hiddenSet.has(s.id)?0.22:1}"></span>
					{s.label}
				</button>
			{/each}
		</div>
	{/if}

	<!-- SVG + tooltip wrapper -->
	<div style="position:relative; height:{height}px; width:100%;">
		<svg
			class="lac__svg"
			viewBox="0 0 {W} {height}"
			width={W}
			height={height}
			onmousemove={onMove}
			onmouseleave={onLeave}
			onmouseenter={onEnter}
			onclick={onClick}
			style="cursor:{onPointClick ? 'crosshair' : 'default'}"
			role="img"
			aria-label="Line area chart"
		>
			<defs>
				{#each series as s}
					<linearGradient id={gid(s.id)} x1="0" y1="0" x2="0" y2="1">
						<stop offset="0%"   stop-color={s.color} stop-opacity="0.28"/>
						<stop offset="100%" stop-color={s.color} stop-opacity="0"/>
					</linearGradient>
				{/each}
			</defs>

			<!-- Grid -->
			{#each yTicks as t}
				<line x1={PAD.l} y1={t.y} x2={W-PAD.r} y2={t.y}
					stroke="rgba(255,255,255,0.05)" stroke-width="0.75" stroke-dasharray="3 3"/>
				<text x={PAD.l-5} y={t.y+3.5} text-anchor="end"
					fill="var(--text-muted)" font-size="8.5" font-family="JetBrains Mono,monospace">{t.label}</text>
			{/each}
			{#each xTicks as t}
				<text x={t.x} y={height-5} text-anchor="middle"
					fill="var(--text-muted)" font-size="8.5" font-family="JetBrains Mono,monospace">{t.label}</text>
			{/each}

			<!-- Areas -->
			{#each visible as s}
				{#if s.filled !== false && s.data.length > 1}
					<path d={makeArea(s.data)} fill="url(#{gid(s.id)})"/>
				{/if}
			{/each}

			<!-- Lines -->
			{#each visible as s}
				{#if s.data.length > 1}
					<path d={makeLine(s.data)} fill="none" stroke={s.color}
						stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
				{/if}
			{/each}

			<!-- Crosshair + hover points -->
			{#if hovering && hovPts.length}
				<line x1={crossX} y1={PAD.t} x2={crossX} y2={PAD.t+cH}
					stroke="rgba(255,255,255,0.25)" stroke-width="1" stroke-dasharray="4 3"/>
				{#each hovPts as p}
					<circle cx={p.px} cy={p.py} r="8" fill={p.color} opacity="0.15" class="lac__ring"/>
					<circle cx={p.px} cy={p.py} r="4" fill={p.color}
						stroke="var(--surface-base)" stroke-width="1.5" class="lac__dot"/>
				{/each}
			{/if}

			<!-- Transparent event target -->
			<rect x={PAD.l} y={PAD.t} width={cW} height={cH} fill="transparent" style="cursor:crosshair"/>
		</svg>

		<ChartTooltip
			visible={hovering && hovPts.length > 0}
			x={mouseX} y={mouseY}
			title={tipTitle}
			items={tipItems}
			align={tipAlign}
		/>
	</div>
</div>

<style>
	.lac { width: 100%; display: flex; flex-direction: column; gap: 8px; }

	/* Legend */
	.lac__legend {
		display: flex; flex-wrap: wrap; gap: 6px;
		padding-bottom: 8px;
		border-bottom: 1px solid var(--surface-border);
	}
	.lac__leg-btn {
		display: inline-flex; align-items: center; gap: 5px;
		font-size: 10px; color: var(--text-secondary);
		background: transparent; border: none; cursor: pointer;
		padding: 2px 6px; border-radius: 4px;
		transition: background var(--transition-fast), color var(--transition-fast);
	}
	.lac__leg-btn:hover { background: var(--surface-raised); color: var(--text-primary); }
	.lac__leg-btn--off  { color: var(--text-muted); text-decoration: line-through; }
	.lac__leg-swatch { width: 18px; height: 2.5px; border-radius: 2px; flex-shrink: 0; }

	.lac__svg { display: block; overflow: visible; }

	/* Animated hover indicators */
	:global(.lac__ring) { animation: lac-ring 250ms ease-out forwards; }
	:global(.lac__dot)  { animation: lac-dot  200ms cubic-bezier(0.34,1.56,0.64,1) forwards; }
	@keyframes lac-ring { from { r: 2; opacity: 0; } to { r: 8; opacity: 0.15; } }
	@keyframes lac-dot  { from { r: 1; } to { r: 4; } }
</style>
