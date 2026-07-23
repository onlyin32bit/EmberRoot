<script lang="ts">
import { onMount } from 'svelte';
import { api, type ApiAlert, type ApiRegion } from '$lib/api';
import PageShell from '$lib/components/PageShell.svelte';
import Card from '$lib/components/ui/Card.svelte';
import Badge from '$lib/components/ui/Badge.svelte';
import Button from '$lib/components/ui/Button.svelte';
import SearchBar from '$lib/components/ui/SearchBar.svelte';
import { goto } from '$app/navigation';

let alerts = $state<ApiAlert[]>([]);
let regions = $state<ApiRegion[]>([]);
let loading = $state(true);
let error = $state<string | null>(null);
let searchQuery = $state('');
let severityFilter = $state<'all' | 'warning' | 'suspicious' | 'monitoring'>('all');
let stateFilter = $state<'all' | 'open' | 'acknowledged' | 'investigating' | 'resolved' | 'false_positive'>('all');

const regionMap = $derived(new Map(regions.map((region) => [region.id, region])));

const filteredAlerts = $derived.by(() => {
let results = alerts;

if (severityFilter !== 'all') {
results = results.filter((alert) => alert.level === severityFilter);
}

if (stateFilter !== 'all') {
results = results.filter((alert) => alert.state === stateFilter);
}

if (searchQuery.trim()) {
const query = searchQuery.toLowerCase();
results = results.filter((alert) => {
const regionName = regionMap.get(alert.region_id ?? '')?.name.toLowerCase() ?? '';
return (
alert.id.toLowerCase().includes(query) ||
(alert.node_name ?? alert.node_id).toLowerCase().includes(query) ||
alert.explanation.toLowerCase().includes(query) ||
regionName.includes(query)
);
});
}

return results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
});

function formatLevel(level: ApiAlert['level']): string {
switch (level) {
case 'warning': return 'Critical';
case 'suspicious': return 'Suspicious';
case 'monitoring': return 'Monitoring';
default: return 'Unknown';
}
}

function formatState(state: ApiAlert['state']): string {
switch (state) {
case 'open': return 'Open';
case 'acknowledged': return 'Acknowledged';
case 'investigating': return 'Investigating';
case 'resolved': return 'Resolved';
case 'false_positive': return 'False Positive';
default: return 'Unknown';
}
}

function getLevelBadgeVariant(level: ApiAlert['level']) {
switch (level) {
case 'warning': return 'critical';
case 'suspicious': return 'warning';
case 'monitoring': return 'online';
default: return 'neutral';
}
}

function getStateBadgeVariant(state: ApiAlert['state']) {
switch (state) {
case 'open': return 'warning';
case 'acknowledged': return 'neutral';
case 'investigating': return 'warning';
case 'resolved': return 'online';
case 'false_positive': return 'neutral';
default: return 'neutral';
}
}

async function loadData() {
try {
loading = true;
error = null;
const [alertData, regionData] = await Promise.all([
api.getAlerts({ limit: 200 }),
api.getRegions()
]);
alerts = alertData;
regions = regionData;
} catch (err) {
error = err instanceof Error ? err.message : 'Failed to load alert history';
} finally {
loading = false;
}
}

onMount(() => {
void loadData();
const poll = window.setInterval(() => void loadData(), 30_000);
return () => window.clearInterval(poll);
});
</script>

<svelte:head>
<title>Alert History — EmberRoot</title>
<meta name="description" content="Alert history from the connected API." />
</svelte:head>

