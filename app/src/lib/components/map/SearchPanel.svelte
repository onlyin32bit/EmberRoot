<script lang="ts">
	type SearchResult = {
		id: string;
		title: string;
		details: string;
		coords: [number, number];
	};

	let {
		results = [],
		onSearch,
		onSelect
	}: {
		results?: SearchResult[];
		onSearch?: (query: string) => void;
		onSelect?: (item: SearchResult) => void;
	} = $props();

	let query = '';

	function runSearch() {
		onSearch?.(query);
	}

	function selectItem(item: SearchResult) {
		onSelect?.(item);
	}
</script>

<div class="search-panel">
	<div class="search-panel__top">
		<input
			type="search"
			placeholder="Search node ID, region, coordinates..."
			bind:value={query}
			onkeydown={(event) => event.key === 'Enter' && runSearch()}
			class="search-panel__input"
		/>
		<button type="button" class="search-panel__button" onclick={runSearch}>
			Search
		</button>
	</div>

	<ul class="search-panel__results">
		{#each results as item}
			<li class="search-panel__item" onclick={() => selectItem(item)}>
				<div class="search-panel__item-title">{item.title}</div>
				<div class="search-panel__item-subtitle">{item.details}</div>
			</li>
		{/each}
	</ul>
</div>

<style>
	.search-panel {
		background: rgba(15, 23, 42, 0.9);
		border: 1px solid rgba(148, 163, 184, 0.14);
		border-radius: 18px;
		padding: 14px;
		color: #e2e8f0;
	}

	.search-panel__top {
		display: flex;
		gap: 10px;
		margin-bottom: 12px;
	}

	.search-panel__input {
		flex: 1;
		padding: 8px 12px;
		border-radius: 14px;
		border: 1px solid rgba(148, 163, 184, 0.18);
		background: rgba(255, 255, 255, 0.04);
		color: #e2e8f0;
		outline: none;
	}

	.search-panel__button {
		border: none;
		padding: 8px 14px;
		border-radius: 14px;
		background: #7c3aed;
		color: white;
		font-weight: 700;
		cursor: pointer;
	}

	.search-panel__results {
		list-style: none;
		padding: 0;
		margin: 0;
		display: grid;
		gap: 8px;
	}

	.search-panel__item {
		padding: 10px 12px;
		border-radius: 14px;
		background: rgba(255, 255, 255, 0.05);
		cursor: pointer;
	}

	.search-panel__item:hover {
		background: rgba(255, 255, 255, 0.1);
	}

	.search-panel__item-title {
		font-weight: 700;
	}

	.search-panel__item-subtitle {
		font-size: 12px;
		color: rgba(226, 232, 240, 0.72);
	}
</style>