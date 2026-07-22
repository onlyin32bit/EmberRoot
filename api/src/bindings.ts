import type { RealtimeHub } from './realtime-hub';

export interface Bindings {
	DB: D1Database;
	REALTIME_HUB: DurableObjectNamespace<RealtimeHub>;
	ENVIRONMENT: string;
	AUTH_SECRET?: string;
	ADMIN_USERNAME?: string;
	ADMIN_PASSWORD?: string;
	INGEST_API_KEY?: string;
}

export interface AdminSession {
	sub: 'admin';
	expiresAt: number;
}

export interface AppVariables {
	admin: AdminSession;
}
