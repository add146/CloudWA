'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Play, Trash2, Edit, Power } from 'lucide-react';

interface Flow {
    id: string;
    name: string;
    description?: string;
    triggerKeywords: string[];
    isActive: boolean;
    priority: number;
    version: number;
    updatedAt: string;
}

export default function FlowsPage() {
    const router = useRouter();
    const [flows, setFlows] = useState<Flow[]>([]);
    const [deviceId, setDeviceId] = useState<string>('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // TODO: Get deviceId from context or URL
        const demoDeviceId = 'device-1';
        setDeviceId(demoDeviceId);
        loadFlows(demoDeviceId);
    }, []);

    const loadFlows = async (deviceId: string) => {
        try {
            const response = await fetch(`/api/devices/${deviceId}/flows`);
            const data = await response.json();
            if (data.success) {
                setFlows(data.data);
            }
        } catch (error) {
            console.error('Failed to load flows:', error);
        } finally {
            setLoading(false);
        }
    };

    const createFlow = async () => {
        try {
            const response = await fetch(`/api/devices/${deviceId}/flows`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: 'New Flow',
                    description: '',
                    triggerKeywords: [],
                    flowJson: {
                        nodes: [
                            { id: 'start-1', type: 'start', position: { x: 250, y: 50 }, data: {} },
                        ],
                        edges: [],
                    },
                }),
            });

            const data = await response.json();
            if (data.success) {
                router.push(`/dashboard/flows/${data.data.id}/edit`);
            }
        } catch (error) {
            console.error('Failed to create flow:', error);
        }
    };

    const toggleActive = async (flowId: string, isActive: boolean) => {
        try {
            await fetch(`/api/devices/${deviceId}/flows/${flowId}/activate`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive: !isActive }),
            });
            loadFlows(deviceId);
        } catch (error) {
            console.error('Failed to toggle flow:', error);
        }
    };

    const deleteFlow = async (flowId: string) => {
        if (!confirm('Are you sure you want to delete this flow?')) return;

        try {
            await fetch(`/api/devices/${deviceId}/flows/${flowId}`, {
                method: 'DELETE',
            });
            loadFlows(deviceId);
        } catch (error) {
            console.error('Failed to delete flow:', error);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-gray-500">Loading flows...</div>
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
                <button
                    onClick={createFlow}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                >
                    <Plus className="h-5 w-5" />
                    Create Flow
                </button>
            </div>

            {flows.length === 0 ? (
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
                        className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
                    >
                        <Plus className="h-5 w-5" />
                        Create First Flow
                    </button>
                </div>
            ) : (
                <div className="grid gap-4">
                    {flows.map((flow) => (
                        <div
                            key={flow.id}
                            className="bg-white border rounded-lg p-6 hover:shadow-md transition"
                        >
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
                                        <span className="text-xs text-gray-500">
                                            v{flow.version}
                                        </span>
                                    </div>

                                    {flow.description && (
                                        <p className="text-gray-600 mb-3">{flow.description}</p>
                                    )}

                                    <div className="flex items-center gap-4 text-sm text-gray-500">
                                        <div>
                                            <span className="font-medium">Keywords:</span>{' '}
                                            {flow.triggerKeywords.length > 0
                                                ? flow.triggerKeywords.join(', ')
                                                : 'None'}
                                        </div>
                                        <div>
                                            <span className="font-medium">Priority:</span>{' '}
                                            {flow.priority}
                                        </div>
                                        <div>
                                            <span className="font-medium">Updated:</span>{' '}
                                            {new Date(flow.updatedAt).toLocaleDateString()}
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
                                        className={`p-2 rounded-lg transition ${flow.isActive
                                                ? 'text-green-600 hover:bg-green-50'
                                                : 'text-gray-400 hover:bg-gray-50'
                                            }`}
                                        title={flow.isActive ? 'Deactivate' : 'Activate'}
                                    >
                                        <Power className="h-5 w-5" />
                                    </button>
                                    <button
                                        onClick={() => deleteFlow(flow.id)}
                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                                        title="Delete flow"
                                    >
                                        <Trash2 className="h-5 w-5" />
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
