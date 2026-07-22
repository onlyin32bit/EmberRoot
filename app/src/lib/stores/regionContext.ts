import { writable } from 'svelte/store';

export const selectedRegionId = writable<string>('all');
