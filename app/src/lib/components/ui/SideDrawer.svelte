<!-- ────────────────────────────────────────────────────────────────
  SideDrawer.svelte — EmberRoot Design System
  Off-canvas panel with optional title, backdrop, smooth slide.
──────────────────────────────────────────────────────────────── -->
<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		open?: boolean;
		title?: string;
		position?: 'left' | 'right';
		width?: 'sm' | 'md' | 'lg' | 'xl';
		class?: string;
		children?: Snippet;
		onclose?: () => void;
	}

	let {
		open = $bindable(false),
		title,
		position = 'right',
		width = 'md',
		class: className = '',
		children,
		onclose
	}: Props = $props();

	function close() {
		open = false;
		onclose?.();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') close();
	}
</script>

<svelte:window onkeydown={open ? handleKeydown : undefined} />

<!-- Backdrop -->
<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div
	class="er-drawer__backdrop"
	class:er-drawer__backdrop--visible={open}
	onclick={close}
></div>

<!-- Drawer panel -->
<aside
	class="er-drawer er-drawer--{position} er-drawer--{width} {className}"
	class:er-drawer--open={open}
	aria-hidden={!open}
	aria-modal="true"
	role="dialog"
	aria-label={title ?? 'Side drawer'}
>
	{#if title}
		<div class="er-drawer__header">
			<span class="er-drawer__title">{title}</span>
			<button onclick={close} class="er-drawer__close" aria-label="Close drawer">
				<svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
				</svg>
			</button>
		</div>
	{/if}

	<div class="er-drawer__body">
		{@render children?.()}
	</div>
</aside>

<style>
	/* Backdrop */
	.er-drawer__backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0);
		z-index: 40;
		pointer-events: none;
		transition: background var(--transition-base);
	}
	.er-drawer__backdrop--visible {
		background: rgba(0, 0, 0, 0.55);
		backdrop-filter: blur(3px);
		-webkit-backdrop-filter: blur(3px);
		pointer-events: auto;
	}

	/* Drawer */
	.er-drawer {
		position: fixed;
		top: 0;
		bottom: 0;
		z-index: 50;
		display: flex;
		flex-direction: column;
		background: var(--surface-base);
		border: 1px solid var(--surface-border);
		box-shadow: 0 0 48px rgba(0, 0, 0, 0.6);
		transition: transform var(--transition-base);
		overflow: hidden;
	}

	/* Position */
	.er-drawer--right {
		right: 0;
		border-left-color: var(--surface-border);
		transform: translateX(100%);
	}
	.er-drawer--left {
		left: 0;
		border-right-color: var(--surface-border);
		transform: translateX(-100%);
	}

	/* Open */
	.er-drawer--open {
		transform: translateX(0);
	}

	/* Widths */
	.er-drawer--sm { width: 256px; }
	.er-drawer--md { width: 320px; }
	.er-drawer--lg { width: 400px; }
	.er-drawer--xl { width: 520px; }

	/* Header */
	.er-drawer__header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 20px;
		height: 52px;
		background: var(--surface-raised);
		border-bottom: 1px solid var(--surface-border);
		flex-shrink: 0;
	}

	.er-drawer__title {
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--text-primary);
	}

	.er-drawer__close {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		background: transparent;
		border: none;
		border-radius: 6px;
		color: var(--text-muted);
		cursor: pointer;
		transition: background var(--transition-fast), color var(--transition-fast);
	}
	.er-drawer__close:hover {
		background: var(--surface-overlay);
		color: var(--text-primary);
	}

	/* Body */
	.er-drawer__body {
		flex: 1;
		overflow-y: auto;
		padding: 20px;
	}
</style>
