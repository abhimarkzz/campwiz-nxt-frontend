import { useState, useEffect, useRef, useCallback, useMemo } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type MediaQueryPreset = Record<string, string>;

export interface UseMediaQueryOptions {
    /** Returned during SSR / before mount — defaults to false */
    defaultValue?: boolean;
    /** Custom preset map — merged with TAILWIND_PRESETS */
    presets?: MediaQueryPreset;
    /** How to combine array queries: "and" | "or" — defaults to "and" */
    combinator?: "and" | "or";
    /** Called whenever match state changes */
    onChange?: (matches: boolean) => void;
}

export interface UseMediaQueryReturn {
    matches: boolean;
    /** True until first browser measurement completes (SSR hydration guard) */
    isHydrating: boolean;
}

export interface MediaQueryResults {
    [key: string]: boolean;
}

// ─── Tailwind v3 Breakpoints + extended presets ───────────────────────────────

export const TAILWIND_PRESETS: MediaQueryPreset = {
    // Breakpoints
    sm:  "(min-width: 640px)",
    md:  "(min-width: 768px)",
    lg:  "(min-width: 1024px)",
    xl:  "(min-width: 1280px)",
    "2xl": "(min-width: 1536px)",

    // Max-width variants
    "max-sm":  "(max-width: 639px)",
    "max-md":  "(max-width: 767px)",
    "max-lg":  "(max-width: 1023px)",
    "max-xl":  "(max-width: 1279px)",
    "max-2xl": "(max-width: 1535px)",

    // Orientation
    landscape: "(orientation: landscape)",
    portrait:  "(orientation: portrait)",

    // Color scheme
    dark:  "(prefers-color-scheme: dark)",
    light: "(prefers-color-scheme: light)",

    // Motion
    "motion-safe":   "(prefers-reduced-motion: no-preference)",
    "motion-reduce": "(prefers-reduced-motion: reduce)",

    // Pointer / interaction
    touch:     "(hover: none) and (pointer: coarse)",
    "no-touch": "(hover: hover) and (pointer: fine)",
    hover:     "(hover: hover)",
    "no-hover": "(hover: none)",
    stylus:    "(pointer: fine) and (hover: none)",

    // Display quality
    retina:    "(-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi)",
    print:     "print",

    // Contrast / transparency
    "high-contrast":    "(forced-colors: active)",
    "low-contrast":     "(prefers-contrast: less)",
    "reduced-transparency": "(prefers-reduced-transparency: reduce)",
};

// ─── Global MQL cache — one MediaQueryList per resolved query string ──────────

const mqlCache = new Map<string, MediaQueryList>();

function getOrCreateMQL(query: string): MediaQueryList | null {
    if (typeof window === "undefined" || !("matchMedia" in window)) return null;
    if (!mqlCache.has(query)) {
        try {
            mqlCache.set(query, window.matchMedia(query));
        } catch {
            return null;
        }
    }
    return mqlCache.get(query) ?? null;
}

/** Exposed for testing — clears the global MQL cache */
export function __clearMQLCache(): void {
    mqlCache.clear();
}

// ─── Query resolution ─────────────────────────────────────────────────────────

function resolveQuery(
    query: string,
    presets: MediaQueryPreset
): string {
    // If it's a known preset key, expand it; otherwise use as-is
    return presets[query] ?? query;
}

function buildFinalQuery(
    query: string | string[],
    presets: MediaQueryPreset,
    combinator: "and" | "or"
): string {
    const queries = Array.isArray(query) ? query : [query];
    const resolved = queries.map((q) => resolveQuery(q, presets));

    if (resolved.length === 1) return resolved[0];

    // Wrap each query in parens before joining to ensure correct precedence
    const separator = ` ${combinator} `;
    return resolved.map((q) => `(${q})`).join(separator);
}

// ─── MQL listener helper (handles deprecated addListener API gracefully) ──────

function addMQLListener(
    mql: MediaQueryList,
    handler: (e: MediaQueryListEvent) => void
): () => void {
    // Modern browsers
    if (typeof mql.addEventListener === "function") {
        mql.addEventListener("change", handler);
        return () => mql.removeEventListener("change", handler);
    }

    // Safari < 14 fallback
    mql.addListener(handler);
    return () => mql.removeListener(handler);
}

// ─── Core hook ────────────────────────────────────────────────────────────────

