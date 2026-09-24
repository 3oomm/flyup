import NavbarDashboard from '@/components/NavbarDashboard'
import SidebarAdmin from '@/components/SidebarAdmin'
import { useEffect, useState, startTransition } from 'react';
import { Outlet, useLocation } from 'react-router'

const AdminLayout = () => {
    const location = useLocation();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    useEffect(() => {
        startTransition(() => setIsSidebarOpen(false))
    }, [location])

    return (
        <div className='admin-responsive flex min-h-screen bg-background overflow-x-hidden'>
            <div className={`fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <SidebarAdmin />
            </div>

            {
                isSidebarOpen && (<div className='fixed inset-0 bg-black-20 z-40 lg:hidden' onClick={() => setIsSidebarOpen(false)} />)
            }

            <div className='flex-1 flex flex-col min-w-0'>
                <NavbarDashboard onOpenSidebar={() => setIsSidebarOpen(true)} />
                <main className='flex-1 min-w-0 overflow-x-hidden overflow-y-auto p-3 sm:p-4 xl:p-8'>
                    <div className='mx-auto w-full min-w-0 max-w-7xl'>
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    )
}

export default AdminLayout
