import { getEndpoint } from './config';
import {StreamEvent, StreamOptions} from "../types";

export class LiveGoStream {
    private eventSource: EventSource | null = null;
    private reconnectTimeout: number | null = null;
    private listeners = new Map<string, Set<(data: any) => void>>();
    private readonly componentId: string;
    private readonly signature: string;
    private readonly baseUrl: string;
    private options: StreamOptions;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;

    constructor(
        componentId: string,
        signature: string,
        options: StreamOptions = {}
    ) {
        this.componentId = componentId;
        this.signature = signature;
        this.baseUrl = options.endpoint || getEndpoint();
        this.options = {
            reconnect: true,
            reconnectInterval: 1000,
            ...options,
        };
    }

    connect(): void {
        if (this.eventSource) {
            return; // Already connected
        }

        const url = `${this.baseUrl}/livego/stream?component_id=${this.componentId}&signature=${this.signature}`;
        this.eventSource = new EventSource(url);

        this.eventSource.onopen = () => {
            this.reconnectAttempts = 0;
            this.options.onConnect?.();
        };

        this.eventSource.onerror = (error) => {
            console.error('SSE connection error:', error);
            this.options.onError?.(new Error('SSE connection error'));

            if (this.options.reconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
                this.reconnectAttempts++;
                this.reconnectTimeout = window.setTimeout(() => {
                    this.disconnect();
                    this.connect();
                }, this.options.reconnectInterval! * Math.pow(2, this.reconnectAttempts - 1));
            } else {
                this.disconnect();
            }
        };

        this.eventSource.onmessage = (event) => {
            this.handleMessage(event);
        };

        // Listen for custom events
        this.setupEventListeners();
    }

    private setupEventListeners(): void {
        if (!this.eventSource) return;

        // Standard events (TODO: We should probably let the user define these)
        const eventTypes = ['connected', 'text-chunk', 'progress', 'notification', 'generation-complete', 'upload-complete'];

        eventTypes.forEach((eventType) => {
            this.eventSource!.addEventListener(eventType, (event: MessageEvent) => {
                this.handleMessage(event, eventType);
            });
        });
    }

    private handleMessage(event: MessageEvent, eventType?: string): void {
        try {
            const data = JSON.parse(event.data);
            const streamEvent: StreamEvent = {
                event: eventType || 'message',
                data,
                id: event.lastEventId,
            };

            // Call global handler
            this.options.onEvent?.(streamEvent);

            // Call specific event listeners
            const listeners = this.listeners.get(streamEvent.event);
            if (listeners) {
                listeners.forEach((callback) => callback(streamEvent.data));
            }
        } catch (error) {
            console.error('Failed to parse SSE message:', error);
        }
    }

    on<T = any>(event: string, callback: (data: T) => void): () => void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }

        this.listeners.get(event)!.add(callback);

        // Return unsubscribe function
        return () => {
            const listeners = this.listeners.get(event);
            if (listeners) {
                listeners.delete(callback);
                if (listeners.size === 0) {
                    this.listeners.delete(event);
                }
            }
        };
    }

    off(event: string, callback?: (data: any) => void): void {
        if (callback) {
            this.listeners.get(event)?.delete(callback);
        } else {
            this.listeners.delete(event);
        }
    }

    disconnect(): void {
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }

        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
            this.options.onDisconnect?.();
        }

        this.listeners.clear();
    }

    isConnected(): boolean {
        return this.eventSource !== null && this.eventSource.readyState === EventSource.OPEN;
    }
}