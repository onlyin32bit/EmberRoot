<script lang="ts">
	import { page } from '$app/state';
	import PageShell from '$lib/components/PageShell.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { LineAreaChart } from '$lib/components/charts';
	import { mockService } from '$lib/mock';
	import { goto } from '$app/navigation';
	
	const id = $derived(page.params.id as string);
	const alert = $derived(mockService.getAlerts().find(a => a.id === id));
	const incident = $derived(mockService.getIncident(id));
	
	// Determine if we're showing an alert or an incident
	const isIncident = $derived(!!incident);
	const data: any = $derived(incident || alert);
	const sensor = $derived(data && data.sensorId ? mockService.getSensor(data.sensorId) : null);
	const region = $derived(data ? mockService.getRegion(data.regionId) : null);
	
	const telemetry = $derived(sensor ? mockService.getTelemetry(sensor.id) : null);
	const tempSeries = $derived(telemetry?.history.temperature ?? []);
	const moistureSeries = $derived(telemetry?.history.soilMoisture ?? []);
	const batterySeries = $derived(telemetry?.history.batteryPct ?? []);
	const co2Series = $derived(telemetry?.history.co2Ppm ?? []);
	const smokeSeries = $derived(telemetry?.history.smokeIndex ?? []);
	const windSeries = $derived(telemetry?.history.windSpeed ?? []);
	const confidence = $derived(sensor ? mockService.getConfidenceScore(sensor.id) : null);

	function getSeverityBadge(severity: string) {
		switch (severity) {
			case 'critical': return 'critical';
			case 'high': return 'ember';
			case 'medium': return 'warning';
			default: return 'neutral';
		}
	}
	
	function formatDate(timestamp: number) {
		return new Date(timestamp).toLocaleString();
	}
</script>

<svelte:head>
	<title>Details: {id} — EmberRoot</title>
</svelte:head>

<PageShell
	title={isIncident ? 'Incident Command View' : 'Alert Details'}
	subtitle={`Details for ${id}`}
	breadcrumb={['EmberRoot', 'Operations', isIncident ? 'Incidents' : 'Alerts', id]}
