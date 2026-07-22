<!-- ────────────────────────────────────────────────────────────────
  Panel.svelte — EmberRoot Design System
  A titled, optionally collapsible panel with a header slot.
──────────────────────────────────────────────────────────────── -->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import Card from './Card.svelte';

	interface Props {
		title?: string;
		collapsible?: boolean;
		collapsed?: boolean;
		class?: string;
		children?: Snippet;
		headerRight?: Snippet;
	}

	let {
		title,
		collapsible = false,
		collapsed = $bindable(false),
		class: className = '',
		children,
		headerRight
	}: Props = $props();

	function toggle() {
		if (collapsible) collapsed = !collapsed;
	}
</script>

<Card variant="default" padding="none" class="er-panel {className}">
	{#if title || collapsible || headerRight}
		<div
			class="er-panel__header"
			class:er-panel__header--clickable={collapsible}
			onclick={toggle}
			onkeydown={(e) => e.key === 'Enter' && toggle()}
			role={collapsible ? 'button' : undefined}
			tabindex={collapsible ? 0 : undefined}
			aria-expanded={collapsible ? !collapsed : undefined}
		>
			<div class="er-panel__title-group">
				{#if collapsible}
					<svg
						class="er-panel__chevron"
						class:er-panel__chevron--collapsed={collapsed}
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
						aria-hidden="true"
					>
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
					</svg>
				{/if}
				{#if title}
					<h3 class="er-panel__title">{title}</h3>
				{/if}
			</div>
			{#if headerRight}
				<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
				<div class="er-panel__header-right" onclick={(e) => e.stopPropagation()}>
					{@render headerRight()}
				</div>
			{/if}
		</div>
	{/if}

	{#if !collapsed}
		<div class="er-panel__body">
			{@render children?.()}
		</div>
	{/if}
</Card>

<style>
	:global(.er-panel) {
		overflow: hidden;
	}

	.er-panel__header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 10px 16px;
		background: var(--surface-raised);
		border-bottom: 1px solid var(--surface-border);
		min-height: 44px;
	}
	.er-panel__header--clickable {
		cursor: pointer;
	}
	.er-panel__header--clickable:hover {
		background: var(--surface-overlay);
	}
	.er-panel__header:focus-visible {
		outline: 2px solid var(--ember-400);
		outline-offset: -2px;
	}

	.er-panel__title-group {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.er-panel__title {
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--text-primary);
		margin: 0;
	}

	.er-panel__chevron {
		width: 14px;
		height: 14px;
		color: var(--text-muted);
		transition: transform var(--transition-fast);
		flex-shrink: 0;
	}
	.er-panel__chevron--collapsed {
		transform: rotate(-90deg);
	}

	.er-panel__header-right {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.er-panel__body {
		padding: 16px;
	}
</style>
