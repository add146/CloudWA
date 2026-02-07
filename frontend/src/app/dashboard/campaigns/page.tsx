'use client';

import { useState, useEffect } from 'react';
// Icons replaced with emojis - lucide-react removed
// import { Plus, Megaphone, Calendar, CheckCircle, Clock, AlertCircle, RefreshCw } from 'lucide-react';

interface Campaign {
    id: string;
    name: string;
    status: string;
    totalContacts: number;
    sentCount: number;
    failedCount: number;
    scheduledAt?: string;
    completedAt?: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://cloudwa-flow.khibroh.workers.dev';

export default function CampaignsPage() {
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);

    // Create Campaign State
    const [newCampaign, setNewCampaign] = useState({
        name: '',
        deviceId: '',
        message: '',
        scheduledAt: ''
    });
    const [devices, setDevices] = useState<any[]>([]);

    useEffect(() => {
        loadCampaigns();
        loadDevices();
    }, []);

    const getAuthHeaders = () => {
        const token = localStorage.getItem('token');
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };
    };

    const loadCampaigns = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_URL}/api/campaigns`, {
                headers: getAuthHeaders()
            });

            if (response.ok) {
                const data = await response.json();
                setCampaigns(data.data || []);
            }
        } catch (err) {
            console.error('Error loading campaigns:', err);
        } finally {
            setLoading(false);
        }
    };

    const loadDevices = async () => {
        try {
            const response = await fetch(`${API_URL}/api/devices`, {
                headers: getAuthHeaders()
            });
            const data = await response.json();
            if (data.success) {
                setDevices(data.data);
                if (data.data.length > 0) {
                    setNewCampaign(prev => ({ ...prev, deviceId: data.data[0].id }));
                }
            }
        } catch (err) {
            console.error('Error loading devices:', err);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return 'bg-green-100 text-green-700';
            case 'processing': return 'bg-blue-100 text-blue-700';
            case 'scheduled': return 'bg-yellow-100 text-yellow-700';
            case 'failed': return 'bg-red-100 text-red-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    return (
        <div className="container mx-auto">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Broadcasts</h1>
                    <p className="text-gray-500">Manage bulk message campaigns</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                >
                    <span>➕</span>
                    New Broadcast
                </button>
            </div>

            {loading ? (
                <div className="text-center py-12 text-gray-500">Loading campaigns...</div>
            ) : campaigns.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-xl border-2 border-dashed">
                    <span className="text-6xl mb-4 block">📢</span>
                    <h3 className="text-xl font-medium text-gray-900">No Broadcasts Yet</h3>
                    <p className="text-gray-500 mt-2 mb-6">Create your first campaign to reach your audience</p>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
                    >
                        <span>➕</span>
                        Create Campaign
                    </button>
                </div>
            ) : (
                <div className="grid gap-6">
                    {campaigns.map((campaign) => (
                        <div key={campaign.id} className="bg-white rounded-xl shadow-sm border p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900">{campaign.name}</h3>
                                    <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                                        <span className="flex items-center gap-1">
                                            <span>🕐</span>
                                            {campaign.scheduledAt ? new Date(campaign.scheduledAt).toLocaleDateString() : 'Immediate'}
                                        </span>
                                        <span>•</span>
                                        <span>{campaign.totalContacts} Recipients</span>
                                    </div>
                                </div>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(campaign.status)}`}>
                                    {campaign.status.toUpperCase()}
                                </span>
                            </div>

                            {/* Progress Bar */}
                            <div className="w-full bg-gray-100 rounded-full h-2.5 mb-2">
                                <div
                                    className="bg-blue-600 h-2.5 rounded-full"
                                    style={{ width: `${(campaign.sentCount / (campaign.totalContacts || 1)) * 100}%` }}
                                ></div>
                            </div>

                            <div className="flex justify-between text-xs text-gray-500">
                                <span>Sent: {campaign.sentCount}</span>
                                <span>Failed: {campaign.failedCount}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Modal (Simplified) */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl max-w-lg w-full p-6">
                        <h3 className="text-xl font-bold mb-4">New Broadcast</h3>
                        <div className="bg-yellow-50 text-yellow-800 p-4 rounded-lg mb-4 text-sm">
                            <span className="mr-2">⚠️</span>
                            Broadcast feature is currently in beta. Please ensure you have sufficient quota.
                        </div>

                        <form className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Campaign Name</label>
                                <input
                                    type="text"
                                    className="w-full border rounded-lg px-3 py-2"
                                    placeholder="Promo Jan 2026"
                                    value={newCampaign.name}
                                    onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Select Device</label>
                                <select
                                    className="w-full border rounded-lg px-3 py-2"
                                    value={newCampaign.deviceId}
                                    onChange={(e) => setNewCampaign({ ...newCampaign, deviceId: e.target.value })}
                                >
                                    <option value="">Select a device...</option>
                                    {devices.map(d => (
                                        <option key={d.id} value={d.id}>{d.displayName || d.phoneNumber}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                                <textarea
                                    className="w-full border rounded-lg px-3 py-2 h-32"
                                    placeholder="Hello {{name}}, check out our new promo!"
                                    value={newCampaign.message}
                                    onChange={(e) => setNewCampaign({ ...newCampaign, message: e.target.value })}
                                ></textarea>
                                <p className="text-xs text-gray-500 mt-1">Available variables: {'{{name}}'}</p>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={async () => {
                                        if (!newCampaign.name || !newCampaign.deviceId || !newCampaign.message) {
                                            alert('Please fill all fields');
                                            return;
                                        }

                                        try {
                                            const response = await fetch(`${API_URL}/api/campaigns`, {
                                                method: 'POST',
                                                headers: getAuthHeaders(),
                                                body: JSON.stringify(newCampaign)
                                            });
                                            const data = await response.json();
                                            if (data.success) {
                                                setShowCreateModal(false);
                                                loadCampaigns();
                                                alert('Campaign started successfully!');
                                            } else {
                                                alert('Failed: ' + data.error);
                                            }
                                        } catch (e) {
                                            alert('Error creating campaign');
                                        }
                                    }}
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    Start Broadcast
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
