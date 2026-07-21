<!-- TimeRangeSelector.svelte
  Compact button group for selecting a chart time range.
  Props: value (controlled), onChange callback.
-->
<script lang="ts">
	export type TimeRange = '24h' | '7d' | '30d';

	const RANGES: { id: TimeRange; label: string }[] = [
		{ id: '24h', label: '24 h' },
		{ id: '7d',  label: '7 d'  },
		{ id: '30d', label: '30 d' }
	];

	let {
		value = '24h',
		onChange
	}: {
		value?: TimeRange;
		onChange: (r: TimeRange) => void;
	} = $props();
</script>

<div class="trs" role="group" aria-label="Select time range">
	{#each RANGES as r}
		<button
			class="trs__btn"
			class:trs__btn--active={value === r.id}
			onclick={() => onChange(r.id)}
			aria-pressed={value === r.id}
		>
			{r.label}
		</button>
	{/each}
</div>

<style>
	.trs {
		display: inline-flex;
		gap: 2px;
		background: var(--surface-raised);
		border: 1px solid var(--surface-border);
		border-radius: 10px;
		padding: 3px;
	}

	.trs__btn {
		padding: 5px 14px;
		border-radius: 7px;
		border: none;
		background: transparent;
		color: var(--text-muted);
		font-size: 12px;
		font-weight: 600;
		cursor: pointer;
		transition:
			background 0.14s ease,
			color 0.14s ease;
	}

	.trs__btn:hover:not(.trs__btn--active) {
		background: rgba(255, 255, 255, 0.05);
		color: var(--text-secondary);
	}

	.trs__btn--active {
		background: var(--surface-overlay);
		color: var(--text-primary);
	}
</style>
