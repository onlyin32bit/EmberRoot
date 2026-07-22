<script lang="ts">
	interface NotificationItem {
		id: string;
		title: string;
		message: string;
		read: boolean;
		kind: 'alert' | 'incident' | 'system';
		createdAt: string;
		href?: string;
	}

	let {
		open = false,
		notifications = [],
		onClose = () => {},
		onMarkAllRead = () => {},
		onMarkRead = () => {},
		onSelect = () => {}
	}: {
		open?: boolean;
		notifications?: NotificationItem[];
		onClose?: () => void;
		onMarkAllRead?: () => void;
		onMarkRead?: (id: string) => void;
		onSelect?: (item: NotificationItem) => void;
	} = $props();
</script>

{#if open}
	<div class="notification-panel" role="dialog" aria-label="Notifications">
		<div class="notification-panel__header">
			<div>
				<div class="notification-panel__title">Notifications</div>
				<div class="notification-panel__subtitle">Live incident and health updates</div>
			</div>
			<button class="notification-panel__ghost" type="button" onclick={onMarkAllRead} disabled={notifications.every((item) => item.read)}>
				Mark all read
			</button>
		</div>

		{#if notifications.length === 0}
			<div class="notification-panel__empty">You’re all caught up.</div>
		{:else}
			<div class="notification-panel__list">
				{#each notifications as item}
					<button class="notification-item" type="button" onclick={() => onSelect(item)}>
						<div class="notification-item__top">
							<span class="notification-item__kind">{item.kind}</span>
							{#if !item.read}
								<span class="notification-item__dot"></span>
							{/if}
						</div>
						<div class="notification-item__title">{item.title}</div>
						<div class="notification-item__message">{item.message}</div>
						<div class="notification-item__time">{item.createdAt}</div>
					</button>
				{/each}
			</div>
		{/if}
	</div>
{/if}

<style>
	.notification-panel {
		position: absolute;
		top: calc(100% + 8px);
		right: 0;
		width: min(360px, calc(100vw - 24px));
		max-height: min(520px, calc(100vh - 140px));
		overflow: auto;
		background: rgba(15, 23, 42, 0.96);
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: 16px;
		padding: 12px;
		box-shadow: 0 24px 48px rgba(0, 0, 0, 0.4);
		backdrop-filter: blur(18px);
		z-index: 1200;
	}

	.notification-panel__header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 8px;
		margin-bottom: 10px;
	}

	.notification-panel__title {
		font-size: 14px;
		font-weight: 700;
		color: var(--text-primary);
	}

	.notification-panel__subtitle {
		font-size: 11px;
		color: var(--text-muted);
	}

	.notification-panel__ghost {
		border: 1px solid rgba(240, 120, 64, 0.2);
		background: rgba(240, 120, 64, 0.08);
		color: var(--ember-300);
		border-radius: 999px;
		padding: 6px 10px;
		font-size: 11px;
		font-weight: 700;
		cursor: pointer;
	}

	.notification-panel__ghost:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.notification-panel__empty {
		padding: 16px;
		text-align: center;
		color: var(--text-muted);
		font-size: 13px;
	}

	.notification-panel__list {
		display: grid;
		gap: 8px;
	}

	.notification-item {
		text-align: left;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(255, 255, 255, 0.04);
		border-radius: 12px;
		padding: 10px;
		color: inherit;
		cursor: pointer;
	}

	.notification-item__top {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 6px;
	}

	.notification-item__kind {
		font-size: 10px;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--text-muted);
	}

	.notification-item__dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--ember-400);
		flex-shrink: 0;
	}

	.notification-item__title {
		font-size: 12px;
		font-weight: 700;
		color: var(--text-primary);
		margin-bottom: 4px;
	}

	.notification-item__message {
		font-size: 12px;
		color: var(--text-secondary);
		line-height: 1.4;
		margin-bottom: 6px;
	}

	.notification-item__time {
		font-size: 10px;
		color: var(--text-muted);
	}
</style>
