<!-- ────────────────────────────────────────────────────────────────
  StatusIndicator.svelte — EmberRoot Design System
  A pulsing dot that maps to the four operational states.
──────────────────────────────────────────────────────────────── -->
<script lang="ts">
	interface Props {
		status?: 'online' | 'warning' | 'critical' | 'offline';
		pulse?: boolean;
		size?: 'sm' | 'md' | 'lg';
		label?: string;
		class?: string;
	}

	let { status = 'offline', pulse = false, size = 'md', label, class: className = '' }: Props = $props();
</script>

<div class="er-status er-status--{size} {className}" role="img" aria-label={label ?? status} title={label ?? status}>
	<div class="er-status__dot er-status__dot--{status}">
		{#if pulse && status !== 'offline'}
			<div class="er-status__ping er-status__ping--{status}"></div>
		{/if}
	</div>
	{#if label}
		<span class="er-status__label er-status__label--{status}">{label}</span>
	{/if}
</div>

<style>
	.er-status {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		flex-shrink: 0;
	}

	/* ── Sizes ── */
	.er-status--sm .er-status__dot { width: 6px;  height: 6px;  }
	.er-status--md .er-status__dot { width: 8px;  height: 8px;  }
	.er-status--lg .er-status__dot { width: 11px; height: 11px; }

	/* Outer wrapper (needed for ping positioning) */
	.er-status__dot {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		border-radius: 50%;
	}

	/* Inner solid dot via ::after */
	.er-status__dot::after {
		content: '';
		position: absolute;
		inset: 0;
		border-radius: 50%;
	}
	.er-status__dot--online::after   { background: var(--status-online);   box-shadow: 0 0 6px rgba(34, 211, 160, 0.7); }
	.er-status__dot--warning::after  { background: var(--status-warning);  box-shadow: 0 0 6px rgba(240, 179, 64, 0.7); }
	.er-status__dot--critical::after { background: var(--status-critical); box-shadow: 0 0 6px rgba(240, 80, 80, 0.7);  }
	.er-status__dot--offline::after  { background: var(--status-offline);  }

	/* Ping ring */
	.er-status__ping {
		position: absolute;
		inset: -3px;
		border-radius: 50%;
		animation: er-ping 1.6s cubic-bezier(0, 0, 0.2, 1) infinite;
		opacity: 0;
	}
	.er-status__ping--online   { background: var(--status-online);   }
	.er-status__ping--warning  { background: var(--status-warning);  }
	.er-status__ping--critical { background: var(--status-critical); }

	@keyframes er-ping {
		0%   { transform: scale(0.6); opacity: 0.8; }
		80%  { transform: scale(2.2); opacity: 0; }
		100% { transform: scale(2.2); opacity: 0; }
	}

	/* ── Label ── */
	.er-status__label {
		font-size: 12px;
		font-weight: 500;
	}
	.er-status__label--online   { color: var(--status-online); }
	.er-status__label--warning  { color: var(--status-warning); }
	.er-status__label--critical { color: var(--status-critical); }
	.er-status__label--offline  { color: var(--text-muted); }
</style>
