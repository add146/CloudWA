'use client';

import { useEffect, useState } from 'react';

export default function SuperAdminDashboard() {
    const [stats, setStats] = useState({
        totalTenants: 0,
        activeDevices: 0,
        totalRevenue: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const token = localStorage.getItem('super_admin_token');
                if (!token) return;

                const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://cloudwa-flow.khibroh.workers.dev';
                const res = await fetch(`${API_URL}/api/super-admin/stats`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (res.ok) {
                    const data = await res.json();
                    if (data.success) {
                        setStats(data.data);
                    }
                }
            } catch (error) {
                console.error('Failed to fetch stats:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    return (
        <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-6">System Overview</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="text-gray-500 text-sm font-medium">Total Tenants</h3>
                    <p className="text-3xl font-bold text-gray-900 mt-2">
                        {loading ? '...' : stats.totalTenants}
                    </p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="text-gray-500 text-sm font-medium">Active Devices</h3>
                    <p className="text-3xl font-bold text-gray-900 mt-2">
                        {loading ? '...' : stats.activeDevices}
                    </p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="text-gray-500 text-sm font-medium">Total Revenue</h3>
                    <p className="text-3xl font-bold text-gray-900 mt-2">
                        {loading ? '...' : `$${stats.totalRevenue.toFixed(2)}`}
                    </p>
                </div>
            </div>
        </div>
    );
}
