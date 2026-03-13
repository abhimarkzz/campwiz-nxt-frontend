import { useState, useEffect, useCallback, useRef } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PermissionName =
    | "accelerometer"
    | "ambient-light-sensor"
    | "background-fetch"
    | "background-sync"
    | "bluetooth"
    | "camera"
    | "clipboard-read"
    | "clipboard-write"
    | "display-capture"
    | "gamepad"
    | "geolocation"
    | "gyroscope"
    | "idle-detection"
    | "local-fonts"
    | "magnetometer"
    | "microphone"
    | "midi"
    | "nfc"
    | "notifications"
    | "payment-handler"
    | "periodic-background-sync"
    | "persistent-storage"
    | "push"
    | "screen-wake-lock"
    | "speaker-selection"
    | "storage-access"
    | "system-wake-lock"
    | "top-level-storage-access"
    | "window-management"
    | "xr-spatial-tracking";

export type PermissionState =
    | "granted"
    | "denied"
    | "prompt"
    | "unsupported"
    | "error";

export interface PermissionSnapshot {
    state: PermissionState;
    timestamp: number;
    /** Milliseconds spent in the previous state */
    durationMs: number;
}

export interface UsePermissionOptions {
    /** Subscribe to live permission changes — defaults to true */
    watch?: boolean;
    /** Called when permission transitions to "granted" */
    onGranted?: () => void;
    /** Called when permission transitions to "denied" */
    onDenied?: () => void;
    /** Called when permission transitions to "prompt" */
    onPrompt?: () => void;
    /** Called on any query or runtime error */
    onError?: (error: Error) => void;
    /** Called on every state transition */
    onStateChange?: (prev: PermissionState, next: PermissionState) => void;
    /** Max history entries retained — defaults to 50 */
    maxHistory?: number;
}

export interface UsePermissionReturn {
    state: PermissionState;
    isGranted: boolean;
    isDenied: boolean;
    isPrompt: boolean;
    isUnsupported: boolean;
    isLoading: boolean;
    error: Error | null;
    history: PermissionSnapshot[];
    /** Epoch ms of last state change */
    lastChangedAt: number | null;
    /** Manually re-query the permission */
    query: () => Promise<void>;
    /** Reset error to null */
    clearError: () => void;
    /** Wipe history array */
    clearHistory: () => void;
}

// ─── Batch helper ─────────────────────────────────────────────────────────────

/**
 * Query multiple permissions in parallel.
 * Never throws — returns "unsupported" on any failure.
 */
export async function queryPermissions(
    names: PermissionName[]
): Promise<Record<PermissionName, PermissionState>> {
    const result = {} as Record<PermissionName, PermissionState>;

    await Promise.allSettled(
        names.map(async (name) => {
            try {
                if (!navigator?.permissions?.query) {
                    result[name] = "unsupported";
                    return;
                }
                const status = await navigator.permissions.query(
                    { name: name as PermissionDescriptor["name"] }
                );
                result[name] = status.state as PermissionState;
            } catch {
                result[name] = "unsupported";
            }
        })
    );

    return result;
}

/**
 * One-shot check — safe to call outside React (route guards, service workers).
 */