export function useMediaQuery(
    query: string | string[],
    options: UseMediaQueryOptions = {}
): UseMediaQueryReturn {
    const {
        defaultValue = false,
        presets,
        combinator = "and",
        onChange,
    } = options;

    // Merge caller presets on top of Tailwind defaults
    const mergedPresets = useMemo(
        () => (presets ? { ...TAILWIND_PRESETS, ...presets } : TAILWIND_PRESETS),
        [presets]
    );

    const finalQuery = useMemo(
        () => buildFinalQuery(query, mergedPresets, combinator),
        [query, mergedPresets, combinator]
    );

    const [matches, setMatches] = useState<boolean>(defaultValue);
    const [isHydrating, setIsHydrating] = useState<boolean>(true);

    const onChangeRef = useRef(onChange);
    useEffect(() => { onChangeRef.current = onChange; });

    const handleChange = useCallback(
        (e: MediaQueryListEvent): void => {
            setMatches(e.matches);
            onChangeRef.current?.(e.matches);
        },
        []
    );

    useEffect(() => {
        const mql = getOrCreateMQL(finalQuery);

        if (!mql) {
            // SSR or matchMedia unavailable — keep defaultValue
            setIsHydrating(false);
            return;
        }

        // Synchronously snap to current state on mount
        const current = mql.matches;
        setMatches(current);
        setIsHydrating(false);

        // Notify if initial value differs from default (e.g. SSR mismatch)
        if (current !== defaultValue) {
            onChangeRef.current?.(current);
        }

        return addMQLListener(mql, handleChange);
    }, [finalQuery, defaultValue, handleChange]);

    return { matches, isHydrating };
}

// ─── Convenience boolean hook ─────────────────────────────────────────────────

/**
 * Simplified variant — returns just the boolean match value.
 * Use `useMediaQuery` when you need the `isHydrating` guard.
 */
export function useMedia(
    query: string | string[],
    options: UseMediaQueryOptions = {}
): boolean {
    return useMediaQuery(query, options).matches;
}

// ─── Multiple queries hook ────────────────────────────────────────────────────

/**
 * Evaluates multiple named queries in one call.
 *
 * @example
 * const { isMobile, isDark } = useMediaQueries({
 *   isMobile: "md",
 *   isDark: "dark",
 * });
 */
export function useMediaQueries(
    queries: Record<string, string | string[]>,
    options: UseMediaQueryOptions = {}
): MediaQueryResults {
    const { defaultValue = false, presets, combinator = "and" } = options;

    const mergedPresets = useMemo(
        () => (presets ? { ...TAILWIND_PRESETS, ...presets } : TAILWIND_PRESETS),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [JSON.stringify(presets)]
    );

    // Build a stable map of key → resolved final query string
    const queryMap = useMemo(() => {
        const map: Record<string, string> = {};
        for (const [key, q] of Object.entries(queries)) {
            map[key] = buildFinalQuery(q, mergedPresets, combinator);
        }
        return map;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [JSON.stringify(queries), mergedPresets, combinator]);

    const [results, setResults] = useState<MediaQueryResults>(() => {
        const initial: MediaQueryResults = {};
        for (const key of Object.keys(queryMap)) {
            const mql = getOrCreateMQL(queryMap[key]);
            initial[key] = mql ? mql.matches : defaultValue;
        }
        return initial;
    });

    useEffect(() => {
        const mqls: Array<{ key: string; mql: MediaQueryList; handler: (e: MediaQueryListEvent) => void }> = [];

        // Snap to current values
        const current: MediaQueryResults = {};
        for (const [key, finalQuery] of Object.entries(queryMap)) {
            const mql = getOrCreateMQL(finalQuery);
            current[key] = mql ? mql.matches : defaultValue;

            if (mql) {
                const handler = (e: MediaQueryListEvent): void => {
                    setResults((prev) => ({ ...prev, [key]: e.matches }));
                };
                mqls.push({ key, mql, handler });
                addMQLListener(mql, handler);
            }
        }
        setResults(current);

        return () => {
            for (const { mql, handler } of mqls) {
                if (typeof mql.removeEventListener === "function") {
                    mql.removeEventListener("change", handler);
                } else {
                    mql.removeListener(handler);
                }
            }
        };
    }, [queryMap, defaultValue]);

    return results;
}

// ─── Preset shortcuts ─────────────────────────────────────────────────────────

export function useTailwindBreakpoint(breakpoint: keyof typeof TAILWIND_PRESETS | (string & {})): boolean {
    return useMedia(breakpoint);
}

export function useDarkMode(): boolean {
    return useMedia("dark");
}

export function useTouch(): boolean {
    return useMedia("touch");
}

export function useReducedMotion(): boolean {
    return useMedia("motion-reduce");
}

export function useHighContrast(): boolean {
    return useMedia("high-contrast");
}

export function useRetina(): boolean {
    return useMedia("retina");
}

export function usePrint(): boolean {
    return useMedia("print");
}

export default useMediaQuery;