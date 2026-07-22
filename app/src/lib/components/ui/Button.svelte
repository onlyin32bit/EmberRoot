<!-- ────────────────────────────────────────────────────────────────
  Button.svelte — EmberRoot Design System
  Variants: primary | secondary | danger | ghost
  Sizes:     sm | md | lg
──────────────────────────────────────────────────────────────── -->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';

	interface Props extends HTMLButtonAttributes {
		variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
		size?: 'sm' | 'md' | 'lg';
		class?: string;
		children?: Snippet;
	}

	let {
		variant = 'primary',
		size = 'md',
		class: className = '',
		children,
		...restProps
	}: Props = $props();
</script>

<button
	class="er-btn er-btn--{variant} er-btn--{size} {className}"
	{...restProps}
>
	{@render children?.()}
</button>

<style>
	.er-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		font-family: inherit;
		font-weight: 500;
		letter-spacing: 0.01em;
		border: 1px solid transparent;
		border-radius: 6px;
		cursor: pointer;
		transition: background var(--transition-fast), border-color var(--transition-fast),
			color var(--transition-fast), box-shadow var(--transition-fast);
		white-space: nowrap;
		text-decoration: none;
		-webkit-user-select: none;
		user-select: none;
	}

	.er-btn:focus-visible {
		outline: 2px solid var(--ember-400);
		outline-offset: 2px;
	}

	.er-btn:disabled {
		opacity: 0.45;
		cursor: not-allowed;
		pointer-events: none;
	}

	/* ── Sizes ── */
	.er-btn--sm { height: 28px; padding: 0 10px; font-size: 11px; }
	.er-btn--md { height: 36px; padding: 0 14px; font-size: 13px; }
	.er-btn--lg { height: 44px; padding: 0 20px; font-size: 14px; }

	/* ── Variants ── */
	.er-btn--primary {
		background: var(--ember-500);
		color: #fff;
		border-color: var(--ember-400);
		box-shadow: var(--glow-ember);
	}
	.er-btn--primary:hover:not(:disabled) {
		background: var(--ember-400);
		box-shadow: 0 0 28px -4px rgba(240, 120, 64, 0.5);
	}

	.er-btn--secondary {
		background: var(--surface-raised);
		color: var(--text-primary);
		border-color: var(--surface-border);
	}
	.er-btn--secondary:hover:not(:disabled) {
		background: var(--surface-overlay);
		border-color: var(--surface-muted);
	}

	.er-btn--danger {
		background: var(--status-critical);
		color: #fff;
		border-color: #f06868;
		box-shadow: 0 0 16px -4px rgba(240, 80, 80, 0.35);
	}
	.er-btn--danger:hover:not(:disabled) {
		background: #f36868;
		box-shadow: 0 0 24px -4px rgba(240, 80, 80, 0.55);
	}

	.er-btn--ghost {
		background: transparent;
		color: var(--text-secondary);
		border-color: transparent;
	}
	.er-btn--ghost:hover:not(:disabled) {
		background: var(--surface-raised);
		color: var(--text-primary);
	}
</style>
