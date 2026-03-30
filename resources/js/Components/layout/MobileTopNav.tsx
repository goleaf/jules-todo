import { Menu, Search, CheckSquare } from 'lucide-react';
import { useState } from 'react';

import { useAppStore } from '../../stores/useAppStore';
import { Button } from '../ui/button';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from '../ui/sheet';
import Sidebar, { SidebarPresentationProvider } from './Sidebar';

/**
 * Mobile-only top navigation that owns the sidebar drawer and search trigger.
 *
 * @returns The rendered mobile top navigation bar.
 */
export default function MobileTopNav() {
    const openSearch = useAppStore((state) => state.openSearch);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <>
            <header className="flex h-14 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur md:hidden">
                <Button
                    aria-label="Open navigation menu"
                    size="icon"
                    type="button"
                    variant="ghost"
                    onClick={() => setIsSidebarOpen(true)}
                >
                    <Menu className="h-5 w-5" />
                </Button>

                <div className="flex items-center gap-2">
                    <CheckSquare className="h-5 w-5 text-primary" />
                    <span className="text-sm font-semibold">TodoApp</span>
                </div>

                <Button
                    aria-label="Search tasks"
                    size="icon"
                    type="button"
                    variant="ghost"
                    onClick={openSearch}
                >
                    <Search className="h-5 w-5" />
                </Button>
            </header>

            <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
                <SheetContent
                    side="left"
                    className="w-[min(20rem,100vw)] p-0 data-[state=closed]:animate-[sidebarSlideOut_200ms_ease-in_both] data-[state=open]:animate-[sidebarSlideIn_200ms_ease-out_both]"
                >
                    <SheetHeader className="sr-only">
                        <SheetTitle>Navigation</SheetTitle>
                    </SheetHeader>

                    <SidebarPresentationProvider
                        value={{
                            forceExpanded: true,
                            onNavigate: () => setIsSidebarOpen(false),
                        }}
                    >
                        <Sidebar />
                    </SidebarPresentationProvider>
                </SheetContent>
            </Sheet>
        </>
    );
}
