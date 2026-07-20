<script lang="ts">
    import Card from '$lib/components/ui/Card.svelte';
    import { uid } from '$lib/mock/utils';

    const now = Date.now();
    const items = [
        { id: uid('AL', 1), ts: now - 6 * 60_000, title: 'Temperature spike detected', msg: 'Surface temp exceeded expected threshold.' },
        { id: uid('AL', 2), ts: now - 14 * 60_000, title: 'Smoke index rising', msg: 'Localized smoke index increase at node SN-0042.' },
        { id: uid('AL', 3), ts: now - 60 * 60_000, title: 'Sensor drift', msg: 'CO2 sensor calibration flagged.' }
    ];
</script>

<Card padding="md">
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px">
        <div style="font-weight:700">Recent Anomalous Readings</div>
		<a href="/alert-history" style="font-size:12px; color:var(--ember-500)">View All Logs</a>
    </div>
    <ul style="list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:10px">
        {#each items as it}
            <li style="display:flex; gap:10px; align-items:flex-start">
                <div style="width:8px; height:8px; background:var(--status-warning); border-radius:50%; margin-top:6px"></div>
                <div style="flex:1">
                    <div style="display:flex; justify-content:space-between; gap:8px">
                        <div style="font-weight:600">{it.title}</div>
                        <div style="font-family:'JetBrains Mono', monospace; color:var(--text-muted); font-size:12px">{new Date(it.ts).toLocaleTimeString()}</div>
                    </div>
                    <div style="font-size:13px; color:var(--text-muted)">{it.msg}</div>
                </div>
            </li>
        {/each}
    </ul>
</Card>
