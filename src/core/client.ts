import type {
    ErrorResponse,
    MountRequest,
    MountResponse,
    UpdateRequest,
    UpdateResponse,
} from '../types';

export class LiveGoClient {
    private readonly endpoint: string;
    private readonly credentials: RequestCredentials;
    private readonly headers: Record<string, string>;

    constructor(
        endpoint: string = '/api/livego',
        credentials: RequestCredentials = 'include',
        headers: Record<string, string> = {}
    ) {
        this.endpoint = endpoint;
        this.credentials = credentials;
        this.headers = headers;
    }

    /**
     * Mount a component on the server
     */
    async mount(request: MountRequest): Promise<MountResponse> {
        const response = await this.fetch('/mount', {
            method: 'POST',
            body: JSON.stringify(request),
        });

        if (!response.ok) {
            throw await this.parseError(response);
        }

        return response.json();
    }

    /**
     * Send an update to the server
     */
    async update(request: UpdateRequest): Promise<UpdateResponse> {
        const response = await this.fetch('/update', {
            method: 'POST',
            body: JSON.stringify(request),
        });

        if (!response.ok) {
            throw await this.parseError(response);
        }

        return response.json();
    }

    /**
     * Internal fetch wrapper with common options
     */
    private async fetch(path: string, options: RequestInit = {}): Promise<Response> {
        const url = `${this.endpoint}${path}`;

        return fetch(url, {
            ...options,
            credentials: this.credentials,
            headers: {
                'Content-Type': 'application/json',
                ...this.headers,
                ...options.headers,
            },
        });
    }

    private async parseError(response: Response): Promise<ErrorResponse> {
        try {
            return await response.json();
        } catch {
            return {
                error: 'HTTP_ERROR',
                message: response.statusText || 'Unknown error',
                code: response.status,
            };
        }
    }
}