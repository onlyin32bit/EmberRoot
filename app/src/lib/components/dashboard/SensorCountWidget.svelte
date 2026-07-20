<!-- SensorCountWidget — uses DonutChart (interactive segments) -->
<script lang="ts">
	import { mockService } from '$lib/mock';
	import DonutChart from '$lib/components/charts/DonutChart.svelte';
	import type { SegmentDef } from '$lib/components/charts';

	const stats   = mockService.getSummaryStats();
	const sensors = mockService.getSensors();

	const segments: SegmentDef[] = [
		{ id: 'online',   label: 'Online',          value: stats.onlineSensors,                          color: 'var(--status-online)' },
		{ id: 'warning',  label: 'Warning',          value: stats.warningSensors,                         color: 'var(--status-warning)' },
		{ id: 'critical', label: 'Offline / Critical', value: stats.offlineSensors + stats.criticalSensors, color: 'var(--status-critical)' },
	].filter(s => s.value > 0);

	const byType: Record<string, number> = {};
	for (const s of sensors) byType[s.type] = (byType[s.type] ?? 0) + 1;
	const typeRows = Object.entries(byType).sort((a, b) => b[1] - a[1]).slice(0, 5);
	const maxTc = Math.max(...typeRows.map(([, c]) => c), 1);

	let selected = $state<SegmentDef | null>(null);
</script>

<div class="sc">
	<span class="sc__title">Sensor Network</span>

	<div class="sc__body">
		<DonutChart
			{segments}
			size={88} strokeWidth={10}
			centerLabel={String(stats.totalSensors)}
			centerSub="sensors"
			onSegmentClick={(s) => selected = selected?.id === s.id ? null : s}
		/>
		<div class="sc__legend">
			{#each segments as seg}
				<div class="sc__row" class:sc__row--sel={selected?.id === seg.id}>
					<span class="sc__dot" style="background:{seg.color}"></span>
					<span class="sc__leg-text">{seg.label}</span>
					<span class="sc__leg-pct" style="color:{seg.color}">
						{((seg.value / stats.totalSensors) * 100).toFixed(0)}%
					</span>
				</div>
			{/each}
		</div>
	</div>

	{#if selected}
		<div class="sc__sel">
			<span class="sc__sel-label">{selected.label}</span>
			<span class="sc__sel-val" style="color:{selected.color}">{selected.value}</span>
		</div>
	{/if}

	<div class="sc__types">
		{#each typeRows as [type, count]}
			<div class="sc__type-row">
				<span class="sc__type-label">{type}</span>
				<div class="sc__type-track">
					<div class="sc__type-fill" style="width:{(count/maxTc*100).toFixed(1)}%"></div>
				</div>
				<span class="sc__type-count">{count}</span>
			</div>
		{/each}
	</div>
</div>

<style>
	.sc { display: flex; flex-direction: column; gap: 12px; height: 100%; }
	.sc__title {
		font-size: 12px; font-weight: 600; letter-spacing: 0.06em;
		text-transform: uppercase; color: var(--text-primary);
	}
	.sc__body { display: flex; align-items: center; gap: 14px; }
	.sc__legend { display: flex; flex-direction: column; gap: 6px; flex: 1; }
	.sc__row {
		display: grid; grid-template-columns: 10px 1fr auto;
		align-items: center; gap: 6px;
		padding: 2px 4px; border-radius: 4px;
		transition: background var(--transition-fast);
	}
	.sc__row--sel { background: var(--surface-raised); }
	.sc__dot { width: 8px; height: 8px; border-radius: 50%; }
	.sc__leg-text { font-size: 11px; color: var(--text-secondary); }
	.sc__leg-pct {
		font-family: 'JetBrains Mono', monospace; font-size: 11px; font-weight: 600;
	}
	.sc__sel {
		display: flex; align-items: center; justify-content: space-between;
		padding: 6px 10px; border-radius: 6px;
		background: var(--surface-raised); border: 1px solid var(--surface-border);
	}
	.sc__sel-label { font-size: 11px; color: var(--text-secondary); }
	.sc__sel-val {
		font-family: 'JetBrains Mono', monospace; font-size: 18px; font-weight: 700;
	}
	.sc__types { display: flex; flex-direction: column; gap: 5px; }
	.sc__type-row {
		display: grid; grid-template-columns: 64px 1fr 28px;
		align-items: center; gap: 6px;
	}
	.sc__type-label {
		font-size: 10px; color: var(--text-muted);
		text-transform: uppercase; letter-spacing: 0.04em;
	}
	.sc__type-track { height: 4px; background: var(--surface-overlay); border-radius: 2px; overflow: hidden; }
	.sc__type-fill {
		height: 100%; border-radius: 2px;
		background: linear-gradient(90deg, var(--ember-600), var(--ember-400));
		transition: width 600ms ease;
	}
	.sc__type-count {
		font-family: 'JetBrains Mono', monospace; font-size: 10px; color: var(--text-secondary); text-align: right;
	}
</style>
