import { useEffect, useState, startTransition } from "react"
import { Outlet, useLocation } from "react-router"
import SidebarPioneer from "../components/SidebarPioneer"
import NavbarDashboard from "../components/NavbarDashboard"
import { useAuthStore } from "../store/useAuthStore"

const PioneerLayout = () => {
    const location = useLocation();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const { checkAuth } = useAuthStore();

    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    useEffect(() => {
        startTransition(() => setIsSidebarOpen(false))
    }, [location])

    return (
        <div className="flex min-h-screen bg-background font-kanit overflow-x-hidden">
            <div className={`fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
                <SidebarPioneer />
            </div>

            {isSidebarOpen && (
                <div className="fixed inset-0 bg-black/20 z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)} />
            )}

            <div className="flex-1 flex flex-col min-w-0">
                <NavbarDashboard onOpenSidebar={() => setIsSidebarOpen(true)} />

                <main className="flex-1 min-w-0 p-[16px] lg:p-[32px] overflow-x-hidden overflow-y-auto">
                    <div className="mx-auto w-full min-w-0 max-w-7xl">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    )
}

export default PioneerLayout
