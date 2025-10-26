import type {
    ComponentSnapshot,
    Effects,
    UpdateCallback,
    LiveGoOptions,
    Update,
} from '../types';
import { LiveGoClient } from './client';
import { getEndpoint, getCredentials, getHeaders } from './config';

export class LiveGoComponent {
    private snapshot: ComponentSnapshot;
    private updateCallbacks: Set<UpdateCallback> = new Set();
    private readonly client: LiveGoClient;

    constructor(snapshot: ComponentSnapshot, options: LiveGoOptions = {}) {
        this.snapshot = snapshot;

        const endpoint = options.endpoint || getEndpoint();
        const credentials = options.credentials || getCredentials();
        const headers = options.headers || getHeaders();

        this.client = new LiveGoClient(endpoint, credentials, headers);
    }

    /**
     * Mount a component from the API (static factory method)
     */
    static async mount(
        componentName: string,
        props: Record<string, any> = {},
        options: LiveGoOptions = {}
    ): Promise<LiveGoComponent> {
        const endpoint = options.endpoint || getEndpoint();
        const credentials = options.credentials || getCredentials();
        const headers = options.headers || getHeaders();

        const client = new LiveGoClient(endpoint, credentials, headers);

        const response = await client.mount({
            component: componentName,
            props,
        });

        return new LiveGoComponent(response.snapshot, options);
    }

    /**
     * Get the current state
     */
    getState(): any {
        return this.snapshot.state;
    }

    /**
     * Get the component ID
     */
    getId(): string {
        return this.snapshot.memo.id;
    }

    /**
     * Get the component name
     */
    getName(): string {
        return this.snapshot.memo.name;
    }

    /**
     * Get the current snapshot (useful for debugging)
     */
    getSnapshot(): ComponentSnapshot {
        return this.snapshot;
    }

    /**
     * Call a method on the server component
     */
    async call(method: string, ...params: any[]): Promise<void> {
        return this.sendUpdates([
            {
                type: 'callMethod',
                payload: { method, params },
            },
        ]);
    }

    /**
     * Sync an input field to the server
     */
    async set(field: string, value: any): Promise<void> {
        return this.sendUpdates([
            {
                type: 'syncInput',
                payload: { field, value },
            },
        ]);
    }

    /**
     * Batch multiple operations together
     */
    async batch(operations: Array<{ type: 'call' | 'set'; [key: string]: any }>): Promise<void> {
        const updates: Update[] = operations.map((op) => {
            if (op.type === 'call') {
                return {
                    type: 'callMethod',
                    payload: {
                        method: op.method,
                        params: op.params || [],
                    },
                };
            } else {
                return {
                    type: 'syncInput',
                    payload: {
                        field: op.field,
                        value: op.value,
                    },
                };
            }
        });

        return this.sendUpdates(updates);
    }

    /**
     * Subscribe to state updates
     */
    onUpdate(callback: UpdateCallback): () => void {
        this.updateCallbacks.add(callback);

        // Return unsubscribe function
        return () => {
            this.updateCallbacks.delete(callback);
        };
    }

    /**
     * Remove all update listeners
     */
    clearListeners(): void {
        this.updateCallbacks.clear();
    }

    /**
     * Send updates to the server
     */
    private async sendUpdates(updates: Update[]): Promise<void> {
        const response = await this.client.update({
            snapshot: this.snapshot,
            updates,
        });

        this.snapshot = response.snapshot;
        this.notifyUpdate(response.snapshot.state, response.effects);
    }

    /**
     * Notify all subscribers of state change
     */
    private notifyUpdate(state: any, effects: Effects): void {
        this.updateCallbacks.forEach((callback) => {
            try {
                callback(state, effects);
            } catch (error) {
                console.error('Error in LiveGo update callback:', error);
            }
        });
    }
}