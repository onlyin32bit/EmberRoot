<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { api } from '$lib/api';

	let { children } = $props();

	onMount(() => {
		if (!api.isAuthenticated() && page.url.pathname !== '/admin/login') {
			void goto('/admin/login');
		}
	});
</script>

{@render children()}
