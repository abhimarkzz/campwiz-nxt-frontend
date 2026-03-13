import { useState, useEffect, useCallback, useRef } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UseLocalStorageOptions<T> {
    /** Custom serializer — defaults to JSON.stringify */
    serializer?: (value: T) => string;
    /** Custom deserializer — defaults to JSON.parse */
    deserializer?: (value: string) => T;
    /** Read from localStorage on mount — defaults to true */
    initializeFromLocalStorage?: boolean;
    /** Called on any read/write error */
    onError?: (error: Error) => void;
    /** Sync state across tabs and same-tab instances — defaults to true */
    syncData?: boolean;
    /** Schema version — bump to trigger migration */
    version?: number;
    /** Called when a stored value's version is older than current */
    migrate?: (stored: unknown, fromVersion: number) => T;
    /** TTL in milliseconds — value expires after this duration */
    ttl?: number;
}

export interface UseLocalStorageState<T> {
    value: T | null;
    serialized: string | null;
}

interface StoredEnvelope<T> {
    __v: number;
    __t?: number; // expiry timestamp (Date.now() + ttl)
    data: T;
}

export interface UseLocalStorageReturn<T> {
    value: T | null;
    setValue: (value: T | ((prev: T | null) => T)) => void;
    removeValue: () => void;
    /** True if the stored value has expired */
    isExpired: boolean;
    /** Force a re-read from localStorage */
    refresh: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SAME_TAB_EVENT = "campwiz:localstorage:update";
const DEFAULT_VERSION = 1;

// ─── Sentinel for failed parse (avoids null ambiguity) ───────────────────────

const PARSE_FAILURE = Symbol("PARSE_FAILURE");

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isSSR(): boolean {
    return typeof window === "undefined";
}

function safeParse<T>(
    raw: string,
    deserializer: (v: string) => T
): T | typeof PARSE_FAILURE {
    try {
        return deserializer(raw);
    } catch {
        return PARSE_FAILURE;
    }
}

function isExpiredEnvelope<T>(envelope: StoredEnvelope<T>): boolean {
    return typeof envelope.__t === "number" && Date.now() > envelope.__t;
}

function readFromStorage<T>(
    key: string,
    version: number,
    initialValue: T,
    deserializer: (v: string) => T,
    migrate: ((stored: unknown, from: number) => T) | undefined,
    onError: ((e: Error) => void) | undefined
): { value: T; isExpired: boolean } {
    if (isSSR()) return { value: initialValue, isExpired: false };

    try {
        const raw = localStorage.getItem(key);
        if (raw === null) return { value: initialValue, isExpired: false };

        // Try parsing as envelope first
        const envelopeParsed = safeParse<StoredEnvelope<T>>(raw, JSON.parse);

        if (envelopeParsed !== PARSE_FAILURE && typeof envelopeParsed === "object" && envelopeParsed !== null && "__v" in (envelopeParsed as object)) {
            const envelope = envelopeParsed as StoredEnvelope<T>;

            // TTL expiry check
            if (isExpiredEnvelope(envelope)) {
                localStorage.removeItem(key);
                return { value: initialValue, isExpired: true };
            }

            // Version migration
            if (envelope.__v < version && migrate) {
                try {
                    const migrated = migrate(envelope.data, envelope.__v);
                    return { value: migrated, isExpired: false };
                } catch (e) {
                    onError?.(e instanceof Error ? e : new Error(String(e)));
                    return { value: initialValue, isExpired: false };
                }
            }

            return { value: envelope.data, isExpired: false };
        }

        // Legacy value (no envelope) — try deserializing directly
        const legacyParsed = safeParse<T>(raw, deserializer);
        if (legacyParsed !== PARSE_FAILURE) {
            return { value: legacyParsed as T, isExpired: false };
        }

        onError?.(new Error(`Failed to parse localStorage key "${key}"`));
        return { value: initialValue, isExpired: false };
    } catch (e) {
        onError?.(e instanceof Error ? e : new Error(String(e)));
        return { value: initialValue, isExpired: false };
    }
}

function writeToStorage<T>(
    key: string,
    value: T,
    version: number,
    serializer: (v: T) => string,
    ttl: number | undefined,
    onError: ((e: Error) => void) | undefined
): string | null {
    try {
        const envelope: StoredEnvelope<T> = {
            __v: version,
            data: value,
            ...(ttl !== undefined ? { __t: Date.now() + ttl } : {}),
        };
        const serialized = JSON.stringify(envelope);
        localStorage.setItem(key, serialized);
        return serialized;
    } catch (e) {
        // QuotaExceededError or SecurityError
        onError?.(e instanceof Error ? e : new Error(String(e)));
        // Fallback: try writing raw value
        try {
            const raw = serializer(value);
            localStorage.setItem(key, raw);
            return raw;
        } catch {
            return null;
        }
    }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useLocalStorage<T>(
    key: string,
    initialValue: T,
    options: UseLocalStorageOptions<T> = {}
): UseLocalStorageReturn<T> {
    const {
        serializer = JSON.stringify,
        deserializer = JSON.parse,
        initializeFromLocalStorage = true,
        onError,
        syncData = true,
        version = DEFAULT_VERSION,
        migrate,
        ttl,
    } = options;

    const [state, setState] = useState<UseLocalStorageState<T>>(() => {
        if (!initializeFromLocalStorage) {
            return { value: initialValue, serialized: serializer(initialValue) };
        }
        const { value } = readFromStorage(key, version, initialValue, deserializer, migrate, onError);
        return { value, serialized: null };
    });

    const [isExpired, setIsExpired] = useState(false);
    const [removeCount, setRemoveCount] = useState(0);
    const isRemovingRef = useRef(false);
    const isFirstMountRef = useRef(true);
    const mountedRef = useRef(true);
    const optionsRef = useRef(options);
    useEffect(() => { optionsRef.current = options; });

    useEffect(() => {
        mountedRef.current = true;
        return () => { mountedRef.current = false; };
    }, []);

    // ─── setValue ─────────────────────────────────────────────────────────────

    const setValue = useCallback(
        (value: T | ((prev: T | null) => T)): void => {
            if (!mountedRef.current) return;
            try {
                isRemovingRef.current = false;
                const valueToStore =
                    value instanceof Function ? value(state.value) : value;
                const serialized = serializer(valueToStore);
                setState({ value: valueToStore, serialized });
                setIsExpired(false);
            } catch (e) {
                onError?.(e instanceof Error ? e : new Error(String(e)));
            }
        },
        [state.value, serializer, onError]
    );

    // ─── removeValue ──────────────────────────────────────────────────────────

    const removeValue = useCallback((): void => {
        if (!mountedRef.current) return;
        try {
            isRemovingRef.current = true;
            setState({ value: initialValue, serialized: serializer(initialValue) });
            setRemoveCount((c) => c + 1);
            setIsExpired(false);
        } catch (e) {
            onError?.(e instanceof Error ? e : new Error(String(e)));
        }
    }, [initialValue, serializer, onError]);

    // ─── refresh ──────────────────────────────────────────────────────────────

    const refresh = useCallback((): void => {
        if (!mountedRef.current || isSSR()) return;
        const { value, isExpired: expired } = readFromStorage(
            key, version, initialValue, deserializer, migrate, onError
        );
        setState({ value, serialized: null });
        setIsExpired(expired);
    }, [key, version, initialValue, deserializer, migrate, onError]);

    // ─── Cross-tab + same-tab sync ────────────────────────────────────────────

    useEffect(() => {
        if (isSSR()) return;

        const handleStorageEvent = (event: StorageEvent): void => {
            if (event.key !== key || !mountedRef.current) return;

            if (event.newValue === null) {
                setState({ value: initialValue, serialized: null });
                setIsExpired(false);
            } else {
                const { value, isExpired: expired } = readFromStorage(
                    key, version, initialValue, deserializer, migrate,
                    optionsRef.current.onError
                );
                setState({ value, serialized: event.newValue });
                setIsExpired(expired);
            }
        };

        interface SameTabDetail<T> {
            key: string;
            value: T | null;
            serialized: string | null;
            isRemoving: boolean;
        }

        const handleSameTabEvent = (event: Event): void => {
            const customEvent = event as CustomEvent<SameTabDetail<T>>;
            if (!mountedRef.current) return;
            if (customEvent.detail?.key !== key) return;

            try {
                const { value, serialized, isRemoving } = customEvent.detail;
                if (isRemoving) {
                    setState({ value: initialValue, serialized: null });
                } else {
                    setState({ value, serialized });
                }
            } catch (e) {
                optionsRef.current.onError?.(
                    e instanceof Error ? e : new Error(String(e))
                );
            }
        };

        if (syncData) {
            window.addEventListener("storage", handleStorageEvent);
            window.addEventListener(SAME_TAB_EVENT, handleSameTabEvent as EventListener);
        }

        return () => {
            window.removeEventListener("storage", handleStorageEvent);
            window.removeEventListener(SAME_TAB_EVENT, handleSameTabEvent as EventListener);
        };
    }, [key, version, initialValue, deserializer, migrate, syncData]);

    // ─── Write effect ─────────────────────────────────────────────────────────

    useEffect(() => {
        if (isSSR()) return;

        // Skip write on first mount — avoid overwriting existing data on init
        if (isFirstMountRef.current) {
            isFirstMountRef.current = false;
            return;
        }

        if (isRemovingRef.current) {
            try {
                localStorage.removeItem(key);
                window.dispatchEvent(
                    new CustomEvent(SAME_TAB_EVENT, {
                        detail: { key, value: initialValue, serialized: null, isRemoving: true },
                    })
                );
            } catch (e) {
                optionsRef.current.onError?.(
                    e instanceof Error ? e : new Error(String(e))
                );
            }
            isRemovingRef.current = false;
        } else if (state.value !== null) {
            const serialized = writeToStorage(
                key, state.value, version, serializer, ttl,
                optionsRef.current.onError
            );
            if (serialized !== null) {
                window.dispatchEvent(
                    new CustomEvent(SAME_TAB_EVENT, {
                        detail: { key, value: state.value, serialized, isRemoving: false },
                    })
                );
            }
        }
    }, [key, state.serialized, removeCount, version, ttl]);

    return { value: state.value, setValue, removeValue, isExpired, refresh };
}

export default useLocalStorage;