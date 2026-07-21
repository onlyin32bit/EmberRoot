<script lang="ts">
	let {
		values = [],
		title = 'Heatmap',
		unit = '',
		description = '',
		color = '#f59e0b'
	}: {
		values?: number[];
		title?: string;
		unit?: string;
		description?: string;
		color?: string;
	} = $props();

	const rows = 5;
	const cols = 8;

	const prepared = $derived.by(() => {
		const source = values.length ? values : Array.from({ length: rows * cols }, () => 0);
		const normalized = source.slice(-rows * cols).map((value) => Number(value));
		const padded = normalized.length < rows * cols ? [...normalized, ...Array.from({ length: rows * cols - normalized.length }, () => 0)] : normalized;
		const min = Math.min(...padded);
		const max = Math.max(...padded);
		const range = max - min || 1;
		return padded.map((value, index) => ({
			value,
			intensity: Math.max(0.12, Math.min(1, (value - min) / range)),
			label: `${value.toFixed(1)}${unit}`
		}));
	});

	const summary = $derived.by(() => {
		const numbers = prepared.map((entry) => entry.value);
		const total = numbers.reduce((sum, value) => sum + value, 0);
		const avg = numbers.length ? total / numbers.length : 0;
		return { avg };
	});
</script>

<div class="heatmap-card">
	<div class="heatmap-card__header">
		<div>
			<div class="heatmap-card__title">{title}</div>
			{#if description}
				<div class="heatmap-card__description">{description}</div>
			{/if}
		</div>
		<div class="heatmap-card__meta">Avg {summary.avg.toFixed(1)}{unit}</div>
	</div>

	<div class="heatmap-grid" style="--heat-color:{color}">
		{#each prepared as cell}
			<div
				class="heatmap-grid__cell"
				style={`background: color-mix(in srgb, ${color} ${Math.round(cell.intensity * 100)}%, rgba(15, 23, 42, 0.92));`}
				title={cell.label}
			></div>
		{/each}
	</div>
</div>

<style>
	.heatmap-card {
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding: 14px;
		background: var(--surface-raised);
		border: 1px solid var(--surface-border);
		border-radius: 14px;
	}

	.heatmap-card__header {
		display: flex;
		justify-content: space-between;
		align-items: start;
		gap: 8px;
	}

	.heatmap-card__title {
		font-size: 12px;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--text-secondary);
	}

	.heatmap-card__description {
		margin-top: 4px;
		font-size: 11px;
		color: var(--text-muted);
	}

	.heatmap-card__meta {
		font-size: 11px;
		font-weight: 700;
		color: var(--text-primary);
		font-family: 'JetBrains Mono', monospace;
		white-space: nowrap;
	}

	.heatmap-grid {
		display: grid;
		grid-template-columns: repeat(8, minmax(0, 1fr));
		gap: 4px;
	}

	.heatmap-grid__cell {
		aspect-ratio: 1 / 1;
		border-radius: 4px;
		border: 1px solid rgba(255, 255, 255, 0.05);
		min-height: 12px;
	}
</style>
