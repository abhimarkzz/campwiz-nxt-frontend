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

// ─── SSR guard ────────────────────────────────────────────────────────────────

const isBrowser = (): boolean => typeof window !== "undefined";

// ─── Serialization ────────────────────────────────────────────────────────────

function serialize<T>(entry: StorageEntry<T>): string {
    return JSON.stringify(entry);
}

function deserialize<T>(
    raw: string,
    fallback: T,
    options: UseLocalStorageOptions<T>,
    currentVersion: number
): { value: T; timestamp: number; expiresAt?: number } | null {
    const parsed = JSON.parse(raw) as StorageEntry<unknown>;

    // Handle legacy values (stored before versioning)
    if (typeof parsed !== "object" || !("version" in parsed)) {
        if (options.migrate) {
            return {
                value: options.migrate(parsed, 0),
                timestamp: Date.now(),
            };
        }
        return { value: fallback, timestamp: Date.now() };
    }

    const entry = parsed as StorageEntry<unknown>;

    // Check expiry
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
        return null; // expired
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
// The native `storage` event only fires in OTHER tabs.
// We dispatch a custom event so same-tab listeners also sync.

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
): { value: T; timestamp: number | null; isExpired: boolean } {
    if (!isBrowser()) {
        return { value: initialValue, timestamp: null, isExpired: false };
    }

    const raw = window.localStorage.getItem(key);
    if (raw === null) {
        return { value: initialValue, timestamp: null, isExpired: false };
    }

    const result = deserialize<T>(raw, initialValue, options, version);
    if (result === null) {
        // Expired — clean up
        window.localStorage.removeItem(key);
        return { value: initialValue, timestamp: null, isExpired: true };
    }

    return { value: result.value, timestamp: result.timestamp, isExpired: false };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useLocalStorage<T>(
    key: string,
    initialValue: T,
    options: UseLocalStorageOptions<T> = {}
): UseLocalStorageReturn<T> {
    const version = options.version ?? 1;

    // Keep options in a ref so callbacks don't go stale
    const optionsRef = useRef(options);
    useEffect(() => { optionsRef.current = options; });

    const read = useCallback(() => {
        return readStorageValue(key, initialValue, optionsRef.current, version);
    }, [key, initialValue, version]);

    const [state, setState] = useState(() => read());

    // Write to localStorage whenever value changes
    useEffect(() => {
        if (!isBrowser()) return;

        const entry: StorageEntry<T> = {
            value: state.value,
            version,
            timestamp: state.timestamp ?? Date.now(),
            expiresAt: options.ttlMs
                ? Date.now() + options.ttlMs
                : undefined,
        };

        try {
            window.localStorage.setItem(key, serialize(entry));
            dispatchSameTabEvent(key, serialize(entry));
        } catch (e) {
            const error = e instanceof Error ? e : new Error(String(e));
            optionsRef.current.onError?.(error, key);
        }
    }, [key, state.value, version, options.ttlMs]);

    // Sync across tabs (native storage event)
    // AND same-tab sync via our custom event
    useEffect(() => {
        if (!isBrowser()) return;

        const handleChange = (raw: string | null): void => {
            if (raw === null) {
                setState({ value: initialValue, timestamp: null, isExpired: false });
                return;
            }
            try {
                const result = deserialize<T>(
                    raw,
                    initialValue,
                    optionsRef.current,
                    version
                );
                if (result === null) {
                    setState({ value: initialValue, timestamp: null, isExpired: true });
                } else {
                    setState({
                        value: result.value,
                        timestamp: result.timestamp,
                        isExpired: false,
                    });
                }
            } catch (e) {
                const error = e instanceof Error ? e : new Error(String(e));
                optionsRef.current.onError?.(error, key);
            }
        };

        // Cross-tab sync
        const handleStorageEvent = (event: StorageEvent): void => {
            if (event.key !== key) return;
            handleChange(event.newValue);
        };

        // Same-tab sync
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

    const setValue: SetValue<T> = useCallback((newValue) => {
        setState(prev => ({
            value: typeof newValue === "function"
                ? (newValue as (prev: T) => T)(prev.value)
                : newValue,
            timestamp: Date.now(),
            isExpired: false,
        }));
    }, []);

    const removeValue = useCallback((): void => {
        if (!isBrowser()) return;
        try {
            window.localStorage.removeItem(key);
            dispatchSameTabEvent(key, null);
            setState({ value: initialValue, timestamp: null, isExpired: false });
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