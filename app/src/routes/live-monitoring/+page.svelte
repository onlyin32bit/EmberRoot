<script lang="ts">
	import { onMount } from 'svelte';
	import { api, type ApiNode, type ApiTelemetry } from '$lib/api';
	import PageShell from '$lib/components/PageShell.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import { LineAreaChart } from '$lib/components/charts';
	import type { SeriesDef } from '$lib/components/charts';

	let allNodes = $state<ApiNode[]>([]);
	let telemetryData = $state<Map<string, ApiTelemetry[]>>(new Map());
	let loading = $state(true);
	let error = $state<string | null>(null);

	let selectedNodeId = $state<string | null>(null);
	let selectedDateRange = $state<'1d' | '7d' | '30d'>('7d');

	const currentNode = $derived(selectedNodeId ? allNodes.find(n => n.id === selectedNodeId) : allNodes[0]);
	const currentTelemetry = $derived(selectedNodeId ? (telemetryData.get(selectedNodeId) ?? []) : []);

	// Filter telemetry by date range
	const filteredTelemetry = $derived.by(() => {
		if (currentTelemetry.length === 0) return [];

		const now = Date.now();
		let cutoff = now;

		if (selectedDateRange === '1d') cutoff = now - 24 * 60 * 60 * 1000;
		else if (selectedDateRange === '7d') cutoff = now - 7 * 24 * 60 * 60 * 1000;
		else if (selectedDateRange === '30d') cutoff = now - 30 * 24 * 60 * 60 * 1000;

		return currentTelemetry.filter(t => {
			const tTime = new Date(t.received_at).getTime();
			return tTime >= cutoff;
		});
	});

	// Build chart series
	const tempSeries = $derived(
		filteredTelemetry.map(t => ({
			timestamp: new Date(t.received_at).getTime(),
			value: t.temp_5 ?? 0
		}))
	);

	const coSeries = $derived(
		filteredTelemetry.map(t => ({
			timestamp: new Date(t.received_at).getTime(),
			value: t.co ?? 0
		}))
	);

	const co2Series = $derived(
		filteredTelemetry.map(t => ({
			timestamp: new Date(t.received_at).getTime(),
			value: t.co2 ?? 0
		}))
	);

	const moistureSeries = $derived(
		filteredTelemetry.map(t => ({
			timestamp: new Date(t.received_at).getTime(),
			value: t.moisture ?? 0
		}))
	);

	const temperatureChartSeries = $derived([
		{ id: 'temp', label: 'Temperature at 5cm (°C)', data: tempSeries, color: 'var(--ember-400)' }
	] as SeriesDef[]);

	const gasChartSeries = $derived([
		{ id: 'co', label: 'CO (ppm)', data: coSeries, color: 'var(--status-warning)' },
		{ id: 'co2', label: 'CO2 (ppm)', data: co2Series, color: 'var(--status-critical)', filled: false }
	] as SeriesDef[]);

	const moistureChartSeries = $derived([
		{ id: 'moisture', label: 'Soil Moisture (%)', data: moistureSeries, color: 'var(--status-online)' }
	] as SeriesDef[]);

	// Statistics
	const stats = $derived.by(() => {
		if (filteredTelemetry.length === 0) {
			return { temp: 0, co: 0, co2: 0, moisture: 0, readings: 0 };
		}

		const validTemps = filteredTelemetry.filter(t => t.temp_5 !== null);
		const validCO = filteredTelemetry.filter(t => t.co !== null);
		const validCO2 = filteredTelemetry.filter(t => t.co2 !== null);
		const validMoisture = filteredTelemetry.filter(t => t.moisture !== null);

		return {
			temp: validTemps.reduce((s, t) => s + (t.temp_5 ?? 0), 0) / (validTemps.length || 1),
			co: validCO.reduce((s, t) => s + (t.co ?? 0), 0) / (validCO.length || 1),
			co2: validCO2.reduce((s, t) => s + (t.co2 ?? 0), 0) / (validCO2.length || 1),
			moisture: validMoisture.reduce((s, t) => s + (t.moisture ?? 0), 0) / (validMoisture.length || 1),
			readings: filteredTelemetry.length
		};
	});

	async function loadData() {
		try {
			loading = true;
			const nodes = await api.getNodes();
			allNodes = nodes.filter(n => n.status === 'online');

			if (allNodes.length > 0) {
				if (!selectedNodeId) {
					selectedNodeId = allNodes[0].id;
				}

				// Load telemetry for all online nodes
				const telemetryMap = new Map<string, ApiTelemetry[]>();
				for (const node of allNodes) {
					const telem = await api.getTelemetry(node.id, { limit: 500 });
					telemetryMap.set(node.id, telem);
				}
				telemetryData = telemetryMap;
			}

			error = null;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load data';
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		void loadData();
		const poll = window.setInterval(() => void loadData(), 60_000);
		return () => window.clearInterval(poll);
	});
</script>

<svelte:head>
	<title>Live Monitoring — EmberRoot</title>
</svelte:head>

<PageShell
	title="Live Monitoring"
	subtitle="Real-time telemetry analysis from your sensor network"
	breadcrumb={['EmberRoot', 'Monitoring', 'Live']}
