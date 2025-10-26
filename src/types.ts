export interface ErrorResponse {
    error: string;
    message: string;
    code: number;
    details?: Record<string, any>;
}

export interface ComponentSnapshot {
    state: Record<string, any>;
    memo: ComponentMemo;
    checksum: string;
}

export interface ComponentMemo {
    id: string;
    name: string;
    path: string;
    method: string;
    children: string[];
    data: Record<string, any>;
}

export interface Effects {
    dirty: string[];
    dispatches: Record<string, any>[];
    redirects: string | null;
    html: string | null;
}

export interface UpdateResponse {
    snapshot: ComponentSnapshot;
    effects: Effects;
}

export interface MountResponse {
    snapshot: ComponentSnapshot;
}

export interface MountRequest {
    component: string;
    props: Record<string, any>;
}

export interface UpdateRequest {
    snapshot: ComponentSnapshot;
    updates: Update[];
}

export interface Update {
    type: 'callMethod' | 'syncInput';
    payload: {
        method?: string;
        params?: any[];
        field?: string;
        value?: any;
    };
}

export type UpdateCallback = (state: any, effects: Effects) => void;

export interface LiveGoOptions {
    endpoint?: string;
    credentials?: RequestCredentials;
    headers?: Record<string, string>;
}

export interface StreamEvent<T = any> {
    event: string;
    data: T;
    id?: string;
}

export interface StreamOptions {
    endpoint?: string;
    onEvent?: (event: StreamEvent) => void;
    onError?: (error: Error) => void;
    onConnect?: () => void;
    onDisconnect?: () => void;
    reconnect?: boolean;
    reconnectInterval?: number;
}

export type ComponentTypes = {
    [key: string]: ComponentType;
}

export type ComponentType = {
    state: Record<string, any>;
    actions: Record<string, (...args: any[]) => Promise<any>>;
}