<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { mockService } from '$lib/mock';
	import { selectedRegionId } from '$lib/stores/regionContext';
	import NotificationPanel from './ui/NotificationPanel.svelte';

	const navLinks = [
		{ label: 'Dashboard',   href: '/' },
		{ label: 'Monitoring',  href: '/live-monitoring' },
		{ label: 'Spatial Map', href: '/spatial-map' },
		{ label: 'Alerts',      href: '/alert-history' },
	] as const;

	/** Pulse state for the live indicator */
	let liveActive = $state(true);
	let notificationsOpen = $state(false);
	let searchOpen = $state(false);
	let searchQuery = $state('');
	let selectedResultIndex = $state(0);
	let searchInput = $state<HTMLInputElement | null>(null);
	let regionOptions = $derived(
		[{ id: 'all', label: 'Global Command' }, ...mockService.getRegions().map((region) => ({ id: region.id, label: region.name }))]
	);
	let regionDropdownOpen = $state(false);

	interface SearchResult {
		id: string;
		title: string;
		description: string;
		kind: 'Sensor' | 'Region' | 'Alert' | 'Incident';
		href: string;
	}

	let notificationItems = $state([
		...mockService.getActiveAlerts().slice(0, 3).map((alert) => ({
			id: alert.id,
			title: alert.title,
			message: alert.message,
			read: false,
			kind: 'alert' as const,
			createdAt: new Date(alert.triggeredAt).toLocaleString([], { hour: 'numeric', minute: '2-digit' }),
			href: `/alerts/${alert.id}`
		})),
		...mockService.getActiveIncidents().slice(0, 2).map((incident) => ({
			id: incident.id,
			title: incident.title,
			message: `${incident.type} • ${incident.severity} severity`,
			read: false,
			kind: 'incident' as const,
			createdAt: new Date(incident.updatedAt).toLocaleString([], { hour: 'numeric', minute: '2-digit' }),
			href: `/alerts/${incident.id}`
		}))
	]);

	const unreadCount = $derived(notificationItems.filter((item) => !item.read).length);

	let searchResults = $derived.by(() => {
		const term = searchQuery.trim().toLowerCase();
		if (!term) return [];

		const results: SearchResult[] = [];
		const sensorMatches = mockService.getSensors()
			.filter((sensor) => sensor.id.toLowerCase().includes(term) || sensor.name.toLowerCase().includes(term))
			.slice(0, 4)
			.map((sensor) => ({
				id: sensor.id,
				title: sensor.name,
				description: `${sensor.id} • ${sensor.status}`,
				kind: 'Sensor' as const,
				href: `/spatial-map/node/${sensor.id}`
			}));

		const regionMatches = mockService.getRegions()
			.filter((region) => region.name.toLowerCase().includes(term) || region.code.toLowerCase().includes(term))
			.slice(0, 3)
			.map((region) => ({
				id: region.id,
				title: region.name,
				description: `${region.code} • ${region.terrain}`,
				kind: 'Region' as const,
				href: `/spatial-map?region=${region.id}`
			}));

		const alertMatches = mockService.getActiveAlerts()
			.filter((alert) => alert.title.toLowerCase().includes(term) || alert.message.toLowerCase().includes(term))
			.slice(0, 3)
			.map((alert) => ({
				id: alert.id,
				title: alert.title,
				description: `${alert.severity} alert`,
				kind: 'Alert' as const,
				href: `/alerts/${alert.id}`
			}));

		const incidentMatches = mockService.getActiveIncidents()
			.filter((incident) => incident.title.toLowerCase().includes(term) || incident.description.toLowerCase().includes(term))
			.slice(0, 3)
			.map((incident) => ({
				id: incident.id,
				title: incident.title,
				description: `${incident.type} • ${incident.severity}`,
				kind: 'Incident' as const,
				href: `/alerts/${incident.id}`
			}));

		results.push(...sensorMatches, ...regionMatches, ...alertMatches, ...incidentMatches);
		return results.slice(0, 8);
	});

	function closePanels() {
		notificationsOpen = false;
		searchOpen = false;
		regionDropdownOpen = false;
	}

	function openSearch() {
		searchOpen = true;
		notificationsOpen = false;
		searchQuery = '';
		selectedResultIndex = 0;
		requestAnimationFrame(() => searchInput?.focus());
	}

	function handleSearchSubmit() {
		const target = searchResults[selectedResultIndex];
		if (!target) return;
		goto(target.href);
		closePanels();
	}

	function toggleNotifications() {
		notificationsOpen = !notificationsOpen;
		searchOpen = false;
	}

	function markNotificationRead(id: string) {
		notificationItems = notificationItems.map((item) => (item.id === id ? { ...item, read: true } : item));
	}

	function markAllNotificationsRead() {
		notificationItems = notificationItems.map((item) => ({ ...item, read: true }));
	}

	function handleNotificationSelect(item: { id: string; href?: string }) {
		markNotificationRead(item.id);
		closePanels();
		if (item.href) {
			goto(item.href);
		}
	}

	onMount(() => {
		const handleKeydown = (event: KeyboardEvent) => {
			if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
				event.preventDefault();
				openSearch();
			}

			if (event.key === 'Escape') {
				closePanels();
			}
		};

		const handlePointerDown = (event: PointerEvent) => {
			const target = event.target as HTMLElement | null;
			if (!target?.closest('.topnav')) {
				closePanels();
			} else {
				if (!target?.closest('.topnav__region-selector')) regionDropdownOpen = false;
				if (!target?.closest('.topnav__search')) searchOpen = false;
				if (!target?.closest('.topnav__notifications') && !target?.closest('#btn-notifications')) notificationsOpen = false;
			}
		};

		window.addEventListener('keydown', handleKeydown);
		window.addEventListener('pointerdown', handlePointerDown);
		return () => {
			window.removeEventListener('keydown', handleKeydown);
			window.removeEventListener('pointerdown', handlePointerDown);
		};
	});
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
		<div class="topnav__region-selector" aria-label="Select operational context">
			<button class="topnav__region-button" type="button" onclick={() => { regionDropdownOpen = !regionDropdownOpen; searchOpen = false; notificationsOpen = false; }}>
				<div class="topnav__region-badge">
					<span class="topnav__region-dot" aria-hidden="true"></span>
					<span class="topnav__region-label">Context</span>
				</div>
				<span class="topnav__region-value">
					{regionOptions.find(o => o.id === $selectedRegionId)?.label ?? 'Select Region'}
				</span>
			</button>
			{#if regionDropdownOpen}
				<div class="topnav__region-popover">
					{#each regionOptions as option}
						<button 
							type="button" 
							class="topnav__region-option"
							class:topnav__region-option--active={$selectedRegionId === option.id}
							onclick={() => { $selectedRegionId = option.id; regionDropdownOpen = false; }}
						>
							{option.label}
							{#if $selectedRegionId === option.id}
								<svg class="topnav__region-check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
							{/if}
						</button>
					{/each}
				</div>
			{/if}
		</div>

		<div class="topnav__search" class:topnav__search--open={searchOpen}>
			<button class="topnav__search-trigger" type="button" onclick={openSearch} aria-label="Open global search">
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
					<circle cx="11" cy="11" r="6"/>
					<path d="M20 20L16.65 16.65"/>
				</svg>
				<span>Search nodes, regions, alerts</span>
			</button>
			{#if searchOpen}
				<div class="topnav__search-popover">
					<input
						bind:this={searchInput}
						bind:value={searchQuery}
						class="topnav__search-input"
						type="text"
						placeholder="Search sensor nodes, regions, alerts"
						onkeydown={(event) => {
							if (event.key === 'ArrowDown') {
								event.preventDefault();
								selectedResultIndex = Math.min(selectedResultIndex + 1, Math.max(searchResults.length - 1, 0));
							}
							if (event.key === 'ArrowUp') {
								event.preventDefault();
								selectedResultIndex = Math.max(selectedResultIndex - 1, 0);
							}
							if (event.key === 'Enter') {
								event.preventDefault();
								handleSearchSubmit();
							}
						}}
					/>
					{#if searchResults.length > 0}
						<div class="topnav__search-list">
							{#each searchResults as result, index}
								<button
									type="button"
									class="topnav__search-item"
									class:topnav__search-item--active={index === selectedResultIndex}
									onclick={() => {
										selectedResultIndex = index;
										goto(result.href);
										closePanels();
									}}
								>
									<div class="topnav__search-item-top">
										<span class="topnav__search-item-kind">{result.kind}</span>
										<span class="topnav__search-item-title">{result.title}</span>
									</div>
									<div class="topnav__search-item-description">{result.description}</div>
								</button>
							{/each}
						</div>
					{:else if searchQuery.trim()}
						<div class="topnav__search-empty">No matches. Try another term.</div>
					{/if}
				</div>
			{/if}
		</div>

		<!-- Live status badge -->
		<div class="topnav__status" title="System live">
			<span class="topnav__status-dot" class:topnav__status-dot--pulse={liveActive} aria-hidden="true"></span>
			<span class="topnav__status-label">LIVE</span>
		</div>

		<div class="topnav__divider" aria-hidden="true"></div>

		<!-- Notification bell -->
		<div class="topnav__notifications">
			<button id="btn-notifications" class="topnav__icon-btn" aria-label="Notifications" title="Notifications" onclick={toggleNotifications}>
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
					<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
					<path d="M13.73 21a2 2 0 0 1-3.46 0"/>
				</svg>
				<span class="topnav__badge" aria-label="{unreadCount} unread notifications">{unreadCount}</span>
			</button>
			<NotificationPanel open={notificationsOpen} notifications={notificationItems} onClose={closePanels} onMarkAllRead={markAllNotificationsRead} onMarkRead={markNotificationRead} onSelect={handleNotificationSelect} />
		</div>

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
		position: relative;
	}

	.topnav__region-selector {
		position: relative;
	}

	.topnav__region-button {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 6px 32px 6px 14px;
		border-radius: 12px;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(15, 23, 42, 0.6);
		box-shadow: inset 0 1px 0 rgba(255,255,255,0.05), 0 4px 12px rgba(0, 0, 0, 0.2);
		transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
		cursor: pointer;
		color: inherit;
		text-align: left;
	}

	.topnav__region-button:hover,
	.topnav__region-button:focus-visible {
		border-color: rgba(240, 120, 64, 0.4);
		background: rgba(15, 23, 42, 0.8);
		box-shadow: inset 0 1px 0 rgba(255,255,255,0.08), 0 0 0 1px rgba(240, 120, 64, 0.1), 0 8px 20px -8px rgba(240, 120, 64, 0.3);
		transform: translateY(-1px);
	}

	.topnav__region-button::after {
		content: '';
		position: absolute;
		right: 14px;
		top: 50%;
		width: 7px;
		height: 7px;
		border-right: 2px solid var(--text-muted);
		border-bottom: 2px solid var(--text-muted);
		transform: translateY(-70%) rotate(45deg);
		transition: border-color 0.2s ease, transform 0.2s ease;
		pointer-events: none;
	}

	.topnav__region-button:hover::after,
	.topnav__region-button:focus-visible::after {
		border-color: var(--ember-300);
		transform: translateY(-60%) rotate(45deg);
	}

	.topnav__region-badge {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.topnav__region-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: var(--ember-400);
		box-shadow: 0 0 8px var(--ember-400);
	}

	.topnav__region-label {
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: var(--text-muted);
		pointer-events: none;
	}

	.topnav__region-value {
		font-size: 13px;
		font-weight: 600;
		color: var(--text-primary);
		pointer-events: none;
	}

	.topnav__region-popover {
		position: absolute;
		top: calc(100% + 8px);
		right: 0;
		min-width: 220px;
		padding: 6px;
		background: rgba(15, 23, 42, 0.96);
		border: 1px solid rgba(255,255,255,0.12);
		border-radius: 12px;
		box-shadow: 0 16px 32px rgba(0, 0, 0, 0.4);
		backdrop-filter: blur(18px);
		z-index: 1100;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.topnav__region-option {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		padding: 8px 12px;
		border: none;
		background: transparent;
		color: var(--text-secondary);
		font-size: 13px;
		font-weight: 500;
		text-align: left;
		border-radius: 8px;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.topnav__region-option:hover {
		background: rgba(255, 255, 255, 0.05);
		color: var(--text-primary);
	}

	.topnav__region-option--active {
		background: rgba(240, 120, 64, 0.12);
		color: var(--text-primary);
		font-weight: 600;
	}

	.topnav__region-option--active:hover {
		background: rgba(240, 120, 64, 0.18);
	}

	.topnav__region-check {
		color: var(--ember-400);
	}

	.topnav__search {
		position: relative;
	}

	.topnav__search-trigger {
		display: flex;
		align-items: center;
		gap: 8px;
		min-width: 220px;
		padding: 8px 12px;
		border-radius: 999px;
		border: 1px solid rgba(255,255,255,0.08);
		background: rgba(255,255,255,0.045);
		color: var(--text-secondary);
		font-size: 12px;
		cursor: pointer;
	}

	.topnav__search-trigger:hover {
		background: rgba(255,255,255,0.08);
		color: var(--text-primary);
	}

	.topnav__search--open .topnav__search-trigger {
		border-color: rgba(240,120,64,0.3);
		box-shadow: inset 0 0 0 1px rgba(240,120,64,0.08);
	}

	.topnav__search-popover {
		position: absolute;
		top: calc(100% + 10px);
		right: 0;
		min-width: 320px;
		padding: 8px;
		background: rgba(15,23,42,0.96);
		border: 1px solid rgba(255,255,255,0.12);
		border-radius: 14px;
		box-shadow: 0 24px 48px rgba(0, 0, 0, 0.35);
		backdrop-filter: blur(18px);
		z-index: 1100;
	}

	.topnav__search-input {
		width: 100%;
		padding: 10px 12px;
		border-radius: 10px;
		border: 1px solid rgba(255,255,255,0.08);
		background: rgba(255,255,255,0.05);
		color: var(--text-primary);
		font-size: 13px;
		outline: none;
	}

	.topnav__search-input:focus {
		border-color: rgba(240,120,64,0.35);
	}

	.topnav__search-list {
		display: grid;
		gap: 6px;
		margin-top: 8px;
	}

	.topnav__search-item {
		text-align: left;
		padding: 8px 10px;
		border-radius: 10px;
		border: 1px solid transparent;
		background: rgba(255,255,255,0.03);
		color: var(--text-primary);
		cursor: pointer;
	}

	.topnav__search-item--active {
		border-color: rgba(240,120,64,0.3);
		background: rgba(240,120,64,0.12);
	}

	.topnav__search-item-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		margin-bottom: 3px;
	}

	.topnav__search-item-kind {
		font-size: 10px;
		font-weight: 700;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: var(--text-muted);
	}

	.topnav__search-item-title {
		font-size: 12px;
		font-weight: 700;
	}

	.topnav__search-item-description {
		font-size: 11px;
		color: var(--text-muted);
	}

	.topnav__search-empty {
		margin-top: 8px;
		padding: 10px;
		font-size: 12px;
		color: var(--text-muted);
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
