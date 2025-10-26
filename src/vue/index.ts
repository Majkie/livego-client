import {ref, reactive, onUnmounted, type Ref, computed, onMounted} from 'vue';
import { LiveGoComponent } from '../core/component';
import type {
    Effects,
    ErrorResponse,
    ComponentSnapshot,
    LiveGoOptions,
    StreamEvent,
} from '../types';
import {LiveGoStream} from "../core/stream";

export interface UseLiveGoOptions extends LiveGoOptions {
    autoMount?: boolean;
}

export interface LiveGoStreamOptions {
    autoConnect?: boolean;
    onTextChunk?: (chunk: string, done: boolean) => void;
    onProgress?: (current: number, total: number, message: string) => void;
    onEvent?: (event: StreamEvent) => void;
}

export interface UseLiveGoReturn {
    state: Record<string, any>;
    effects: Ref<Effects | null>;
    isMounted: Ref<boolean>;
    isLoading: Ref<boolean>;
    error: Ref<ErrorResponse | null>;
    mount: () => Promise<void>;
    remount: () => Promise<void>;
    call: (method: string, ...params: any[]) => Promise<void>;
    set: (field: string, value: any) => Promise<void>;
    batch: (operations: Array<{ type: 'call' | 'set'; [key: string]: any }>) => Promise<void>;
    getSnapshot: () => ComponentSnapshot | undefined;
    getId: () => string | undefined;
    getName: () => string | undefined;
}

export function useLiveGo(
    componentName: string,
    props: Record<string, any> = {},
    options: UseLiveGoOptions = {}
): UseLiveGoReturn {
    const state = reactive<Record<string, any>>({});
    const effects = ref<Effects | null>(null);
    const livego = ref<LiveGoComponent | null>(null);
    const isMounted = ref(false);
    const isLoading = ref(false);
    const error = ref<ErrorResponse | null>(null);

    let unsubscribe: (() => void) | null = null;

    /**
     * Mount the component from server
     */
    async function mount() {
        // Cleanup previous instance if exists
        if (unsubscribe) {
            unsubscribe();
            unsubscribe = null;
        }

        isLoading.value = true;
        error.value = null;
        isMounted.value = false;

        try {
            const instance = await LiveGoComponent.mount(componentName, props, options);
            livego.value = instance;

            // Initialize state reactively
            Object.assign(state, instance.getState());
            isMounted.value = true;

            // Subscribe to updates
            unsubscribe = instance.onUpdate((newState, newEffects) => {
                // Replace state reactively
                const keys = Object.keys(state);
                for (const key of keys) {
                    delete state[key];
                }
                Object.assign(state, newState);
                effects.value = newEffects;
            });
        } catch (e) {
            error.value = e as ErrorResponse;
            throw e;
        } finally {
            isLoading.value = false;
        }
    }

    /**
     * Remount with same props
     */
    async function remount() {
        return mount();
    }

    /**
     * Call a method on the server component
     */
    async function call(method: string, ...params: any[]) {
        if (!livego.value) {
            const err = new Error('LiveGo component not mounted');
            error.value = err as any;
            throw err;
        }

        try {
            error.value = null;
            return await livego.value.call(method, ...params);
        } catch (e) {
            error.value = e as ErrorResponse;
            throw e;
        }
    }

    /**
     * Sync an input field to the server
     */
    async function set(field: string, value: any) {
        if (!livego.value) {
            const err = new Error('LiveGo component not mounted');
            error.value = err as any;
            throw err;
        }

        try {
            error.value = null;
            return await livego.value.set(field, value);
        } catch (e) {
            error.value = e as ErrorResponse;
            throw e;
        }
    }

    /**
     * Batch multiple operations
     */
    async function batch(operations: Array<{ type: 'call' | 'set'; [key: string]: any }>) {
        if (!livego.value) {
            const err = new Error('LiveGo component not mounted');
            error.value = err as any;
            throw err;
        }

        try {
            error.value = null;
            return await livego.value.batch(operations);
        } catch (e) {
            error.value = e as ErrorResponse;
            throw e;
        }
    }

    /**
     * Get current snapshot
     */
    function getSnapshot() {
        return livego.value?.getSnapshot();
    }

    /**
     * Get component ID
     */
    function getId() {
        return livego.value?.getId();
    }

    /**
     * Get component name
     */
    function getName() {
        return livego.value?.getName();
    }

    // Auto-mount if requested
    if (options.autoMount) {
        mount();
    }

    // Cleanup on unmount
    onUnmounted(() => {
        if (unsubscribe) {
            unsubscribe();
        }
        if (livego.value) {
            livego.value.clearListeners();
        }
    });

    return {
        state,
        effects,
        isMounted,
        isLoading,
        error,
        mount,
        remount,
        call,
        set,
        batch,
        getSnapshot,
        getId,
        getName,
    };
}

export function useLiveGoStream(
    componentId: string,
    signature: string,
    options: LiveGoStreamOptions = {}
) {
    const stream = ref<LiveGoStream | null>(null);
    const isConnected = ref(false);
    const streamedText = ref('');
    const progress = ref({ current: 0, total: 0, message: '' });
    const events = ref<StreamEvent[]>([]);

    const connect = () => {
        if (stream.value) return;

        stream.value = new LiveGoStream(componentId, signature, {
            onConnect: () => {
                isConnected.value = true;
            },
            onDisconnect: () => {
                isConnected.value = false;
            },
            onEvent: (event) => {
                events.value.push(event);
                options.onEvent?.(event);
            },
        });

        // Handle text chunks
        stream.value.on('text-chunk', (data: { chunk: string; done: boolean }) => {
            if (!data.done) {
                streamedText.value += data.chunk;
            }
            options.onTextChunk?.(data.chunk, data.done);
        });

        // Handle progress
        stream.value.on('progress', (data: { current: number; total: number; message: string }) => {
            progress.value = data;
            options.onProgress?.(data.current, data.total, data.message);
        });

        stream.value.connect();
    };

    const disconnect = () => {
        stream.value?.disconnect();
        stream.value = null;
        isConnected.value = false;
    };

    const on = <T = any>(event: string, callback: (data: T) => void) => {
        return stream.value?.on(event, callback);
    };

    const clearStreamedText = () => {
        streamedText.value = '';
    };

    if (options.autoConnect) {
        onMounted(connect);
    }

    onUnmounted(() => {
        disconnect();
    });

    return {
        stream,
        isConnected: computed(() => isConnected.value),
        streamedText: computed(() => streamedText.value),
        progress: computed(() => progress.value),
        events: computed(() => events.value),
        connect,
        disconnect,
        on,
        clearStreamedText,
    };
}

export { configure, configureEndpoint, configureCredentials, configureHeaders } from '../core/config';
export { LiveGoComponent } from '../core/component';
export type {
    ErrorResponse,
    ComponentSnapshot,
    Effects,
    LiveGoOptions
} from '../types';