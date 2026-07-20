<script lang="ts">
    import Card from '$lib/components/ui/Card.svelte';
    import { DonutChart, BarChart } from '$lib/components/charts';
    import type { NodeHealth } from '$lib/mock';

    interface Props {
        health?: NodeHealth | null;
    }

    let { health = null }: Props = $props();

    const defaultHealth: NodeHealth = {
        sensorId: 'SN-0001',
        batteryPct: 74,
        firmwareVersion: '2.5.3',
        calibrationStatus: 'Calibrated',
        signalStrength: -68,
        sensorDrift: 0.09,
        maintenanceRecommendation: 'Validate sensor calibration on next maintenance window',
        lastSeenAt: Date.now() - 110_000
    };

    const node = health ?? defaultHealth;
    const batteryPct = node.batteryPct;
    const batterySegments = [
        { id: 'b', label: 'Battery', value: batteryPct, color: batteryPct < 35 ? 'var(--status-critical)' : batteryPct < 55 ? 'var(--status-warning)' : 'var(--status-online)' },
        { id: 'b2', label: 'Empty', value: 100 - batteryPct, color: 'var(--surface-overlay)' }
    ];

    const bars = [
        { id: 'battery', label: 'Battery Level', value: batteryPct, sub: '%', color: batteryPct < 35 ? 'var(--status-critical)' : batteryPct < 55 ? 'var(--status-warning)' : 'var(--status-online)' },
        { id: 'signal', label: 'Signal Strength', value: Math.min(100, Math.max(0, node.signalStrength + 120)), sub: 'dBm', color: 'var(--text-secondary)' },
        { id: 'drift', label: 'Sensor Drift', value: Math.round(node.sensorDrift * 100), sub: '%', color: node.sensorDrift > 0.12 ? 'var(--status-critical)' : 'var(--status-warning)' }
    ];

    const nodeId = node.sensorId;
    const lastUplink = new Date(node.lastSeenAt).toLocaleString();
</script>

<Card padding="md">
    <div style="display:flex; gap:12px; align-items:flex-start">
        <div style="flex:0 0 96px; display:flex; align-items:center; justify-content:center">
            <DonutChart segments={batterySegments} size={92} strokeWidth={12} centerLabel={`${batteryPct}%`} centerSub="Battery" />
        </div>

        <div style="flex:1; display:flex; flex-direction:column; gap:8px">
            <div style="display:flex; justify-content:space-between; align-items:center">
                <div>
                    <div style="font-weight:700">Node Health Status</div>
                    <div style="font-size:12px; color:var(--text-muted)">Battery, radio and sensor drift</div>
                </div>
                <div style="font-family: 'JetBrains Mono', monospace; color:var(--text-muted)">{nodeId}</div>
            </div>

            <div>
                <BarChart bars={bars.map(b => ({ ...b, value: Math.abs(b.value) }))} orientation="horizontal" showValues={true} />
            </div>

            <div style="font-size:12px; color:var(--text-muted)">Last Uplink: {lastUplink}</div>
            <div style="font-size:12px; color:var(--text-muted)">Calibration: {node.calibrationStatus}</div>
            <div style="font-size:12px; color:var(--text-muted)">{node.maintenanceRecommendation}</div>
        </div>
    </div>
</Card>

<style>
/* Small tweaks for compact panel */
:global(.er-card) { min-height: 220px; }
</style>