>
	<div class="monitoring-layout">
		{#if error}
			<Card padding="lg" class="error-card">
				<h3>Error Loading Data</h3>
				<p>{error}</p>
			</Card>
		{/if}

		<!-- Controls -->
		<Card padding="md" class="controls-card">
			<div class="controls">
				<div class="control-group">
					<label for="node-select">Select Node</label>
					<select id="node-select" bind:value={selectedNodeId}>
						{#each allNodes as node}
							<option value={node.id}>{node.name || node.id}</option>
						{/each}
					</select>
				</div>

				<div class="control-group">
					<label for="range-select">Date Range</label>
					<select id="range-select" bind:value={selectedDateRange}>
						<option value="1d">Last 24 Hours</option>
						<option value="7d">Last 7 Days</option>
						<option value="30d">Last 30 Days</option>
					</select>
				</div>
			</div>
		</Card>

		{#if loading}
			<Card padding="lg">
				<p>Loading telemetry data...</p>
			</Card>
		{:else if !currentNode}
			<Card padding="lg" class="error-card">
				<p>No online nodes available.</p>
			</Card>
		{:else}
			<!-- Node Status -->
			<Card padding="lg" class="status-card">
				<div class="status-header">
					<div class="status-info">
						<h2>{currentNode.name || currentNode.id}</h2>
						<p>{currentNode.id}</p>
					</div>
					<div class="status-badges">
						<Badge variant="online">{currentNode.status}</Badge>
						{#if currentNode.battery_pct !== null}
							<Badge variant="neutral">{currentNode.battery_pct.toFixed(0)}% battery</Badge>
						{/if}
					</div>
				</div>
			</Card>

			<!-- Statistics Cards -->
			<div class="stats-grid">
				<Card padding="md" class="stat-card">
					<div class="stat-label">Avg Temperature</div>
					<div class="stat-value">{stats.temp.toFixed(1)}</div>
					<div class="stat-unit">°C</div>
				</Card>
				<Card padding="md" class="stat-card">
					<div class="stat-label">Avg CO</div>
					<div class="stat-value">{stats.co.toFixed(2)}</div>
					<div class="stat-unit">ppm</div>
				</Card>
				<Card padding="md" class="stat-card">
					<div class="stat-label">Avg CO2</div>
					<div class="stat-value">{stats.co2.toFixed(0)}</div>
					<div class="stat-unit">ppm</div>
				</Card>
				<Card padding="md" class="stat-card">
					<div class="stat-label">Avg Moisture</div>
					<div class="stat-value">{stats.moisture.toFixed(0)}</div>
					<div class="stat-unit">%</div>
				</Card>
				<Card padding="md" class="stat-card">
					<div class="stat-label">Total Readings</div>
					<div class="stat-value">{stats.readings}</div>
					<div class="stat-unit">samples</div>
				</Card>
			</div>

			<!-- Charts -->
			{#if tempSeries.length > 0}
				<Card padding="lg" class="chart-card">
					<h3>Temperature Trend</h3>
					<LineAreaChart series={temperatureChartSeries} unit="°C" height={280} />
				</Card>
			{/if}

			{#if coSeries.length > 0 || co2Series.length > 0}
				<Card padding="lg" class="chart-card">
					<h3>Gas Levels</h3>
					<LineAreaChart series={gasChartSeries} unit="ppm" height={280} />
				</Card>
			{/if}

			{#if moistureSeries.length > 0}
				<Card padding="lg" class="chart-card">
					<h3>Soil Moisture</h3>
					<LineAreaChart series={moistureChartSeries} unit="%" height={280} />
				</Card>
			{/if}
		{/if}
	</div>
</PageShell>

<style>
	.monitoring-layout {
		display: flex;
		flex-direction: column;
		gap: 24px;
		padding: 24px 28px;
	}

	.controls-card {
		display: flex;
		gap: 16px;
	}

	.controls {
		display: flex;
		gap: 24px;
		width: 100%;
	}

	.control-group {
		display: flex;
		flex-direction: column;
		gap: 6px;
		flex: 1;
		max-width: 300px;
	}

	.control-group label {
		font-size: 12px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--text-muted);
	}

	.control-group select {
		padding: 8px 12px;
		border: 1px solid var(--surface-border);
		border-radius: 8px;
		background: rgba(255, 255, 255, 0.02);
		color: var(--text-primary);
		font-size: 12px;
	}

	.status-card {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.status-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 16px;
	}

	.status-info {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.status-info h2 {
		margin: 0;
		font-size: 18px;
		color: var(--text-primary);
	}

	.status-info p {
		margin: 0;
		font-size: 12px;
		color: var(--text-muted);
		font-family: var(--font-mono);
	}

	.status-badges {
		display: flex;
		gap: 8px;
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
		gap: 12px;
	}

	:global(.stat-card) {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 4px;
		text-align: center;
		padding: 16px !important;
	}

	.stat-label {
		font-size: 10px;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--text-muted);
	}

	.stat-value {
		font-size: 22px;
		font-weight: 700;
		color: var(--text-primary);
	}

	.stat-unit {
		font-size: 10px;
		color: var(--text-secondary);
	}

	.chart-card {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.chart-card h3 {
		margin: 0;
		font-size: 14px;
		color: var(--text-primary);
	}

	.error-card {
		border-color: var(--status-critical);
		background: color-mix(in srgb, var(--status-critical) 5%, transparent);
	}

	.error-card h3 {
		color: var(--status-critical);
		margin-top: 0;
	}

	@media (max-width: 900px) {
		.controls {
			flex-direction: column;
		}

		.control-group {
			max-width: 100%;
		}

		.status-header {
			flex-direction: column;
			align-items: flex-start;
		}

		.stats-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (max-width: 600px) {
		.stats-grid {
			grid-template-columns: 1fr;
		}
	}
</style>