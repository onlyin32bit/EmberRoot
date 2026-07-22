/**
 * Shared type definitions for all chart components.
 * Exported from here so they can be re-exported cleanly from index.ts
 * without triggering TS2614 (svelte module has no named exports).
 */

import type { TimeSeries } from '$lib/mock';

export interface TooltipItem {
	label: string;
	value: string;
	color?: string;
	sub?: string;
}

export interface SeriesDef {
	id: string;
	label: string;
	data: TimeSeries;
	color: string;
	/** Fill below the line with gradient area. Default true. */
	filled?: boolean;
}

export interface BarDef {
	id: string;
	label: string;
	value: number;
	color?: string;
	sub?: string;
}

export interface SegmentDef {
	id: string;
	label: string;
	value: number;
	color: string;
	sub?: string;
}
