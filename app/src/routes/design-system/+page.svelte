<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Panel from '$lib/components/ui/Panel.svelte';
	import MetricCard from '$lib/components/ui/MetricCard.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import StatusIndicator from '$lib/components/ui/StatusIndicator.svelte';
	import ProgressBar from '$lib/components/ui/ProgressBar.svelte';
	import ChartContainer from '$lib/components/ui/ChartContainer.svelte';
	import Toolbar from '$lib/components/ui/Toolbar.svelte';
	import Dropdown from '$lib/components/ui/Dropdown.svelte';
	import SearchBar from '$lib/components/ui/SearchBar.svelte';
	import SideDrawer from '$lib/components/ui/SideDrawer.svelte';

	let drawerOpen = $state(false);
	let panelCollapsed = $state(false);
	let searchValue = $state('');
	let dropdownValue = $state('');

	const regions = [
		{ value: 'all', label: 'All Regions' },
		{ value: 'north', label: 'North Sector' },
		{ value: 'south', label: 'South Sector' },
		{ value: 'east', label: 'East Corridor' }
	];
</script>

<div class="ds-page">
	<header class="ds-header">
		<div class="ds-header__title-row">
			<h1 class="ds-header__title">EmberRoot<span class="ds-header__title-thin"> Design System</span></h1>
			<Badge variant="ember">v1.0</Badge>
		</div>
		<p class="ds-header__sub">GIS / Emergency Operations UI components — one spacing system, one typography scale.</p>
	</header>

	<!-- ── Buttons ───────────────────────────────────────────────── -->
	<section class="ds-section">
		<h2 class="ds-section__heading">Button</h2>
		<div class="ds-group">
			<div class="ds-row">
				<Button variant="primary">Primary</Button>
				<Button variant="secondary">Secondary</Button>
				<Button variant="danger">Danger</Button>
				<Button variant="ghost">Ghost</Button>
				<Button variant="primary" disabled>Disabled</Button>
			</div>
			<div class="ds-row">
				<Button size="sm" variant="secondary">SM</Button>
				<Button size="md" variant="secondary">MD</Button>
				<Button size="lg" variant="secondary">LG</Button>
			</div>
		</div>
	</section>

	<!-- ── Cards ────────────────────────────────────────────────── -->
	<section class="ds-section">
		<h2 class="ds-section__heading">Card</h2>
		<div class="ds-grid ds-grid--3">
			<Card padding="md">
				<p class="ds-card-label">Default</p>
				<p class="ds-card-text">Standard surface container with subtle border and shadow.</p>
			</Card>
			<Card variant="raised" padding="md">
				<p class="ds-card-label">Raised</p>
				<p class="ds-card-text">Elevated surface for highlighted content areas.</p>
			</Card>
			<Card variant="glass" padding="md">
				<p class="ds-card-label">Glass</p>
				<p class="ds-card-text">Translucent backdrop-blur container for overlays.</p>
			</Card>
		</div>
	</section>

	<!-- ── Panel ────────────────────────────────────────────────── -->
	<section class="ds-section">
		<h2 class="ds-section__heading">Panel</h2>
		<Panel title="Layer Controls" collapsible bind:collapsed={panelCollapsed}>
			{#snippet headerRight()}
				<Badge variant="online">Live</Badge>
			{/snippet}
			<p class="ds-card-text">Click the header to collapse this panel. Ideal for map overlays, GIS filter controls, and configuration drawers.</p>
		</Panel>
	</section>

	<!-- ── Metric Cards ─────────────────────────────────────────── -->
	<section class="ds-section">
		<h2 class="ds-section__heading">Metric Card</h2>
		<div class="ds-grid ds-grid--4">
			<MetricCard title="Active Sensors" value="1,248" trend="up" trendValue="+12% vs last hour" />
			<MetricCard title="System Load" value="42" unit="%" trend="neutral" trendValue="Stable" />
			<MetricCard title="Critical Alerts" value="3" trend="down" trendValue="−2 from peak" />
			<MetricCard title="Network Latency" value="12" unit="ms" />
		</div>
	</section>

	<!-- ── Badges ───────────────────────────────────────────────── -->
	<section class="ds-section">
		<h2 class="ds-section__heading">Badge</h2>
		<div class="ds-group">
			<div class="ds-row">
				<Badge variant="neutral">Idle</Badge>
				<Badge variant="online">Active</Badge>
				<Badge variant="warning">Degraded</Badge>
				<Badge variant="critical">Error</Badge>
				<Badge variant="ember">Priority</Badge>
			</div>
			<div class="ds-row">
				<Badge variant="online" size="sm">Active</Badge>
				<Badge variant="warning" size="sm">Delayed</Badge>
				<Badge variant="critical" size="sm">Fault</Badge>
			</div>
		</div>
	</section>

	<!-- ── Status Indicator ─────────────────────────────────────── -->
	<section class="ds-section">
		<h2 class="ds-section__heading">Status Indicator</h2>
		<div class="ds-group">
			<div class="ds-row">
				<StatusIndicator status="online"   pulse label="Online" />
				<StatusIndicator status="warning"  pulse label="Warning" />
				<StatusIndicator status="critical" pulse label="Critical" />
				<StatusIndicator status="offline"       label="Offline" />
			</div>
			<div class="ds-row">
				<StatusIndicator status="online"   size="sm" pulse />
				<StatusIndicator status="online"   size="md" pulse />
				<StatusIndicator status="online"   size="lg" pulse />
			</div>
		</div>
	</section>

	<!-- ── Progress Bar ─────────────────────────────────────────── -->
	<section class="ds-section">
		<h2 class="ds-section__heading">Progress Bar</h2>
		<div class="ds-stack">
			<ProgressBar value={75}  label="Deployment"    variant="ember"    showValue />
			<ProgressBar value={48}  label="Storage"       variant="warning"  showValue />
			<ProgressBar value={91}  label="CPU Usage"     variant="critical" showValue size="lg" />
			<ProgressBar value={30}  label="Network"       variant="online"   showValue size="sm" />
		</div>
	</section>

	<!-- ── Chart Container ──────────────────────────────────────── -->
	<section class="ds-section">
		<h2 class="ds-section__heading">Chart Container</h2>
		<ChartContainer title="Network Traffic" subtitle="Last 24 hours · 5-min intervals" minHeight="220px">
			{#snippet toolbar()}
				<Badge variant="online" size="sm">Live</Badge>
				<Button size="sm" variant="ghost">Export</Button>
			{/snippet}
			<div class="ds-chart-placeholder">
				<svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="color: var(--text-muted)">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
				</svg>
				<span>Chart library content renders here</span>
			</div>
		</ChartContainer>
	</section>

	<!-- ── Toolbar ──────────────────────────────────────────────── -->
	<section class="ds-section">
		<h2 class="ds-section__heading">Toolbar</h2>
		<div class="ds-group">
			<Toolbar>
				<Button size="sm" variant="primary">Deploy</Button>
				<Button size="sm" variant="secondary">Pause</Button>
				<div class="er-toolbar__sep"></div>
				<Button size="sm" variant="ghost">Logs</Button>
				<Button size="sm" variant="ghost">Settings</Button>
			</Toolbar>
			<Toolbar orientation="vertical" class="ds-vtoolbar">
				<Button size="sm" variant="secondary">Layer 1</Button>
				<Button size="sm" variant="secondary">Layer 2</Button>
				<div class="er-toolbar__sep"></div>
				<Button size="sm" variant="ghost">Clear</Button>
			</Toolbar>
		</div>
	</section>

	<!-- ── Dropdown ─────────────────────────────────────────────── -->
	<section class="ds-section">
		<h2 class="ds-section__heading">Dropdown</h2>
		<div class="ds-row">
			<Dropdown options={regions} bind:value={dropdownValue} class="ds-dropdown-demo" />
			{#if dropdownValue}
				<Badge variant="ember">{dropdownValue}</Badge>
			{/if}
		</div>
	</section>

	<!-- ── Search Bar ───────────────────────────────────────────── -->
	<section class="ds-section">
		<h2 class="ds-section__heading">Search Bar</h2>
		<div class="ds-search-demo">
			<SearchBar bind:value={searchValue} placeholder="Search sensors, alerts, zones…" />
			{#if searchValue}
				<p class="ds-search-query">Query: <code>{searchValue}</code></p>
			{/if}
		</div>
	</section>

	<!-- ── Side Drawer ──────────────────────────────────────────── -->
	<section class="ds-section">
		<h2 class="ds-section__heading">Side Drawer</h2>
		<Button variant="secondary" onclick={() => drawerOpen = true}>Open Details Drawer</Button>

		<SideDrawer bind:open={drawerOpen} title="Asset Details" width="md">
			<div class="ds-drawer-content">
				<MetricCard title="Signal Strength" value="−72" unit="dBm" trend="neutral" trendValue="Stable" />
				<div class="ds-drawer-gap"></div>
				<ProgressBar value={64} label="Battery" variant="online" showValue />
				<div class="ds-drawer-gap"></div>
				<div class="ds-drawer-status-row">
					<StatusIndicator status="online" pulse label="Transmitting" />
					<Badge variant="online">Sensor-04B</Badge>
				</div>
				<div class="ds-drawer-gap"></div>
				<Button variant="danger" class="ds-drawer-btn">Decommission</Button>
			</div>
		</SideDrawer>
	</section>
</div>

<style>
	/* ── Page scaffold ─────────────────────────────────────────── */
	.ds-page {
		max-width: 960px;
		margin: 0 auto;
		padding: 32px;
		display: flex;
		flex-direction: column;
		gap: 48px;
	}

	/* ── Header ──────────────────────────────────────────────────  */
	.ds-header {
		padding-bottom: 24px;
		border-bottom: 1px solid var(--surface-border);
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.ds-header__title-row {
		display: flex;
		align-items: center;
		gap: 12px;
	}
	.ds-header__title {
		font-size: 28px;
		font-weight: 800;
		letter-spacing: -0.5px;
		color: var(--ember-300);
		margin: 0;
	}
	.ds-header__title-thin {
		font-weight: 300;
		color: var(--text-secondary);
	}
	.ds-header__sub {
		font-size: 13px;
		color: var(--text-muted);
	}

	/* ── Sections ─────────────────────────────────────────────── */
	.ds-section {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}
	.ds-section__heading {
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--text-secondary);
		padding-bottom: 8px;
		border-bottom: 1px solid var(--surface-border);
		margin: 0;
	}

	/* ── Grids ───────────────────────────────────────────────────  */
	.ds-grid {
		display: grid;
		gap: 12px;
	}
	.ds-grid--3 { grid-template-columns: repeat(3, 1fr); }
	.ds-grid--4 { grid-template-columns: repeat(4, 1fr); }

	@media (max-width: 700px) {
		.ds-grid--3, .ds-grid--4 { grid-template-columns: 1fr 1fr; }
	}

	/* ── Flex groups ─────────────────────────────────────────────  */
	.ds-group { display: flex; flex-direction: column; gap: 12px; }
	.ds-row   { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
	.ds-stack { display: flex; flex-direction: column; gap: 12px; max-width: 440px; }

	/* ── Card sample text ─────────────────────────────────────── */
	.ds-card-label {
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.07em;
		text-transform: uppercase;
		color: var(--ember-300);
		margin: 0 0 6px;
	}
	.ds-card-text {
		font-size: 13px;
		color: var(--text-secondary);
		line-height: 1.6;
		margin: 0;
	}

	/* ── Chart placeholder ─────────────────────────────────────── */
	.ds-chart-placeholder {
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 10px;
		background: var(--surface-overlay);
		border: 1px dashed var(--surface-muted);
		border-radius: 6px;
		font-size: 12px;
		color: var(--text-muted);
	}

	/* ── Toolbar vertical sizing ──────────────────────────────── */
	.ds-vtoolbar { width: 140px; }

	/* ── Dropdown ─────────────────────────────────────────────── */
	.ds-dropdown-demo { width: 200px; }

	/* ── Search ───────────────────────────────────────────────── */
	.ds-search-demo { display: flex; flex-direction: column; gap: 8px; max-width: 400px; }
	.ds-search-query { font-size: 12px; color: var(--text-muted); margin: 0; }
	.ds-search-query code {
		font-family: 'JetBrains Mono', monospace;
		font-size: 11px;
		color: var(--ember-300);
		background: var(--surface-raised);
		padding: 1px 6px;
		border-radius: 4px;
	}

	/* ── Drawer demo content ──────────────────────────────────── */
	.ds-drawer-content { display: flex; flex-direction: column; }
	.ds-drawer-gap     { height: 16px; }
	.ds-drawer-status-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
	:global(.ds-drawer-btn) { width: 100%; }
</style>
