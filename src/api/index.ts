import type { ResponseError, ResponseSingle, ResponseMultiple } from "@/types/response";
import { isResponseError } from "@/types/response";

// ─── Constants ───────────────────────────────────────────────────────────────
const API_PATH = import.meta.env.VITE_BACKEND_API_PATH || "/api/v2";
const MAX_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 1000;
const REQUEST_TIMEOUT_MS = 10000;

// ─── Cache ────────────────────────────────────────────────────────────────────
interface CacheEntry<T> {
    data: T;
    expiresAt: number;
}

const cache = new Map<string, CacheEntry<unknown>>();
const DEFAULT_CACHE_TTL_MS = 30000; // 30 seconds

const getCached = <T>(key: string): T | null => {
    const entry = cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
        cache.delete(key);
        return null;
    }
    return entry.data as T;
};

const setCached = <T>(key: string, data: T, ttl = DEFAULT_CACHE_TTL_MS): void => {
    cache.set(key, { data, expiresAt: Date.now() + ttl });
};

export const clearCache = (): void => cache.clear();
export const invalidateCache = (key: string): void => { cache.delete(key); };

// ─── In-flight deduplication ──────────────────────────────────────────────────
const inFlight = new Map<string, Promise<unknown>>();

// ─── Error messages ───────────────────────────────────────────────────────────
const getErrorMessage = (status: number): string => {
    const messages: Record<number, string> = {
        400: "Bad request. Please check your input.",
        401: "Session expired. Please login again.",
        403: "You do not have permission to access this resource.",
        404: "The requested resource was not found.",
        408: "Request timed out. Please try again.",
        429: "Too many requests. Please slow down.",
        500: "Internal server error. Please try again later.",
        502: "Server is temporarily unavailable. Please try again.",
        503: "Service unavailable. Please try again later.",
        504: "Gateway timeout. Please try again.",
    };
    return messages[status] ?? `Unexpected error (${status}). Please try again.`;
};

// ─── Retry delay with exponential backoff + jitter ────────────────────────────
const getRetryDelay = (attempt: number): number => {
    const exponential = BASE_RETRY_DELAY_MS * Math.pow(2, attempt);
    const jitter = Math.random() * 500;
    return exponential + jitter;
};

// ─── Should we retry this error? ─────────────────────────────────────────────
const isRetryable = (status: number): boolean => {
    return [408, 429, 500, 502, 503, 504].includes(status);
};

// ─── Base fetch ───────────────────────────────────────────────────────────────
export const fetchFromBackend = async (
    path: string,
    options?: RequestInit,
    signal?: AbortSignal
): Promise<Response> => {
    const baseURL = import.meta.env.VITE_BACKEND_API_URL || "";

    const timeoutController = new AbortController();
    const timeoutId = setTimeout(
        () => timeoutController.abort(),
        REQUEST_TIMEOUT_MS
    );

    // Merge caller signal with timeout signal
    const combinedSignal = signal
        ? (AbortSignal as unknown as { any: (signals: AbortSignal[]) => AbortSignal }).any
            ? (AbortSignal as unknown as { any: (signals: AbortSignal[]) => AbortSignal }).any([signal, timeoutController.signal])
            : timeoutController.signal
        : timeoutController.signal;

    try {
        const res = await fetch(`${baseURL}${path}`, {
            ...options,
            credentials: "include",
            signal: combinedSignal,
        });
        return res;
    } finally {
        clearTimeout(timeoutId);
    }
};

// ─── Core request handler ─────────────────────────────────────────────────────
async function executeRequest<T>(
    path: string,
    req?: RequestInit,
    signal?: AbortSignal,
    useCache = false
): Promise<T | ResponseError> {
    const cacheKey = `${req?.method ?? "GET"}:${path}`;

    // Return cached response for GET requests
    if (useCache && (!req?.method || req.method === "GET")) {
        const cached = getCached<T>(cacheKey);
        if (cached) return cached;
    }

    // Deduplicate in-flight GET requests
    if (!req?.method || req.method === "GET") {
        const existing = inFlight.get(cacheKey);
        if (existing) return existing as Promise<T | ResponseError>;
    }

    let attempt = 0;

    const execute = async (): Promise<T | ResponseError> => {
        while (attempt < MAX_RETRIES) {
            try {
                if (signal?.aborted) {
                    return { detail: "Request was cancelled." };
                }

                const res = await fetchFromBackend(
                    `${API_PATH}${path}`,
                    req,
                    signal
                );

                // Non-retryable auth errors — return immediately
                if (res.status === 401) return { detail: getErrorMessage(401) };
                if (res.status === 403) return { detail: getErrorMessage(403) };

                // Retryable server errors
                if (!res.ok && isRetryable(res.status)) {
                    throw new Error(`Retryable error: ${res.status}`);
                }

                // Other non-ok responses
                if (!res.ok) {
                    return { detail: getErrorMessage(res.status) };
                }

                const data = await res.json() as T;

                // Cache successful GET responses
                if (useCache && (!req?.method || req.method === "GET")) {
                    setCached<T>(cacheKey, data);
                }

                return data;

            } catch (e) {
                if (signal?.aborted) {
                    return { detail: "Request was cancelled." };
                }

                attempt++;

                if (attempt >= MAX_RETRIES) {
                    return {
                        detail: "Network error. Please check your internet connection.",
                    };
                }

                await new Promise<void>(resolve =>
                    setTimeout(resolve, getRetryDelay(attempt))
                );
            }
        }

        return { detail: "Unknown error occurred." };
    };

    const promise = execute();

    if (!req?.method || req.method === "GET") {
        inFlight.set(cacheKey, promise);
        promise.finally(() => inFlight.delete(cacheKey));
    }

    return promise;
}

// ─── Public API ───────────────────────────────────────────────────────────────
export async function fetchAPIFromBackendSingleWithErrorHandling<T>(
    path: string,
    req?: RequestInit,
    signal?: AbortSignal,
    useCache = false
): Promise<ResponseSingle<T> | ResponseError> {
    const result = await executeRequest<ResponseSingle<T>>(path, req, signal, useCache);
    return result as ResponseSingle<T> | ResponseError;
}

export async function fetchAPIFromBackendMultipleWithErrorHandling<T>(
    path: string,
    req?: RequestInit,
    signal?: AbortSignal,
    useCache = false
): Promise<ResponseMultiple<T> | ResponseError> {
    const result = await executeRequest<ResponseMultiple<T>>(path, req, signal, useCache);
    return result as ResponseMultiple<T> | ResponseError;
}

// ─── HTTP method helpers ──────────────────────────────────────────────────────
export const api = {
    get: <T>(path: string, signal?: AbortSignal, useCache = false) =>
        fetchAPIFromBackendSingleWithErrorHandling<T>(path, { method: "GET" }, signal, useCache),

    post: <T>(path: string, body: unknown, signal?: AbortSignal) =>
        fetchAPIFromBackendSingleWithErrorHandling<T>(
            path,
            { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
            signal
        ),

    put: <T>(path: string, body: unknown, signal?: AbortSignal) =>
        fetchAPIFromBackendSingleWithErrorHandling<T>(
            path,
            { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
            signal
        ),

    patch: <T>(path: string, body: unknown, signal?: AbortSignal) =>
        fetchAPIFromBackendSingleWithErrorHandling<T>(
            path,
            { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
            signal
        ),

    delete: <T>(path: string, signal?: AbortSignal) =>
        fetchAPIFromBackendSingleWithErrorHandling<T>(path, { method: "DELETE" }, signal),
};

export { isResponseError };