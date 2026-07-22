<!-- FilterBar.svelte
  Status filter chips for the spatial map.
  Emits the selected status string (or null for "All") via onFilter.
-->
<script lang="ts">
	type Status = 'online' | 'warning' | 'critical' | 'offline';

	interface FilterOption {
		id: Status | null;
		label: string;
		color: string;
	}

	let {
		onFilter
	}: {
		onFilter: (status: Status | null) => void;
	} = $props();

	const FILTERS: FilterOption[] = [
		{ id: null,       label: 'All',      color: 'var(--text-secondary)' },
		{ id: 'online',   label: 'Online',   color: '#22c55e' },
		{ id: 'warning',  label: 'Warning',  color: '#f59e0b' },
		{ id: 'critical', label: 'Critical', color: '#ef4444' },
		{ id: 'offline',  label: 'Offline',  color: '#6b7280' }
	];

	let active = $state<Status | null>(null);

	function select(id: Status | null) {
		active = id;
		onFilter(id);
	}
</script>

<div class="filter-bar" role="group" aria-label="Filter nodes by status">
	{#each FILTERS as f}
		<button
			class="filter-chip"
			class:filter-chip--active={active === f.id}
			onclick={() => select(f.id)}
			style="--chip-color:{f.color}"
			aria-pressed={active === f.id}
		>
			{#if f.id !== null}
				<span class="filter-chip__dot"></span>
			{/if}
			{f.label}
		</button>
	{/each}
</div>

<style>
	.filter-bar {
		display: flex;
		gap: 6px;
		flex-wrap: wrap;
		background: rgba(15, 23, 42, 0.82);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 14px;
		padding: 8px 10px;
		backdrop-filter: blur(8px);
	}

	.filter-chip {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		padding: 5px 12px;
		border-radius: 8px;
		border: 1px solid transparent;
		background: transparent;
		color: var(--text-muted);
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.04em;
		cursor: pointer;
		transition:
			background 0.15s ease,
			color 0.15s ease,
			border-color 0.15s ease;
	}

	.filter-chip:hover {
		background: rgba(255, 255, 255, 0.06);
		color: var(--text-secondary);
	}

	.filter-chip--active {
		background: color-mix(in srgb, var(--chip-color) 15%, transparent);
		border-color: color-mix(in srgb, var(--chip-color) 40%, transparent);
		color: var(--chip-color);
	}

	.filter-chip__dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: var(--chip-color);
		flex-shrink: 0;
	}
</style>