>
	{#if !data}
		<Card padding="lg" class="error-card">
			<h3>Record not found</h3>
			<p>No alert or incident exists with ID {id}.</p>
			<Button variant="secondary" onclick={() => window.history.back()}>Go Back</Button>
		</Card>
	{:else}
		<div class="details-grid">
			<div class="main-column">
				<!-- Header Card -->
				<Card padding="lg" class="header-card">
					<div class="header-top">
						<Badge variant={getSeverityBadge(data.severity)}>{data.severity}</Badge>
						<Badge variant="neutral">{data.status ?? (data.resolvedAt ? 'resolved' : 'active')}</Badge>
						{#if isIncident}
							<span class="type-tag">{data.type}</span>
						{/if}
					</div>
					<h2 class="title">{data.title}</h2>
					<p class="description">{data.message || data.description}</p>
					
					<div class="meta-grid">
						<div class="meta-item">
							<span class="meta-label">Timestamp</span>
							<span class="meta-value">{formatDate(data.triggeredAt || data.reportedAt)}</span>
						</div>
						<div class="meta-item">
							<span class="meta-label">Region</span>
							<span class="meta-value">{region?.name ?? data.regionId}</span>
						</div>
						<div class="meta-item">
							<span class="meta-label">GPS Location</span>
							<span class="meta-value font-mono">{data.location?.lat.toFixed(4) || data.origin?.lat.toFixed(4)}, {data.location?.lon.toFixed(4) || data.origin?.lon.toFixed(4)}</span>
						</div>
						{#if confidence}
							<div class="meta-item">
								<span class="meta-label">AI Confidence Score</span>
								<span class="meta-value text-ember">{confidence.score}%</span>
							</div>
						{/if}
					</div>
				</Card>
				
				<!-- Sensor Trends -->
				{#if sensor && telemetry}
					<Card padding="lg" class="chart-card">
						<h3>Sensor Readings & Historical Trends</h3>
						<p class="subtitle">Data from node <a href={`/spatial-map/node/${sensor.id}`}>{sensor.id}</a></p>
						
						<div class="chart-wrapper">
							{#if data.category === 'battery_low'}
								<LineAreaChart series={[{ id: 'batt', label: 'Battery (%)', data: batterySeries, color: 'var(--status-warning)' }]} unit="" height={250} />
							{:else if data.category === 'co2_threshold'}
								<LineAreaChart series={[{ id: 'co2', label: 'CO2 (ppm)', data: co2Series, color: 'var(--status-critical)' }]} unit="" height={250} />
							{:else if data.category === 'smoke_detected'}
								<LineAreaChart series={[{ id: 'smoke', label: 'Smoke Index', data: smokeSeries, color: 'var(--text-primary)' }]} unit="" height={250} />
							{:else if data.category === 'wind_shift'}
								<LineAreaChart series={[{ id: 'wind', label: 'Wind Speed (kph)', data: windSeries, color: 'var(--status-online)' }]} unit="" height={250} />
							{:else}
								<LineAreaChart 
									series={[
										{ id: 'temp', label: 'Temperature (°C)', data: tempSeries, color: 'var(--ember-400)' },
										{ id: 'moisture', label: 'Soil Moisture (%)', data: moistureSeries, color: 'var(--status-online)', filled: false }
									]} 
									unit="" 
									height={250} 
								/>
							{/if}
						</div>
					</Card>
				{/if}

				<!-- Incident Timeline -->
				{#if isIncident && data.updates}
					<Card padding="lg" class="timeline-card">
						<h3>Response History</h3>
						<div class="timeline">
							{#each data.updates as update}
								<div class="timeline-item">
									<div class="timeline-dot"></div>
									<div class="timeline-content">
										<div class="timeline-meta">
											<strong>{update.authorId}</strong>
											<span>{formatDate(update.timestamp)}</span>
										</div>
										<p>{update.message}</p>
									</div>
								</div>
							{/each}
						</div>
					</Card>
				{/if}
			</div>

			<div class="side-column">
				<!-- Quick Actions -->
				<Card padding="md" class="actions-card">
					<h3>Quick Actions</h3>
					<div class="action-buttons">
						<Button variant="primary" class="w-full">Acknowledge</Button>
						<Button variant="secondary" class="w-full">Dispatch Ranger</Button>
						{#if sensor}
							<Button variant="ghost" class="w-full" onclick={() => goto(`/spatial-map/node/${sensor.id}`)}>View Node on Map</Button>
						{/if}
					</div>
				</Card>
				
				<!-- Sensor Info -->
				{#if sensor}
					<Card padding="md" class="sensor-info-card">
						<h3>Associated Node</h3>
						<div class="meta-grid vertical">
							<div class="meta-item">
								<span class="meta-label">Node ID</span>
								<span class="meta-value">{sensor.id}</span>
							</div>
							<div class="meta-item">
								<span class="meta-label">Status</span>
								<span class="meta-value"><Badge variant={sensor.status === 'online' ? 'online' : 'warning'}>{sensor.status}</Badge></span>
							</div>
							<div class="meta-item">
								<span class="meta-label">Battery</span>
								<span class="meta-value">{sensor.batteryPct}%</span>
							</div>
						</div>
					</Card>
				{/if}
				
				<!-- Hotspot Info -->
				{#if region}
					<Card padding="md" class="hotspot-card">
						<h3>Satellite Hotspot</h3>
						<p class="subtitle">NASA FIRMS integration</p>
						<p class="info-text">Checking for correlated thermal anomalies in {region.name} near the event origin.</p>
						<div class="hotspot-status">
							<Badge variant="ember">Hotspot Detected</Badge>
						</div>
					</Card>
				{/if}
			</div>
		</div>
	{/if}
</PageShell>

<style>
	.details-grid {
		display: grid;
		grid-template-columns: 1fr 320px;
		gap: 20px;
		margin-top: 20px;
	}
	@media (max-width: 900px) {
		.details-grid {
			grid-template-columns: 1fr;
		}
	}
	
	.main-column, .side-column {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}
	
	.header-top {
		display: flex;
		gap: 8px;
		margin-bottom: 12px;
	}
	
	.title {
		font-size: 24px;
		font-weight: 700;
		color: var(--text-primary);
		margin: 0 0 12px 0;
	}
	
	.description {
		font-size: 14px;
		color: var(--text-secondary);
		line-height: 1.6;
		margin-bottom: 24px;
	}
	
	.meta-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
		gap: 16px;
		padding-top: 16px;
		border-top: 1px solid var(--surface-border);
	}
	
	.meta-grid.vertical {
		grid-template-columns: 1fr;
		padding-top: 0;
		border-top: none;
		gap: 12px;
	}
	
	.meta-item {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
	
	.meta-label {
		font-size: 11px;
		font-weight: 600;
		color: var(--text-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}
	
	.meta-value {
		font-size: 14px;
		font-weight: 500;
		color: var(--text-primary);
	}
	
	.font-mono {
		font-family: 'JetBrains Mono', monospace;
	}
	
	.text-ember {
		color: var(--ember-400);
	}
	
	.w-full {
		width: 100%;
	}
	
	.action-buttons {
		display: flex;
		flex-direction: column;
		gap: 8px;
		margin-top: 16px;
	}
	
	h3 {
		font-size: 16px;
		font-weight: 600;
		margin: 0 0 8px 0;
		color: var(--text-primary);
	}
	
	.subtitle {
		font-size: 13px;
		color: var(--text-muted);
		margin-bottom: 16px;
	}
	
	.info-text {
		font-size: 13px;
		color: var(--text-secondary);
		line-height: 1.5;
		margin-bottom: 12px;
	}
	
	.chart-wrapper {
		margin-top: 20px;
	}
	
	/* Timeline */
	.timeline {
		display: flex;
		flex-direction: column;
		gap: 16px;
		margin-top: 16px;
	}
	
	.timeline-item {
		display: flex;
		gap: 16px;
	}
	
	.timeline-dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: var(--ember-400);
		margin-top: 6px;
		position: relative;
	}
	
	.timeline-dot::after {
		content: '';
		position: absolute;
		top: 14px;
		bottom: -20px;
		left: 4px;
		width: 2px;
		background: var(--surface-border);
	}
	
	.timeline-item:last-child .timeline-dot::after {
		display: none;
	}
	
	.timeline-content {
		flex: 1;
		background: var(--surface-base);
		padding: 12px;
		border-radius: 8px;
		border: 1px solid var(--surface-border);
	}
	
	.timeline-meta {
		display: flex;
		justify-content: space-between;
		margin-bottom: 6px;
		font-size: 12px;
		color: var(--text-muted);
	}
	
	.timeline-meta strong {
		color: var(--text-primary);
	}
	
	.timeline-content p {
		margin: 0;
		font-size: 13px;
		color: var(--text-secondary);
		line-height: 1.5;
	}
</style>
