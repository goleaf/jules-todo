import {
    Fragment,
    createContext,
    createElement,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useSyncExternalStore,
    type CSSProperties,
    type PropsWithChildren,
    type ReactElement,
} from 'react';

/**
 * Shape exposed by the announce context and hook.
 */
export interface AnnounceContextValue {
    /**
     * Pushes a new polite screen-reader announcement.
     */
    announce: (message: string) => void;
    /**
     * Clears the currently announced message.
     */
    clear: () => void;
    /**
     * The latest live-region message.
     */
    message: string;
}

/**
 * Visually hidden styles used by the aria-live region.
 */
export const VISUALLY_HIDDEN_LIVE_REGION_STYLE: CSSProperties = {
    position: 'absolute',
    width: '1px',
    height: '1px',
    overflow: 'hidden',
    clip: 'rect(0 0 0 0)',
    whiteSpace: 'nowrap',
};

type AnnouncementListener = () => void;

const CLEAR_DELAY_MS = 2000;

class AnnouncementStore {
    private listeners = new Set<AnnouncementListener>();

    private message = '';

    private clearTimer: ReturnType<typeof globalThis.setTimeout> | null = null;

    subscribe = (listener: AnnouncementListener) => {
        this.listeners.add(listener);

        return () => {
            this.listeners.delete(listener);
        };
    };

    getSnapshot = () => this.message;

    announce = (message: string) => {
        this.clear();
        this.message = message;
        this.emit();

        this.clearTimer = globalThis.setTimeout(() => {
            this.message = '';
            this.clearTimer = null;
            this.emit();
        }, CLEAR_DELAY_MS);
    };

    clear = () => {
        if (this.clearTimer !== null) {
            globalThis.clearTimeout(this.clearTimer);
            this.clearTimer = null;
        }

        if (this.message !== '') {
            this.message = '';
            this.emit();
        }
    };

    private emit() {
        this.listeners.forEach((listener) => listener());
    }
}

const fallbackStore = new AnnouncementStore();
const AnnounceContext = createContext<AnnounceContextValue | null>(null);

/**
 * Provider that renders the hidden aria-live region once and exposes the
 * announce API to the component tree via React context.
 *
 * @param props The provider children.
 * @returns The provider and live-region markup.
 */
export function AnnounceProvider({
    children,
}: PropsWithChildren): ReactElement {
    const message = useSyncExternalStore(
        fallbackStore.subscribe,
        fallbackStore.getSnapshot,
        fallbackStore.getSnapshot,
    );
    const liveRegionRef = useRef<HTMLDivElement | null>(null);

    const value = useMemo<AnnounceContextValue>(() => ({
        announce: fallbackStore.announce,
        clear: fallbackStore.clear,
        message,
    }), [message]);

    useEffect(() => {
        if (liveRegionRef.current) {
            liveRegionRef.current.textContent = message;
        }
    }, [message]);

    return createElement(
        AnnounceContext.Provider,
        { value },
        createElement(
            Fragment,
            null,
            createElement('div', {
                ref: liveRegionRef,
                role: 'status',
                'aria-live': 'polite',
                'aria-atomic': 'true',
                style: VISUALLY_HIDDEN_LIVE_REGION_STYLE,
            }),
            children,
        ),
    );
}

/**
 * Returns the current announce API.
 *
 * When used outside of `AnnounceProvider`, the hook falls back to a shared
 * singleton store so existing components continue to work safely.
 *
 * @returns The announce function and current live-region message.
 */
export function useAnnounce(): AnnounceContextValue {
    const context = useContext(AnnounceContext);
    const fallbackMessage = useSyncExternalStore(
        fallbackStore.subscribe,
        fallbackStore.getSnapshot,
        fallbackStore.getSnapshot,
    );

    const fallbackValue = useMemo<AnnounceContextValue>(() => ({
        announce: fallbackStore.announce,
        clear: fallbackStore.clear,
        message: fallbackMessage,
    }), [fallbackMessage]);

    return context ?? fallbackValue;
}
