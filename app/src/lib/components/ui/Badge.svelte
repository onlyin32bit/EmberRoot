<!-- ────────────────────────────────────────────────────────────────
  Badge.svelte — EmberRoot Design System
  Variants: neutral | online | warning | critical | ember
  Sizes:    sm | md
──────────────────────────────────────────────────────────────── -->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	interface Props extends HTMLAttributes<HTMLSpanElement> {
		variant?: 'neutral' | 'online' | 'warning' | 'critical' | 'ember';
		size?: 'sm' | 'md';
		class?: string;
		children?: Snippet;
	}

	let {
		variant = 'neutral',
		size = 'md',
		class: className = '',
		children,
		...restProps
	}: Props = $props();
</script>

<span class="er-badge er-badge--{variant} er-badge--{size} {className}" {...restProps}>
	{@render children?.()}
</span>

<style>
	.er-badge {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		font-weight: 600;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		border-radius: 999px;
		border: 1px solid;
		line-height: 1;
		white-space: nowrap;
	}

	/* ── Sizes ── */
	.er-badge--sm { font-size: 9px;  padding: 2px 7px; }
	.er-badge--md { font-size: 10px; padding: 3px 9px; }

	/* ── Variants ── */
	.er-badge--neutral {
		background: var(--surface-overlay);
		color: var(--text-secondary);
		border-color: var(--surface-muted);
	}
	.er-badge--online {
		background: rgba(34, 211, 160, 0.12);
		color: var(--status-online);
		border-color: rgba(34, 211, 160, 0.3);
	}
	.er-badge--warning {
		background: rgba(240, 179, 64, 0.12);
		color: var(--status-warning);
		border-color: rgba(240, 179, 64, 0.3);
	}
	.er-badge--critical {
		background: rgba(240, 80, 80, 0.12);
		color: var(--status-critical);
		border-color: rgba(240, 80, 80, 0.3);
	}
	.er-badge--ember {
		background: rgba(240, 120, 64, 0.15);
		color: var(--ember-300);
		border-color: var(--ember-500);
	}
</style>
