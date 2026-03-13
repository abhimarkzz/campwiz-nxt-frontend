import { useState, useEffect, useCallback, useRef } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface UseDebounceOptions {
    leading?: boolean;  // fire immediately on first call, then debounce
    maxWait?: number;   // maximum time to wait before forcing execution
}

interface UseDebounceReturn<T> {
    debouncedValue: T;
    isPending: boolean;
    cancel: () => void;
    flush: () => void;
}

// ─── useDebounce ──────────────────────────────────────────────────────────────

export function useDebounce<T>(
    value: T,
    delayMs: number,
    options: UseDebounceOptions = {}
): UseDebounceReturn<T> {
    const { leading = false, maxWait } = options;

    const [debouncedValue, setDebouncedValue] = useState<T>(value);
    const [isPending, setIsPending] = useState<boolean>(false);

    // Refs to hold mutable state without causing re-renders
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const maxWaitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastValueRef = useRef<T>(value);
    const isLeadingFiredRef = useRef<boolean>(false);

    const cancelTimers = useCallback((): void => {
        if (timerRef.current !== null) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        if (maxWaitTimerRef.current !== null) {
            clearTimeout(maxWaitTimerRef.current);
            maxWaitTimerRef.current = null;
        }
    }, []);

    // flush — apply the latest value immediately
    const flush = useCallback((): void => {
        cancelTimers();
        setDebouncedValue(lastValueRef.current);
        setIsPending(false);
        isLeadingFiredRef.current = false;
    }, [cancelTimers]);

    // cancel — discard pending update
    const cancel = useCallback((): void => {
        cancelTimers();
        setIsPending(false);
        isLeadingFiredRef.current = false;
    }, [cancelTimers]);

    useEffect(() => {
        lastValueRef.current = value;

        // Leading edge: fire immediately on first value change
        if (leading && !isLeadingFiredRef.current) {
            isLeadingFiredRef.current = true;
            setDebouncedValue(value);
            setIsPending(false);
        } else {
            setIsPending(true);
        }

        // Clear existing debounce timer
        if (timerRef.current !== null) {
            clearTimeout(timerRef.current);
        }

        // Set debounce timer
        timerRef.current = setTimeout(() => {
            setDebouncedValue(lastValueRef.current);
            setIsPending(false);
            isLeadingFiredRef.current = false;
            timerRef.current = null;

            // Clear maxWait timer since we resolved naturally
            if (maxWaitTimerRef.current !== null) {
                clearTimeout(maxWaitTimerRef.current);
                maxWaitTimerRef.current = null;
            }
        }, delayMs);

        // Set maxWait timer if provided and not already running
        if (maxWait !== undefined && maxWaitTimerRef.current === null) {
            maxWaitTimerRef.current = setTimeout(() => {
                if (timerRef.current !== null) {
                    clearTimeout(timerRef.current);
                    timerRef.current = null;
                }
                setDebouncedValue(lastValueRef.current);
                setIsPending(false);
                isLeadingFiredRef.current = false;
                maxWaitTimerRef.current = null;
            }, maxWait);
        }

        // Cleanup on unmount or before next effect
        return () => {
            if (timerRef.current !== null) {
                clearTimeout(timerRef.current);
            }
        };
    }, [value, delayMs, leading, maxWait]);

    // Cancel all timers on unmount
    useEffect(() => {
        return () => {
            cancelTimers();
        };
    }, [cancelTimers]);

    return { debouncedValue, isPending, cancel, flush };
}

// ─── useDebouncedCallback ─────────────────────────────────────────────────────
// Debounces a function call instead of a value

interface UseDebouncedCallbackReturn<T extends unknown[]> {
    debouncedFn: (...args: T) => void;
    isPending: boolean;
    cancel: () => void;
    flush: () => void;
}

export function useDebouncedCallback<T extends unknown[]>(
    callback: (...args: T) => void,
    delayMs: number,
    options: UseDebounceOptions = {}
): UseDebouncedCallbackReturn<T> {
    const { leading = false, maxWait } = options;

    const [isPending, setIsPending] = useState<boolean>(false);

    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const maxWaitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const callbackRef = useRef(callback);
    const lastArgsRef = useRef<T | null>(null);
    const isLeadingFiredRef = useRef<boolean>(false);

    // Always use latest callback without re-creating the debounced function
    useEffect(() => { callbackRef.current = callback; });

    const cancelTimers = useCallback((): void => {
        if (timerRef.current !== null) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        if (maxWaitTimerRef.current !== null) {
            clearTimeout(maxWaitTimerRef.current);
            maxWaitTimerRef.current = null;
        }
    }, []);

    const flush = useCallback((): void => {
        cancelTimers();
        if (lastArgsRef.current !== null) {
            callbackRef.current(...lastArgsRef.current);
        }
        setIsPending(false);
        isLeadingFiredRef.current = false;
    }, [cancelTimers]);

    const cancel = useCallback((): void => {
        cancelTimers();
        setIsPending(false);
        isLeadingFiredRef.current = false;
    }, [cancelTimers]);

    const debouncedFn = useCallback((...args: T): void => {
        lastArgsRef.current = args;

        if (leading && !isLeadingFiredRef.current) {
            isLeadingFiredRef.current = true;
            callbackRef.current(...args);
            setIsPending(false);
        } else {
            setIsPending(true);
        }

        if (timerRef.current !== null) {
            clearTimeout(timerRef.current);
        }

        timerRef.current = setTimeout(() => {
            // ✅ Fixed: was `!leading || isLeadingFiredRef.current` which caused
            //    double invocation when leading=true. Now correctly skips the
            //    trailing call if the leading edge already fired for this burst.
            if (!leading || !isLeadingFiredRef.current) {
                callbackRef.current(...(lastArgsRef.current as T));
            }
            setIsPending(false);
            isLeadingFiredRef.current = false;
            timerRef.current = null;

            if (maxWaitTimerRef.current !== null) {
                clearTimeout(maxWaitTimerRef.current);
                maxWaitTimerRef.current = null;
            }
        }, delayMs);

        if (maxWait !== undefined && maxWaitTimerRef.current === null) {
            maxWaitTimerRef.current = setTimeout(() => {
                if (timerRef.current !== null) {
                    clearTimeout(timerRef.current);
                    timerRef.current = null;
                }
                callbackRef.current(...(lastArgsRef.current as T));
                setIsPending(false);
                isLeadingFiredRef.current = false;
                maxWaitTimerRef.current = null;
            }, maxWait);
        }
    }, [delayMs, leading, maxWait]);

    // Cancel on unmount
    useEffect(() => {
        return () => { cancelTimers(); };
    }, [cancelTimers]);

    return { debouncedFn, isPending, cancel, flush };
}

export default useDebounce;