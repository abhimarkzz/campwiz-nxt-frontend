import { useState, useEffect, useCallback, useRef } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type PermissionName =
    | "camera"
    | "microphone"
    | "geolocation"
    | "notifications"
    | "persistent-storage"
    | "push"
    | "screen-wake-lock"
    | "xr-spatial-tracking"
    | "clipboard-read"
    | "clipboard-write"
    | "payment-handler"
    | "idle-detection"
    | "periodic-background-sync"
    | "system-wake-lock"
    | "nfc"
    | "bluetooth"
    | "accelerometer"
    | "gyroscope"
    | "magnetometer"
    | "ambient-light-sensor";

type PermissionState = "granted" | "denied" | "prompt" | "unsupported" | "error";

interface PermissionSnapshot {
    state: PermissionState;
    timestamp: number;
}

interface UsePermissionOptions {
    watch?: boolean;
    onGranted?: () => void;
    onDenied?: () => void;
    onPrompt?: () => void;
    onError?: (error: Error) => void;
    onStateChange?: (prev: PermissionState, next: PermissionState) => void;
}

interface UsePermissionReturn {
    state: PermissionState;
    isGranted: boolean;
    isDenied: boolean;
    isPrompt: boolean;
    isUnsupported: boolean;
    isLoading: boolean;
    error: Error | null;
    history: PermissionSnapshot[];
    query: () => Promise<void>;
}

// ─── Batch query multiple permissions at once ─────────────────────────────────

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

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePermission(
    name: PermissionName,
    options: UsePermissionOptions = {}
): UsePermissionReturn {
    const { watch = true } = options;

    const [state, setState] = useState<PermissionState>("prompt");
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<Error | null>(null);
    const [history, setHistory] = useState<PermissionSnapshot[]>([]);

    const optionsRef = useRef(options);
    useEffect(() => { optionsRef.current = options; });

    const prevStateRef = useRef<PermissionState>("prompt");
    const permissionStatusRef = useRef<PermissionStatus | null>(null);
    const mountedRef = useRef(true);

    useEffect(() => {
        mountedRef.current = true;
        return () => { mountedRef.current = false; };
    }, []);

    const updateState = useCallback((newState: PermissionState): void => {
        if (!mountedRef.current) return;

        const prev = prevStateRef.current;
        if (prev === newState) return;

        prevStateRef.current = newState;
        setState(newState);
        setHistory(h => [...h, { state: newState, timestamp: Date.now() }]);

        const opts = optionsRef.current;
        if (newState === "granted") opts.onGranted?.();
        if (newState === "denied") opts.onDenied?.();
        if (newState === "prompt") opts.onPrompt?.();
        if (prev !== newState) opts.onStateChange?.(prev, newState);
    }, []);

    const query = useCallback(async (): Promise<void> => {
        if (!mountedRef.current) return;

        setIsLoading(true);
        setError(null);

        if (typeof navigator === "undefined" || !navigator?.permissions?.query) {
            updateState("unsupported");
            setIsLoading(false);
            return;
        }

        try {
            const status = await navigator.permissions.query(
                { name: name as PermissionDescriptor["name"] }
            );

            if (!mountedRef.current) return;

            // Remove previous listener
            if (permissionStatusRef.current) {
                permissionStatusRef.current.onchange = null;
            }

            permissionStatusRef.current = status;
            updateState(status.state as PermissionState);

            // Watch for live permission changes
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
            if (mountedRef.current) setIsLoading(false);
        }
    }, [name, watch, updateState]);

    useEffect(() => {
        query();

        return () => {
            if (permissionStatusRef.current) {
                permissionStatusRef.current.onchange = null;
            }
        };
    }, [query]);

    return {
        state,
        isGranted: state === "granted",
        isDenied: state === "denied",
        isPrompt: state === "prompt",
        isUnsupported: state === "unsupported" || state === "error",
        isLoading,
        error,
        history,
        query,
    };
}

export default usePermission;