<script lang="ts">
	import PageShell from '$lib/components/PageShell.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import MetricCard from '$lib/components/ui/MetricCard.svelte';
	import SearchBar from '$lib/components/ui/SearchBar.svelte';
	import { mockService } from '$lib/mock';

	// Filters
	let searchQuery = $state('');
	let selectedFormat = $state<'all' | 'csv' | 'pdf'>('all');
	let selectedRegionId = $state<string>('all');
	let lastExportTime = $state<string | null>(null);
	let activeNotification = $state<string | null>(null);

	// Preview state
	let previewModalOpen = $state(false);
	let previewTitle = $state('');
	let previewHeaders = $state<string[]>([]);
	let previewRows = $state<string[][]>([]);

	const regions = mockService.getRegions();
	const sensors = mockService.getSensors();
	const incidents = mockService.getIncidents();

	// Helper for downloading Blobs
	function downloadBlob(filename: string, content: string | Blob, mimeType: string) {
		const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = filename;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);

		const now = new Date();
		lastExportTime = now.toLocaleTimeString();
		showNotification(`Export complete: ${filename}`);
	}

	function showNotification(msg: string) {
		activeNotification = msg;
		setTimeout(() => {
			if (activeNotification === msg) {
				activeNotification = null;
			}
		}, 4000);
	}

	// 1. Daily Telemetry CSV
	function exportTelemetryCSV() {
		const targetSensors = selectedRegionId === 'all'
			? sensors
			: mockService.getSensorsForRegion(selectedRegionId);

		const headers = [
			'Sensor ID',
			'Sensor Name',
			'Region ID',
			'Type',
			'Status',
			'Latitude',
			'Longitude',
			'Temperature (°C)',
			'Humidity (%)',
			'Wind Speed (km/h)',
			'CO2 (ppm)',
			'Smoke Index',
			'Battery (%)',
			'Signal (dBm)',
			'Timestamp (ISO)'
		];

		const rows = targetSensors.map((s) => {
			const t = mockService.getTelemetry(s.id);
			return [
				s.id,
				`"${s.name.replace(/"/g, '""')}"`,
				s.regionId,
				s.type,
				s.status,
				s.location.lat.toFixed(5),
				s.location.lon.toFixed(5),
				t ? t.temperature.toString() : '-',
				t ? t.humidity.toString() : '-',
				t ? t.windSpeed.toString() : '-',
				t ? t.co2Ppm.toString() : '-',
				t ? t.smokeIndex.toString() : '-',
				s.batteryPct.toString(),
				s.signalStrength.toString(),
				new Date(t ? t.timestamp : s.lastSeenAt).toISOString()
			];
		});

		const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
		const dateStr = new Date().toISOString().slice(0, 10);
		downloadBlob(`emberroot_daily_telemetry_${dateStr}.csv`, csvContent, 'text/csv;charset=utf-8;');
	}

	function previewTelemetry() {
		const targetSensors = selectedRegionId === 'all'
			? sensors
			: mockService.getSensorsForRegion(selectedRegionId);

		previewTitle = 'Daily Telemetry Data Preview';
		previewHeaders = ['Sensor ID', 'Name', 'Region', 'Type', 'Status', 'Temp (°C)', 'Humidity', 'CO₂', 'Smoke Index'];
		previewRows = targetSensors.slice(0, 10).map((s) => {
			const t = mockService.getTelemetry(s.id);
			return [
				s.id,
				s.name,
				s.regionId,
				s.type,
				s.status,
				t ? `${t.temperature}°C` : 'N/A',
				t ? `${t.humidity}%` : 'N/A',
				t ? `${t.co2Ppm} ppm` : 'N/A',
				t ? t.smokeIndex.toFixed(2) : 'N/A'
			];
		});
		previewModalOpen = true;
	}

	// 2. Incident Log PDF (Mock download & Print)
	function exportIncidentLogPDF() {
		const targetIncidents = selectedRegionId === 'all'
			? incidents
			: mockService.getIncidentsForRegion(selectedRegionId);

		const dateStr = new Date().toISOString().slice(0, 10);
		
		let docText = `================================================================================\n`;
		docText += `                     EMBERROOT OPERATIONAL INCIDENT LOG                         \n`;
		docText += `                     Export Date: ${new Date().toLocaleString()}                \n`;
		docText += `                     Total Logged Records: ${targetIncidents.length}           \n`;
		docText += `================================================================================\n\n`;

		targetIncidents.forEach((inc, idx) => {
			docText += `[INCIDENT #${idx + 1}] ID: ${inc.id} | TYPE: ${inc.type.toUpperCase()}\n`;
			docText += `Title:           ${inc.title}\n`;
			docText += `Status:          ${inc.status.toUpperCase()} | Severity: ${inc.severity.toUpperCase()}\n`;
			docText += `Region:          ${inc.regionId}\n`;
			docText += `Containment:     ${inc.containmentPct}%\n`;
			docText += `Affected Area:   ${inc.affectedAreaKm2} sq km\n`;
			docText += `Reported Time:   ${new Date(inc.reportedAt).toLocaleString()}\n`;
			docText += `Description:     ${inc.description}\n`;
			docText += `--------------------------------------------------------------------------------\n\n`;
		});

		const blob = new Blob([docText], { type: 'application/pdf' });
		downloadBlob(`emberroot_incident_log_${dateStr}.pdf`, blob, 'application/pdf');
	}

	function printIncidentLog() {
		const targetIncidents = selectedRegionId === 'all'
			? incidents
			: mockService.getIncidentsForRegion(selectedRegionId);

		const printWindow = window.open('', '_blank');
		if (!printWindow) {
			showNotification('Pop-up blocked. Please allow pop-ups to print PDF.');
			return;
		}

		printWindow.document.write(`
			<!DOCTYPE html>
			<html>
				<head>
					<title>EmberRoot Incident Log</title>
					<style>
						body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 32px; color: #1e293b; background: #fff; }
						h1 { color: #f07840; margin: 0 0 4px 0; font-size: 24px; }
						.subtitle { color: #64748b; font-size: 13px; margin-bottom: 24px; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; }
						table { width: 100%; border-collapse: collapse; margin-top: 12px; }
						th, td { border: 1px solid #cbd5e1; padding: 10px 12px; text-align: left; font-size: 12px; }
						th { background: #f8fafc; font-weight: 600; color: #475569; }
						.badge { font-weight: 700; font-size: 10px; padding: 2px 6px; border-radius: 4px; text-transform: uppercase; }
						.critical { background: #fef2f2; color: #dc2626; border: 1px solid #fca5a5; }
						.high { background: #fff7ed; color: #ea580c; border: 1px solid #fdba74; }
						.medium { background: #fefce8; color: #ca8a04; border: 1px solid #fde047; }
						.low { background: #f0fdf4; color: #16a34a; border: 1px solid #86efac; }
					</style>
				</head>
				<body>
					<h1>EmberRoot Operational Incident Log</h1>
					<div class="subtitle">Generated ${new Date().toLocaleString()} · Target Region: ${selectedRegionId === 'all' ? 'All Regions' : selectedRegionId}</div>
					<table>
						<thead>
							<tr>
								<th>Incident ID</th>
								<th>Title & Type</th>
								<th>Severity</th>
								<th>Status</th>
								<th>Region</th>
								<th>Containment</th>
								<th>Reported Date</th>
							</tr>
						</thead>
						<tbody>
							${targetIncidents.map(i => `
								<tr>
									<td><strong>${i.id}</strong></td>
									<td><strong>${i.title}</strong><br/><small style="color:#64748b">${i.type.toUpperCase()}</small></td>
									<td><span class="badge ${i.severity}">${i.severity}</span></td>
									<td>${i.status.toUpperCase()}</td>
									<td>${i.regionId}</td>
									<td>${i.containmentPct}%</td>
									<td>${new Date(i.reportedAt).toLocaleString()}</td>
								</tr>
							`).join('')}
						</tbody>
					</table>
				</body>
			</html>
		`);
		printWindow.document.close();
		printWindow.focus();
		setTimeout(() => {
			printWindow.print();
		}, 300);
	}

	function previewIncidentLog() {
		const targetIncidents = selectedRegionId === 'all'
			? incidents
			: mockService.getIncidentsForRegion(selectedRegionId);

		previewTitle = 'Incident Log & Command Dispatch Preview';
		previewHeaders = ['Incident ID', 'Title', 'Type', 'Severity', 'Status', 'Region', 'Containment', 'Reported'];
		previewRows = targetIncidents.slice(0, 10).map((i) => [
			i.id,
			i.title,
			i.type,
			i.severity.toUpperCase(),
			i.status.toUpperCase(),
			i.regionId,
			`${i.containmentPct}%`,
			new Date(i.reportedAt).toLocaleDateString()
		]);
		previewModalOpen = true;
	}

	// 3. Sensor Health Report CSV
	function exportSensorHealthCSV() {
		const targetSensors = selectedRegionId === 'all'
			? sensors
			: mockService.getSensorsForRegion(selectedRegionId);

		const headers = [
			'Sensor ID',
			'Name',
			'Region ID',
			'Type',
			'Status',
			'Battery (%)',
			'Signal Strength (dBm)',
			'Calibration Status',
			'Drift Score',
			'Maintenance Recommendation',
			'Last Seen (ISO)'
		];

		const rows = targetSensors.map((s) => {
			const health = mockService.getNodeHealth(s.id);
			return [
				s.id,
				`"${s.name.replace(/"/g, '""')}"`,
				s.regionId,
				s.type,
				s.status,
				s.batteryPct.toString(),
				s.signalStrength.toString(),
				`"${health ? health.calibrationStatus : 'Calibrated'}"`,
				health ? health.sensorDrift.toString() : '0',
				`"${health ? health.maintenanceRecommendation.replace(/"/g, '""') : 'Routine Check'}"`,
				new Date(s.lastSeenAt).toISOString()
			];
		});

		const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
		const dateStr = new Date().toISOString().slice(0, 10);
		downloadBlob(`emberroot_sensor_health_${dateStr}.csv`, csvContent, 'text/csv;charset=utf-8;');
	}

	function previewSensorHealth() {
		const targetSensors = selectedRegionId === 'all'
			? sensors
			: mockService.getSensorsForRegion(selectedRegionId);

		previewTitle = 'Sensor Health Diagnostics Preview';
		previewHeaders = ['Sensor ID', 'Name', 'Region', 'Status', 'Battery', 'Signal', 'Calibration', 'Recommendation'];
		previewRows = targetSensors.slice(0, 10).map((s) => {
			const health = mockService.getNodeHealth(s.id);
			return [
				s.id,
				s.name,
				s.regionId,
				s.status,
				`${s.batteryPct}%`,
				`${s.signalStrength} dBm`,
				health ? health.calibrationStatus : 'Calibrated',
				health ? health.maintenanceRecommendation : 'Routine Inspection'
			];
		});
		previewModalOpen = true;
	}

	// 4. Regional Risk Index Snapshot CSV
	function exportRiskIndexCSV() {
		const riskIndices = mockService.getAllRiskIndices();
		const headers = ['Region ID', 'Composite Risk Score', 'Risk Level', 'Fuel Moisture Score', 'Wind Exposure Score', 'Next Review Date'];
		const rows = riskIndices.map((r) => [
			r.regionId,
			r.composite.toString(),
			r.level,
			r.factors.fuelMoisture.score.toString(),
			r.factors.windExposure.score.toString(),
			new Date(r.nextReviewAt).toLocaleDateString()
		]);

		const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
		const dateStr = new Date().toISOString().slice(0, 10);
		downloadBlob(`emberroot_risk_indices_${dateStr}.csv`, csvContent, 'text/csv;charset=utf-8;');
	}

	// Definition of all report cards
	const reportsList = [
		{
			id: 'daily-telemetry',
			title: 'Daily Telemetry CSV',
			format: 'CSV' as const,
			category: 'Sensors',
			description: 'Full multi-spectral & microclimate reading snapshot from all active sensor nodes. Includes real-time temperature, humidity, wind velocity, CO₂ levels, smoke index, and battery telemetry.',
			badgeVariant: 'ember' as const,
			recordsCount: sensors.length,
			recordsLabel: 'Sensor Telemetry Points',
			exportFn: exportTelemetryCSV,
			previewFn: previewTelemetry
		},
		{
			id: 'incident-log',
			title: 'Incident Log PDF',
			format: 'PDF' as const,
			category: 'Emergency Response',
			description: 'Comprehensive audit trail of all wildfire outbreaks, smoke alarms, containment percentages, tactical unit assignments, casualties, and emergency dispatch notes.',
			badgeVariant: 'warning' as const,
			recordsCount: incidents.length,
			recordsLabel: 'Incident Audit Records',
			exportFn: exportIncidentLogPDF,
			printFn: printIncidentLog,
			previewFn: previewIncidentLog
		},
		{
			id: 'sensor-health',
			title: 'Sensor Health Report CSV',
			format: 'CSV' as const,
			category: 'Hardware Diagnostics',
			description: 'Diagnostic audit detailing node battery degradation, LoRa mesh signal strength (dBm), sensor drift scores, calibration requirements, and automated maintenance recommendations.',
			badgeVariant: 'online' as const,
			recordsCount: sensors.length,
			recordsLabel: 'Node Diagnostics',
			exportFn: exportSensorHealthCSV,
			previewFn: previewSensorHealth
		},
		{
			id: 'risk-index',
			title: 'Regional Risk Index CSV',
			format: 'CSV' as const,
			category: 'Threat Analysis',
			description: 'Multi-factor risk evaluation combining fuel moisture content, slope aspect, microclimate wind exposure, human activity indices, and historical wildfire occurrence frequency.',
			badgeVariant: 'neutral' as const,
			recordsCount: regions.length,
			recordsLabel: 'Monitored Regions',
			exportFn: exportRiskIndexCSV,
			previewFn: null
		}
	];

	// Filtered reports
	let filteredReports = $derived(
		reportsList.filter((report) => {
			const matchesFormat = selectedFormat === 'all' || report.format.toLowerCase() === selectedFormat;
			const matchesQuery =
				searchQuery.trim() === '' ||
				report.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
				report.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
				report.category.toLowerCase().includes(searchQuery.toLowerCase());
			return matchesFormat && matchesQuery;
		})
	);

	function copyPreviewToClipboard() {
		if (previewHeaders.length === 0) return;
		const csvText = [previewHeaders.join(','), ...previewRows.map((r) => r.join(','))].join('\n');
		navigator.clipboard.writeText(csvText);
		showNotification('Preview data copied to clipboard!');
	}
