import type { ApiAlert, ApiEnvelope, ApiNode, ApiRegion, ApiTelemetry, AuthSession, RealtimeEvent } from './types';
import { PUBLIC_API_BASE_URL } from '$env/static/public';

const TOKEN_KEY = 'emberroot.admin-token';
const API_BASE_URL = PUBLIC_API_BASE_URL?.replace(/\/$/u, '') || 'http://localhost:8787';

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

	// Regions
	getRegions(): Promise<ApiRegion[]> { return this.request('/api/regions'); }
	getRegion(id: string): Promise<ApiRegion & { nodes: ApiNode[] }> {
		return this.request(`/api/regions/${encodeURIComponent(id)}`);
	}

	// Nodes
	getNodes(regionId?: string): Promise<ApiNode[]> {
		return this.request(`/api/nodes${regionId ? `?regionId=${encodeURIComponent(regionId)}` : ''}`);
	}
	getNode(id: string): Promise<ApiNode> {
		return this.request(`/api/nodes/${encodeURIComponent(id)}`);
	}

	// Telemetry
	getTelemetry(nodeId: string, options?: { limit?: number; from?: string; to?: string }): Promise<ApiTelemetry[]> {
		const params = new URLSearchParams();
		if (options?.limit) params.set('limit', String(options.limit));
		if (options?.from) params.set('from', options.from);
		if (options?.to) params.set('to', options.to);
		const query = params.toString() ? `?${params.toString()}` : '';
		return this.request(`/api/nodes/${encodeURIComponent(nodeId)}/telemetry${query}`);
	}

	// Alerts
	getAlerts(options?: { state?: ApiAlert['state']; nodeId?: string; limit?: number }): Promise<ApiAlert[]> {
		const params = new URLSearchParams();
		if (options?.state) params.set('state', options.state);
		if (options?.nodeId) params.set('nodeId', options.nodeId);
		if (options?.limit) params.set('limit', String(options.limit));
		const query = params.toString() ? `?${params.toString()}` : '';
		return this.request(`/api/alerts${query}`);
	}
	acknowledgeAlert(id: string): Promise<{ id: string; state: string }> {
		return this.request(`/api/alerts/${encodeURIComponent(id)}/acknowledge`, { method: 'POST' });
	}

	// Admin
	isAuthenticated(): boolean {
		return this.token !== null;
	}
	getAdminNodes(): Promise<ApiNode[]> {
		return this.request('/api/admin/nodes');
	}
	createAdminNode(data: { id: string; name: string; regionId: string; nodeType: string; latitude?: number; longitude?: number }): Promise<{ id: string }> {
		return this.request('/api/admin/nodes', {
			method: 'POST',
			body: JSON.stringify(data)
		});
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
