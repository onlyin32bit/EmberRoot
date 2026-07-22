<script lang="ts">
	type LegendItem = {
		label: string;
		color: string;
	};

	let {
		items = []
	}: {
		items?: LegendItem[];
	} = $props();
</script>

<div class="map-legend">
	<div class="map-legend__title">Legend</div>
	{#each items as item}
		<div class="map-legend__row">
			<span class="map-legend__dot" style="background:{item.color}"></span>
			<span>{item.label}</span>
		</div>
	{/each}
</div>

<style>
	.map-legend {
		background: rgba(15, 23, 42, 0.9);
		border: 1px solid rgba(148, 163, 184, 0.15);
		border-radius: 18px;
		padding: 14px;
		color: #e2e8f0;
		font-size: 12px;
	}

	.map-legend__title {
		font-weight: 700;
		margin-bottom: 10px;
	}

	.map-legend__row {
		display: flex;
		align-items: center;
		gap: 10px;
		margin-bottom: 8px;
	}

	.map-legend__dot {
		width: 12px;
		height: 12px;
		border-radius: 999px;
		flex-shrink: 0;
	}
</style>