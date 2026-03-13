import { useEffect, useRef, useCallback } from "react";
import type { RefObject } from "react";

// ─── Stable defaults ──────────────────────────────────────────────────────────

const EMPTY_REFS: RefObject<HTMLElement | null>[] = [];
const EMPTY_KEYS: string[] = [];

// ─── Types ────────────────────────────────────────────────────────────────────

export type AnyPointerEvent = MouseEvent | TouchEvent | PointerEvent;

export type ClickOutsideEventType =
    | "mousedown"
    | "mouseup"
    | "touchstart"
    | "touchend"
    | "pointerdown"
    | "pointerup"
    | "click";

export interface UseOnClickOutsideOptions {
    /** Disable without unmounting — defaults to true */
    enabled?: boolean;
    /** Pointer event type to listen on — defaults to "pointerdown" */
    eventType?: ClickOutsideEventType;
    /** Refs whose subtrees are treated as "inside" */
    ignoreRefs?: RefObject<HTMLElement | null>[];
    /** CSS selectors — clicks on matching elements are ignored */
    ignoreSelectors?: string[];
    /** Enable keyboard dismiss — defaults to false */
    listenForKeys?: boolean;
    /** Keys that trigger dismiss — defaults to ["Escape"] */
    dismissKeys?: string[];
    /** Called when a dismiss key is pressed, receives the key string */
    onDismissKey?: (key: string) => void;
    /** Called on every outside click (in addition to handler) */
    onOutside?: (event: AnyPointerEvent) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Portal-aware + Shadow DOM containment check.
 * Handles clicks inside React portals which render outside the DOM tree.
 */
function isInsideRef(
    target: Node,
    ref: RefObject<HTMLElement | null>
): boolean {
    if (!ref.current) return false;

    // Fast path: standard DOM subtree
    if (ref.current.contains(target)) return true;

    // Shadow DOM traversal — walks through shadow root boundaries
    let node: Node | null = target;
    while (node) {
        if (node === ref.current) return true;
        const root = (node as Element).getRootNode?.();
        if (root instanceof ShadowRoot) {
            if (ref.current.contains(root.host)) return true;
            node = root.host;
        } else {
            node = (node as Element).parentElement ?? null;
        }
    }

    return false;
}

/**
 * CSS selector containment check.
 * Returns true if target matches or is a descendant of any selector.
 */
function isInsideSelector(target: Node, selectors: string[]): boolean {
    if (selectors.length === 0) return false;
    const el = target instanceof Element
        ? target
        : (target as Node).parentElement;
    if (!el) return false;
    return selectors.some((selector) => {
        try {
            return el.matches(selector) || el.closest(selector) !== null;
        } catch {
            // Invalid CSS selector — skip silently
            return false;
        }
    });
}

// ─── Shared handler factory ───────────────────────────────────────────────────
// Both useOnClickOutside and useOnClickOutsideMultiple share identical
// dispatch logic — extracted here to eliminate duplication.

interface HandlerRefs {
    handlerRef: RefObject<(event: AnyPointerEvent) => void>;
    optionsRef: RefObject<UseOnClickOutsideOptions>;
}

function buildPointerHandler(
    getRefs: () => RefObject<HTMLElement | null>[],
    { handlerRef, optionsRef }: HandlerRefs
): (event: AnyPointerEvent) => void {
    return (event: AnyPointerEvent): void => {
        const target = event.target as Node;
        const opts = optionsRef.current;

        for (const ref of getRefs()) {
            if (isInsideRef(target, ref)) return;
        }

        for (const ignoreRef of (opts.ignoreRefs ?? EMPTY_REFS)) {
            if (isInsideRef(target, ignoreRef)) return;
        }

        if (isInsideSelector(target, opts.ignoreSelectors ?? EMPTY_KEYS)) return;

        handlerRef.current(event);
        opts.onOutside?.(event);
    };
}

function buildKeyHandler(
    optionsRef: RefObject<UseOnClickOutsideOptions>
): (event: KeyboardEvent) => void {
    return (event: KeyboardEvent): void => {
        const opts = optionsRef.current;
        const keys = opts.dismissKeys ?? ["Escape"];
        if (keys.includes(event.key)) {
            opts.onDismissKey?.(event.key);
        }
    };
}

// ─── Core hook ────────────────────────────────────────────────────────────────

export function useOnClickOutside<T extends HTMLElement>(
    ref: RefObject<T | null>,
    handler: (event: AnyPointerEvent) => void,
    options: UseOnClickOutsideOptions = {}
): void {
    const {
        enabled = true,
        eventType = "pointerdown",
        listenForKeys = false,
    } = options;

    const handlerRef = useRef(handler);
    useEffect(() => { handlerRef.current = handler; });

    const optionsRef = useRef(options);
    useEffect(() => { optionsRef.current = options; });

    const stablePointer = useCallback(
        buildPointerHandler(
            () => [ref as RefObject<HTMLElement | null>],
            { handlerRef, optionsRef }
        ),
        [ref] // eslint-disable-line react-hooks/exhaustive-deps
    );

    const stableKeyDown = useCallback(
        buildKeyHandler(optionsRef),
        [] // eslint-disable-line react-hooks/exhaustive-deps
    );

    useEffect(() => {
        if (!enabled) return;

        // capture: true — fires before stopPropagation on inner elements
        // passive: true — never blocks scroll / touch
        const pointerOpts: AddEventListenerOptions = { capture: true, passive: true };

        document.addEventListener(eventType, stablePointer as EventListener, pointerOpts);

        if (listenForKeys) {
            document.addEventListener("keydown", stableKeyDown);
        }

        return () => {
            document.removeEventListener(eventType, stablePointer as EventListener, pointerOpts);
            if (listenForKeys) {
                document.removeEventListener("keydown", stableKeyDown);
            }
        };
    }, [enabled, eventType, stablePointer, stableKeyDown, listenForKeys]);
}

// ─── Multiple refs variant ────────────────────────────────────────────────────

export function useOnClickOutsideMultiple<T extends HTMLElement>(
    refs: RefObject<T | null>[],
    handler: (event: AnyPointerEvent) => void,
    options: UseOnClickOutsideOptions = {}
): void {
    const {
        enabled = true,
        eventType = "pointerdown",
        listenForKeys = false,
    } = options;

    const handlerRef = useRef(handler);
    useEffect(() => { handlerRef.current = handler; });

    const optionsRef = useRef(options);
    useEffect(() => { optionsRef.current = options; });

    const stablePointer = useCallback(
        buildPointerHandler(
            () => refs as RefObject<HTMLElement | null>[],
            { handlerRef, optionsRef }
        ),
        [refs] // eslint-disable-line react-hooks/exhaustive-deps
    );

    const stableKeyDown = useCallback(
        buildKeyHandler(optionsRef),
        [] // eslint-disable-line react-hooks/exhaustive-deps
    );

    useEffect(() => {
        if (!enabled) return;

        const pointerOpts: AddEventListenerOptions = { capture: true, passive: true };

        document.addEventListener(eventType, stablePointer as EventListener, pointerOpts);

        if (listenForKeys) {
            document.addEventListener("keydown", stableKeyDown);
        }

        return () => {
            document.removeEventListener(eventType, stablePointer as EventListener, pointerOpts);
            if (listenForKeys) {
                document.removeEventListener("keydown", stableKeyDown);
            }
        };
    }, [enabled, eventType, stablePointer, stableKeyDown, listenForKeys]);
}

// ─── Auto-ref variant ─────────────────────────────────────────────────────────

/**
 * Returns a ref to attach directly — no need to create one manually.
 *
 * @example
 * const ref = useClickOutsideRef((e) => setOpen(false), {
 *   listenForKeys: true,
 *   onDismissKey: () => setOpen(false),
 * });
 * return <div ref={ref}>...</div>
 */
export function useClickOutsideRef<T extends HTMLElement>(
    handler: (event: AnyPointerEvent) => void,
    options: UseOnClickOutsideOptions = {}
): RefObject<T | null> {
    const ref = useRef<T | null>(null);
    useOnClickOutside(ref, handler, options);
    return ref;
}

export default useOnClickOutside;