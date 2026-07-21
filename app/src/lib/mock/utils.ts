/**
 * EmberRoot Mock Data Layer — Utility Helpers
 * ─────────────────────────────────────────────
 * Pure utility functions for data generation.
 * No dependencies outside this file.
 */

import type { Severity, StatusLevel, TimeSeries } from './types.js';

// ── Deterministic pseudo-random (seeded) ─────────────────────────────────────

let _seed = 0xdeadbeef;

export function setSeed(s: number) { _seed = s; }

/** Mulberry32 — fast, seedable, good distribution */
export function rand(): number {
	_seed = (_seed + 0x9e3779b9) >>> 0;
	let t = _seed;
	t = Math.imul(t ^ (t >>> 15), 1 | t);
	t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
	return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** Integer in [min, max] */
export function randInt(min: number, max: number): number {
	return Math.floor(rand() * (max - min + 1)) + min;
}

/** Float in [min, max] rounded to `dp` decimal places */
export function randFloat(min: number, max: number, dp = 2): number {
	const v = rand() * (max - min) + min;
	return parseFloat(v.toFixed(dp));
}

/** Pick one item from an array */
export function pick<T>(arr: readonly T[]): T {
	return arr[Math.floor(rand() * arr.length)];
}

/** Pick N unique items from an array */
export function pickN<T>(arr: readonly T[], n: number): T[] {
	const copy = [...arr];
	const result: T[] = [];
	for (let i = 0; i < Math.min(n, copy.length); i++) {
		const idx = Math.floor(rand() * (copy.length - i));
		result.push(copy[idx]);
		[copy[idx], copy[copy.length - 1 - i]] = [copy[copy.length - 1 - i], copy[idx]];
	}
	return result;
}

/** Weighted pick: items with higher weight appear more often */
export function weightedPick<T>(items: T[], weights: number[]): T {
	const total = weights.reduce((s, w) => s + w, 0);
	let r = rand() * total;
	for (let i = 0; i < items.length; i++) {
		r -= weights[i];
		if (r <= 0) return items[i];
	}
	return items[items.length - 1];
}

// ── Time helpers ─────────────────────────────────────────────────────────────

const NOW = Date.now();

export function msAgo(ms: number) { return NOW - ms; }
export function hoursAgo(h: number) { return msAgo(h * 3_600_000); }
export function daysAgo(d: number) { return hoursAgo(d * 24); }
export function hoursAhead(h: number) { return NOW + h * 3_600_000; }

/** Generate a TimeSeries going back `points` intervals of `intervalMs` each */
export function makeSeries(
	startValue: number,
	points: number,
	intervalMs: number,
	jitter: number,
	clamp: [number, number] = [0, Infinity]
): TimeSeries {
	const series: TimeSeries = [];
	let value = startValue;
	const startTime = NOW - points * intervalMs;
	for (let i = 0; i < points; i++) {
		value += (rand() - 0.5) * 2 * jitter;
		value = Math.max(clamp[0], Math.min(clamp[1], value));
		series.push({ timestamp: startTime + i * intervalMs, value: parseFloat(value.toFixed(2)) });
	}
	return series;
}

// ── Naming helpers ────────────────────────────────────────────────────────────

const REGION_PREFIXES = ['U Minh', 'Cà Mau', 'Bạc Liêu', 'Sóc Trăng', 'Long An', 'Đồng Tháp', 'Kiên Giang', 'Mekong'];
const REGION_SUFFIXES = ['Wetlands', 'Forest', 'Estuary', 'Basin', 'Marsh', 'Delta', 'Ridge', 'Reserve'];

export function regionName(): string {
	return `${pick(REGION_PREFIXES)} ${pick(REGION_SUFFIXES)}`;
}

// ── Severity / Status mapping ─────────────────────────────────────────────────

export function scoreToSeverity(score: number): Severity {
	if (score >= 75) return 'critical';
	if (score >= 55) return 'high';
	if (score >= 35) return 'medium';
	return 'low';
}

export function scoreToStatus(score: number): StatusLevel {
	if (score < 10) return 'offline';
	if (score < 40) return 'critical';
	if (score < 70) return 'warning';
	return 'online';
}

// ── ID generators ─────────────────────────────────────────────────────────────

export function uid(prefix: string, n: number): string {
	return `${prefix}-${String(n).padStart(4, '0')}`;
}

export function shortId(): string {
	return Math.random().toString(36).slice(2, 9).toUpperCase();
}