export async function checkPermission(name: PermissionName): Promise<PermissionState> {
    try {
        if (typeof navigator === "undefined" || !navigator?.permissions?.query) {
            return "unsupported";
        }
        const status = await navigator.permissions.query(
            { name: name as PermissionDescriptor["name"] }
        );
        return status.state as PermissionState;
    } catch {
        return "error";
    }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

const DEFAULT_MAX_HISTORY = 50;

export function usePermission(
    name: PermissionName,
    options: UsePermissionOptions = {}
): UsePermissionReturn {
    const { watch = true, maxHistory = DEFAULT_MAX_HISTORY } = options;

    const [state, setState] = useState<PermissionState>("prompt");
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<Error | null>(null);
    const [history, setHistory] = useState<PermissionSnapshot[]>([]);
    const [lastChangedAt, setLastChangedAt] = useState<number | null>(null);

    const optionsRef = useRef(options);
    useEffect(() => { optionsRef.current = options; });

    const prevStateRef = useRef<PermissionState>("prompt");
    const prevTimestampRef = useRef<number>(Date.now());
    const permissionStatusRef = useRef<PermissionStatus | null>(null);
    const mountedRef = useRef(true);
    const queryIdRef = useRef(0);

    useEffect(() => {
        mountedRef.current = true;
        return () => { mountedRef.current = false; };
    }, []);

    // ─── State transition ─────────────────────────────────────────────────────

    const updateState = useCallback((newState: PermissionState): void => {
        if (!mountedRef.current) return;

        const prev = prevStateRef.current;
        if (prev === newState) return;

        const now = Date.now();
        const durationMs = now - prevTimestampRef.current;

        prevStateRef.current = newState;
        prevTimestampRef.current = now;

        setState(newState);
        setLastChangedAt(now);
        setHistory((h) => {
            const snapshot: PermissionSnapshot = { state: newState, timestamp: now, durationMs };
            const updated = [...h, snapshot];
            return updated.length > maxHistory
                ? updated.slice(updated.length - maxHistory)
                : updated;
        });

        const opts = optionsRef.current;
        if (newState === "granted") opts.onGranted?.();
        if (newState === "denied")  opts.onDenied?.();
        if (newState === "prompt")  opts.onPrompt?.();
        opts.onStateChange?.(prev, newState);
    }, [maxHistory]);

    // ─── Query ────────────────────────────────────────────────────────────────

    const query = useCallback(async (): Promise<void> => {
        if (!mountedRef.current) return;

        const queryId = ++queryIdRef.current;
        setIsLoading(true);
        setError(null);

        if (typeof navigator === "undefined" || !navigator?.permissions?.query) {
            updateState("unsupported");
            if (mountedRef.current) setIsLoading(false);
            return;
        }

        try {
            const status = await navigator.permissions.query(
                { name: name as PermissionDescriptor["name"] }
            );

            // Guard 1 — unmounted while in flight
            if (!mountedRef.current) return;
            // Guard 2 — name prop changed, result is stale
            if (queryId !== queryIdRef.current) return;

            // Detach stale listener before overwriting ref
            if (permissionStatusRef.current) {
                permissionStatusRef.current.onchange = null;
            }

            permissionStatusRef.current = status;
            updateState(status.state as PermissionState);

            if (watch) {
                status.onchange = (): void => {
                    if (mountedRef.current) {
                        updateState(status.state as PermissionState);
                    }
                };
            }
        } catch (e) {
            if (!mountedRef.current) return;
            const err = e instanceof Error ? e : new Error(String(e));
            setError(err);
            updateState("error");
            optionsRef.current.onError?.(err);
        } finally {
            if (mountedRef.current && queryId === queryIdRef.current) {
                setIsLoading(false);
            }
        }
    }, [name, watch, updateState]);

    // ─── Effect ───────────────────────────────────────────────────────────────

    useEffect(() => {
        let cancelled = false;

        const run = async (): Promise<void> => {
            if (!cancelled) await query();
        };

        run();

        return () => {
            cancelled = true;
            if (permissionStatusRef.current) {
                permissionStatusRef.current.onchange = null;
            }
        };
    }, [query]);

    // ─── Utilities ────────────────────────────────────────────────────────────

    const clearError = useCallback((): void => {
        if (mountedRef.current) setError(null);
    }, []);

    const clearHistory = useCallback((): void => {
        if (mountedRef.current) setHistory([]);
    }, []);

    // ─── Return ───────────────────────────────────────────────────────────────

    return {
        state,
        isGranted:     state === "granted",
        isDenied:      state === "denied",
        isPrompt:      state === "prompt",
        isUnsupported: state === "unsupported" || state === "error",
        isLoading,
        error,
        history,
        lastChangedAt,
        query,
        clearError,
        clearHistory,
    };
}

export default usePermission;