<script lang="ts">
	import { page } from '$app/state';

	const navLinks = [
		{ label: 'Dashboard',    href: '/'           },
		{ label: 'Analytics',    href: '/analytics'  },
		{ label: 'Spatial Map',  href: '/spatial-map'},
		{ label: 'Reports',      href: '/reports'    },
	] as const;

	/** Pulse state for the live indicator */
	let liveActive = $state(true);
</script>

<header class="topnav">
	<!-- Brand -->
	<div class="topnav__brand">
		<div class="topnav__logo" aria-hidden="true">
			<svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
				<defs>
					<linearGradient id="ember-grad" x1="0" y1="0" x2="1" y2="1">
						<stop offset="0%"   stop-color="#f07840"/>
						<stop offset="100%" stop-color="#d4622a"/>
					</linearGradient>
				</defs>
				<!-- Stylised flame / root glyph -->
				<path d="M14 2 C14 2 8 8 8 14 C8 18.4 10.8 21.6 14 23
				         C17.2 21.6 20 18.4 20 14 C20 10 17 7 16 5
				         C16 5 15.5 9 14 10 C12.5 9 12 5 14 2Z"
				      fill="url(#ember-grad)" opacity="0.9"/>
				<path d="M14 12 C14 12 10 15 10 18 C10 20.2 11.8 22 14 22
				         C16.2 22 18 20.2 18 18 C18 15 14 12 14 12Z"
				      fill="white" opacity="0.15"/>
				<circle cx="14" cy="18" r="2.5" fill="white" opacity="0.9"/>
			</svg>
		</div>
		<span class="topnav__wordmark">
			<span class="topnav__wordmark-ember">Ember</span><span class="topnav__wordmark-root">Root</span>
		</span>
	</div>

	<!-- Primary Navigation -->
	<nav class="topnav__nav" aria-label="Primary navigation">
		{#each navLinks as link}
			{@const active = page.url.pathname === link.href}
			<a
				id="nav-{link.label.toLowerCase().replace(/\s+/g, '-')}"
				href={link.href}
				class="topnav__link"
				class:topnav__link--active={active}
				aria-current={active ? 'page' : undefined}
			>
				{link.label}
				{#if active}
					<span class="topnav__link-indicator" aria-hidden="true"></span>
				{/if}
			</a>
		{/each}
	</nav>

	<!-- Right cluster -->
	<div class="topnav__actions">
		<!-- Live status badge -->
		<div class="topnav__status" title="System live">
			<span class="topnav__status-dot" class:topnav__status-dot--pulse={liveActive} aria-hidden="true"></span>
			<span class="topnav__status-label">LIVE</span>
		</div>

		<div class="topnav__divider" aria-hidden="true"></div>

		<!-- Notification bell -->
		<button id="btn-notifications" class="topnav__icon-btn" aria-label="Notifications" title="Notifications">
			<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
				<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
				<path d="M13.73 21a2 2 0 0 1-3.46 0"/>
			</svg>
			<span class="topnav__badge" aria-label="3 notifications">3</span>
		</button>

		<!-- Settings -->
		<button id="btn-settings" class="topnav__icon-btn" aria-label="Settings" title="Settings">
			<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
				<circle cx="12" cy="12" r="3"/>
				<path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
			</svg>
		</button>

		<!-- Avatar -->
		<button id="btn-user-menu" class="topnav__avatar" aria-label="User menu" title="User account">
			<span>ER</span>
		</button>
	</div>
</header>

<style>
	.topnav {
		position: fixed;
		top: 0; left: 0; right: 0;
		height: var(--nav-height);
		z-index: 100;
		display: flex;
		align-items: center;
		gap: 0;
		padding: 0 16px;
		background: rgba(11, 15, 19, 0.88);
		backdrop-filter: blur(16px) saturate(1.6);
		-webkit-backdrop-filter: blur(16px) saturate(1.6);
		border-bottom: 1px solid var(--surface-border);
		box-shadow: 0 1px 0 rgba(240, 120, 64, 0.06),
		            0 4px 24px -4px rgba(0, 0, 0, 0.5);
	}

	/* ── Brand ─────────────────────────────────────────────────── */
	.topnav__brand {
		display: flex;
		align-items: center;
		gap: 10px;
		flex-shrink: 0;
		width: var(--sidebar-width);
		padding-left: 4px;
		text-decoration: none;
		user-select: none;
	}

	.topnav__logo {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		border-radius: 8px;
		background: linear-gradient(135deg, rgba(240,120,64,0.15) 0%, rgba(212,98,42,0.08) 100%);
		border: 1px solid rgba(240,120,64,0.25);
		box-shadow: var(--glow-ember);
		transition: box-shadow var(--transition-base);
	}
	.topnav__logo:hover { box-shadow: 0 0 32px -4px rgba(240, 120, 64, 0.6); }

	.topnav__wordmark {
		font-size: 15px;
		font-weight: 700;
		letter-spacing: -0.3px;
		line-height: 1;
	}
	.topnav__wordmark-ember { color: var(--ember-300); }
	.topnav__wordmark-root  { color: var(--text-secondary); }

	/* ── Nav links ─────────────────────────────────────────────── */
	.topnav__nav {
		display: flex;
		align-items: center;
		gap: 2px;
		flex: 1;
		padding: 0 24px;
	}

	.topnav__link {
		position: relative;
		display: flex;
		align-items: center;
		padding: 6px 14px;
		border-radius: 8px;
		font-size: 13.5px;
		font-weight: 500;
		color: var(--text-secondary);
		text-decoration: none;
		transition:
			color var(--transition-fast),
			background var(--transition-fast);
		white-space: nowrap;
	}
	.topnav__link:hover {
		color: var(--text-primary);
		background: rgba(255,255,255,0.05);
	}
	.topnav__link--active {
		color: var(--ember-300);
		background: rgba(240, 120, 64, 0.1);
	}
	.topnav__link--active:hover {
		color: var(--ember-200);
		background: rgba(240, 120, 64, 0.14);
	}

	.topnav__link-indicator {
		position: absolute;
		bottom: -1px;
		left: 50%;
		transform: translateX(-50%);
		width: 20px;
		height: 2px;
		border-radius: 1px;
		background: var(--ember-400);
		box-shadow: 0 0 8px var(--ember-400);
	}

	/* ── Actions ────────────────────────────────────────────────── */
	.topnav__actions {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-shrink: 0;
	}

	.topnav__status {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 4px 10px;
		border-radius: 6px;
		background: rgba(34, 211, 160, 0.08);
		border: 1px solid rgba(34, 211, 160, 0.2);
	}
	.topnav__status-dot {
		width: 6px; height: 6px;
		border-radius: 50%;
		background: var(--status-online);
	}
	.topnav__status-dot--pulse {
		animation: pulse-dot 2s ease-in-out infinite;
	}
	.topnav__status-label {
		font-size: 10px;
		font-weight: 700;
		letter-spacing: 0.08em;
		color: var(--status-online);
		font-family: 'JetBrains Mono', monospace;
	}

	.topnav__divider {
		width: 1px;
		height: 20px;
		background: var(--surface-border);
		margin: 0 4px;
	}

	.topnav__icon-btn {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 34px; height: 34px;
		border-radius: 8px;
		border: none;
		background: transparent;
		color: var(--text-secondary);
		cursor: pointer;
		transition: background var(--transition-fast), color var(--transition-fast);
	}
	.topnav__icon-btn:hover {
		background: rgba(255,255,255,0.06);
		color: var(--text-primary);
	}

	.topnav__badge {
		position: absolute;
		top: 4px; right: 4px;
		min-width: 14px; height: 14px;
		padding: 0 3px;
		border-radius: 7px;
		background: var(--ember-400);
		color: white;
		font-size: 9px;
		font-weight: 700;
		display: flex;
		align-items: center;
		justify-content: center;
		line-height: 1;
	}

	.topnav__avatar {
		width: 32px; height: 32px;
		border-radius: 50%;
		border: 1.5px solid rgba(240,120,64,0.4);
		background: linear-gradient(135deg, var(--ember-800) 0%, var(--ember-700) 100%);
		color: var(--ember-200);
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 0.02em;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
	}
	.topnav__avatar:hover {
		border-color: var(--ember-400);
		box-shadow: 0 0 12px -2px rgba(240,120,64,0.5);
	}

	@keyframes pulse-dot {
		0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(34,211,160,0.4); }
		50%       { opacity: 0.7; box-shadow: 0 0 0 4px rgba(34,211,160,0); }
	}
</style>
