'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
// Icons replaced with emojis - lucide-react removed
// import { ShieldCheck, Lock, Mail, AlertCircle, RefreshCw } from 'lucide-react';

export default function SuperAdminLoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://cloudwa-flow.khibroh.workers.dev';

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await fetch(`${API_URL}/api/auth/super-admin/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (data.success) {
                // Save token and user info
                localStorage.setItem('super_admin_token', data.data.token);
                localStorage.setItem('super_admin_user', JSON.stringify(data.data.user));

                // Redirect to super admin dashboard
                router.push('/super-admin/dashboard');
            } else {
                setError(data.error || 'Invalid credentials');
            }
        } catch (err) {
            setError('Failed to connect to server');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900">
            <div className="max-w-md w-full space-y-8 p-8 bg-gray-800 rounded-xl shadow-2xl border border-gray-700">
                <div className="text-center">
                    <div className="mx-auto h-12 w-12 bg-red-600 rounded-full flex items-center justify-center">
                        <span className="text-2xl">🛡️</span>
                    </div>
                    <h2 className="mt-6 text-3xl font-extrabold text-white">Super Admin</h2>
                    <p className="mt-2 text-sm text-gray-400">
                        Restricted access. Authorized personnel only.
                    </p>
                </div>
                <form className="mt-8 space-y-6" onSubmit={handleLogin}>
                    <div className="rounded-md shadow-sm -space-y-px">
                        <div>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">📧</span>
                                <input
                                    type="email"
                                    required
                                    className="appearance-none rounded-t-md relative block w-full pl-10 px-3 py-3 border border-gray-600 bg-gray-700 placeholder-gray-400 text-white focus:outline-none focus:ring-red-500 focus:border-red-500 focus:z-10 sm:text-sm"
                                    placeholder="Admin Email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                        </div>
                        <div>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">🔒</span>
                                <input
                                    type="password"
                                    required
                                    className="appearance-none rounded-b-md relative block w-full pl-10 px-3 py-3 border border-gray-600 bg-gray-700 placeholder-gray-400 text-white focus:outline-none focus:ring-red-500 focus:border-red-500 focus:z-10 sm:text-sm"
                                    placeholder="Password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-900/50 border border-red-800 text-red-200 p-3 rounded text-sm text-center flex items-center justify-center gap-2">
                            <span>⚠️</span>
                            {error}
                        </div>
                    )}

                    <div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                        >
                            {loading && <span className="animate-spin -ml-1 mr-2">🔄</span>}
                            {loading ? 'Authenticating...' : 'Access Dashboard'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
