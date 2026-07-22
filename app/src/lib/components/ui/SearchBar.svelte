<!-- ────────────────────────────────────────────────────────────────
  SearchBar.svelte — EmberRoot Design System
  Full-width search input with icon, clear button, shortcut hint.
──────────────────────────────────────────────────────────────── -->
<script lang="ts">
	interface Props {
		value?: string;
		placeholder?: string;
		id?: string;
		class?: string;
		onsearch?: (value: string) => void;
	}

	let {
		value = $bindable(''),
		placeholder = 'Search…',
		id,
		class: className = '',
		onsearch
	}: Props = $props();

	function clear() {
		value = '';
		onsearch?.('');
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') onsearch?.(value);
		if (e.key === 'Escape') clear();
	}
</script>

<div class="er-search {className}">
	<svg class="er-search__icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
		<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
	</svg>

	<input
		{id}
		type="search"
		bind:value
		{placeholder}
		onkeydown={handleKeydown}
		class="er-search__input"
		autocomplete="off"
		spellcheck="false"
	/>

	{#if value}
		<button type="button" onclick={clear} class="er-search__clear" aria-label="Clear search">
			<svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
			</svg>
		</button>
	{/if}
</div>

<style>
	.er-search {
		position: relative;
		display: flex;
		align-items: center;
		width: 100%;
	}

	.er-search__icon {
		position: absolute;
		left: 11px;
		width: 15px;
		height: 15px;
		color: var(--text-muted);
		pointer-events: none;
		flex-shrink: 0;
	}

	.er-search__input {
		width: 100%;
		background: var(--surface-base);
		border: 1px solid var(--surface-border);
		color: var(--text-primary);
		font-family: inherit;
		font-size: 13px;
		padding: 0 36px 0 36px;
		height: 36px;
		border-radius: 18px;
		outline: none;
		transition: border-color var(--transition-fast), background var(--transition-fast),
			box-shadow var(--transition-fast);
	}

	/* Remove native search clear on webkit */
	.er-search__input::-webkit-search-cancel-button { display: none; }

	.er-search__input::placeholder {
		color: var(--text-muted);
	}

	.er-search__input:hover {
		background: var(--surface-raised);
		border-color: var(--surface-muted);
	}

	.er-search__input:focus {
		border-color: var(--ember-500);
		background: var(--surface-raised);
		box-shadow: 0 0 0 2px rgba(160, 69, 32, 0.2);
	}

	.er-search__clear {
		position: absolute;
		right: 10px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--surface-muted);
		border: none;
		border-radius: 50%;
		width: 18px;
		height: 18px;
		color: var(--text-muted);
		cursor: pointer;
		transition: background var(--transition-fast), color var(--transition-fast);
	}
	.er-search__clear:hover {
		background: var(--surface-overlay);
		color: var(--text-primary);
	}
</style>
