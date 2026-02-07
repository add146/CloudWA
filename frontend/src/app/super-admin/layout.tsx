'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
    ShieldCheck,
    Users,
    Settings,
    LogOut,
    LayoutDashboard,
    Server,
    Database
} from 'lucide-react';
import { useState, useEffect } from 'react';

export default function SuperAdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const router = useRouter();
    const [user, setUser] = useState<any>(null);

    // Skip layout for login page
    if (pathname === '/super-admin/login') {
        return <>{children}</>;
    }

    useEffect(() => {
        // Check auth
        const token = localStorage.getItem('super_admin_token');
        if (!token) {
            router.push('/super-admin/login');
            return;
        }

        const userStr = localStorage.getItem('super_admin_user');
        if (userStr) {
            setUser(JSON.parse(userStr));
        }
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('super_admin_token');
        localStorage.removeItem('super_admin_user');
        router.push('/super-admin/login');
    };

    const navigation = [
        { name: 'Overview', href: '/super-admin/dashboard', icon: LayoutDashboard },
        { name: 'Tenants', href: '/super-admin/tenants', icon: Users },
        { name: 'AI Providers', href: '/super-admin/ai', icon: Server },
        { name: 'Plans', href: '/super-admin/plans', icon: Database },
        { name: 'Settings', href: '/super-admin/settings', icon: Settings },
    ];

    return (
        <div className="min-h-screen bg-gray-100 flex">
            {/* Sidebar */}
            <aside className="w-64 bg-gray-900 border-r border-gray-800 text-white flex-shrink-0">
                <div className="h-16 flex items-center px-6 border-b border-gray-800 gap-3">
                    <ShieldCheck className="h-6 w-6 text-red-500" />
                    <span className="text-lg font-bold">CloudWA Admin</span>
                </div>

                <nav className="p-4 space-y-1">
                    {navigation.map((item) => {
                        const isActive = pathname.startsWith(item.href);
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive
                                        ? 'bg-red-600 text-white'
                                        : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                                    }`}
                            >
                                <item.icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>

                <div className="absolute bottom-0 w-64 p-4 border-t border-gray-800 bg-gray-900">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="h-10 w-10 rounded-full bg-red-900/50 flex items-center justify-center text-red-500 font-bold border border-red-900">
                            {user?.name?.[0]?.toUpperCase() || 'A'}
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-sm font-medium text-white truncate">{user?.name}</p>
                            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm font-medium text-red-400 hover:bg-red-900/30 rounded-lg transition"
                    >
                        <LogOut className="h-5 w-5" />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto p-8">
                {children}
            </main>
        </div>
    );
}
