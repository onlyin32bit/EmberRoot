<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import PageShell from '$lib/components/PageShell.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { LineAreaChart } from '$lib/components/charts';
	import { mockService } from '$lib/mock';

	// View State
	let viewMode = $state<'node' | 'region'>('node');
	
	// Data
	const sensors = mockService.getSensors();
	const regions = mockService.getRegions();
	
	// Selection State
	let selectedRegionId = $state(regions[0].id);
	let selectedNodeId = $state(sensors.find(s => s.regionId === selectedRegionId)?.id ?? sensors[0].id);
	let selectedDateRange = $state('7d');
	
	// Derived state for the view
	const currentRegion = $derived(mockService.getRegion(selectedRegionId));
	const currentNode = $derived(mockService.getSensor(selectedNodeId));
	const regionSensors = $derived(mockService.getSensorsForRegion(selectedRegionId));
	const telemetry = $derived(currentNode ? mockService.getTelemetry(currentNode.id) : null);
	
	// Helper to filter data by date range
	function filterByDateRange<T extends { timestamp: number }>(data: T[], range: string): T[] {
		if (!data || data.length === 0) return [];
		const now = Date.now();
		let cutoff = now;
		
		if (range === '24h') cutoff = now - 24 * 60 * 60 * 1000;
		else if (range === '7d') cutoff = now - 7 * 24 * 60 * 60 * 1000;
		else if (range === '30d') cutoff = now - 30 * 24 * 60 * 60 * 1000;
		else return data; // all
		
		return data.filter(d => d.timestamp >= cutoff);
	}

	// Individual Sensor Data
	const tempSeries = $derived(filterByDateRange(telemetry?.history.temperature ?? [], selectedDateRange));
	const moistureSeries = $derived(filterByDateRange(telemetry?.history.soilMoisture ?? [], selectedDateRange));
	const groundwaterSeries = $derived(filterByDateRange(telemetry?.history.groundwaterLevel ?? [], selectedDateRange));
	const gasSeries = $derived(filterByDateRange(telemetry?.history.co2Ppm ?? [], selectedDateRange));
	
	// Derive historical risk score for a single node (mocked based on temp and moisture)
	const nodeRiskSeries = $derived(tempSeries.map((t, i) => {
		const m = moistureSeries[i]?.value ?? 50;
		// Simple mock calculation: higher temp + lower moisture = higher risk
		let risk = Math.max(0, Math.min(100, (t.value * 2) + ((100 - m) * 0.5) - 20));
		return { timestamp: t.timestamp, value: Math.round(risk) };
	}));

	// Regional Data (Average across nodes)
	const regionalRiskSeries = $derived.by(() => {
		// Mock historical regional risk data based on the region's current composite risk
		const baseRisk = mockService.getRiskIndex(selectedRegionId)?.composite ?? 50;
		const now = Date.now();
		const days = selectedDateRange === '24h' ? 1 : selectedDateRange === '7d' ? 7 : selectedDateRange === '30d' ? 30 : 90;
		const points = days * 24; // 1 point per hour
		
		const data = [];
		for(let i = 0; i < points; i++) {
			const time = now - (points - i) * 60 * 60 * 1000;
			// Add some noise
			const noise = Math.sin(i * 0.1) * 5 + Math.cos(i * 0.05) * 3;
			data.push({ timestamp: time, value: Math.max(0, Math.min(100, baseRisk + noise)) });
		}
		return data;
	});

	// Region Comparison Data
	const regionComparisonSeries = $derived(regions.map((r, index) => {
		const baseRisk = mockService.getRiskIndex(r.id)?.composite ?? 50;
		const now = Date.now();
		const data = [];
		for(let i = 0; i < 24; i++) {
			const time = now - (24 - i) * 60 * 60 * 1000;
			data.push({ timestamp: time, value: Math.max(0, Math.min(100, baseRisk + Math.sin(i * 0.2 + index) * 5)) });
		}
		return {
			id: r.id,
			label: r.name,
			data: data,
			color: `hsl(${10 + index * 40}, 80%, 50%)`,
			filled: false
		};
	}));

	// CSV Export functionality
	function downloadBlob(filename: string, content: string) {
		const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = filename;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}

	function exportCSV() {
		let csvContent = "";
		let filename = "";

		if (viewMode === 'node') {
			filename = `node_history_${selectedNodeId}_${selectedDateRange}.csv`;
			const headers = ['Timestamp', 'Risk Score', 'Temperature (C)', 'Soil Moisture (%)', 'Groundwater (m)', 'CO2 (ppm)'];
			csvContent += headers.join(',') + '\n';
			
			for(let i = 0; i < tempSeries.length; i++) {
				const time = new Date(tempSeries[i].timestamp).toISOString();
				const risk = nodeRiskSeries[i]?.value ?? 0;
				const temp = tempSeries[i]?.value ?? 0;
				const moist = moistureSeries[i]?.value ?? 0;
				const gw = groundwaterSeries[i]?.value ?? 0;
				const gas = gasSeries[i]?.value ?? 0;
				
				csvContent += `${time},${risk},${temp},${moist},${gw},${gas}\n`;
			}
		} else {
			filename = `region_history_${selectedRegionId}_${selectedDateRange}.csv`;
			const headers = ['Timestamp', 'Avg Risk Score'];
			csvContent += headers.join(',') + '\n';
			
			for(let i = 0; i < regionalRiskSeries.length; i++) {
				const time = new Date(regionalRiskSeries[i].timestamp).toISOString();
				const risk = regionalRiskSeries[i].value;
				csvContent += `${time},${risk.toFixed(2)}\n`;
			}
		}

		downloadBlob(filename, csvContent);
	}
	
	// Sync node selection when region changes
	$effect(() => {
		if (selectedRegionId) {
			const validSensors = mockService.getSensorsForRegion(selectedRegionId);
			if (validSensors.length > 0 && !validSensors.find(s => s.id === selectedNodeId)) {
				selectedNodeId = validSensors[0].id;
			}
		}
	});

