<script lang="ts">
	interface Props {
		title: string;
		subtitle?: string;
		breadcrumb?: string[];
	}
	let { title, subtitle, breadcrumb }: Props = $props();
</script>

<div class="page">
	<!-- Page header -->
	<div class="page__header">
		{#if breadcrumb && breadcrumb.length > 0}
			<nav class="page__breadcrumb" aria-label="Breadcrumb">
				{#each breadcrumb as crumb, i}
					<span class="page__breadcrumb-item">{crumb}</span>
					{#if i < breadcrumb.length - 1}
						<span class="page__breadcrumb-sep" aria-hidden="true">/</span>
					{/if}
				{/each}
			</nav>
		{/if}

		<div class="page__heading-row">
			<h1 class="page__title">{title}</h1>
			{#if subtitle}
				<p class="page__subtitle">{subtitle}</p>
			{/if}
		</div>
	</div>

	<!-- Empty body slot -->
	<div class="page__body">
		<!-- Content will be added here -->
	</div>
</div>

<style>
	.page {
		display: flex;
		flex-direction: column;
		min-height: 100%;
		padding: 28px 32px;
		gap: 24px;
	}

	/* ── Header ─────────────────────────────────────────────────── */
	.page__header {
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding-bottom: 20px;
		border-bottom: 1px solid var(--surface-border);
	}

	.page__breadcrumb {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 12px;
	}
	.page__breadcrumb-item {
		color: var(--text-muted);
		font-weight: 500;
	}
	.page__breadcrumb-item:last-child {
		color: var(--text-secondary);
	}
	.page__breadcrumb-sep {
		color: var(--text-muted);
		opacity: 0.5;
	}

	.page__heading-row {
		display: flex;
		align-items: baseline;
		gap: 16px;
		flex-wrap: wrap;
	}

	.page__title {
		font-size: 22px;
		font-weight: 700;
		letter-spacing: -0.4px;
		color: var(--text-primary);
		line-height: 1.2;
	}

	.page__subtitle {
		font-size: 13px;
		color: var(--text-muted);
		font-weight: 400;
	}

	/* ── Body ────────────────────────────────────────────────────── */
	.page__body {
		flex: 1;
	}
</style>
