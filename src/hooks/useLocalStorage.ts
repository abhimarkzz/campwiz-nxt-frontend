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
    serialized: string;
}

// ─── SSR guard ────────────────────────────────────────────────────────────────

const isBrowser = (): boolean => typeof window !== "undefined";

// ─── Safe JSON parse ──────────────────────────────────────────────────────────

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
// Sentinel to distinguish parse failure from a legitimately stored null
const PARSE_FAILURE = Symbol("PARSE_FAILURE");

function deserialize<T>(
    raw: string,
    fallback: T,
    options: UseLocalStorageOptions<T>,
    currentVersion: number,
    key: string
): { value: T; timestamp: number; expiresAt?: number } | null {
    const parsed = safeParse<unknown>(raw, PARSE_FAILURE as unknown, options.onError, key);
    if (parsed === PARSE_FAILURE) return { value: fallback, timestamp: Date.now() };
    
    if (typeof parsed !== "object" || !("version" in (parsed as object))) {
        if (options.migrate) {
            return { value: options.migrate(parsed, 0), timestamp: Date.now() };
        }
        return { value: fallback, timestamp: Date.now() };
    }

    const entry = parsed as StorageEntry<unknown>;

    if (entry.expiresAt && Date.now() > entry.expiresAt) {
        return null;
    }

    if (entry.version !== currentVersion && options.migrate) {
        return {
            value: options.migrate(entry.value, entry.version),
            timestamp: Date.now(),
        };
    }

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

    const isFirstMount = useRef(true);
    const isRemoving = useRef(false);
    // ✅ Incrementing this forces the write effect to run even when
    // state.serialized doesn't change (value === initialValue after remove)
    const [removeCount, setRemoveCount] = useState(0);

    // ─── Write effect ──────────────────────────────────────────────────────────
    useEffect(() => {
        if (!isBrowser()) return;

        // Skip on first mount — don't overwrite existing TTL
        if (isFirstMount.current) {
            isFirstMount.current = false;
            return;
        }

        // ✅ Skip write if removeValue just ran — reset flag here (not in microtask)
        if (isRemoving.current) {
            isRemoving.current = false;
            return;
        }

        // Preserve original expiresAt — don't reset TTL on every render
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
            expiresAt: existingExpiresAt ?? (
                optionsRef.current.ttlMs
                    ? Date.now() + optionsRef.current.ttlMs
                    : undefined
            ),
        };

        const serialized = serialize(entry);

        try {
            window.localStorage.setItem(key, serialized);
            dispatchSameTabEvent(key, serialized);
        } catch (e) {
            const error = e instanceof Error ? e : new Error(String(e));
            optionsRef.current.onError?.(error, key);
        }
    // ✅ removeCount in deps guarantees this effect runs after every removeValue call
    }, [key, state.serialized, version, removeCount]);

    // ─── Sync effect (cross-tab + same-tab) ───────────────────────────────────
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
                raw, initialValue, optionsRef.current, version, key
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
    }, [key, initialValue, version]);

    // ─── setValue ──────────────────────────────────────────────────────────────
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

    // ─── removeValue ──────────────────────────────────────────────────────────
    const removeValue = useCallback((): void => {
        if (!isBrowser()) return;
        try {
            isRemoving.current = true;
            window.localStorage.removeItem(key);
            dispatchSameTabEvent(key, null);
            // ✅ Increment forces write effect to run and reset isRemoving
            // even when state.serialized doesn't change
            setRemoveCount(c => c + 1);
            setState({
                value: initialValue,
                timestamp: null,
                isExpired: false,
                serialized: JSON.stringify(initialValue),
            });
        } catch (e) {
            isRemoving.current = false;
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