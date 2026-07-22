import type { ApiAlert, ApiEnvelope, ApiNode, ApiRegion, ApiTelemetry, AuthSession, RealtimeEvent } from './types';

const TOKEN_KEY = 'emberroot.admin-token';
const API_BASE_URL = (import.meta.env.PUBLIC_API_BASE_URL as string | undefined)?.replace(/\/$/u, '') || 'http://localhost:8787';

export class EmberRootApiClient {
	private token: string | null = typeof localStorage === 'undefined' ? null : localStorage.getItem(TOKEN_KEY);

	private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
		const headers = new Headers(init.headers);
		headers.set('Accept', 'application/json');
		if (init.body) headers.set('Content-Type', 'application/json');
		if (this.token) headers.set('Authorization', `Bearer ${this.token}`);
		const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
		const body = await response.json() as ApiEnvelope<T>;
		if (!response.ok || !body.success) throw new Error(body.error || `Request failed (${response.status})`);
		return body.data;
	}

	async login(username: string, password: string): Promise<AuthSession> {
		const session = await this.request<AuthSession>('/api/auth/login', {
			method: 'POST', body: JSON.stringify({ username, password })
		});
		this.token = session.token;
		localStorage.setItem(TOKEN_KEY, session.token);
		return session;
	}

	logout(): void {
		this.token = null;
		localStorage.removeItem(TOKEN_KEY);
	}

	getRegions(): Promise<ApiRegion[]> { return this.request('/api/regions'); }
	getNodes(regionId?: string): Promise<ApiNode[]> {
		return this.request(`/api/nodes${regionId ? `?regionId=${encodeURIComponent(regionId)}` : ''}`);
	}
	getNode(id: string): Promise<ApiNode> { return this.request(`/api/nodes/${encodeURIComponent(id)}`); }
	getTelemetry(id: string, limit = 100): Promise<ApiTelemetry[]> {
		return this.request(`/api/nodes/${encodeURIComponent(id)}/telemetry?limit=${limit}`);
	}
	getAlerts(state?: ApiAlert['state']): Promise<ApiAlert[]> {
		return this.request(`/api/alerts${state ? `?state=${encodeURIComponent(state)}` : ''}`);
	}
	acknowledgeAlert(id: string): Promise<{ id: string; state: string }> {
		return this.request(`/api/alerts/${encodeURIComponent(id)}/acknowledge`, { method: 'POST' });
	}

	connectRealtime(onEvent: (event: RealtimeEvent) => void, onError?: () => void): (() => void) | null {
		if (!this.token || typeof WebSocket === 'undefined') return null;
		const wsBase = API_BASE_URL.replace(/^http/u, 'ws');
		const socket = new WebSocket(`${wsBase}/api/ws?token=${encodeURIComponent(this.token)}`);
		socket.onmessage = (message) => {
			try { onEvent(JSON.parse(String(message.data)) as RealtimeEvent); } catch { /* Ignore malformed events. */ }
		};
		socket.onerror = () => onError?.();
		return () => socket.close(1000, 'Client closed');
	}
}

export const api = new EmberRootApiClient();
