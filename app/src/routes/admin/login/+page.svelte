<script lang="ts">
	import { goto } from '$app/navigation';
	import { api } from '$lib/api';
	import PageShell from '$lib/components/PageShell.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';

	let username = $state('');
	let password = $state('');
	let error = $state<string | null>(null);
	let loading = $state(false);

	async function handleLogin(e: Event) {
		e.preventDefault();
		error = null;
		loading = true;

		try {
			await api.login(username, password);
			await goto('/admin');
		} catch (err) {
			error = err instanceof Error ? err.message : 'Login failed';
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Admin Login — EmberRoot</title>
</svelte:head>

<PageShell
	title="Admin Authentication"
	subtitle="Sign in to access the EmberRoot management portal"
	breadcrumb={['EmberRoot', 'Admin', 'Login']}
>
	<div class="login-container">
		<Card padding="lg" class="login-card">
			<form onsubmit={handleLogin} class="login-form">
				{#if error}
					<div class="error-box">
						{error}
					</div>
				{/if}

				<div class="input-group">
					<label for="username">Username</label>
					<input 
						type="text" 
						id="username" 
						bind:value={username} 
						required 
						class="er-input" 
						placeholder="Enter admin username"
					/>
				</div>

				<div class="input-group">
					<label for="password">Password</label>
					<input 
						type="password" 
						id="password" 
						bind:value={password} 
						required 
						class="er-input" 
						placeholder="Enter password"
					/>
				</div>

				<Button variant="primary" size="lg" type="submit" disabled={loading} class="submit-btn">
					{loading ? 'Authenticating...' : 'Sign In'}
				</Button>
			</form>
		</Card>
	</div>
</PageShell>

<style>
	.login-container {
		display: flex;
		justify-content: center;
		align-items: center;
		padding-top: 40px;
	}

	:global(.login-card) {
		width: 100%;
		max-width: 400px;
		background: rgba(15, 23, 42, 0.7) !important;
		border: 1px solid rgba(255, 255, 255, 0.1) !important;
	}

	.login-form {
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	.input-group {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.input-group label {
		font-size: 13px;
		font-weight: 600;
		color: var(--text-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.er-input {
		background: var(--surface-base);
		color: var(--text-primary);
		border: 1px solid var(--surface-border);
		border-radius: 8px;
		padding: 12px 16px;
		font-size: 15px;
		font-family: inherit;
		outline: none;
		transition: all 0.2s ease;
	}

	.er-input:focus {
		border-color: var(--ember-400);
		box-shadow: 0 0 0 2px rgba(240, 120, 64, 0.2);
	}

	.error-box {
		padding: 12px;
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid rgba(239, 68, 68, 0.3);
		border-radius: 8px;
		color: #fca5a5;
		font-size: 14px;
		text-align: center;
	}

	:global(.submit-btn) {
		margin-top: 10px;
		width: 100%;
	}
</style>
