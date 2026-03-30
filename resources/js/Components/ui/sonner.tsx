import {
    CircleCheck,
    Info,
    LoaderCircle,
    OctagonX,
    TriangleAlert,
} from 'lucide-react';
import { useEffect, useState, type ComponentProps } from 'react';
import { Toaster as Sonner } from 'sonner';

import { useAppStore } from '../../stores/useAppStore';

type ToasterProps = ComponentProps<typeof Sonner>;

function resolveToasterTheme(theme: 'light' | 'dark' | 'system') {
    if (typeof window === 'undefined') {
        return 'light' as const;
    }

    if (theme === 'system') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches
            ? 'dark'
            : 'light';
    }

    return theme;
}

const Toaster = ({ ...props }: ToasterProps) => {
    const theme = useAppStore((state) => state.settings.theme);
    const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() =>
        resolveToasterTheme(theme),
    );

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const syncTheme = () => {
            setResolvedTheme(resolveToasterTheme(theme));
        };

        syncTheme();
        mediaQuery.addEventListener('change', syncTheme);

        return () => {
            mediaQuery.removeEventListener('change', syncTheme);
        };
    }, [theme]);

    return (
        <Sonner
            theme={resolvedTheme}
            className="toaster group"
            icons={{
                success: <CircleCheck className="h-4 w-4" />,
                info: <Info className="h-4 w-4" />,
                warning: <TriangleAlert className="h-4 w-4" />,
                error: <OctagonX className="h-4 w-4" />,
                loading: <LoaderCircle className="h-4 w-4 animate-spin" />,
            }}
            toastOptions={{
                classNames: {
                    toast:
                        'group toast group-[.toaster]:border-border group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:shadow-lg',
                    description: 'group-[.toast]:text-muted-foreground',
                    actionButton:
                        'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
                    cancelButton:
                        'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
                },
            }}
            {...props}
        />
    );
};

export { Toaster };
