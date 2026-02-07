'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useRef, useCallback } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { Save, ArrowLeft, CheckCircle } from 'lucide-react';

import { useFlowStore } from '../../store';
import { NodePalette } from '../../components/NodePalette';
import { FlowCanvas } from '../../components/FlowCanvas';
import { ConfigurationPanel } from '../../components/ConfigurationPanel';
import { Button } from '../../../../../components/ui/button'; // Adjusted path
import { useToast } from '../../../../../hooks/use-toast'; // Adjusted path

export default function FlowEditorPageClient() {
    const { flowId } = useParams();
    const router = useRouter();
    const { toast } = useToast();

    // State management from store
    const {
        nodes, edges,
        loadFlow, saveFlow,
        onNodesChange, onEdgesChange, onConnect,
        isDirty, setDirty
    } = useFlowStore();

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Load flow on mount based on flowId
    useEffect(() => {
        if (flowId) {
            // In a real app, fetch from API
            // For now, load from store or check if exists
            // loadFlow(flowId as string); 
            setIsLoading(false);
        }
    }, [flowId, loadFlow]);

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
            await saveFlow();
            toast({
                title: "Flow Saved",
                description: "Your changes have been saved successfully.",
            });
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to save flow.",
                variant: "destructive"
            });
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
                    <Button variant="ghost" size="icon" onClick={handleBack}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
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
                    <Button
                        onClick={handleSave}
                        disabled={isSaving}
                        className={isDirty ? "bg-primary" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}
                    >
                        {isSaving ? (
                            "Saving..."
                        ) : (
                            <>
                                <Save className="h-4 w-4 mr-2" />
                                Save Flow
                            </>
                        )}
                    </Button>
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
                        <ConfigurationPanel />
                    </div>
                </ReactFlowProvider>
            </div>
        </div>
    );
}
