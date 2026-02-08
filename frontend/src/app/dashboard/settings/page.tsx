'use client';

import { useState, useEffect } from 'react';
// Icons replaced with emojis - lucide-react removed
// import { Save, Server, Key, Info } from 'lucide-react';

interface Settings {
    waha?: {
        baseUrl?: string;
        apiKey?: string;
    };
}

// Get API URL from env or fallback to production backend
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://cloudwa-flow.khibroh.workers.dev';

export default function SettingsPage() {
    const [settings, setSettings] = useState<Settings>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const getAuthHeaders = () => {
        const token = localStorage.getItem('token');
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };
    };

    // Fetch settings on load
    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await fetch(`${API_URL}/api/settings`, {
                    headers: getAuthHeaders()
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data.success) {
                        setSettings(data.data || {});
                    }
                }
            } catch (error) {
                console.error('Failed to load settings', error);
            } finally {
                setLoading(false);
            }
        };

        fetchSettings();
    }, []);

    const handleChange = (field: 'baseUrl' | 'apiKey', value: string) => {
        setSettings(prev => ({
            ...prev,
            waha: {
                ...(prev.waha || {}),
                [field]: value
            }
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage(null);

        try {
            const res = await fetch(`${API_URL}/api/settings`, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify(settings),
            });

            const data = await res.json();

            if (data.success) {
                setMessage({ type: 'success', text: 'Settings saved successfully!' });
            } else {
                setMessage({ type: 'error', text: data.error || 'Failed to save settings' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Network error. Failed to save settings.' });
        } finally {
            setSaving(false);
        }
    };


    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    return (
        <div className="container mx-auto max-w-4xl p-6">
            <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <span>🖥️</span>
                System Settings
            </h1>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold mb-4 text-gray-800 border-b pb-2">
                    WhatsApp Gateway Configuration (BYOS)
                </h2>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <div className="flex gap-3">
                        <span className="text-blue-600 flex-shrink-0 mt-0.5">ℹ️</span>
                        <div className="text-sm text-blue-800">
                            <strong>Bring Your Own Server (BYOS):</strong><br />
                            Configure your own WAHA (WhatsApp HTTP API) server here. This allows you to process
                            WhatsApp messages using your own infrastructure.
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid gap-6 md:grid-cols-2">
                        {/* WAHA Base URL */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                <span>🖥️</span>
                                WAHA Base URL
                            </label>
                            <input
                                type="url"
                                placeholder="https://waha.yourdomain.com"
                                value={settings.waha?.baseUrl || ''}
                                onChange={(e) => handleChange('baseUrl', e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                                required
                            />
                            <p className="text-xs text-gray-500">
                                The URL where your WAHA instance is running (include http/https and port if needed).
                            </p>
                        </div>

                        {/* WAHA API Key */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                <span>🔑</span>
                                WAHA API Key
                            </label>
                            <input
                                type="password"
                                placeholder="secret_api_key"
                                value={settings.waha?.apiKey || ''}
                                onChange={(e) => handleChange('apiKey', e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                            />
                            <p className="text-xs text-gray-500">
                                The API Key configured in your WAHA settings (leave empty if none).
                            </p>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <div className="flex items-center justify-between pt-4 border-t mt-6">
                        <div className="text-sm">
                            {message && (
                                <span className={`font-medium ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                                    {message.text}
                                </span>
                            )}
                        </div>
                        <button
                            type="submit"
                            disabled={saving}
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {saving ? (
                                <>
                                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <span>💾</span>
                                    Save Configuration
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
