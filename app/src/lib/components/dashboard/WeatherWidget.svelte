<!-- ─────────────────────────────────────────────────────────────────────────
  WeatherWidget.svelte
  Current conditions for the highest-risk region + 6-hour mini-forecast.
───────────────────────────────────────────────────────────────────────────── -->
<script lang="ts">
	import { mockService } from '$lib/mock';
	import type { WeatherCondition } from '$lib/mock';

	// Use highest-risk region's weather
	const highRisk = mockService.getHighRiskRegions(1);
	const regionId = highRisk[0]?.regionId ?? mockService.getRegions()[0]?.id;
	const weather  = mockService.getWeather(regionId);
	const region   = mockService.getRegion(regionId);

	const COND_ICONS: Record<WeatherCondition, string> = {
		clear:         '☀️',
		partly_cloudy: '⛅',
		overcast:      '☁️',
		fog:           '🌫️',
		rain:          '🌧️',
		thunderstorm:  '⛈️',
		smoke:         '🌫️'
	};

	const WIND_DIR = ['N','NE','E','SE','S','SW','W','NW'];
	function bearing(deg: number) { return WIND_DIR[Math.round(deg / 45) % 8]; }

	function condLabel(c: WeatherCondition) {
		return c.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
	}

	const forecast6 = weather?.forecast.slice(0, 6) ?? [];
</script>

{#if weather}
<div class="wx">
	<div class="wx__header">
		<svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"/>
		</svg>
		<span class="wx__title">Weather</span>
		<span class="wx__region">{region?.name ?? '—'}</span>
	</div>

	<div class="wx__current">
		<div class="wx__emoji" aria-label={condLabel(weather.condition)}>{COND_ICONS[weather.condition]}</div>
		<div class="wx__main">
			<span class="wx__temp">{weather.tempC.toFixed(1)}<span class="wx__temp-unit">°C</span></span>
			<span class="wx__cond">{condLabel(weather.condition)}</span>
		</div>
		<div class="wx__side-stats">
			<div class="wx__side-stat">
				<svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z"/></svg>
				<span>{weather.humidity}%</span>
			</div>
			<div class="wx__side-stat">
				<svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
				<span>{weather.windSpeedKph.toFixed(0)} km/h {bearing(weather.windDirection)}</span>
			</div>
			<div class="wx__side-stat">
				<svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/></svg>
				<span>UV {weather.uvIndex.toFixed(0)}</span>
			</div>
		</div>
	</div>

	<!-- 6h forecast row -->
	<div class="wx__forecast">
		{#each forecast6 as slot, i}
			{@const hour = new Date(slot.timestamp).getHours()}
			<div class="wx__slot">
				<span class="wx__slot-time">{hour.toString().padStart(2,'0')}:00</span>
				<span class="wx__slot-icon">{COND_ICONS[slot.condition]}</span>
				<span class="wx__slot-temp">{slot.tempC.toFixed(0)}°</span>
			</div>
		{/each}
	</div>

	<!-- Fire weather advisory row -->
	{#if weather.windSpeedKph > 40 || weather.humidity < 20}
		<div class="wx__advisory">
			<svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
			Fire weather conditions active — low humidity / high wind
		</div>
	{/if}
</div>
{/if}

<style>
	.wx { display: flex; flex-direction: column; gap: 14px; height: 100%; }

	.wx__header {
		display: flex; align-items: center; gap: 6px;
		color: var(--text-muted);
	}
	.wx__title {
		font-size: 12px; font-weight: 600; letter-spacing: 0.06em;
		text-transform: uppercase; color: var(--text-primary);
	}
	.wx__region {
		font-size: 10px; color: var(--text-muted);
		margin-left: auto;
		max-width: 100px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
	}

	.wx__current {
		display: flex; align-items: center; gap: 12px;
	}
	.wx__emoji { font-size: 36px; line-height: 1; flex-shrink: 0; }
	.wx__main { display: flex; flex-direction: column; gap: 2px; flex: 1; }
	.wx__temp {
		font-family: 'JetBrains Mono', monospace;
		font-size: 32px; font-weight: 700; line-height: 1;
		color: var(--text-primary); letter-spacing: -1px;
	}
	.wx__temp-unit { font-size: 16px; font-weight: 400; color: var(--text-secondary); }
	.wx__cond { font-size: 12px; color: var(--text-secondary); }

	.wx__side-stats { display: flex; flex-direction: column; gap: 4px; }
	.wx__side-stat {
		display: flex; align-items: center; gap: 4px;
		font-size: 11px; color: var(--text-secondary);
	}
	.wx__side-stat svg { color: var(--text-muted); flex-shrink: 0; }

	/* Mini forecast */
	.wx__forecast {
		display: grid; grid-template-columns: repeat(6, 1fr);
		gap: 4px;
		padding-top: 10px;
		border-top: 1px solid var(--surface-border);
	}
	.wx__slot {
		display: flex; flex-direction: column; align-items: center; gap: 3px;
	}
	.wx__slot-time { font-size: 9px; color: var(--text-muted); }
	.wx__slot-icon { font-size: 14px; }
	.wx__slot-temp { font-size: 11px; font-weight: 500; color: var(--text-primary); }

	/* Advisory */
	.wx__advisory {
		display: flex; align-items: center; gap: 6px;
		padding: 8px 10px; border-radius: 6px;
		background: rgba(240, 179, 64, 0.1);
		border: 1px solid rgba(240, 179, 64, 0.3);
		font-size: 11px; color: var(--status-warning);
	}
	.wx__advisory svg { flex-shrink: 0; }
</style>