</script>

<svelte:head>
	<title>Reports & Data Export — EmberRoot</title>
	<meta name="description" content="Operational reports, data exports, telemetry CSV, and incident PDF logs for EmberRoot." />
</svelte:head>

<PageShell
	title="Reports & Data Export"
	subtitle="Generate, preview, and download operational telemetry, incident logs, and node diagnostic reports."
	breadcrumb={['EmberRoot', 'Reports']}
>
	<!-- Toast notification -->
	{#if activeNotification}
		<div class="toast-notification" role="status" aria-live="polite">
			<div class="toast-icon">
				<svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
				</svg>
			</div>
			<span>{activeNotification}</span>
		</div>
	{/if}

	<!-- Top Metric Summary Bar -->
	<div class="metrics-grid">
		<MetricCard title="Available Export Profiles" value={reportsList.length} unit="Reports" />
		<MetricCard title="Active Nodes Exported" value={sensors.length} unit="Sensors" trend="up" trendValue="100% Online" />
		<MetricCard title="Logged Incident History" value={incidents.length} unit="Records" trend="neutral" trendValue="30-day retention" />
		<MetricCard title="Last Export Activity" value={lastExportTime ?? 'Idle'} unit="" />
	</div>

	<!-- Controls & Filter Toolbar -->
	<Card variant="glass" padding="sm" class="filter-toolbar">
		<div class="toolbar-content">
			<div class="search-wrap">
				<SearchBar
					placeholder="Search report templates..."
					bind:value={searchQuery}
				/>
			</div>

			<div class="filter-group">
				<div class="filter-item">
					<label for="format-select" class="filter-label">Format:</label>
					<select id="format-select" class="er-select" bind:value={selectedFormat}>
						<option value="all">All Formats</option>
						<option value="csv">CSV Exports</option>
						<option value="pdf">PDF Reports</option>
					</select>
				</div>

				<div class="filter-item">
					<label for="region-select" class="filter-label">Target Region:</label>
					<select id="region-select" class="er-select" bind:value={selectedRegionId}>
						<option value="all">All Regions ({regions.length})</option>
						{#each regions as region}
							<option value={region.id}>{region.name} ({region.code})</option>
						{/each}
					</select>
				</div>
			</div>
		</div>
	</Card>

	<!-- Report Cards Grid -->
	<div class="reports-grid">
		{#each filteredReports as report (report.id)}
			<Card variant="default" padding="lg" class="report-card">
				<div class="report-card__header">
					<div class="report-card__title-row">
						<h3 class="report-card__title">{report.title}</h3>
						<Badge variant={report.badgeVariant} size="md">{report.format}</Badge>
					</div>
					<span class="report-card__category">{report.category}</span>
				</div>

				<p class="report-card__desc">{report.description}</p>

				<div class="report-card__meta">
					<div class="meta-item">
						<svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7c0-2-1-3-3-3H7C5 4 4 5 4 7z" />
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6M9 16h4" />
						</svg>
						<span><strong>{report.recordsCount}</strong> {report.recordsLabel}</span>
					</div>
					<div class="meta-item">
						<svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
						</svg>
						<span>{selectedRegionId === 'all' ? 'Scope: All Regions' : `Region: ${selectedRegionId}`}</span>
					</div>
				</div>

				<div class="report-card__actions">
					{#if report.exportFn}
						<Button variant="primary" size="md" onclick={report.exportFn}>
							<svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
							</svg>
							<span>Download {report.format}</span>
						</Button>
					{/if}

					{#if report.printFn}
						<Button variant="secondary" size="md" onclick={report.printFn}>
							<svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
							</svg>
							<span>Print</span>
						</Button>
					{/if}

					{#if report.previewFn}
						<Button variant="ghost" size="md" onclick={report.previewFn}>
							<svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
							</svg>
							<span>Preview</span>
						</Button>
					{/if}
				</div>
			</Card>
		{:else}
			<div class="empty-state">
				<p>No report templates match your active filters.</p>
				<Button variant="secondary" size="sm" onclick={() => { searchQuery = ''; selectedFormat = 'all'; }}>
					Reset Filters
				</Button>
			</div>
		{/each}
	</div>

	<!-- Preview Modal -->
	{#if previewModalOpen}
		<div class="modal-backdrop" role="dialog" aria-modal="true">
			<div class="modal-card">
				<div class="modal-header">
					<div>
						<h3 class="modal-title">{previewTitle}</h3>
						<span class="modal-subtitle">Showing first {previewRows.length} rows</span>
					</div>
					<button class="modal-close" onclick={() => (previewModalOpen = false)} aria-label="Close modal">×</button>
				</div>

				<div class="modal-body">
					<div class="table-container">
						<table class="preview-table">
							<thead>
								<tr>
									{#each previewHeaders as header}
										<th>{header}</th>
									{/each}
								</tr>
							</thead>
							<tbody>
								{#each previewRows as row}
									<tr>
										{#each row as cell}
											<td>{cell}</td>
										{/each}
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</div>

				<div class="modal-footer">
					<Button variant="secondary" size="sm" onclick={copyPreviewToClipboard}>
						Copy CSV Data
					</Button>
					<Button variant="primary" size="sm" onclick={() => (previewModalOpen = false)}>
						Close Preview
					</Button>
				</div>
			</div>
		</div>
	{/if}
</PageShell>

<style>
	/* ── Metrics Bar ── */
	.metrics-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
		gap: 16px;
	}

	/* ── Toast Notification ── */
	.toast-notification {
		position: fixed;
		bottom: 24px;
		right: 24px;
		z-index: 9999;
		display: flex;
		align-items: center;
		gap: 10px;
		background: rgba(22, 28, 34, 0.95);
		border: 1px solid var(--ember-400);
		color: var(--text-primary);
		padding: 12px 18px;
		border-radius: 8px;
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4), var(--glow-ember);
		font-size: 13px;
		font-weight: 500;
		animation: slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
	}
	.toast-icon {
		color: var(--status-online);
		display: flex;
	}
	@keyframes slideUp {
		from { opacity: 0; transform: translateY(12px); }
		to { opacity: 1; transform: translateY(0); }
	}

	/* ── Filter Toolbar ── */
	:global(.filter-toolbar) {
		margin-top: 8px;
	}
	.toolbar-content {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		flex-wrap: wrap;
	}
	.search-wrap {
		flex: 1;
		min-width: 260px;
	}
	.filter-group {
		display: flex;
		align-items: center;
		gap: 16px;
		flex-wrap: wrap;
	}
	.filter-item {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.filter-label {
		font-size: 12px;
		font-weight: 500;
		color: var(--text-muted);
		white-space: nowrap;
	}
	.er-select {
		background: var(--surface-base);
		color: var(--text-primary);
		border: 1px solid var(--surface-border);
		border-radius: 6px;
		padding: 6px 12px;
		font-size: 12px;
		font-family: inherit;
		outline: none;
		cursor: pointer;
		transition: border-color 0.15s ease;
	}
	.er-select:focus {
		border-color: var(--ember-400);
	}

	/* ── Reports Grid ── */
	.reports-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
		gap: 20px;
		margin-top: 8px;
	}

	:global(.report-card) {
		display: flex;
		flex-direction: column;
		gap: 16px;
		transition: transform 0.2s ease, border-color 0.2s ease;
	}
	:global(.report-card:hover) {
		border-color: var(--surface-muted);
		transform: translateY(-2px);
	}

	.report-card__header {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
	.report-card__title-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
	}
	.report-card__title {
		font-size: 16px;
		font-weight: 600;
		color: var(--text-primary);
		letter-spacing: -0.2px;
		margin: 0;
	}
	.report-card__category {
		font-size: 11px;
		font-weight: 500;
		color: var(--text-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}
	.report-card__desc {
		font-size: 13px;
		color: var(--text-secondary);
		line-height: 1.5;
		margin: 0;
		flex: 1;
	}
	.report-card__meta {
		display: flex;
		flex-direction: column;
		gap: 6px;
		padding-top: 12px;
		border-top: 1px solid var(--surface-border);
		font-size: 12px;
		color: var(--text-muted);
	}
	.meta-item {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.report-card__actions {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
		margin-top: 4px;
	}

	.empty-state {
		grid-column: 1 / -1;
		padding: 48px;
		text-align: center;
		color: var(--text-muted);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 12px;
	}

	/* ── Modal ── */
	.modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.7);
		backdrop-filter: blur(4px);
		z-index: 999;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 24px;
	}
	.modal-card {
		background: var(--surface-raised);
		border: 1px solid var(--surface-border);
		border-radius: 12px;
		width: 100%;
		max-width: 860px;
		max-height: 85vh;
		display: flex;
		flex-direction: column;
		box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
		overflow: hidden;
	}
	.modal-header {
		padding: 16px 20px;
		border-bottom: 1px solid var(--surface-border);
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
	.modal-title {
		font-size: 16px;
		font-weight: 600;
		color: var(--text-primary);
		margin: 0;
	}
	.modal-subtitle {
		font-size: 12px;
		color: var(--text-muted);
	}
	.modal-close {
		background: transparent;
		border: none;
		color: var(--text-muted);
		font-size: 24px;
		cursor: pointer;
		line-height: 1;
		padding: 0 4px;
	}
	.modal-close:hover {
		color: var(--text-primary);
	}
	.modal-body {
		padding: 20px;
		overflow-y: auto;
		flex: 1;
	}
	.table-container {
		overflow-x: auto;
		border: 1px solid var(--surface-border);
		border-radius: 6px;
	}
	.preview-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 12px;
		text-align: left;
	}
	.preview-table th {
		background: var(--surface-base);
		color: var(--text-secondary);
		font-weight: 600;
		padding: 10px 12px;
		border-bottom: 1px solid var(--surface-border);
		white-space: nowrap;
	}
	.preview-table td {
		padding: 8px 12px;
		border-bottom: 1px solid var(--surface-border);
		color: var(--text-primary);
		white-space: nowrap;
	}
	.preview-table tr:last-child td {
		border-bottom: none;
	}
	.modal-footer {
		padding: 14px 20px;
		border-top: 1px solid var(--surface-border);
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 12px;
		background: var(--surface-base);
	}
</style>
