<!-- ────────────────────────────────────────────────────────────────
  Toolbar.svelte — EmberRoot Design System
  Horizontal or vertical strip of actions with separator support.
──────────────────────────────────────────────────────────────── -->
<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		orientation?: 'horizontal' | 'vertical';
		class?: string;
		children?: Snippet;
	}

	let { orientation = 'horizontal', class: className = '', children }: Props = $props();
</script>

<div class="er-toolbar er-toolbar--{orientation} {className}" role="toolbar">
	{@render children?.()}
</div>

<style>
	.er-toolbar {
		display: flex;
		gap: 4px;
		padding: 4px;
		background: var(--surface-raised);
		border: 1px solid var(--surface-border);
		border-radius: 8px;
	}

	.er-toolbar--horizontal {
		flex-direction: row;
		align-items: center;
	}

	.er-toolbar--vertical {
		flex-direction: column;
		align-items: stretch;
	}

	/* Divider convenience element */
	.er-toolbar :global(.er-toolbar__sep) {
		background: var(--surface-border);
		border: none;
		flex-shrink: 0;
	}
	.er-toolbar--horizontal :global(.er-toolbar__sep) {
		width: 1px;
		height: 20px;
		margin: 0 4px;
	}
	.er-toolbar--vertical :global(.er-toolbar__sep) {
		height: 1px;
		width: 100%;
		margin: 4px 0;
	}
</style>
