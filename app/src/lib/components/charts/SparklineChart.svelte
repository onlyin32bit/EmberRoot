<!-- ──────────────────────────────────────────────────────────────────────────
  SparklineChart.svelte — Compact interactive inline sparkline.
  Designed for use inside TelemetryCard (no axis labels).
  Features: hover crosshair snap, tooltip, gradient fill, ResizeObserver.
────────────────────────────────────────────────────────────────────────────── -->
<script lang="ts">
	import { onMount } from 'svelte';
	import ChartTooltip from './ChartTooltip.svelte';
	import type { TimeSeries } from '$lib/mock';

	interface Props {
		data: TimeSeries;
		color?: string;
		unit?: string;
		height?: number;
		formatValue?: (n: number) => string;
		formatTime?:  (ts: number) => string;
	}

	let {
		data,
		color = 'var(--ember-400)',
		unit  = '',
		height = 36,
		formatValue = (n) => n.toFixed(2),
		formatTime  = (ts) => {
			const d = new Date(ts);
			return `${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
		}
	}: Props = $props();

	let wrapEl: HTMLDivElement;
	let W = $state(120);
	const H = $derived(height);

	onMount(() => {
		W = wrapEl.clientWidth || 120;
		const ro = new ResizeObserver(es => { W = es[0].contentRect.width; });
		ro.observe(wrapEl);
		return () => ro.disconnect();
	});

	const minV = $derived(data.length ? Math.min(...data.map(p => p.value)) : 0);
	const maxV = $derived(data.length ? Math.max(...data.map(p => p.value)) : 1);
	const minT = $derived(data.length ? Math.min(...data.map(p => p.timestamp)) : 0);
	const maxT = $derived(data.length ? Math.max(...data.map(p => p.timestamp)) : 1);
	const vR   = $derived((maxV - minV) || 1);
	const tR   = $derived((maxT - minT) || 1);

	function sx(t: number) { return ((t - minT) / tR) * W; }
	function sy(v: number) { return H - ((v - minV) / vR) * H; }

	const pts  = $derived(data.map(p => `${sx(p.timestamp).toFixed(1)},${sy(p.value).toFixed(1)}`).join(' '));
	const area = $derived(
		data.length > 1
			? `0,${H} ${pts} ${sx(data[data.length-1].timestamp).toFixed(1)},${H}`
			: ''
	);

	// ── Hover ─────────────────────────────────────────────────────────────────
	let hovering = $state(false);
	let hoverPt  = $state<{ x: number; y: number; value: number; ts: number } | null>(null);
	let mX = $state(0), mY = $state(0);

	function onMove(e: MouseEvent) {
		const r = (e.currentTarget as SVGElement).getBoundingClientRect();
		mX = e.clientX - r.left; mY = e.clientY - r.top;
		const tC = minT + (mX / W) * tR;
		if (!data.length) return;
		let best = data[0], bestD = Infinity;
		for (const p of data) {
			const d = Math.abs(p.timestamp - tC);
			if (d < bestD) { bestD = d; best = p; }
		}
		hoverPt = { x: sx(best.timestamp), y: sy(best.value), value: best.value, ts: best.timestamp };
	}

	// Stable gradient ID derived from color string characters
	const gid = $derived('sl_' + color.replace(/\W/g,'').slice(0,10));
</script>

<div class="sl" bind:this={wrapEl} style="position:relative; height:{height}px">
	{#if data.length >= 2}
		<svg
			class="sl__svg"
			viewBox="0 0 {W} {H}"
			width={W} height={H}
			onmousemove={onMove}
			onmouseleave={() => { hovering = false; hoverPt = null; }}
			onmouseenter={() => hovering = true}
			role="img" aria-label="Sparkline"
		>
			<defs>
				<linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%"   stop-color={color} stop-opacity="0.35"/>
					<stop offset="100%" stop-color={color} stop-opacity="0"/>
				</linearGradient>
			</defs>

			{#if area}<polygon points={area} fill="url(#{gid})"/>{/if}
			<polyline points={pts} fill="none" stroke={color} stroke-width="1.5"
				stroke-linecap="round" stroke-linejoin="round"/>

			{#if hovering && hoverPt}
				<line x1={hoverPt.x} y1={0} x2={hoverPt.x} y2={H}
					stroke={color} stroke-width="1" stroke-dasharray="2 2" opacity="0.55"/>
				<circle cx={hoverPt.x} cy={hoverPt.y} r="5.5" fill={color} opacity="0.18"/>
				<circle cx={hoverPt.x} cy={hoverPt.y} r="3"   fill={color}
					stroke="var(--surface-base)" stroke-width="1.5"/>
			{/if}

			<!-- Transparent event overlay -->
			<rect x="0" y="0" width={W} height={H} fill="transparent" style="cursor:crosshair"/>
		</svg>

		<ChartTooltip
			visible={hovering && hoverPt !== null}
			x={mX} y={mY}
			title={hoverPt ? formatTime(hoverPt.ts) : ''}
			items={hoverPt ? [{ label: 'Value', value: `${formatValue(hoverPt.value)}${unit}`, color }] : []}
			align={mX > W * 0.62 ? 'right' : 'left'}
		/>
	{/if}
</div>

<style>
	.sl { width: 100%; overflow: visible; }
	.sl__svg { display: block; overflow: visible; }
</style>
