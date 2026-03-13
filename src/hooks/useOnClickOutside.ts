import { useEffect, useRef, useCallback } from "react";
import type { RefObject } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type AnyEvent = MouseEvent | TouchEvent | PointerEvent;
type EventType = "mousedown" | "mouseup" | "touchstart" | "touchend" | "pointerdown" | "pointerup";

interface UseOnClickOutsideOptions {
    enabled?: boolean;
    eventType?: EventType;
    ignoreRefs?: RefObject<HTMLElement | null>[];
    listenForEscape?: boolean;
    onEscape?: () => void;
}

// ─── Portal-aware containment check ──────────────────────────────────────────
// Handles clicks inside React portals which render outside the DOM tree

function isInsideRef(
    target: Node,
    ref: RefObject<HTMLElement | null>
): boolean {
    if (!ref.current) return false;

    // Standard DOM containment
    if (ref.current.contains(target)) return true;

    // Shadow DOM support
    let node: Node | null = target;
    while (node) {
        if (node === ref.current) return true;
        // Traverse shadow root boundaries
        const root = (node as Element).getRootNode?.();
        if (root instanceof ShadowRoot) {
            if (ref.current.contains(root.host)) return true;
            node = root.host;
        } else {
            node = (node as Element).parentElement;
        }
    }

    return false;
}

// ─── Core hook ────────────────────────────────────────────────────────────────

export function useOnClickOutside<T extends HTMLElement>(
    ref: RefObject<T | null>,
    handler: (event: AnyEvent) => void,
    options: UseOnClickOutsideOptions = {}
): void {
    const {
        enabled = true,
        eventType = "pointerdown",
        ignoreRefs = [],
        listenForEscape = false,
    } = options;

    // Always call latest handler without re-registering listeners
    const handlerRef = useRef(handler);
    useEffect(() => { handlerRef.current = handler; });

    const optionsRef = useRef(options);
    useEffect(() => { optionsRef.current = options; });

    const handleEvent = useCallback((event: AnyEvent): void => {
        const target = event.target as Node;

        if (isInsideRef(target, ref)) return;

        for (const ignoreRef of ignoreRefs) {
            if (isInsideRef(target, ignoreRef)) return;
        }

        handlerRef.current(event);
    }, [ref, ignoreRefs]);

    const handleKeyDown = useCallback((event: KeyboardEvent): void => {
    if (event.key === "Escape") {
        optionsRef.current.onEscape?.();
    }
}, []);

    useEffect(() => {
        if (!enabled) return;

        const opts: AddEventListenerOptions = { passive: true, capture: true };

        document.addEventListener(
            eventType,
            handleEvent as EventListener,
            opts
        );

        if (listenForEscape) {
            document.addEventListener("keydown", handleKeyDown);
        }

        return () => {
            document.removeEventListener(
                eventType,
                handleEvent as EventListener,
                opts
            );
            if (listenForEscape) {
                document.removeEventListener("keydown", handleKeyDown);
            }
        };
    }, [enabled, eventType, handleEvent, handleKeyDown, listenForEscape]);
}

// ─── Multiple refs variant ────────────────────────────────────────────────────

export function useOnClickOutsideMultiple<T extends HTMLElement>(
    refs: RefObject<T | null>[],
    handler: (event: AnyEvent) => void,
    options: UseOnClickOutsideOptions = {}
): void {
    const {
        enabled = true,
        eventType = "pointerdown",
        ignoreRefs = [],
        listenForEscape = false,
    } = options;

    const handlerRef = useRef(handler);
    useEffect(() => { handlerRef.current = handler; });

    const optionsRef = useRef(options);
    useEffect(() => { optionsRef.current = options; });

    const handleEvent = useCallback((event: AnyEvent): void => {
        const target = event.target as Node;

        for (const ref of refs) {
            if (isInsideRef(target, ref)) return;
        }

        for (const ignoreRef of ignoreRefs) {
            if (isInsideRef(target, ignoreRef)) return;
        }

        handlerRef.current(event);
    }, [refs, ignoreRefs]);

    const handleKeyDown = useCallback((event: KeyboardEvent): void => {
    if (event.key === "Escape") {
        optionsRef.current.onEscape?.();
    }
}, []);

    useEffect(() => {
        if (!enabled) return;

        const opts: AddEventListenerOptions = { passive: true, capture: true };

        document.addEventListener(eventType, handleEvent as EventListener, opts);

        if (listenForEscape) {
            document.addEventListener("keydown", handleKeyDown);
        }

        return () => {
            document.removeEventListener(eventType, handleEvent as EventListener, opts);
            if (listenForEscape) {
                document.removeEventListener("keydown", handleKeyDown);
            }
        };
    }, [enabled, eventType, handleEvent, handleKeyDown, listenForEscape]);
}

// ─── Auto-ref variant — returns a ref, no need to create one manually ─────────

export function useClickOutsideRef<T extends HTMLElement>(
    handler: (event: AnyEvent) => void,
    options: UseOnClickOutsideOptions = {}
): RefObject<T | null> {
    const ref = useRef<T | null>(null);
    useOnClickOutside(ref, handler, options);
    return ref;
}

export default useOnClickOutside;