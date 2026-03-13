import type { ResponseError, ResponseSingle } from "@/types/response";

// ─── Config ───────────────────────────────────────────────────────────────────

const API_PATH = import.meta.env.VITE_BACKEND_API_PATH || "/api/v2";
const BASE_URL = import.meta.env.VITE_BACKEND_API_URL || "";

// ─── Types ────────────────────────────────────────────────────────────────────

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD";

export interface FetchOptions extends Omit<RequestInit, "method"> {
    method?: HttpMethod;
    timeout?: number;
    retries?: number;
    retryDelay?: number;
    signal?: AbortSignal;
}

export interface ApiRequestOptions extends FetchOptions {
    params?: Record<string, string | number | boolean | undefined | null>;
}

// ─── Errors ───────────────────────────────────────────────────────────────────

export class ApiError extends Error {
    readonly status: number;
    readonly statusText: string;
    readonly detail: string;
    readonly url: string;
    readonly requestId: string | undefined;

    constructor(
        status: number,
        statusText: string,
        detail: string,
        url: string,
        requestId?: string
    ) {
        super(`[${status}] ${statusText}: ${detail}`);
        this.name = "ApiError";
        this.status = status;
        this.statusText = statusText;
        this.detail = detail;
        this.url = url;
        this.requestId = requestId;
    }
}

export class NetworkError extends Error {
    readonly cause: unknown;
    readonly url: string;

    constructor(cause: unknown, url: string) {
        super(`Network request failed: ${url}`);
        this.name = "NetworkError";
        this.cause = cause;
        this.url = url;
    }
}

export class TimeoutError extends Error {
    readonly url: string;
    readonly timeoutMs: number;

    constructor(url: string, timeoutMs: number) {
        super(`Request timed out after ${timeoutMs}ms: ${url}`);
        this.name = "TimeoutError";
        this.url = url;
        this.timeoutMs = timeoutMs;
    }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildURL(
    path: string,
    params?: ApiRequestOptions["params"]
): string {
    const url = `${BASE_URL}${API_PATH}${path}`;
    if (!params) return url;

    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) {
            searchParams.set(key, String(value));
        }
    }
    const qs = searchParams.toString();
    return qs ? `${url}?${qs}` : url;
}

function mergeSignals(...signals: (AbortSignal | undefined)[]): AbortSignal {
    const defined = signals.filter(Boolean) as AbortSignal[];
    if (defined.length === 0) return new AbortController().signal;
    if (defined.length === 1) return defined[0];
    const controller = new AbortController();
    for (const signal of defined) {
        if (signal.aborted) {
            controller.abort(signal.reason);
            break;
        }
        signal.addEventListener("abort", () => controller.abort(signal.reason), {
            once: true,
        });
    }
    return controller.signal;
}

function isRetryable(status: number): boolean {
    return status === 429 || status === 502 || status === 503 || status === 504;
}

function getRetryDelay(attempt: number, baseDelay: number): number {
    return Math.min(baseDelay * Math.pow(2, attempt) + Math.random() * 200, 30_000);
}

async function parseErrorDetail(res: Response): Promise<string> {
    try {
        const body = await res.clone().json();
        return body?.detail ?? body?.message ?? res.statusText;
    } catch {
        try {
            const text = await res.clone().text();
            return text || res.statusText;
        } catch {
            return res.statusText;
        }
    }
}

// ─── Core fetch ───────────────────────────────────────────────────────────────

