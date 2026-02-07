'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useRef, useCallback } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { Save, ArrowLeft, CheckCircle } from 'lucide-react';

import { useFlowStore } from '../../store';
import { NodePalette } from '../../components/NodePalette';
import { FlowCanvas } from '../../components/FlowCanvas';
import { NodeConfigPanel } from '../../components/NodeConfigPanel';

export default function FlowEditorPage() {
    const params = useParams();
    const router = useRouter();
    const flowId = params.flowId as string;

    const { setNodes, setEdges, nodes, edges } = useFlowStore();
    const [flowName, setFlowName] = useState('Loading...');
    const [deviceId, setDeviceId] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const autoSaveTimeout = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        // TODO: Get deviceId from context or route
        const demoDeviceId = 'device-1';
        setDeviceId(demoDeviceId);
        loadFlow(demoDeviceId, flowId);
    }, [flowId]);

    // Track changes to nodes and edges
    useEffect(() => {
        if (nodes.length > 0 || edges.length > 0) {
            setHasUnsavedChanges(true);

            // Clear existing timeout
            if (autoSaveTimeout.current) {
                clearTimeout(autoSaveTimeout.current);
            }

            // Set new auto-save timeout (3 seconds)
            autoSaveTimeout.current = setTimeout(() => {
                saveFlow(true); // Auto-save
            }, 3000);
        }

        return () => {
            if (autoSaveTimeout.current) {
                clearTimeout(autoSaveTimeout.current);
            }
        };
    }, [nodes, edges]);

    // Warn before leaving with unsaved changes
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (hasUnsavedChanges) {
                e.preventDefault();
                e.returnValue = '';
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [hasUnsavedChanges]);

    const loadFlow = async (deviceId: string, flowId: string) => {
        try {
            const response = await fetch(`/api/devices/${deviceId}/flows/${flowId}`);
            const data = await response.json();

            if (data.success) {
                setFlowName(data.data.name);
                const flowJson = JSON.parse(data.data.flowJson || '{"nodes":[],"edges":[]}');
                setNodes(flowJson.nodes || []);
                setEdges(flowJson.edges || []);
                setHasUnsavedChanges(false);
            }
        } catch (error) {
            console.error('Failed to load flow:', error);
        }
    };

    const saveFlow = useCallback(async (isAutoSave = false) => {
        if (!deviceId || !flowId) return;

        setIsSaving(true);
        try {
            const response = await fetch(`/api/devices/${deviceId}/flows/${flowId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    flowJson: { nodes, edges },
                }),
            });

            if (response.ok) {
                setHasUnsavedChanges(false);
                setLastSaved(new Date());
                if (!isAutoSave) {
                    // Only show alert for manual saves
                    alert('Flow saved successfully!');
                }
            }
        } catch (error) {
            console.error('Failed to save flow:', error);
            if (!isAutoSave) {
                alert('Failed to save flow');
            }
        } finally {
            setIsSaving(false);
        }
    }, [deviceId, flowId, nodes, edges]);

    const handleBack = () => {
        if (hasUnsavedChanges) {
            if (confirm('You have unsaved changes. Are you sure you want to leave?')) {
                router.push('/dashboard/flows');
            }
        } else {
            router.push('/dashboard/flows');
        }
    };

    return (
        <ReactFlowProvider>
            <div className="flex flex-col h-screen">
                {/* Toolbar */}
                <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={handleBack}
                            className="p-2 hover:bg-gray-100 rounded-lg transition"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </button>
                        <div>
                            <h1 className="text-lg font-semibold">{flowName}</h1>
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                <span>Visual Flow Editor</span>
                                {lastSaved && !hasUnsavedChanges && (
                                    <span className="flex items-center gap-1 text-green-600">
                                        <CheckCircle className="h-3 w-3" />
                                        Saved {lastSaved.toLocaleTimeString()}
                                    </span>
                                )}
                                {hasUnsavedChanges && (
                                    <span className="text-orange-600">• Unsaved changes</span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => saveFlow(false)}
                            disabled={isSaving}
                            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                        >
                            <Save className="h-4 w-4" />
                            {isSaving ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                </div>

                {/* Editor Layout */}
                <div className="flex flex-1 overflow-hidden">
                    <NodePalette />
                    <FlowCanvas />
                    <NodeConfigPanel />
                </div>
            </div>
        </ReactFlowProvider>
    );
}
