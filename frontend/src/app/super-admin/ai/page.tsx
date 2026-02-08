'use client';

import { useEffect, useState } from 'react';

export default function AIProvidersPage() {
    const [providers, setProviders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    // New Provider Form State
    const [newProvider, setNewProvider] = useState({
        name: '',
        provider: 'openai',
        apiKey: '',
        modelId: ''
    });

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://cloudwa-flow.khibroh.workers.dev';

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('super_admin_token');
            const res = await fetch(`${API_URL}/api/super-admin/ai-providers`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(newProvider)
            });

            if (res.ok) {
                setShowModal(false);
                setNewProvider({ name: '', provider: 'openai', apiKey: '', modelId: '' });
                fetchProviders(); // Refresh list
            } else {
                alert('Failed to add provider');
            }
        } catch (error) {
            alert('Error adding provider');
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900">AI Providers</h1>
                <button
                    onClick={() => setShowModal(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                >
                    + Add Provider
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Display Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Provider</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Default Model</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {loading ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">Loading...</td>
                            </tr>
                        ) : providers.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">No providers configured</td>
                            </tr>
                        ) : (
                            providers.map((p) => (
                                <tr key={p.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{p.displayName}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{p.provider}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{p.modelId || '-'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${p.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {p.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Add Provider Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <h2 className="text-xl font-bold mb-4">Add AI Provider</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Display Name</label>
                                <input
                                    type="text"
                                    required
                                    className="mt-1 w-full border rounded-md p-2"
                                    value={newProvider.name}
                                    onChange={e => setNewProvider({ ...newProvider, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Provider Type</label>
                                <select
                                    className="mt-1 w-full border rounded-md p-2"
                                    value={newProvider.provider}
                                    onChange={e => setNewProvider({ ...newProvider, provider: e.target.value })}
                                >
                                    <option value="openai">OpenAI</option>
                                    <option value="gemini">Google Gemini</option>
                                    <option value="anthropic">Anthropic Claude</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">System API Key (Optional)</label>
                                <input
                                    type="password"
                                    className="mt-1 w-full border rounded-md p-2"
                                    placeholder="sk-..."
                                    value={newProvider.apiKey}
                                    onChange={e => setNewProvider({ ...newProvider, apiKey: e.target.value })}
                                />
                                <p className="text-xs text-gray-500 mt-1">If set, tenants can use this key as fallback.</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Default Model ID</label>
                                <input
                                    type="text"
                                    className="mt-1 w-full border rounded-md p-2"
                                    placeholder="e.g., gpt-4o"
                                    value={newProvider.modelId}
                                    onChange={e => setNewProvider({ ...newProvider, modelId: e.target.value })}
                                />
                            </div>
                            <div className="flex justify-end gap-2 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    Add Provider
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
