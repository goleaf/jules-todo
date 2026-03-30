import { Head } from '@inertiajs/react';
import {
    createContext,
    lazy,
    Suspense,
    useEffect,
    useRef,
    useState,
    type PropsWithChildren,
    type RefObject,
} from 'react';
import { useShallow } from 'zustand/react/shallow';

import { AnnounceProvider } from '../../hooks/useAnnounce';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { cn } from '../../lib/utils';
import { useAppStore } from '../../stores/useAppStore';
import type { AccentColor, FontSize, Theme } from '../../types';
import TodoDetailPanel from '../todos/TodoDetailPanel';
import { Skeleton } from '../ui/skeleton';
import { Toaster } from '../ui/sonner';
import MobileTopNav from './MobileTopNav';
import Sidebar from './Sidebar';

const LazySearchOverlay = lazy(() => import('../search/SearchOverlay'));

/**
 * Responsive layout modes used by the app shell.
 */
export type AppLayoutMode = 'mobile' | 'tablet' | 'desktop';

/**
 * Shared create-input ref context used by the layout-level shortcut hook.
 */
export const CreateInputRefContext =
    createContext<RefObject<HTMLInputElement | null> | null>(null);

/**
 * Accent-token channels applied to the document root for a given accent theme.
 */
export interface AccentThemeVariables {
    /**
     * The sidebar/list accent channel value.
     */
    '--accent': string;
    /**
     * Foreground color used on accent backgrounds.
     */
    '--accent-foreground': string;
    /**
     * Primary brand color channel value.
     */
    '--primary': string;
    /**
     * Foreground color used on primary backgrounds.
     */
    '--primary-foreground': string;
    /**
     * Focus ring channel value.
     */
    '--ring': string;
}

/**
 * Static accent theme map keyed by the persisted accent color name.
 */
export const ACCENT_THEME_MAP: Record<AccentColor, AccentThemeVariables> = {
    amber: {
        '--accent': '32 95% 44%',
        '--accent-foreground': '222 47% 11%',
        '--primary': '32 95% 44%',
        '--primary-foreground': '222 47% 11%',
        '--ring': '32 95% 44%',
    },
    blue: {
        '--accent': '221 83% 53%',
        '--accent-foreground': '0 0% 100%',
        '--primary': '221 83% 53%',
        '--primary-foreground': '0 0% 100%',
        '--ring': '221 83% 53%',
    },
    emerald: {
        '--accent': '161 94% 30%',
        '--accent-foreground': '222 47% 11%',
        '--primary': '161 94% 30%',
        '--primary-foreground': '222 47% 11%',
        '--ring': '161 94% 30%',
    },
    indigo: {
        '--accent': '243 75% 59%',
        '--accent-foreground': '0 0% 100%',
        '--primary': '243 75% 59%',
        '--primary-foreground': '0 0% 100%',
        '--ring': '243 75% 59%',
    },
    pink: {
        '--accent': '333 71% 51%',
        '--accent-foreground': '0 0% 100%',
        '--primary': '333 71% 51%',
        '--primary-foreground': '0 0% 100%',
        '--ring': '333 71% 51%',
    },
    purple: {
        '--accent': '262 83% 58%',
        '--accent-foreground': '0 0% 100%',
        '--primary': '262 83% 58%',
        '--primary-foreground': '0 0% 100%',
        '--ring': '262 83% 58%',
    },
    red: {
        '--accent': '0 72% 51%',
        '--accent-foreground': '0 0% 100%',
        '--primary': '0 72% 51%',
        '--primary-foreground': '0 0% 100%',
        '--ring': '0 72% 51%',
    },
    teal: {
        '--accent': '175 77% 26%',
        '--accent-foreground': '0 0% 100%',
        '--primary': '175 77% 26%',
        '--primary-foreground': '0 0% 100%',
        '--ring': '175 77% 26%',
    },
};

const TABLET_BREAKPOINT = 768;
const DESKTOP_BREAKPOINT = 1024;
const SIDEBAR_COLLAPSED_STORAGE_KEY = 'sidebar_collapsed';
const FONT_SIZE_VALUE_MAP: Record<FontSize, string> = {
    large: '18px',
    medium: '16px',
    small: '14px',
};

/**
 * Props accepted by the app layout shell.
 */
export interface AppLayoutProps extends PropsWithChildren {
    /**
     * Optional page title pushed into the Inertia document head.
     */
    title?: string;
}

/**
 * Returns the responsive app layout mode for a viewport width.
 *
 * @param width The current viewport width.
 * @returns The matching layout mode.
 */
export function getAppLayoutMode(width: number): AppLayoutMode {
    if (width < TABLET_BREAKPOINT) {
        return 'mobile';
    }

    if (width <= DESKTOP_BREAKPOINT) {
        return 'tablet';
    }

    return 'desktop';
}

/**
 * Resolves whether the dark theme class should be active.
 *
 * @param theme The persisted theme preference.
 * @param prefersDark Whether the operating system currently prefers dark mode.
 * @returns `true` when the `dark` class should be applied.
 */
export function shouldUseDarkTheme(
    theme: Theme,
    prefersDark: boolean,
): boolean {
    if (theme === 'dark') {
        return true;
    }

    if (theme === 'light') {
        return false;
    }

    return prefersDark;
}

/**
 * Resolves the initial sidebar-collapsed state before the store is hydrated.
 *
 * @param storedValue The persisted localStorage value, if any.
 * @param viewportWidth The current viewport width.
 * @returns The sidebar collapsed state to use for the first render.
 */
export function getInitialSidebarCollapsed(
    storedValue: string | null,
    viewportWidth: number,
): boolean {
    if (storedValue === 'true') {
        return true;
    }

    if (storedValue === 'false') {
        return false;
    }

    return getAppLayoutMode(viewportWidth) === 'tablet';
}

