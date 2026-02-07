'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Play, Trash, Edit, AlertCircle } from 'lucide-react';

interface Flow {
    id: string;
    name: string;
    description?: string;
    triggerKeywords: string[];
    isActive: boolean;
    priority: number;
    version: number;
    updatedAt: string;
    deviceId: string;
}

interface Device {
    id: string;
    name?: string;
    phoneNumber?: string;
    status?: string;
}

// Get API URL from env or fallback to production backend
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://cloudwa-flow.khibroh.workers.dev';

export default function FlowsPage() {
    const router = useRouter();
    const [flows, setFlows] = useState<Flow[]>([]);
    const [devices, setDevices] = useState<Device[]>([]);
    const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Initial load
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            // Redirect to login if no token
            // window.location.href = '/login'; 
            setError('Please login to continue');
            setLoading(false);
            return;
        }

        loadDevices();
    }, []);

    // Load flows when device changes
    useEffect(() => {
        if (selectedDeviceId) {
            loadFlows(selectedDeviceId);
        }
    }, [selectedDeviceId]);

    const getAuthHeaders = () => {
        const token = localStorage.getItem('token');
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };
    };

    const loadDevices = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_URL}/api/devices`, {
                headers: getAuthHeaders()
            });

            if (!response.ok) throw new Error('Failed to load devices');

            const data = await response.json();
            if (data.success && data.data.length > 0) {
                setDevices(data.data);
                // Select first device by default
                setSelectedDeviceId(data.data[0].id);
            } else {
                setDevices([]);
                setError('No devices found. Please connect a WhatsApp device first.');
            }
        } catch (err: any) {
            console.error('Error loading devices:', err);
            setError(err.message || 'Failed to load devices');
        } finally {
            setLoading(false);
        }
    };

    const loadFlows = async (deviceId: string) => {
        try {
            setLoading(true);
            const response = await fetch(`${API_URL}/api/devices/${deviceId}/flows`, {
                headers: getAuthHeaders()
            });

            if (!response.ok) {
                if (response.status === 404) {
                    setFlows([]); // No flows found is fine
                    return;
                }
                throw new Error('Failed to load flows');
            }

            const data = await response.json();
            if (data.success) {
                setFlows(Array.isArray(data.data) ? data.data : []);
                setError(null);
            }
        } catch (err: any) {
            console.error('Failed to load flows:', err);
            // Don't set error here to allow UI to show "No flows" state with retry button
        } finally {
            setLoading(false);
        }
    };

    const createFlow = async () => {
        if (!selectedDeviceId) {
            alert('No device selected');
            return;
        }

        try {
            setLoading(true);
            const response = await fetch(`${API_URL}/api/devices/${selectedDeviceId}/flows`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    name: 'New Flow',
                    description: 'Created via Dashboard',
                    triggerKeywords: [],
                    flowJson: {
                        nodes: [
                            { id: 'start-1', type: 'start', position: { x: 250, y: 50 }, data: {} },
                        ],
                        edges: [],
                    },
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to create flow');
            }

            const data = await response.json();
            if (data.success) {
                router.push(`/dashboard/flows/${data.data.id}/edit`);
            }
        } catch (err: any) {
            console.error('Failed to create flow:', err);
            alert(`Error creating flow: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const toggleActive = async (flowId: string, isActive: boolean) => {
        if (!selectedDeviceId) return;

        try {
            const response = await fetch(`${API_URL}/api/devices/${selectedDeviceId}/flows/${flowId}/activate`, {
                method: 'PATCH',
                headers: getAuthHeaders(),
                body: JSON.stringify({ isActive: !isActive }),
            });

            if (response.ok) {
                loadFlows(selectedDeviceId);
            }
        } catch (error) {
            console.error('Failed to toggle flow:', error);
        }
    };

    const deleteFlow = async (flowId: string) => {
        if (!selectedDeviceId) return;
        if (!confirm('Are you sure you want to delete this flow?')) return;

        try {
            await fetch(`${API_URL}/api/devices/${selectedDeviceId}/flows/${flowId}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });
            loadFlows(selectedDeviceId);
        } catch (error) {
            console.error('Failed to delete flow:', error);
        }
    };

    if (loading && !selectedDeviceId) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="flex flex-col items-center gap-2">
                    <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                    <div className="text-gray-500">Loading devices...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold">Chatbot Flows</h1>
                    <p className="text-gray-500 mt-1">
                        Create and manage automated conversation flows
                    </p>
                </div>
                <div className="flex gap-2">
                    {/* Device Selector (Simplified) */}
                    {devices.length > 1 && (
                        <select
                            value={selectedDeviceId}
                            onChange={(e) => setSelectedDeviceId(e.target.value)}
                            className="border rounded-lg px-3 py-2 bg-white"
                        >
                            {devices.map(d => (
                                <option key={d.id} value={d.id}>
                                    {d.name || d.phoneNumber || d.id}
                                </option>
                            ))}
                        </select>
                    )}

                    <button
                        onClick={createFlow}
                        disabled={!selectedDeviceId}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${!selectedDeviceId
                            ? 'bg-gray-300 cursor-not-allowed text-gray-500'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                            }`}
                    >
                        <Plus className="h-5 w-5" />
                        Create Flow
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    {error}
                    {error.includes('login') && (
                        <button
                            onClick={() => window.location.href = '/login'}
                            className="underline ml-2"
                        >
                            Go to Login
                        </button>
                    )}
                </div>
            )}

            {!loading && (!flows || flows.length === 0) ? (
                <div className="text-center py-16 bg-gray-50 rounded-lg border-2 border-dashed">
                    <div className="text-gray-400 mb-4">
                        <Play className="h-16 w-16 mx-auto" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-700 mb-2">
                        No flows yet
                    </h3>
                    <p className="text-gray-500 mb-4">
                        Create your first flow to automate conversations
                    </p>
                    <button
                        onClick={createFlow}
                        disabled={!selectedDeviceId}
                        className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
                    >
                        <Plus className="h-5 w-5" />
                        Create First Flow
                    </button>
                </div>
            ) : (
                <div className="grid gap-4">
                    {Array.isArray(flows) && flows.map((flow) => (
                        <div
                            key={flow?.id || Math.random()}
                            className="bg-white border rounded-lg p-6 hover:shadow-md transition"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h3 className="text-xl font-semibold">{flow?.name || 'Untitled Flow'}</h3>
                                        <span
                                            className={`px-2 py-1 text-xs rounded-full ${flow?.isActive
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-gray-100 text-gray-600'
                                                }`}
                                        >
                                            {flow?.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                            v{flow?.version || 1}
                                        </span>
                                    </div>

                                    {flow?.description && (
                                        <p className="text-gray-600 mb-3">{flow.description}</p>
                                    )}

                                    <div className="flex items-center gap-4 text-sm text-gray-500">
                                        <div>
                                            <span className="font-medium">Keywords:</span>{' '}
                                            {flow?.triggerKeywords && Array.isArray(flow.triggerKeywords) && flow.triggerKeywords.length > 0
                                                ? flow.triggerKeywords.join(', ')
                                                : 'None'}
                                        </div>
                                        <div>
                                            <span className="font-medium">Last updated:</span>{' '}
                                            {flow?.updatedAt ? new Date(flow.updatedAt).toLocaleDateString() : '-'}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 ml-4">
                                    <button
                                        onClick={() =>
                                            router.push(`/dashboard/flows/${flow.id}/edit`)
                                        }
                                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                        title="Edit flow"
                                    >
                                        <Edit className="h-5 w-5" />
                                    </button>
                                    <button
                                        onClick={() => toggleActive(flow.id, flow.isActive)}
                                        className={`px-3 py-1 rounded-lg text-sm font-medium transition ${flow.isActive
                                            ? 'text-green-700 bg-green-100 hover:bg-green-200'
                                            : 'text-gray-600 bg-gray-100 hover:bg-gray-200'
                                            }`}
                                        title={flow.isActive ? 'Deactivate' : 'Activate'}
                                    >
                                        {flow.isActive ? 'ON' : 'OFF'}
                                    </button>
                                    <button
                                        onClick={() => deleteFlow(flow.id)}
                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                                        title="Delete flow"
                                    >
                                        <Trash className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
