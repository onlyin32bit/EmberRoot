<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import TopNav from '$lib/components/TopNav.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';

	let { children } = $props();

	let sidebarCollapsed = $state(false);
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>EmberRoot</title>
	<meta name="description" content="EmberRoot — Robotics operations & monitoring platform" />
</svelte:head>

<div class="app-shell">
	<TopNav />

	<Sidebar
		collapsed={sidebarCollapsed}
		onToggle={() => (sidebarCollapsed = !sidebarCollapsed)}
	/>

	<main
		class="app-content"
		class:app-content--sidebar-collapsed={sidebarCollapsed}
		id="main-content"
	>
		{@render children()}
	</main>
</div>

<style>
	.app-shell {
		display: flex;
		flex-direction: column;
		height: 100dvh;
		overflow: hidden;
	}

	.app-content {
		position: fixed;
		top: var(--nav-height);
		left: var(--sidebar-width);
		right: 0;
		bottom: 0;
		overflow-y: auto;
		overflow-x: hidden;
		background: var(--surface-bg);
		transition: left var(--transition-base);

		/* Subtle grid texture */
		background-image:
			radial-gradient(circle at 20% 20%, rgba(240, 120, 64, 0.04) 0%, transparent 60%),
			radial-gradient(circle at 80% 80%, rgba(240, 120, 64, 0.02) 0%, transparent 50%);
	}

	.app-content--sidebar-collapsed {
		left: var(--sidebar-collapsed);
	}
</style>