export async function fetchFromBackend(
    path: string,
    options: FetchOptions = {}
): Promise<Response> {
    const {
        timeout = 30_000,
        retries = 0,
        retryDelay = 500,
        signal: callerSignal,
        ...fetchInit
    } = options;

    const url = `${BASE_URL}${path}`;
    let attempt = 0;

    while (true) {
        const timeoutController = new AbortController();
        const timeoutId = setTimeout(
            () => timeoutController.abort(new TimeoutError(url, timeout)),
            timeout
        );

        const signal = mergeSignals(callerSignal, timeoutController.signal);

        try {
            const res = await fetch(url, {
                credentials: "include",
                ...fetchInit,
                signal,
            });

            clearTimeout(timeoutId);

            if (!res.ok && isRetryable(res.status) && attempt < retries) {
                const delay = getRetryDelay(attempt, retryDelay);
                await new Promise((resolve) => setTimeout(resolve, delay));
                attempt++;
                continue;
            }

            return res;
        } catch (err) {
            clearTimeout(timeoutId);

            if (err instanceof TimeoutError) throw err;
            if ((err as Error)?.name === "AbortError") {
                if (timeoutController.signal.aborted) {
                    throw new TimeoutError(url, timeout);
                }
                throw err;
            }

            if (attempt < retries) {
                const delay = getRetryDelay(attempt, retryDelay);
                await new Promise((resolve) => setTimeout(resolve, delay));
                attempt++;
                continue;
            }

            throw new NetworkError(err, url);
        }
    }
}

// ─── Typed API request ────────────────────────────────────────────────────────

export async function fetchAPI<T>(
    path: string,
    options: ApiRequestOptions = {}
): Promise<ResponseSingle<T> | ResponseError> {
    const { params, ...fetchOptions } = options;
    const url = buildURL(path, params);
    const rawPath = url.replace(BASE_URL, "");

    try {
        const res = await fetchFromBackend(rawPath, fetchOptions);
        const requestId = res.headers.get("x-request-id") ?? undefined;

        if (!res.ok) {
            const detail = await parseErrorDetail(res);
            throw new ApiError(res.status, res.statusText, detail, url, requestId);
        }

        if (res.status === 204) {
            return {} as ResponseSingle<T>;
        }

        const data = await res.json() as ResponseSingle<T>;
        return data;
    } catch (err) {
        if (err instanceof ApiError)    return { detail: err.detail };
        if (err instanceof TimeoutError) return { detail: "Request timed out. Please try again." };
        if (err instanceof NetworkError) return { detail: "Network error. Check your connection and try again." };
        return { detail: (err as Error)?.message ?? "An unexpected error occurred." };
    }
}

// ─── Convenience wrappers ─────────────────────────────────────────────────────

export const api = {
    get<T>(path: string, options?: ApiRequestOptions) {
        return fetchAPI<T>(path, { ...options, method: "GET" });
    },
    post<T>(path: string, body: unknown, options?: ApiRequestOptions) {
        return fetchAPI<T>(path, {
            ...options,
            method: "POST",
            body: JSON.stringify(body),
            headers: { "Content-Type": "application/json", ...options?.headers },
        });
    },
    put<T>(path: string, body: unknown, options?: ApiRequestOptions) {
        return fetchAPI<T>(path, {
            ...options,
            method: "PUT",
            body: JSON.stringify(body),
            headers: { "Content-Type": "application/json", ...options?.headers },
        });
    },
    patch<T>(path: string, body: unknown, options?: ApiRequestOptions) {
        return fetchAPI<T>(path, {
            ...options,
            method: "PATCH",
            body: JSON.stringify(body),
            headers: { "Content-Type": "application/json", ...options?.headers },
        });
    },
    delete<T>(path: string, options?: ApiRequestOptions) {
        return fetchAPI<T>(path, { ...options, method: "DELETE" });
    },
} as const;

// ─── Type guard ───────────────────────────────────────────────────────────────

export function isResponseError( 
    res: ResponseSingle<unknown> | ResponseError
): res is ResponseError {
    return typeof (res as ResponseError).detail === "string";
}

// ─── Legacy compat ────────────────────────────────────────────────────────────

/** @deprecated Use `fetchAPI<T>` instead */
export async function fetchAPIFromBackendSingleWithErrorHandling<T>(
    path: string,
    req?: RequestInit
): Promise<ResponseSingle<T> | ResponseError> {
    const { signal, method, ...rest } = req ?? {};
    return fetchAPI<T>(path, {
        ...rest,
        method: method as HttpMethod | undefined,
        signal: signal ?? undefined,
    });
}