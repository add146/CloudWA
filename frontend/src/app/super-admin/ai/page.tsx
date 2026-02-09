'use client';

import { useEffect, useState } from 'react';

interface AIProvider {
    id: string;
    provider: 'openai' | 'gemini' | 'workers_ai' | 'hybrid';
    displayName: string;
    modelId: string;
    apiKey: string;
    isActive: boolean;
}

export default function AIProvidersPage() {
    const [providers, setProviders] = useState<AIProvider[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://cloudwa-flow.khibroh.workers.dev';

    // Provider configurations
    const providerConfigs = {
        openai: {
            name: 'OpenAI',
            defaultModel: 'gpt-4o',
            needsApiKey: true,
            description: 'GPT-4, GPT-3.5 Turbo models'
        },
        gemini: {
            name: 'Google Gemini',
            defaultModel: 'gemini-1.5-flash',
            needsApiKey: true,
            description: 'Gemini 1.5 Flash, Pro models'
        },
        hybrid: {
            name: 'Hybrid (Workers AI)',
            defaultModel: '@cf/meta/llama-3.1-8b-instruct',
            needsApiKey: true,
            description: 'Use custom account/token for Workers AI'
        },
        workers_ai: {
            name: 'Cloudflare AI (Free)',
            defaultModel: '@cf/meta/llama-3.1-8b-instruct',
            needsApiKey: false,
            description: 'Free Llama 3.1, Gemma models via binding'
        }
    };

    const fetchProviders = async () => {
        try {
            const token = localStorage.getItem('super_admin_token');
            const res = await fetch(`${API_URL}/api/super-admin/ai-providers`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                if (data.success) {
                    setProviders(data.data);
                }
            }
        } catch (error) {
            console.error('Failed to fetch providers:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProviders();
    }, []);

    const handleToggle = async (providerId: string, currentState: boolean) => {
        setSaving(providerId);
        try {
            const token = localStorage.getItem('super_admin_token');
            const res = await fetch(`${API_URL}/api/super-admin/ai-providers/${providerId}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ isActive: !currentState })
            });

            if (res.ok) {
                fetchProviders();
            } else {
                alert('Failed to update provider');
            }
        } catch (error) {
            alert('Error updating provider');
        } finally {
            setSaving(null);
        }
    };

    const handleSaveApiKey = async (providerId: string, apiKey: string) => {
        setSaving(providerId);
        try {
            const token = localStorage.getItem('super_admin_token');
            const res = await fetch(`${API_URL}/api/super-admin/ai-providers/${providerId}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ apiKey })
            });

            if (res.ok) {
                alert('API Key saved successfully!');
                fetchProviders();
            } else {
                alert('Failed to save API key');
            }
        } catch (error) {
            alert('Error saving API key');
        } finally {
            setSaving(null);
        }
    };

    if (loading) {
        return <div className="text-center py-12">Loading...</div>;
    }

    return (
        <div className="max-w-5xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Providers</h1>
                <p className="text-gray-600">Configure AI providers available for your tenants</p>
            </div>

            <div className="space-y-4">
                {Object.entries(providerConfigs).map(([providerType, config]) => {
                    const provider = providers.find(p => p.provider === providerType);
                    const [apiKeyInput, setApiKeyInput] = useState(provider?.apiKey || '');

                    return (
                        <div key={providerType} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3">
                                            <h3 className="text-lg font-semibold text-gray-900">{config.name}</h3>
                                            <span className="text-sm text-gray-500">{config.defaultModel}</span>
                                            {provider?.isActive && (
                                                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                                    Active
                                                </span>
                                            )}
                                            {!provider?.isActive && provider && (
                                                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-600">
                                                    Not Configured
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-500 mt-1">{config.description}</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {provider && (
                                            <button
                                                onClick={() => handleToggle(provider.id, provider.isActive)}
                                                disabled={saving === provider.id}
                                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${provider.isActive ? 'bg-blue-600' : 'bg-gray-200'
                                                    } ${saving === provider.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            >
                                                <span
                                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${provider.isActive ? 'translate-x-6' : 'translate-x-1'
                                                        }`}
                                                />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* API Key Input (only if needed) */}
                                {config.needsApiKey && provider && (
                                    <div className="mt-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">API Key</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="password"
                                                placeholder={provider.apiKey ? `sk-...${provider.apiKey.slice(-5)}` : 'Enter API Key'}
                                                value={apiKeyInput}
                                                onChange={(e) => setApiKeyInput(e.target.value)}
                                                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                            <button
                                                onClick={() => handleSaveApiKey(provider.id, apiKeyInput)}
                                                disabled={saving === provider.id || !apiKeyInput}
                                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                                            >
                                                Save
                                            </button>
                                        </div>
                                        {provider.apiKey && (
                                            <p className="text-xs text-gray-500 mt-1">
                                                Key configured: {provider.apiKey.substring(0, 10)}...{provider.apiKey.slice(-4)}
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* Cloudflare AI - No API Key Needed */}
                                {!config.needsApiKey && provider && (
                                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                        <p className="text-sm text-blue-800">
                                            ✨ <strong>Free tier</strong> - No API key required. Uses Cloudflare Workers AI binding.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
