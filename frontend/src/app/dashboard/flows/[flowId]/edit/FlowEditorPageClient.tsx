'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
// import { Save, ArrowLeft } from 'lucide-react';

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
        <div className="flex flex-col h-screen bg-gradient-to-br from-gray-50 to-slate-100">
            {/* Enhanced Header Toolbar */}
            <header className="h-16 border-b bg-white/80 backdrop-blur-sm px-6 flex items-center justify-between shadow-lg z-20">
                <div className="flex items-center gap-4">
                    <button
                        className="group p-2 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 rounded-lg transition-all duration-200 hover:shadow-md"
                        onClick={handleBack}
                        title="Back to flows"
                    >
                        <span className="text-xl group-hover:scale-110 inline-block transition-transform">←</span>
                    </button>
                    <div>
                        <h1 className="font-bold text-lg bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                            Flow Editor
                        </h1>
                        <p className="text-xs text-gray-500 font-medium">ID: {flowId}</p>
                    </div>
                    {isDirty && (
                        <span className="flex items-center gap-1.5 text-xs text-amber-700 bg-gradient-to-r from-amber-100 to-yellow-100 px-3 py-1.5 rounded-full border border-amber-300 shadow-sm">
                            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></span>
                            Unsaved changes
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className={`
                            flex items-center gap-2 px-5 py-2.5 rounded-lg text-white text-sm font-semibold 
                            transition-all duration-200 shadow-md hover:shadow-lg
                            ${isSaving
                                ? "bg-gray-400 cursor-not-allowed"
                                : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 hover:scale-105"
                            }
                        `}
                    >
                        {isSaving ? (
                            <>
                                <span className="animate-spin">⏳</span>
                                Saving...
                            </>
                        ) : (
                            <>
                                <span className="text-base">💾</span>
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
                    <NodePalette />

                    {/* Center: Canvas */}
                    <div className="flex-1 relative bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-100 via-gray-100 to-slate-200">
                        <FlowCanvas />
                    </div>

                    {/* Right Sidebar: Configuration Panel */}
                    <NodeConfigPanel />
                </ReactFlowProvider>
            </div>
        </div>
    );
}
