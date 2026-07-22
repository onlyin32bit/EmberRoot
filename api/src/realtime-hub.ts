import { DurableObject } from 'cloudflare:workers';
import type { Bindings } from './bindings';

export interface RealtimeEvent {
	type: 'telemetry.created' | 'alert.created' | 'alert.updated' | 'node.updated';
	payload: Record<string, unknown>;
	sentAt: string;
}

export class RealtimeHub extends DurableObject<Bindings> {
	async fetch(request: Request): Promise<Response> {
		if (request.headers.get('Upgrade') !== 'websocket') return new Response('Expected WebSocket', { status: 426 });
		const pair = new WebSocketPair();
		const [client, server] = Object.values(pair);
		this.ctx.acceptWebSocket(server);
		server.serializeAttachment({ connectedAt: new Date().toISOString() });
		server.send(JSON.stringify({ type: 'connected', sentAt: new Date().toISOString() }));
		return new Response(null, { status: 101, webSocket: client });
	}

	publish(event: RealtimeEvent): void {
		const message = JSON.stringify(event);
		for (const socket of this.ctx.getWebSockets()) {
			try {
				socket.send(message);
			} catch {
				socket.close(1011, 'Unable to deliver event');
			}
		}
	}

	webSocketMessage(socket: WebSocket, message: ArrayBuffer | string): void {
		if (typeof message === 'string' && message === 'ping') socket.send('pong');
	}

	webSocketClose(socket: WebSocket, code: number, reason: string): void {
		socket.close(code, reason);
	}
}
