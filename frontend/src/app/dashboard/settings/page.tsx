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

            {/* AI Settings Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mt-8">
                <h2 className="text-lg font-semibold mb-4 text-gray-800 border-b pb-2 flex items-center gap-2">
                    <span>🤖</span> AI Configuration (BYOK)
                </h2>

                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
                    <div className="flex gap-3">
                        <span className="text-purple-600 flex-shrink-0 mt-0.5">ℹ️</span>
                        <div className="text-sm text-purple-800">
                            <strong>Bring Your Own Key (BYOK):</strong><br />
                            Configure your AI Provider keys here to enable AI features in your flows.
                            Your keys are stored securely and only used for your workspace.
                        </div>
                    </div>
                </div>

                <AISettingsForm />
            </div>
        </div>
    );
}

function AISettingsForm() {
    const [providers, setProviders] = useState<any[]>([]);
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

    useEffect(() => {
        fetchProviders();
    }, []);

    const fetchProviders = async () => {
        try {
            // showAll=true ensures Settings page gets all providers for configuration
            const res = await fetch(`${API_URL}/api/settings/ai?showAll=true`, {
                headers: getAuthHeaders()
            });
            if (res.ok) {
                const data = await res.json();
                if (data.success) {
                    setProviders(data.data);
                }
            }
        } catch (error) {
            console.error('Failed to load AI settings', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveKey = async (providerId: string, apiKey: string) => {
        setSaving(true);
        setMessage(null);
        try {
            const res = await fetch(`${API_URL}/api/settings/ai`, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    providerId,
                    apiKey,
                    // If saving a key, we also ensure it's enabled
                    isEnabled: true
                }),
            });
            const data = await res.json();
            if (data.success) {
                setMessage({ type: 'success', text: 'AI Key saved successfully!' });
                fetchProviders(); // Refresh to show masked key
            } else {
                setMessage({ type: 'error', text: data.error || 'Failed to save' });
            }
        } catch (e) {
            setMessage({ type: 'error', text: 'Network error' });
        } finally {
            setSaving(false);
        }
    };

    const handleToggle = async (providerId: string, currentEnabled: boolean) => {
        setSaving(true);
        setMessage(null);
        try {
            const res = await fetch(`${API_URL}/api/settings/ai`, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    providerId,
                    isEnabled: !currentEnabled,
                }),
            });
            const data = await res.json();
            if (data.success) {
                fetchProviders(); // Refresh
            } else {
                setMessage({ type: 'error', text: data.error || 'Failed to toggle' });
            }
        } catch (e) {
            setMessage({ type: 'error', text: 'Network error' });
        } finally {
            setSaving(false);
        }
    };

    const handleActivateFree = async (providerId: string) => {
        setSaving(true);
        setMessage(null);
        try {
            // For Cloudflare/Free providers, we just enable them without an API key
            const res = await fetch(`${API_URL}/api/settings/ai`, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    providerId,
                    isEnabled: true,
                    apiKey: '', // Clear any key just in case, or leave as is
                }),
            });
            const data = await res.json();
            if (data.success) {
                setMessage({ type: 'success', text: 'Provider activated successfully!' });
                fetchProviders();
            } else {
                setMessage({ type: 'error', text: data.error || 'Failed to activate' });
            }
        } catch (e) {
            setMessage({ type: 'error', text: 'Network error' });
        } finally {
            setSaving(false);
        }
    }

    if (loading) return <div className="text-center py-4 text-gray-500">Loading AI settings...</div>;

    return (
        <div className="space-y-4">
            {message && (
                <div className={`text-sm font-medium ${message.type === 'success' ? 'text-green-600' : 'text-red-600'} mb-2`}>
                    {message.text}
                </div>
            )}

            {providers.map((provider) => {
                const isEnabled = provider.tenantSetting?.isEnabled === true;
                const hasApiKey = provider.tenantSetting?.hasApiKey;

                // Check if this is a "Free" provider (like Cloudflare AI) that doesn't strictly need a key
                // We identify this by checking if it allows blank keys or by specific provider ID/Name
                // For now, hardcode check for 'workers_ai' or check if it's "Free" in name
                const isFreeProvider = provider.provider === 'workers_ai' || provider.displayName.includes('(Free)');
                const needsApiKey = !isFreeProvider;

                return (
                    <div key={provider.id} className={`bg-white rounded-xl shadow-sm border ${isEnabled ? 'border-blue-200' : 'border-gray-200'} overflow-hidden transition-all`}>
                        <div className="p-5">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3">
                                        <h3 className="text-lg font-semibold text-gray-900">{provider.displayName}</h3>
                                        {provider.modelId && (
                                            <span className="text-xs px-2 py-0.5 bg-gray-100 rounded-full text-gray-600 font-mono">
                                                {provider.modelId}
                                            </span>
                                        )}
                                        {isEnabled ? (
                                            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                                Active
                                            </span>
                                        ) : (
                                            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-gray-100 text-gray-500">
                                                Not Configured
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-500 mt-1">
                                        {isFreeProvider ? 'Uses system binding (No API Key required)' : 'Configure your own API key to use this provider.'}
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => handleToggle(provider.id, isEnabled)}
                                        disabled={saving || (!hasApiKey && needsApiKey && !isEnabled)} // Disable toggle if needs key but doesn't have one
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isEnabled ? 'bg-blue-600' : 'bg-gray-200'
                                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                                    >
                                        <span
                                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isEnabled ? 'translate-x-6' : 'translate-x-1'
                                                }`}
                                        />
                                    </button>
                                </div>
                            </div>

                            {/* Configuration Area */}
                            <div className="mt-4 pt-4 border-t border-gray-100">
                                {isFreeProvider ? (
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm text-gray-600">
                                            This provider is free and ready to use.
                                        </p>
                                        {!isEnabled && (
                                            <button
                                                onClick={() => handleActivateFree(provider.id)}
                                                disabled={saving}
                                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition"
                                            >
                                                Activate Now
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">API Key</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="password"
                                                placeholder={provider.tenantSetting?.maskedApiKey || "sk-..."}
                                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                onChange={(e) => {
                                                    // Store temporarily in DOM or local state if needed, 
                                                    // but for simplicity we rely on 'Save' reading the input
                                                    // (No-op here, real value read on save)
                                                }}
                                            />
                                            <button
                                                onClick={(e) => {
                                                    const input = (e.currentTarget.previousElementSibling as HTMLInputElement);
                                                    if (input.value) {
                                                        handleSaveKey(provider.id, input.value);
                                                        input.value = '';
                                                    }
                                                }}
                                                disabled={saving}
                                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition disabled:brightness-75"
                                            >
                                                Save
                                            </button>
                                        </div>
                                        {hasApiKey && (
                                            <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                                                <span>✓</span> Key configured: {provider.tenantSetting.maskedApiKey}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}

            {providers.length === 0 && (
                <div className="text-center text-gray-500 py-8 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                    No AI providers available. Please contact Super Admin.
                </div>
            )}
        </div>
    );
}
