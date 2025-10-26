import { useState, useEffect, useCallback, useRef } from 'react';
import { LiveGoComponent } from '../core/component';
import type {
    Effects,
    ErrorResponse,
    ComponentSnapshot,
    LiveGoOptions
} from '../types';

export interface UseLiveGoOptions extends LiveGoOptions {
    autoMount?: boolean;
}

export interface UseLiveGoReturn {
    state: Record<string, any>;
    effects: Effects | null;
    isMounted: boolean;
    isLoading: boolean;
    error: ErrorResponse | null;
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
    const [state, setState] = useState<Record<string, any>>({});
    const [effects, setEffects] = useState<Effects | null>(null);
    const [isMounted, setIsMounted] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<ErrorResponse | null>(null);

    const livegoRef = useRef<LiveGoComponent | null>(null);
    const unsubscribeRef = useRef<(() => void) | null>(null);

    // Stable options reference (only changes if options object changes)
    const optionsRef = useRef(options);
    optionsRef.current = options;

    /**
     * Mount the component from server
     */
    const mount = useCallback(async () => {
        // Cleanup previous instance if exists
        if (unsubscribeRef.current) {
            unsubscribeRef.current();
            unsubscribeRef.current = null;
        }

        setIsLoading(true);
        setError(null);
        setIsMounted(false);

        try {
            const instance = await LiveGoComponent.mount(
                componentName,
                props,
                optionsRef.current
            );
            livegoRef.current = instance;

            // Initialize state
            setState(instance.getState());
            setIsMounted(true);

            // Subscribe to updates
            unsubscribeRef.current = instance.onUpdate((newState, newEffects) => {
                setState(newState);
                setEffects(newEffects);
            });
        } catch (e) {
            setError(e as ErrorResponse);
            throw e;
        } finally {
            setIsLoading(false);
        }
    }, [componentName]); // Only remount if component name changes

    /**
     * Remount with same props
     */
    const remount = useCallback(() => {
        return mount();
    }, [mount]);

    /**
     * Call a method on the server component
     */
    const call = useCallback(async (method: string, ...params: any[]) => {
        if (!livegoRef.current) {
            const err = new Error('LiveGo component not mounted');
            setError(err as any);
            throw err;
        }

        try {
            setError(null);
            return await livegoRef.current.call(method, ...params);
        } catch (e) {
            setError(e as ErrorResponse);
            throw e;
        }
    }, []);

    /**
     * Sync an input field to the server
     */
    const set = useCallback(async (field: string, value: any) => {
        if (!livegoRef.current) {
            const err = new Error('LiveGo component not mounted');
            setError(err as any);
            throw err;
        }

        try {
            setError(null);
            return await livegoRef.current.set(field, value);
        } catch (e) {
            setError(e as ErrorResponse);
            throw e;
        }
    }, []);

    /**
     * Batch multiple operations
     */
    const batch = useCallback(async (operations: Array<{ type: 'call' | 'set'; [key: string]: any }>) => {
        if (!livegoRef.current) {
            const err = new Error('LiveGo component not mounted');
            setError(err as any);
            throw err;
        }

        try {
            setError(null);
            return await livegoRef.current.batch(operations);
        } catch (e) {
            setError(e as ErrorResponse);
            throw e;
        }
    }, []);

    /**
     * Get current snapshot
     */
    const getSnapshot = useCallback(() => {
        return livegoRef.current?.getSnapshot();
    }, []);

    /**
     * Get component ID
     */
    const getId = useCallback(() => {
        return livegoRef.current?.getId();
    }, []);

    /**
     * Get component name
     */
    const getName = useCallback(() => {
        return livegoRef.current?.getName();
    }, []);

    // Auto-mount on component mount if requested
    useEffect(() => {
        if (options.autoMount) {
            mount();
        }

        // Cleanup on unmount
        return () => {
            if (unsubscribeRef.current) {
                unsubscribeRef.current();
            }
            if (livegoRef.current) {
                livegoRef.current.clearListeners();
            }
        };
    }, [mount, options.autoMount]);

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

export { configure, configureEndpoint, configureCredentials, configureHeaders } from '../core/config';
export { LiveGoComponent } from '../core/component';
export type {
    ErrorResponse,
    ComponentSnapshot,
    Effects,
    LiveGoOptions
} from '../types';