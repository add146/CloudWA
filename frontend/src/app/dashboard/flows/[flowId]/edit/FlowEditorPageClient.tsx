'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { Save, ArrowLeft } from 'lucide-react';

import { useFlowStore } from '../../store';
import { NodePalette } from '../../components/NodePalette';
import { FlowCanvas } from '../../components/FlowCanvas';
// Correct import name and path
import { NodeConfigPanel } from '../../components/NodeConfigPanel';

export function FlowEditorPageClient() {
    const { flowId } = useParams();
    const router = useRouter();

    // State management from store with only existing methods
    const {
        nodes, edges,
        onNodesChange, onEdgesChange, onConnect
    } = useFlowStore();

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isDirty, setDirty] = useState(false); // Local state for now

    // Mock load flow
    useEffect(() => {
        if (flowId) {
            // Simulate loading
            const timer = setTimeout(() => setIsLoading(false), 500);
            return () => clearTimeout(timer);
        }
    }, [flowId]);

    // Handle unsaved changes warning
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isDirty) {
                e.preventDefault();
                e.returnValue = '';
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isDirty]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Mock save delay
            await new Promise(resolve => setTimeout(resolve, 1000));
            setDirty(false);
            // Simple alert for now
            alert("Flow saved successfully!");
        } catch (error) {
            alert("Failed to save flow.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleBack = () => {
        if (isDirty) {
            if (confirm('You have unsaved changes. Are you sure you want to leave?')) {
                router.push('/dashboard/flows');
            }
        } else {
            router.push('/dashboard/flows');
        }
    };

    if (isLoading) {
        return <div className="flex items-center justify-center h-screen">Loading Flow Editor...</div>;
    }

    return (
        <div className="flex flex-col h-screen bg-gray-50">
            {/* Header Toolbar */}
            <header className="h-16 border-b bg-white px-4 flex items-center justify-between shadow-sm z-10">
                <div className="flex items-center gap-4">
                    <button
                        className="p-2 hover:bg-gray-100 rounded-md transition-colors"
                        onClick={handleBack}
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                    <div>
                        <h1 className="font-semibold text-lg">Flow Editor</h1>
                        <p className="text-xs text-gray-500">Flow ID: {flowId}</p>
                    </div>
                    {isDirty && (
                        <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                            Unsaved changes
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className={`flex items-center px-4 py-2 rounded-md text-white text-sm font-medium transition-colors ${isSaving ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
                            }`}
                    >
                        {isSaving ? (
                            "Saving..."
                        ) : (
                            <>
                                <Save className="h-4 w-4 mr-2" />
                                Save Flow
                            </>
                        )}
                    </button>
                </div>
            </header>

            {/* Main Workspace */}
            <div className="flex-1 flex overflow-hidden">
                <ReactFlowProvider>
                    {/* Left Sidebar: Node Palette */}
                    <div className="w-64 border-r bg-white flex flex-col">
                        <NodePalette />
                    </div>

                    {/* Center: Canvas */}
                    <div className="flex-1 bg-gray-100 relative">
                        <FlowCanvas />
                    </div>

                    {/* Right Sidebar: Configuration Panel */}
                    <div className="w-80 border-l bg-white flex flex-col">
                        <NodeConfigPanel />
                    </div>
                </ReactFlowProvider>
            </div>
        </div>
    );
}
