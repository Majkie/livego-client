let globalEndpoint = '/api/livego';
let globalCredentials: RequestCredentials = 'include';
let globalHeaders: Record<string, string> = {};

export function configureEndpoint(endpoint: string): void {
    globalEndpoint = endpoint;
}

export function getEndpoint(): string {
    return globalEndpoint;
}

export function configureCredentials(credentials: RequestCredentials): void {
    globalCredentials = credentials;
}

export function getCredentials(): RequestCredentials {
    return globalCredentials;
}

export function configureHeaders(headers: Record<string, string>): void {
    globalHeaders = { ...headers };
}

export function getHeaders(): Record<string, string> {
    return { ...globalHeaders };
}

export function configure(options: {
    endpoint?: string;
    credentials?: RequestCredentials;
    headers?: Record<string, string>;
}): void {
    if (options.endpoint) configureEndpoint(options.endpoint);
    if (options.credentials) configureCredentials(options.credentials);
    if (options.headers) configureHeaders(options.headers);
}