<PageShell title="Alert History" subtitle="Operational alerts received from the backend">
<div class="history-page">
{#if error}
<Card padding="lg" class="error-card">
<h3>Unable to load alerts</h3>
<p>{error}</p>
<Button variant="primary" onclick={() => void loadData()}>Retry</Button>
</Card>
{:else}
<div class="filters-section">
<SearchBar placeholder="Search alerts or nodes..." bind:value={searchQuery} />

<div class="filter-controls">
<div class="filter-group">
<span class="filter-group__label">Severity</span>
<div class="filter-buttons">
<button class:active={severityFilter === 'all'} onclick={() => (severityFilter = 'all')}>All</button>
<button class:active={severityFilter === 'warning'} onclick={() => (severityFilter = 'warning')}>Critical</button>
<button class:active={severityFilter === 'suspicious'} onclick={() => (severityFilter = 'suspicious')}>Suspicious</button>
<button class:active={severityFilter === 'monitoring'} onclick={() => (severityFilter = 'monitoring')}>Monitoring</button>
</div>
</div>

<div class="filter-group">
<span class="filter-group__label">Status</span>
<div class="filter-buttons">
<button class:active={stateFilter === 'all'} onclick={() => (stateFilter = 'all')}>All</button>
<button class:active={stateFilter === 'open'} onclick={() => (stateFilter = 'open')}>Open</button>
<button class:active={stateFilter === 'acknowledged'} onclick={() => (stateFilter = 'acknowledged')}>Acknowledged</button>
<button class:active={stateFilter === 'investigating'} onclick={() => (stateFilter = 'investigating')}>Investigating</button>
<button class:active={stateFilter === 'resolved'} onclick={() => (stateFilter = 'resolved')}>Resolved</button>
</div>
</div>
</div>
</div>

{#if loading}
<Card padding="lg">
<p>Loading alert history...</p>
</Card>
{:else if filteredAlerts.length === 0}
<Card padding="lg" class="empty-state">
<p>No alerts match the current filters.</p>
</Card>
{:else}
<div class="alerts-list">
{#each filteredAlerts as alert (alert.id)}
<Card padding="md" class="alert-card">
<div class="alert-card__header">
<div class="alert-card__badges">
<Badge variant={getLevelBadgeVariant(alert.level)}>{formatLevel(alert.level)}</Badge>
<Badge variant={getStateBadgeVariant(alert.state)}>{formatState(alert.state)}</Badge>
</div>
<div class="alert-card__time">{new Date(alert.created_at).toLocaleString()}</div>
</div>

<div class="alert-card__content">
<div class="alert-card__node">
<strong>{alert.node_name || alert.node_id}</strong>
<code>{alert.node_id}</code>
</div>
<p>{alert.explanation}</p>
</div>

<div class="alert-card__footer">
{#if alert.region_id}
<span class="meta-pill">{regionMap.get(alert.region_id)?.name ?? 'Region'}</span>
{/if}
<Button variant="ghost" size="sm" onclick={() => goto(`/alerts/${alert.id}`)}>View details</Button>
</div>
</Card>
{/each}
</div>
{/if}
{/if}
</div>
</PageShell>

<style>
.history-page {
display: flex;
flex-direction: column;
gap: 20px;
padding: 24px 28px;
}

.filters-section {
display: flex;
flex-direction: column;
gap: 16px;
}

.filter-controls {
display: flex;
flex-wrap: wrap;
gap: 16px;
padding: 16px;
background: rgba(255, 255, 255, 0.02);
border: 1px solid var(--surface-border);
border-radius: 12px;
}

.filter-group {
display: flex;
flex-direction: column;
gap: 8px;
}

.filter-group__label {
font-size: 11px;
font-weight: 600;
text-transform: uppercase;
letter-spacing: 0.06em;
color: var(--text-muted);
}

.filter-buttons {
display: flex;
flex-wrap: wrap;
gap: 8px;
}

.filter-buttons button {
padding: 8px 12px;
border: 1px solid var(--surface-border);
border-radius: 8px;
background: transparent;
color: var(--text-secondary);
font-size: 12px;
cursor: pointer;
}

.filter-buttons button.active {
background: var(--ember-400);
border-color: var(--ember-400);
color: white;
}

.alerts-list {
display: flex;
flex-direction: column;
gap: 12px;
}

:global(.alert-card) {
display: flex;
flex-direction: column;
gap: 12px;
}

.alert-card__header {
display: flex;
justify-content: space-between;
align-items: center;
gap: 12px;
}

.alert-card__badges {
display: flex;
flex-wrap: wrap;
gap: 8px;
}

.alert-card__time {
font-size: 11px;
color: var(--text-muted);
white-space: nowrap;
}

.alert-card__content {
display: flex;
flex-direction: column;
gap: 8px;
}

.alert-card__node {
display: flex;
flex-direction: column;
gap: 2px;
}

.alert-card__node strong {
color: var(--text-primary);
}

.alert-card__node code {
font-size: 11px;
font-family: var(--font-mono);
background: rgba(255, 255, 255, 0.04);
padding: 2px 6px;
border-radius: 4px;
width: fit-content;
}

.alert-card__content p {
margin: 0;
color: var(--text-secondary);
line-height: 1.5;
}

.alert-card__footer {
display: flex;
justify-content: space-between;
align-items: center;
gap: 12px;
}

.meta-pill {
font-size: 11px;
color: var(--text-muted);
}

:global(.empty-state) {
text-align: center;
color: var(--text-muted);
}

:global(.error-card) {
border-color: var(--status-critical);
background: color-mix(in srgb, var(--status-critical) 5%, transparent);
}

@media (max-width: 900px) {
.alert-card__header,
.alert-card__footer {
flex-direction: column;
align-items: flex-start;
}
}
</style>
