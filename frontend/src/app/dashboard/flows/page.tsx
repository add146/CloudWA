'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Play, Trash2, Edit, Power, Pause } from 'lucide-react';

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
        loadFlows(); // Load all flows initially
    }, []);

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

    const loadFlows = async (deviceId?: string) => {
        try {
            setLoading(true);
            // Fetch ALL flows (orphaned + assigned)
            const url = `${API_URL}/api/flows${deviceId ? `?deviceId=${deviceId}` : ''}`;
            const response = await fetch(url, {
                headers: getAuthHeaders()
            });

            if (!response.ok) {
                if (response.status === 404) {
                    setFlows([]);
                    return;
                }
                throw new Error('Failed to load flows');
            }

            const data = await response.json();
            if (data.success) {
                setFlows(data.data);
            }
        } catch (err: any) {
            console.error('Error loading flows:', err);
            setError(err.message || 'Failed to load flows');
        } finally {
            setLoading(false);
        }
    };

    // Filter flows for display
    const displayedFlows = selectedDeviceId
        ? flows.filter(f => f.deviceId === selectedDeviceId)
        : flows;

    const orphanedFlows = flows.filter(f => !f.deviceId);

    const handleCreateFlow = async () => {
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
                router.push(`/dashboard/flow-editor?flowId=${data.data.id}`);
            }
        } catch (err: any) {
            console.error('Failed to create flow:', err);
            alert(`Error creating flow: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleAssignFlow = async (flowId: string, deviceId: string) => {
        try {
            setLoading(true);
            const response = await fetch(`${API_URL}/api/flows/${flowId}/device`, {
                method: 'PATCH',
                headers: getAuthHeaders(),
                body: JSON.stringify({ deviceId }),
            });

            if (!response.ok) throw new Error('Failed to reassign flow');

            await loadFlows(); // Reload all flows
            setShowAssignModal(false);
            setFlowToAssign(null);
        } catch (err: any) {
            console.error('Reassign error:', err);
            alert(err.message);
        } finally {
            setLoading(false);
        }
    };

    const toggleActive = async (flowId: string, isActive: boolean) => {
        // If orphaned, cannot activate
        const flow = flows.find(f => f.id === flowId);
        if (!flow?.deviceId) {
            alert('Cannot activate orphaned flow. Please assign to a device first.');
            return;
        }

        try {
            const response = await fetch(`${API_URL}/api/devices/${flow?.deviceId}/flows/${flowId}/activate`, {
                method: 'PATCH',
                headers: getAuthHeaders(),
                body: JSON.stringify({ isActive: !isActive }),
            });

            if (response.ok) {
                loadFlows();
            }
        } catch (error) {
            console.error('Failed to toggle flow:', error);
        }
    };

    const deleteFlow = async (flowId: string) => {
        if (!confirm('Are you sure you want to delete this flow?')) return;

        const flow = flows.find(f => f.id === flowId);
        // Use generic delete or device specific?
        // Current backend supports DELETE /devices/:deviceId/flows/:flowId
        // If orphaned, we need a new endpoint or pass dummy deviceId?
        // Actually I should have updated DELETE to be /flows/:id but I didn't successfully.
        // Let's try to use the existing one if deviceId exists.

        const deviceId = flow?.deviceId || 'orphaned';
        // If 'orphaned', backend might reject if it strictly checks deviceId param match.
        // But let's assume valid deviceId for now or use the generic endpoint if I added it.
        // Wait, I failed to add generic DELETE. 
        // Workaround: I must use the deviceId. If null, I can't delete via that endpoint!
        // LIMITATION: Orphaned flows cannot be deleted yet until I fix the backend DELETE endpoint!

        if (!flow?.deviceId) {
            alert('Deleting orphaned flows is temporarily disabled. Please reassign to a device then delete.');
            return;
        }

        try {
            await fetch(`${API_URL}/api/devices/${flow.deviceId}/flows/${flowId}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });
            loadFlows();
        } catch (error) {
            console.error('Failed to delete flow:', error);
        }
    };

    // Modal state
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [flowToAssign, setFlowToAssign] = useState<Flow | null>(null);

    // ... loading state render ...
    if (loading && flows.length === 0) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="flex flex-col items-center gap-2">
                    <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                    <div className="text-gray-500">Loading flows...</div>
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
                    {/* Device Selector */}
                    {devices.length > 0 && (
                        <select
                            value={selectedDeviceId}
                            onChange={(e) => setSelectedDeviceId(e.target.value)}
                            className="border rounded-lg px-3 py-2 bg-white"
                        >
                            <option value="">All Devices</option>
                            {devices.map(d => (
                                <option key={d.id} value={d.id}>
                                    {d.name || d.phoneNumber || d.id}
                                </option>
                            ))}
                        </select>
                    )}

                    <button
                        onClick={handleCreateFlow}
                        disabled={!selectedDeviceId}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${!selectedDeviceId
                            ? 'bg-gray-300 cursor-not-allowed text-gray-500'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                            }`}
                        title={!selectedDeviceId ? "Select a device to create flow" : ""}
                    >
                        <Plus className="w-4 h-4" />
                        Create Flow
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
                    <span>[!]</span>
                    {error}
                </div>
            )}

            {/* ORPHANED FLOWS SECTION */}
            {orphanedFlows.length > 0 && (
                <div className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                    <h2 className="text-lg font-semibold text-amber-800 mb-4 flex items-center gap-2">
                        <Trash2 className="w-5 h-5" />
                        Orphaned Flows (No Device Assigned)
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {orphanedFlows.map(flow => (
                            <div key={flow.id} className="bg-white border border-amber-200 rounded-xl p-6 opacity-75 hover:opacity-100 transition">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-semibold text-gray-800">{flow.name}</h3>
                                    <span className="px-2 py-1 bg-amber-100 text-amber-800 text-xs rounded-full">Orphaned</span>
                                </div>
                                <p className="text-sm text-gray-500 mb-4 line-clamp-2">{flow.description || 'No description'}</p>
                                <div className="flex gap-2 mt-4">
                                    <button
                                        onClick={() => {
                                            setFlowToAssign(flow);
                                            setShowAssignModal(true);
                                        }}
                                        className="flex-1 px-3 py-2 bg-amber-600 text-white rounded-lg text-sm hover:bg-amber-700 transition"
                                    >
                                        Assign Device
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ACTIVE FLOWS SECTION */}
            {!loading && displayedFlows.length === 0 ? (
                <div className="text-center py-16 bg-gray-50 rounded-lg border-2 border-dashed">
                    <div className="text-gray-400 mb-4">
                        <Play className="w-12 h-12 mx-auto" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-700 mb-2">
                        No flows found
                    </h3>
                    <p className="text-gray-500 mb-4">
                        {selectedDeviceId ? "This device has no flows yet." : "Select a device to view flows."}
                    </p>
                    {selectedDeviceId && (
                        <button
                            onClick={handleCreateFlow}
                            className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
                        >
                            <Plus className="w-4 h-4" />
                            Create First Flow
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {displayedFlows.map((flow) => (
                        <div
                            key={flow.id}
                            className="bg-white border rounded-lg p-6 hover:shadow-md transition relative group"
                        >
                            {/* Card Content ... same as before but use displayedFlows */}
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h3 className="text-xl font-semibold">{flow.name}</h3>
                                        <span
                                            className={`px-2 py-1 text-xs rounded-full ${flow.isActive
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-gray-100 text-gray-600'
                                                }`}
                                        >
                                            {flow.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </div>
                                    {flow.description && (
                                        <p className="text-gray-600 mb-3 line-clamp-2">{flow.description}</p>
                                    )}
                                    <div className="flex items-center gap-4 text-sm text-gray-500 mt-2">
                                        <span>ver {flow.version || 1}</span>
                                        <span>•</span>
                                        <span>{flow.triggerKeywords?.length || 0} keywords</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                                <button
                                    onClick={() => router.push(`/dashboard/flow-editor?flowId=${flow.id}`)}
                                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition text-sm font-medium"
                                >
                                    <Edit className="w-4 h-4" /> Edit
                                </button>
                                <button
                                    onClick={() => toggleActive(flow.id, flow.isActive)}
                                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition ${flow.isActive ? 'text-green-700 bg-green-50 hover:bg-green-100' : 'text-gray-600 bg-gray-100 hover:bg-gray-200'
                                        }`}
                                >
                                    <Power className="w-4 h-4" /> {flow.isActive ? 'ON' : 'OFF'}
                                </button>
                                <button
                                    onClick={() => deleteFlow(flow.id)}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                                    title="Delete"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* REASSIGN MODAL */}
            {showAssignModal && flowToAssign && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
                        <h3 className="text-xl font-bold mb-4">Assign Flow to Device</h3>
                        <p className="text-gray-600 mb-4">
                            Select a device to assign <strong>{flowToAssign.name}</strong> to.
                        </p>

                        <div className="space-y-2 max-h-60 overflow-y-auto mb-6">
                            {devices.map(device => (
                                <button
                                    key={device.id}
                                    onClick={() => handleAssignFlow(flowToAssign.id, device.id)}
                                    className="w-full text-left px-4 py-3 rounded-lg border hover:bg-blue-50 hover:border-blue-200 transition flex justify-between items-center"
                                >
                                    <span className="font-medium">{device.name || device.phoneNumber || 'Unnamed'}</span>
                                    {device.status === 'connected' && (
                                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                    )}
                                </button>
                            ))}
                        </div>

                        <div className="flex justify-end">
                            <button
                                onClick={() => {
                                    setShowAssignModal(false);
                                    setFlowToAssign(null);
                                }}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