/**
 * Returns the CSS variable channels for the active accent theme.
 *
 * @param accentColor The selected accent color.
 * @returns The document-root variables to apply.
 */
export function getAccentThemeVariables(
    accentColor: AccentColor,
): AccentThemeVariables {
    return ACCENT_THEME_MAP[accentColor];
}

/**
 * App-level shell that owns theme tokens, sidebar sizing, keyboard shortcuts,
 * overlay mounting, and the shared live-region provider.
 *
 * @param props The layout props and page content.
 * @returns The rendered application shell.
 */
export default function AppLayout({
    children,
    title,
}: AppLayoutProps) {
    const createInputRef = useRef<HTMLInputElement | null>(null);
    const [viewportWidth, setViewportWidth] = useState(() =>
        typeof window === 'undefined' ? 1280 : window.innerWidth,
    );
    const [initialSidebarCollapsed] = useState(() => {
        if (typeof window === 'undefined') {
            return false;
        }

        return getInitialSidebarCollapsed(
            window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY),
            window.innerWidth,
        );
    });
    const [sidebarInitialized, setSidebarInitialized] = useState(false);

    useKeyboardShortcuts({ createInputRef });

    const {
        isSearchOpen,
        selectedTodoId,
        setSidebarCollapsed,
        settings,
        sidebarCollapsed,
    } = useAppStore(
        useShallow((state) => ({
            isSearchOpen: state.isSearchOpen,
            selectedTodoId: state.selectedTodoId,
            setSidebarCollapsed: state.setSidebarCollapsed,
            settings: state.settings,
            sidebarCollapsed: state.sidebarCollapsed,
        })),
    );

    const layoutMode = getAppLayoutMode(viewportWidth);
    const resolvedSidebarCollapsed = sidebarInitialized
        ? sidebarCollapsed
        : initialSidebarCollapsed;
    const shouldReserveDetailPanelSpace =
        layoutMode === 'desktop' && selectedTodoId !== null;

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        function handleResize() {
            setViewportWidth(window.innerWidth);
        }

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    useEffect(() => {
        setSidebarCollapsed(initialSidebarCollapsed);
        setSidebarInitialized(true);
    }, [initialSidebarCollapsed, setSidebarCollapsed]);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const root = document.documentElement;

        const applyThemeClass = () => {
            root.classList.toggle(
                'dark',
                shouldUseDarkTheme(settings.theme, mediaQuery.matches),
            );
        };

        applyThemeClass();
        mediaQuery.addEventListener('change', applyThemeClass);

        return () => {
            mediaQuery.removeEventListener('change', applyThemeClass);
        };
    }, [settings.theme]);

    useEffect(() => {
        if (typeof document === 'undefined') {
            return;
        }

        const root = document.documentElement;
        const accentVariables = getAccentThemeVariables(settings.accentColor);

        Object.entries(accentVariables).forEach(([property, value]) => {
            root.style.setProperty(property, value);
        });
    }, [settings.accentColor]);

    useEffect(() => {
        if (typeof document === 'undefined') {
            return;
        }

        document.documentElement.style.fontSize =
            FONT_SIZE_VALUE_MAP[settings.fontSize];
    }, [settings.fontSize]);

    return (
        <AnnounceProvider>
            <CreateInputRefContext.Provider value={createInputRef}>
                {title ? <Head title={title} /> : null}

                <div
                    className={cn(
                        'flex h-dvh w-full overflow-hidden bg-background text-foreground',
                        '[--detail-panel-width:22.5rem]',
                        '[--sidebar-collapsed-width:4rem]',
                        '[--sidebar-transition:200ms]',
                        '[--sidebar-width:15rem]',
                    )}
                >
                    <div
                        data-collapsed={resolvedSidebarCollapsed}
                        className={cn(
                            'hidden shrink-0 md:block',
                            'w-[var(--sidebar-width)]',
                            'transition-[width] ease-in-out [transition-duration:var(--sidebar-transition)]',
                            'data-[collapsed=true]:w-[var(--sidebar-collapsed-width)]',
                        )}
                    >
                        <Sidebar />
                    </div>

                    <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                        <MobileTopNav />

                        <div className="flex min-h-0 flex-1 min-w-0">
                            <main role="main" className="flex-1 overflow-y-auto">
                                {children}
                            </main>

                            {shouldReserveDetailPanelSpace ? (
                                <div
                                    className="hidden shrink-0 lg:block w-[var(--detail-panel-width)]"
                                    aria-hidden="true"
                                />
                            ) : null}
                        </div>
                    </div>
                </div>

                {isSearchOpen ? (
                    <Suspense fallback={<SearchOverlayFallback />}>
                        <LazySearchOverlay />
                    </Suspense>
                ) : null}
                <TodoDetailPanel />
                <Toaster
                    position="bottom-center"
                    richColors
                    closeButton
                    expand={false}
                    visibleToasts={3}
                    duration={4000}
                />
            </CreateInputRefContext.Provider>
        </AnnounceProvider>
    );
}

function SearchOverlayFallback() {
    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-background/80 px-4 pt-[12vh] backdrop-blur-sm">
            <div className="w-full max-w-[560px] rounded-xl border border-border bg-background shadow-xl">
                <div className="border-b border-border p-4">
                    <Skeleton className="h-10 w-full rounded-md" />
                </div>
                <div className="space-y-3 p-4">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-11 w-full rounded-md" />
                    <Skeleton className="h-11 w-full rounded-md" />
                    <Skeleton className="h-11 w-full rounded-md" />
                </div>
            </div>
        </div>
    );
}
