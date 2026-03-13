import { useState, useEffect, useCallback, useRef } from "react";
import type { ApiState } from "@/types/response";
import { isResponseError } from "@/types/response";
import {
    fetchAPIFromBackendSingleWithErrorHandling,
    fetchAPIFromBackendMultipleWithErrorHandling,
} from "@/api";

// ─── Single resource hook ─────────────────────────────────────────────────────

interface UseAPIOptions {
    enabled?: boolean;
    useCache?: boolean;
}

export function useAPI<T>(
    path: string | null,
    req?: RequestInit,
    options: UseAPIOptions = {}
): ApiState<T> & { refetch: () => void } {
    const { enabled = true, useCache = false } = options;

    const [state, setState] = useState<ApiState<T>>({
        data: null,
        isLoading: false,
        error: null,
    });

    const abortRef = useRef<AbortController | null>(null);

    const fetchData = useCallback(async () => {
        if (!path) return;

        abortRef.current?.abort();
        abortRef.current = new AbortController();

        setState(prev => ({ ...prev, isLoading: true, error: null }));

        const result = await fetchAPIFromBackendSingleWithErrorHandling<T>(
            path,
            req,
            abortRef.current.signal,
            useCache
        );

        if (abortRef.current.signal.aborted) return;

        if (isResponseError(result)) {
            setState({ data: null, isLoading: false, error: result.detail });
        } else {
            setState({ data: result.data, isLoading: false, error: null });
        }
    }, [path, req, useCache]);

    useEffect(() => {
        if (!enabled || !path) return;
        fetchData();
        return () => { abortRef.current?.abort(); };
    }, [fetchData, enabled, path]);

    return { ...state, refetch: fetchData };
}

// ─── Multiple resources hook ──────────────────────────────────────────────────

export function useAPIList<T>(
    path: string | null,
    req?: RequestInit,
    options: UseAPIOptions = {}
): ApiState<T[]> & { total: number; refetch: () => void } {
    const { enabled = true, useCache = false } = options;

    const [state, setState] = useState<ApiState<T[]>>({
        data: null,
        isLoading: false,
        error: null,
    });
    const [total, setTotal] = useState<number>(0);
    const abortRef = useRef<AbortController | null>(null);

    const fetchData = useCallback(async () => {
        if (!path) return;

        abortRef.current?.abort();
        abortRef.current = new AbortController();

        setState(prev => ({ ...prev, isLoading: true, error: null }));

        const result = await fetchAPIFromBackendMultipleWithErrorHandling<T>(
            path,
            req,
            abortRef.current.signal,
            useCache
        );

        if (abortRef.current.signal.aborted) return;

        if (isResponseError(result)) {
            setState({ data: null, isLoading: false, error: result.detail });
        } else {
            setState({ data: result.data, isLoading: false, error: null });
            setTotal(result.total);
        }
    }, [path, req, useCache]);

    useEffect(() => {
        if (!enabled || !path) return;
        fetchData();
        return () => { abortRef.current?.abort(); };
    }, [fetchData, enabled, path]);

    return { ...state, total, refetch: fetchData };
}

// ─── Mutation hook (POST / PUT / PATCH / DELETE) ──────────────────────────────

interface MutationState<T> {
    data: T | null;
    isLoading: boolean;
    error: string | null;
}

interface UseMutationOptions<T> {
    onSuccess?: (data: T) => void;
    onError?: (error: string) => void;
}

export function useMutation<TData, TBody = unknown>(
    path: string,
    method: "POST" | "PUT" | "PATCH" | "DELETE" = "POST",
    options: UseMutationOptions<TData> = {}
): MutationState<TData> & { mutate: (body?: TBody) => Promise<void> } {
    const [state, setState] = useState<MutationState<TData>>({
        data: null,
        isLoading: false,
        error: null,
    });

    const abortRef = useRef<AbortController | null>(null);

    const mutate = useCallback(async (body?: TBody) => {
        abortRef.current?.abort();
        abortRef.current = new AbortController();

        setState({ data: null, isLoading: true, error: null });

        const req: RequestInit = {
            method,
            headers: body ? { "Content-Type": "application/json" } : undefined,
            body: body ? JSON.stringify(body) : undefined,
        };

        const result = await fetchAPIFromBackendSingleWithErrorHandling<TData>(
            path,
            req,
            abortRef.current.signal
        );

        if (abortRef.current.signal.aborted) return;

        if (isResponseError(result)) {
            setState({ data: null, isLoading: false, error: result.detail });
            options.onError?.(result.detail);
        } else {
            setState({ data: result.data, isLoading: false, error: null });
            options.onSuccess?.(result.data);
        }
    }, [path, method]);

    useEffect(() => {
        return () => { abortRef.current?.abort(); };
    }, []);

    return { ...state, mutate };
}

export default useAPI;