<!-- ────────────────────────────────────────────────────────────────
  Card.svelte — EmberRoot Design System
  Variants: default | glass | raised
  Padding:  none | sm | md | lg
──────────────────────────────────────────────────────────────── -->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	interface Props extends HTMLAttributes<HTMLDivElement> {
		variant?: 'default' | 'glass' | 'raised';
		padding?: 'none' | 'sm' | 'md' | 'lg';
		class?: string;
		children?: Snippet;
	}

	let {
		variant = 'default',
		padding = 'md',
		class: className = '',
		children,
		...restProps
	}: Props = $props();
</script>

<div class="er-card er-card--{variant} er-card--pad-{padding} {className}" {...restProps}>
	{@render children?.()}
</div>

<style>
	.er-card {
		border-radius: 8px;
		border: 1px solid var(--surface-border);
		position: relative;
		overflow: hidden;
	}

	/* ── Variants ── */
	.er-card--default {
		background: var(--surface-base);
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
	}
	.er-card--raised {
		background: var(--surface-raised);
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
	}
	.er-card--glass {
		background: rgba(22, 28, 34, 0.72);
		backdrop-filter: blur(14px) saturate(1.6);
		-webkit-backdrop-filter: blur(14px) saturate(1.6);
		border-color: rgba(255, 255, 255, 0.07);
	}

	/* Top accent stripe for default cards */
	.er-card--default::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 1px;
		background: linear-gradient(90deg, transparent, var(--surface-muted), transparent);
	}

	/* ── Padding ── */
	.er-card--pad-none { padding: 0; }
	.er-card--pad-sm   { padding: 12px; }
	.er-card--pad-md   { padding: 20px; }
	.er-card--pad-lg   { padding: 32px; }
</style>
