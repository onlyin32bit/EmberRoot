<!-- ────────────────────────────────────────────────────────────────
  ChartContainer.svelte — EmberRoot Design System
  A standardised wrapper for any chart library.
  Accepts a toolbar snippet and optional fixed aspect ratio.
──────────────────────────────────────────────────────────────── -->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import Card from './Card.svelte';

	interface Props {
		title: string;
		subtitle?: string;
		aspectRatio?: 'video' | 'square' | 'tall' | 'auto';
		minHeight?: string;
		class?: string;
		children?: Snippet;
		toolbar?: Snippet;
	}

	let {
		title,
		subtitle,
		aspectRatio = 'auto',
		minHeight = '200px',
		class: className = '',
		children,
		toolbar
	}: Props = $props();

	const ratios: Record<string, string> = {
		video:  '56.25%',
		square: '100%',
		tall:   '75%',
		auto:   '',
	};
</script>

<Card padding="md" class="er-chart {className}">
	<div class="er-chart__header">
		<div class="er-chart__titles">
			<h3 class="er-chart__title">{title}</h3>
			{#if subtitle}
				<p class="er-chart__subtitle">{subtitle}</p>
			{/if}
		</div>
		{#if toolbar}
			<div class="er-chart__toolbar">{@render toolbar()}</div>
		{/if}
	</div>

	{#if aspectRatio !== 'auto'}
		<div class="er-chart__ratio-wrapper" style="padding-top: {ratios[aspectRatio]}">
			<div class="er-chart__ratio-inner">
				{@render children?.()}
			</div>
		</div>
	{:else}
		<div class="er-chart__body" style="min-height: {minHeight}">
			{@render children?.()}
		</div>
	{/if}
</Card>

<style>
	:global(.er-chart) {
		display: flex;
		flex-direction: column;
	}

	.er-chart__header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		margin-bottom: 16px;
		gap: 12px;
	}

	.er-chart__titles {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.er-chart__title {
		font-size: 12px;
		font-weight: 600;
		letter-spacing: 0.07em;
		text-transform: uppercase;
		color: var(--text-primary);
		margin: 0;
	}

	.er-chart__subtitle {
		font-size: 11px;
		color: var(--text-muted);
	}

	.er-chart__toolbar {
		display: flex;
		align-items: center;
		gap: 6px;
		flex-shrink: 0;
	}

	/* Fixed aspect ratio approach */
	.er-chart__ratio-wrapper {
		position: relative;
		width: 100%;
	}
	.er-chart__ratio-inner {
		position: absolute;
		inset: 0;
		display: flex;
	}

	/* Auto height */
	.er-chart__body {
		flex: 1;
		position: relative;
		display: flex;
	}
</style>
