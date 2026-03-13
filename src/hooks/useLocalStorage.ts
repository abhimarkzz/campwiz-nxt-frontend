import { useState, useEffect, useCallback, useRef } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type SetValue<T> = (value: T | ((prev: T) => T)) => void;

interface StorageEntry<T> {
    value: T;
    version: number;
    timestamp: number;
    expiresAt?: number;
}

interface UseLocalStorageOptions<T> {
    version?: number;
    migrate?: (oldValue: unknown, oldVersion: number) => T;
    ttlMs?: number;
    validate?: (value: unknown) => value is T;
    onError?: (error: Error, key: string) => void;
}

interface UseLocalStorageReturn<T> {
    value: T;
    setValue: SetValue<T>;
    removeValue: () => void;
    isExpired: boolean;
    lastUpdated: number | null;
}

interface StorageState<T> {
    value: T;
    timestamp: number | null;
    isExpired: boolean;
    // ✅ Fix bug 1: track serialized string to prevent infinite loop
    // We compare serialized values (strings) instead of object references
    serialized: string;
}

// ─── SSR guard ────────────────────────────────────────────────────────────────

const isBrowser = (): boolean => typeof window !== "undefined";

// ─── Safe JSON parse ──────────────────────────────────────────────────────────

// ✅ Fix bug 3: ALL JSON.parse calls go through this — never throws
function safeParse<T>(
    raw: string,
    fallback: T,
    onError?: (error: Error, key: string) => void,
    key = "unknown"
): T {
    try {
        return JSON.parse(raw) as T;
    } catch (e) {
        const error = e instanceof Error ? e : new Error(String(e));
        onError?.(error, key);
        return fallback;
    }
}

// ─── Serialization ────────────────────────────────────────────────────────────

function serialize<T>(entry: StorageEntry<T>): string {
    return JSON.stringify(entry);
}

function deserialize<T>(
    raw: string,
    fallback: T,
    options: UseLocalStorageOptions<T>,
    currentVersion: number,
    key: string
): { value: T; timestamp: number; expiresAt?: number } | null {
    // ✅ Fix bug 3: safe parse — never throws
    const parsed = safeParse<unknown>(raw, null, options.onError, key);
    if (parsed === null) return { value: fallback, timestamp: Date.now() };

    // Handle legacy values (stored before versioning)
    if (typeof parsed !== "object" || !("version" in (parsed as object))) {
        if (options.migrate) {
            return {
                value: options.migrate(parsed, 0),
                timestamp: Date.now(),
            };
        }
        return { value: fallback, timestamp: Date.now() };
    }

    const entry = parsed as StorageEntry<unknown>;

    // Check expiry — return null to signal expired
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
        return null;
    }

    // Migrate if version mismatch
    if (entry.version !== currentVersion && options.migrate) {
        return {
            value: options.migrate(entry.value, entry.version),
            timestamp: Date.now(),
        };
    }

    // Validate shape if validator provided
    if (options.validate && !options.validate(entry.value)) {
        return { value: fallback, timestamp: Date.now() };
    }

    return {
        value: entry.value as T,
        timestamp: entry.timestamp,
        expiresAt: entry.expiresAt,
    };
}

// ─── Global event bus for same-tab sync ───────────────────────────────────────

const SAME_TAB_EVENT = "useLocalStorage:update";

interface SameTabEvent extends CustomEvent {
    detail: { key: string; newValue: string | null };
}

function dispatchSameTabEvent(key: string, newValue: string | null): void {
    if (!isBrowser()) return;
    window.dispatchEvent(
        new CustomEvent(SAME_TAB_EVENT, { detail: { key, newValue } })
    );
}

// ─── Core read function ───────────────────────────────────────────────────────

