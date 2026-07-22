<script lang="ts">
	type Layer = {
		id: string;
		label: string;
		enabled: boolean;
	};

	let {
		layers = [],
		onToggle
	}: {
		layers?: Layer[];
		onToggle: (id: string) => void;
	} = $props();
</script>

<div class="layer-control">
	<div class="layer-control__header">Map layers</div>
	{#each layers as layer}
		<label class="layer-control__row">
			<input type="checkbox" checked={layer.enabled} on:change={() => onToggle(layer.id)} />
			<span>{layer.label}</span>
		</label>
	{/each}
</div>

<style>
	.layer-control {
		background: rgba(15, 23, 42, 0.96);
		border: 1px solid rgba(148, 163, 184, 0.14);
		border-radius: 18px;
		padding: 14px;
		color: #e2e8f0;
		font-size: 13px;
	}

	.layer-control__header {
		font-weight: 700;
		margin-bottom: 10px;
	}

	.layer-control__row {
		display: flex;
		align-items: center;
		gap: 10px;
		margin-bottom: 8px;
	}

	.layer-control__row:last-child { margin-bottom: 0; }
</style>