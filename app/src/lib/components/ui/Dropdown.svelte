<!-- ────────────────────────────────────────────────────────────────
  Dropdown.svelte — EmberRoot Design System
  A styled <select> wrapper for the dark GIS aesthetic.
──────────────────────────────────────────────────────────────── -->
<script lang="ts">
	interface Option {
		value: string;
		label: string;
		disabled?: boolean;
	}

	interface Props {
		options: Option[];
		value?: string;
		placeholder?: string;
		disabled?: boolean;
		id?: string;
		class?: string;
		onchange?: (value: string) => void;
	}

	let {
		options,
		value = $bindable(''),
		placeholder = 'Select…',
		disabled = false,
		id,
		class: className = '',
		onchange
	}: Props = $props();

	function handleChange(event: Event) {
		const v = (event.target as HTMLSelectElement).value;
		value = v;
		onchange?.(v);
	}
</script>

<div class="er-dropdown {className}">
	<select
		{id}
		{disabled}
		bind:value
		onchange={handleChange}
		class="er-dropdown__select"
	>
		{#if !value}
			<option value="" disabled selected hidden>{placeholder}</option>
		{/if}
		{#each options as opt}
			<option value={opt.value} disabled={opt.disabled}>{opt.label}</option>
		{/each}
	</select>
	<svg class="er-dropdown__arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
		<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
	</svg>
</div>

<style>
	.er-dropdown {
		position: relative;
		display: inline-flex;
		align-items: center;
	}

	.er-dropdown__select {
		width: 100%;
		appearance: none;
		-webkit-appearance: none;
		background: var(--surface-base);
		border: 1px solid var(--surface-border);
		color: var(--text-primary);
		font-family: inherit;
		font-size: 13px;
		font-weight: 400;
		padding: 0 32px 0 10px;
		height: 36px;
		border-radius: 6px;
		cursor: pointer;
		transition: border-color var(--transition-fast), background var(--transition-fast);
		outline: none;
	}

	.er-dropdown__select:hover:not(:disabled) {
		background: var(--surface-raised);
		border-color: var(--surface-muted);
	}

	.er-dropdown__select:focus-visible {
		border-color: var(--ember-400);
		box-shadow: 0 0 0 2px rgba(212, 98, 42, 0.25);
	}

	.er-dropdown__select:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}

	/* Option elements inherit background on most browsers */
	.er-dropdown__select option {
		background: var(--surface-overlay);
		color: var(--text-primary);
	}

	.er-dropdown__arrow {
		position: absolute;
		right: 8px;
		width: 14px;
		height: 14px;
		color: var(--text-muted);
		pointer-events: none;
		flex-shrink: 0;
	}
</style>
