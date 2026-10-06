/**
 * Server-side JSON fetching for content adapters: timeout, one retry on
 * network errors and 5xx, typed errors. Never imported by client scripts.
 */

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export class HttpError extends Error {
	constructor(
		message: string,
		readonly status?: number,
	) {
		super(message);
		this.name = 'HttpError';
	}
}

interface FetchJsonOptions {
	headers?: Record<string, string>;
	timeoutMs?: number;
	retries?: number;
	fetchImpl?: FetchLike;
}

export async function fetchJson<T>(url: string, options: FetchJsonOptions = {}): Promise<T> {
	const { headers = {}, timeoutMs = 8000, retries = 1, fetchImpl = fetch } = options;
	let lastError: unknown;

	for (let attempt = 0; attempt <= retries; attempt++) {
		try {
			const response = await fetchImpl(url, {
				headers: { Accept: 'application/json', ...headers },
				signal: AbortSignal.timeout(timeoutMs),
			});
			if (response.ok) return (await response.json()) as T;

			const error = new HttpError(`HTTP ${response.status} for ${redact(url)}`, response.status);
			if (response.status < 500) throw error; // client errors are not retried
			lastError = error;
		} catch (error) {
			if (error instanceof HttpError && error.status !== undefined && error.status < 500) throw error;
			lastError = error;
		}
	}

	throw lastError instanceof Error ? lastError : new HttpError(`Request failed for ${redact(url)}`);
}

/** Strip query strings from URLs before they reach logs. */
export function redact(url: string): string {
	return url.split('?')[0] ?? url;
}