</script>

<svelte:head>
	<title>Historical Analytics — EmberRoot</title>
</svelte:head>

<PageShell
	title="Historical Query & Analytics"
	subtitle="Interactive historical analysis of risk scores and telemetry across regions and individual nodes"
	breadcrumb={['EmberRoot', 'Operations', 'Historical Analytics']}
>
	<div class="analytics-layout">
		<!-- Toolbar -->
		<Card padding="md" class="toolbar-card">
			<div class="toolbar-content">
				<div class="view-toggle">
					<button 
						class="toggle-btn" 
						class:active={viewMode === 'node'} 
						onclick={() => viewMode = 'node'}
					>
						Node View
					</button>
					<button 
						class="toggle-btn" 
						class:active={viewMode === 'region'} 
						onclick={() => viewMode = 'region'}
					>
						Region View
					</button>
				</div>
				
				<div class="filters">
					<select class="er-select" bind:value={selectedRegionId}>
						{#each regions as region}
							<option value={region.id}>{region.name}</option>
						{/each}
					</select>
					
					{#if viewMode === 'node'}
						<select class="er-select" bind:value={selectedNodeId}>
							{#each regionSensors as sensor}
								<option value={sensor.id}>{sensor.id} - {sensor.name}</option>
							{/each}
						</select>
					{/if}
					
					<select class="er-select" bind:value={selectedDateRange}>
						<option value="24h">Last 24 Hours</option>
						<option value="7d">Last 7 Days</option>
						<option value="30d">Last 30 Days</option>
						<option value="all">All Time</option>
					</select>
					
					<Button variant="primary" size="sm" onclick={exportCSV}>
						<svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="margin-right: 6px;">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
						</svg>
						Export CSV
					</Button>
				</div>
			</div>
		</Card>

		<div class="charts-grid">
			{#if viewMode === 'node'}
				<!-- Node Level Analytics -->
				<Card padding="lg" class="main-chart">
					<div class="chart-header">
						<h3>Historical Risk Score — {currentNode?.name || selectedNodeId}</h3>
						<Badge variant="warning">Node Level</Badge>
					</div>
					<div class="chart-container">
						<LineAreaChart 
							series={[{ id: 'risk', label: 'Risk Score', data: nodeRiskSeries, color: 'var(--ember-400)' }]} 
							unit="" 
							height={300} 
						/>
					</div>
				</Card>
				
				<Card padding="lg" class="sub-chart">
					<div class="chart-header">
						<h3>Temperature & Humidity</h3>
					</div>
					<div class="chart-container">
						<LineAreaChart 
							series={[
								{ id: 'temp', label: 'Temp (°C)', data: tempSeries, color: '#f59e0b' },
								{ id: 'moisture', label: 'Moisture (%)', data: moistureSeries, color: '#3b82f6', filled: false }
							]} 
							unit="" 
							height={220} 
						/>
					</div>
				</Card>
				
				<Card padding="lg" class="sub-chart">
					<div class="chart-header">
						<h3>Gas & Hydrology</h3>
					</div>
					<div class="chart-container">
						<LineAreaChart 
							series={[
								{ id: 'gas', label: 'CO2 (ppm)', data: gasSeries, color: '#8b5cf6' },
								{ id: 'gw', label: 'Groundwater (m)', data: groundwaterSeries, color: '#06b6d4', filled: false }
							]} 
							unit="" 
							height={220} 
						/>
					</div>
				</Card>
			{:else}
				<!-- Region Level Analytics -->
				<Card padding="lg" class="main-chart">
					<div class="chart-header">
						<h3>Average Regional Risk Score — {currentRegion?.name}</h3>
						<Badge variant="ember">Region Level</Badge>
					</div>
					<p class="chart-desc">Computed average risk across {regionSensors.length} active nodes in the management zone.</p>
					<div class="chart-container">
						<LineAreaChart 
							series={[{ id: 'regRisk', label: 'Avg Risk Score', data: regionalRiskSeries, color: 'var(--status-critical)' }]} 
							unit="" 
							height={300} 
						/>
					</div>
				</Card>
				
				<Card padding="lg" class="full-width-chart">
					<div class="chart-header">
						<h3>Regional Risk Comparison</h3>
						<Badge variant="neutral">Global</Badge>
					</div>
					<p class="chart-desc">Comparing average risk scores across all operating regions over the last 24 hours.</p>
					<div class="chart-container">
						<LineAreaChart 
							series={regionComparisonSeries} 
							unit="" 
							height={300} 
						/>
					</div>
				</Card>
			{/if}
		</div>
	</div>
</PageShell>

<style>
	.analytics-layout {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.toolbar-card {
		background: rgba(15, 23, 42, 0.6);
		border-color: rgba(255, 255, 255, 0.08);
	}

	.toolbar-content {
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: 16px;
	}

	.view-toggle {
		display: flex;
		background: rgba(0, 0, 0, 0.3);
		border-radius: 8px;
		padding: 4px;
		border: 1px solid rgba(255, 255, 255, 0.1);
	}

	.toggle-btn {
		background: transparent;
		border: none;
		color: var(--text-muted);
		padding: 6px 16px;
		font-size: 13px;
		font-weight: 600;
		border-radius: 6px;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.toggle-btn.active {
		background: var(--surface-raised);
		color: var(--text-primary);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
	}

	.filters {
		display: flex;
		align-items: center;
		gap: 12px;
		flex-wrap: wrap;
	}

	.er-select {
		background: var(--surface-base);
		color: var(--text-primary);
		border: 1px solid var(--surface-border);
		border-radius: 6px;
		padding: 6px 12px;
		font-size: 13px;
		font-family: inherit;
		outline: none;
		cursor: pointer;
		min-width: 140px;
	}
	
	.er-select:focus {
		border-color: var(--ember-400);
	}

	.charts-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 16px;
	}

	.main-chart {
		grid-column: 1 / -1;
	}
	
	.full-width-chart {
		grid-column: 1 / -1;
	}

	.sub-chart {
		display: flex;
		flex-direction: column;
	}

	.chart-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 8px;
	}

	.chart-header h3 {
		margin: 0;
		font-size: 16px;
		font-weight: 600;
		color: var(--text-primary);
	}

	.chart-desc {
		font-size: 13px;
		color: var(--text-muted);
		margin: 0 0 16px 0;
	}

	.chart-container {
		flex: 1;
		width: 100%;
		position: relative;
	}

	@media (max-width: 900px) {
		.charts-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
