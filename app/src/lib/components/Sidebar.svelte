<script lang="ts">
	import { page } from '$app/state';

	interface SidebarItem {
		id:     string;
		label:  string;
		href:   string;
		status?: 'online' | 'warning' | 'critical' | 'offline';
		icon:   string; // inline SVG path data
	}

	const sidebarItems: SidebarItem[] = [
		{
			id: 'dashboard',
			label: 'Dashboard',
			href: '/',
			status: 'online',
			icon: 'M3 12l9-9 9 9M5 10v10h14V10',
		},
		{
			id: 'live-monitoring',
			label: 'Live Monitoring',
			href: '/live-monitoring',
			status: 'online',
			icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
		},
		{
			id: 'spatial-map',
			label: 'Spatial Map',
			href: '/spatial-map',
			status: 'warning',
			icon: 'M3 7l7-4 8 4 7-4v14l-7 4-8-4-7 4V7z',
		},
		{
			id: 'alert-history',
			label: 'Alert History',
			href: '/alert-history',
			status: 'warning',
			icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
		},
	];

	interface Props {
		collapsed: boolean;
		onToggle: () => void;
	}

	let { collapsed, onToggle }: Props = $props();
</script>

<aside class="sidebar" class:sidebar--collapsed={collapsed} aria-label="Sidebar navigation">
	<!-- Toggle button -->
	<button
		id="btn-sidebar-toggle"
		class="sidebar__toggle"
		onclick={onToggle}
		aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
		title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
	>
		<svg
			class="sidebar__toggle-icon"
			class:sidebar__toggle-icon--flipped={collapsed}
			width="16" height="16" viewBox="0 0 24 24"
			fill="none" stroke="currentColor"
			stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
		>
			<polyline points="15 18 9 12 15 6"/>
		</svg>
	</button>

	<!-- Section label -->
	{#if !collapsed}
		<div class="sidebar__section-label" aria-hidden="true">
			OPERATIONS
		</div>
	{/if}

	<!-- Nav items -->
	<nav class="sidebar__nav" aria-label="Sidebar">
		{#each sidebarItems as item}
			{@const active = page.url.pathname === item.href}
			<a
				id="sidebar-{item.id}"
				href={item.href}
				class="sidebar__item"
				class:sidebar__item--active={active}
				aria-current={active ? 'page' : undefined}
				title={collapsed ? item.label : undefined}
			>
				<!-- Icon -->
				<span class="sidebar__icon" aria-hidden="true">
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none"
					     stroke="currentColor" stroke-width="1.75"
					     stroke-linecap="round" stroke-linejoin="round">
						{#each item.icon.split(' M').filter(Boolean) as seg, i}
							<path d="{i === 0 ? seg : 'M' + seg}"/>
						{/each}
					</svg>
				</span>

				<!-- Label + status dot -->
				{#if !collapsed}
					<span class="sidebar__label">{item.label}</span>
					{#if item.status}
						<span
							class="sidebar__status-dot sidebar__status-dot--{item.status}"
							aria-label="Status: {item.status}"
						></span>
					{/if}
				{/if}
			</a>
		{/each}
	</nav>

	<!-- Footer info -->
	{#if !collapsed}
		<div class="sidebar__footer">
			<div class="sidebar__footer-label">v0.1.0-alpha</div>
			<div class="sidebar__footer-sub">EmberRoot OS</div>
		</div>
	{/if}
</aside>

<style>
	.sidebar {
		position: fixed;
		top: var(--nav-height);
		left: 0;
		bottom: 0;
		width: var(--sidebar-width);
		z-index: 90;
		display: flex;
		flex-direction: column;
		gap: 0;
		background: var(--surface-base);
		border-right: 1px solid var(--surface-border);
		transition: width var(--transition-base);
		overflow: hidden;
	}

	.sidebar--collapsed {
		width: var(--sidebar-collapsed);
	}

	/* ── Toggle ─────────────────────────────────────────────────── */
	.sidebar__toggle {
		display: flex;
		align-items: center;
		justify-content: center;
		align-self: flex-end;
		width: 28px; height: 28px;
		margin: 12px 10px 4px auto;
		border-radius: 6px;
		border: 1px solid var(--surface-border);
		background: var(--surface-raised);
		color: var(--text-muted);
		cursor: pointer;
		flex-shrink: 0;
		transition:
			background var(--transition-fast),
			color var(--transition-fast),
			border-color var(--transition-fast);
	}
	.sidebar__toggle:hover {
		background: var(--surface-overlay);
		color: var(--text-primary);
		border-color: var(--surface-muted);
	}

	.sidebar__toggle-icon {
		transition: transform var(--transition-base);
	}
	.sidebar__toggle-icon--flipped {
		transform: rotate(180deg);
	}

	/* ── Section label ──────────────────────────────────────────── */
	.sidebar__section-label {
		padding: 12px 16px 6px;
		font-size: 10px;
		font-weight: 700;
		letter-spacing: 0.1em;
		color: var(--text-muted);
		font-family: 'JetBrains Mono', monospace;
		white-space: nowrap;
		overflow: hidden;
	}

	/* ── Nav ─────────────────────────────────────────────────────── */
	.sidebar__nav {
		flex: 1;
		overflow-y: auto;
		overflow-x: hidden;
		padding: 4px 8px;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.sidebar__item {
		position: relative;
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 9px 10px;
		border-radius: 8px;
		text-decoration: none;
		color: var(--text-secondary);
		font-size: 13px;
		font-weight: 500;
		white-space: nowrap;
		overflow: hidden;
		transition:
			background var(--transition-fast),
			color var(--transition-fast);
	}
	.sidebar__item:hover {
		background: rgba(255,255,255,0.05);
		color: var(--text-primary);
	}
	.sidebar__item--active {
		background: rgba(240, 120, 64, 0.12);
		color: var(--ember-300);
	}
	.sidebar__item--active::before {
		content: '';
		position: absolute;
		left: 0; top: 20%; bottom: 20%;
		width: 3px;
		border-radius: 0 3px 3px 0;
		background: var(--ember-400);
		box-shadow: 0 0 8px var(--ember-400);
	}
	.sidebar__item--active:hover {
		background: rgba(240, 120, 64, 0.16);
		color: var(--ember-200);
	}

	.sidebar__icon {
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		width: 20px;
	}

	.sidebar__label {
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	/* ── Status dots ─────────────────────────────────────────────── */
	.sidebar__status-dot {
		width: 6px; height: 6px;
		border-radius: 50%;
		flex-shrink: 0;
	}
	.sidebar__status-dot--online   { background: var(--status-online);   }
	.sidebar__status-dot--warning  { background: var(--status-warning);  }
	.sidebar__status-dot--critical { background: var(--status-critical); }
	.sidebar__status-dot--offline  { background: var(--status-offline);  }

	/* ── Footer ──────────────────────────────────────────────────── */
	.sidebar__footer {
		padding: 12px 16px;
		border-top: 1px solid var(--surface-border);
		overflow: hidden;
	}
	.sidebar__footer-label {
		font-size: 11px;
		font-weight: 600;
		color: var(--text-muted);
		font-family: 'JetBrains Mono', monospace;
		white-space: nowrap;
	}
	.sidebar__footer-sub {
		font-size: 10px;
		color: var(--text-muted);
		opacity: 0.6;
		white-space: nowrap;
	}
</style>
