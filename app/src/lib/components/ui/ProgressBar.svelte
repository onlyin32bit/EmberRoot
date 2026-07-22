<!-- ────────────────────────────────────────────────────────────────
  ProgressBar.svelte — EmberRoot Design System
  Variants: ember | online | warning | critical | neutral
  Sizes:    sm | md | lg
──────────────────────────────────────────────────────────────── -->
<script lang="ts">
	interface Props {
		value: number;      // 0–max
		max?: number;
		label?: string;
		showValue?: boolean;
		variant?: 'ember' | 'online' | 'warning' | 'critical' | 'neutral';
		size?: 'sm' | 'md' | 'lg';
		class?: string;
	}

	let {
		value,
		max = 100,
		label,
		showValue = false,
		variant = 'ember',
		size = 'md',
		class: className = ''
	}: Props = $props();

	const pct = $derived(Math.min(100, Math.max(0, (value / max) * 100)));
</script>

<div class="er-progress {className}" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max} aria-label={label}>
	{#if label || showValue}
		<div class="er-progress__meta">
			{#if label}<span class="er-progress__label">{label}</span>{/if}
			{#if showValue}<span class="er-progress__value">{Math.round(pct)}%</span>{/if}
		</div>
	{/if}
	<div class="er-progress__track er-progress__track--{size}">
		<div class="er-progress__fill er-progress__fill--{variant}" style="width: {pct}%"></div>
	</div>
</div>

<style>
	.er-progress {
		display: flex;
		flex-direction: column;
		gap: 6px;
		width: 100%;
	}

	.er-progress__meta {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
	}

	.er-progress__label {
		font-size: 11px;
		font-weight: 500;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--text-secondary);
	}

	.er-progress__value {
		font-family: 'JetBrains Mono', monospace;
		font-size: 11px;
		font-weight: 500;
		color: var(--text-primary);
	}

	.er-progress__track {
		width: 100%;
		background: var(--surface-overlay);
		border: 1px solid var(--surface-border);
		border-radius: 999px;
		overflow: hidden;
	}

	/* ── Track sizes ── */
	.er-progress__track--sm { height: 4px; }
	.er-progress__track--md { height: 6px; }
	.er-progress__track--lg { height: 10px; }

	.er-progress__fill {
		height: 100%;
		border-radius: 999px;
		transition: width 500ms cubic-bezier(0.4, 0, 0.2, 1);
	}

	/* ── Fill variants ── */
	.er-progress__fill--ember    { background: linear-gradient(90deg, var(--ember-600), var(--ember-400)); box-shadow: var(--glow-ember); }
	.er-progress__fill--online   { background: var(--status-online); }
	.er-progress__fill--warning  { background: var(--status-warning); }
	.er-progress__fill--critical { background: var(--status-critical); }
	.er-progress__fill--neutral  { background: var(--text-secondary); }
</style>