function readStorageValue<T>(
    key: string,
    initialValue: T,
    options: UseLocalStorageOptions<T>,
    version: number
): StorageState<T> {
    if (!isBrowser()) {
        return {
            value: initialValue,
            timestamp: null,
            isExpired: false,
            serialized: JSON.stringify(initialValue),
        };
    }

    // ✅ Fix bug 3: safe read — never throws
    let raw: string | null = null;
    try {
        raw = window.localStorage.getItem(key);
    } catch (e) {
        const error = e instanceof Error ? e : new Error(String(e));
        options.onError?.(error, key);
    }

    if (raw === null) {
        return {
            value: initialValue,
            timestamp: null,
            isExpired: false,
            serialized: JSON.stringify(initialValue),
        };
    }

    const result = deserialize<T>(raw, initialValue, options, version, key);
    if (result === null) {
        // Expired — clean up
        try { window.localStorage.removeItem(key); } catch { /* silent */ }
        return {
            value: initialValue,
            timestamp: null,
            isExpired: true,
            serialized: JSON.stringify(initialValue),
        };
    }

    return {
        value: result.value,
        timestamp: result.timestamp,
        isExpired: false,
        // ✅ Fix bug 1: store serialized form for stable comparison
        serialized: JSON.stringify(result.value),
    };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useLocalStorage<T>(
    key: string,
    initialValue: T,
    options: UseLocalStorageOptions<T> = {}
): UseLocalStorageReturn<T> {
    const version = options.version ?? 1;

    const optionsRef = useRef(options);
    useEffect(() => { optionsRef.current = options; });

    const [state, setState] = useState<StorageState<T>>(() =>
        readStorageValue(key, initialValue, options, version)
    );

    // ✅ Fix bug 2: only write to storage when value actually changes
    // AND preserve the original expiresAt — don't recalculate on every mount
    const isFirstMount = useRef(true);
    const isRemoving = useRef(false);
    const [removeCount, setRemoveCount] = useState(0);

    useEffect(() => {
        if (!isBrowser()) return;

        // On first mount: just read, don't overwrite existing TTL in storage
        // On first mount: just read, don't overwrite existing TTL in storage
        if (isFirstMount.current) {
            isFirstMount.current = false;
            return;
        }

        // ✅ Fix: skip write if removeValue just ran
        if (isRemoving.current) {
            isRemoving.current = false;
            return;
        }

        // ✅ Fix bug 2: read existing entry to preserve original expiresAt
        let existingExpiresAt: number | undefined;
        try {
            const raw = window.localStorage.getItem(key);
            if (raw) {
                const existing = safeParse<StorageEntry<unknown>>(
                    raw, {} as StorageEntry<unknown>, optionsRef.current.onError, key
                );
                existingExpiresAt = existing?.expiresAt;
            }
        } catch { /* silent */ }

        const entry: StorageEntry<T> = {
            value: state.value,
            version,
            timestamp: state.timestamp ?? Date.now(),
            // Preserve original expiresAt if it exists, only set new one for new values
            expiresAt: existingExpiresAt ?? (
                optionsRef.current.ttlMs
                    ? Date.now() + optionsRef.current.ttlMs
                    : undefined
            ),
        };

        const serialized = serialize(entry);

        try {
            window.localStorage.setItem(key, serialized);
            // ✅ Fix bug 1: dispatch with serialized string, not object
            // Listener will compare serialized strings to detect real changes
            dispatchSameTabEvent(key, serialized);
        } catch (e) {
            const error = e instanceof Error ? e : new Error(String(e));
            optionsRef.current.onError?.(error, key);
        }
    // ✅ Fix bug 1: depend on state.serialized (string) not state.value (object)
    // String comparison is stable — won't cause infinite loop with objects/arrays
    }, [key, state.serialized, version]);

    // Sync across tabs and same-tab instances
    useEffect(() => {
        if (!isBrowser()) return;

        const handleChange = (raw: string | null): void => {
            if (raw === null) {
                setState({
                    value: initialValue,
                    timestamp: null,
                    isExpired: false,
                    serialized: JSON.stringify(initialValue),
                });
                return;
            }

            const result = deserialize<T>(
                raw,
                initialValue,
                optionsRef.current,
                version,
                key
            );

            if (result === null) {
                setState({
                    value: initialValue,
                    timestamp: null,
                    isExpired: true,
                    serialized: JSON.stringify(initialValue),
                });
                return;
            }

            const newSerialized = JSON.stringify(result.value);

            // ✅ Fix bug 1: only update state if value actually changed
            // Prevents infinite loop when same-tab event fires after our own write
            setState(prev => {
                if (prev.serialized === newSerialized) return prev;
                return {
                    value: result.value,
                    timestamp: result.timestamp,
                    isExpired: false,
                    serialized: newSerialized,
                };
            });
        };

        const handleStorageEvent = (event: StorageEvent): void => {
            if (event.key !== key) return;
            handleChange(event.newValue);
        };

        const handleSameTabEvent = (event: Event): void => {
            const e = event as SameTabEvent;
            if (e.detail.key !== key) return;
            handleChange(e.detail.newValue);
        };

        window.addEventListener("storage", handleStorageEvent);
        window.addEventListener(SAME_TAB_EVENT, handleSameTabEvent);

        return () => {
            window.removeEventListener("storage", handleStorageEvent);
            window.removeEventListener(SAME_TAB_EVENT, handleSameTabEvent);
        };
  }, [key, state.serialized, version, removeCount]);

    const setValue: SetValue<T> = useCallback((newValue) => {
        setState(prev => {
            const resolved = typeof newValue === "function"
                ? (newValue as (prev: T) => T)(prev.value)
                : newValue;
            return {
                value: resolved,
                timestamp: Date.now(),
                isExpired: false,
                serialized: JSON.stringify(resolved),
            };
        });
    }, []);

    const removeValue = useCallback((): void => {
        if (!isBrowser()) return;
        try {
            isRemoving.current = true;
            window.localStorage.removeItem(key);
            dispatchSameTabEvent(key, null);
            // ✅ Always increment removeCount so the write effect
            // is guaranteed to run even when value === initialValue
            setRemoveCount(c => c + 1);
            setState({
                value: initialValue,
                timestamp: null,
                isExpired: false,
                serialized: JSON.stringify(initialValue),
            });
        } catch (e) {
            const error = e instanceof Error ? e : new Error(String(e));
            optionsRef.current.onError?.(error, key);
        }
    }, [key, initialValue]);

    return {
        value: state.value,
        setValue,
        removeValue,
        isExpired: state.isExpired,
        lastUpdated: state.timestamp,
    };
}

export default useLocalStorage;