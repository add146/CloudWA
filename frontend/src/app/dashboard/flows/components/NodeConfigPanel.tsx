'use client';

import { useFlowStore } from '../store';
// import { Trash } from 'lucide-react';
import { VariablePicker } from './VariablePicker'; // Assuming VariablePicker is in a local file

export function NodeConfigPanel() {
    const { selectedNode, updateNodeData, deleteNode } = useFlowStore();

    if (!selectedNode) {
        return (
            <div className="w-80 bg-white border-l border-gray-200 flex flex-col h-full">
                <div className="p-6 border-b border-gray-200">
                    <h3 className="text-lg font-bold text-gray-900">Node Settings</h3>
                    <p className="text-xs text-gray-500 mt-1">Configure selected node</p>
                </div>
                <div className="flex-1 flex items-center justify-center p-8">
                    <div className="text-center">
                        <div className="text-6xl mb-4 opacity-20">⚙️</div>
                        <p className="text-sm text-gray-500 font-medium">No node selected</p>
                        <p className="text-xs text-gray-400 mt-2">Click on a node to configure it</p>
                    </div>
                </div>
            </div>
        );
    }

    const handleDelete = () => {
        if (confirm('Delete this node?')) {
            deleteNode(selectedNode.id);
        }
    };

    return (
        <div className="w-80 bg-white border-l border-gray-200 flex flex-col h-full">
            {/* Header */}
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-bold text-gray-900">Node Settings</h3>
                    <button
                        onClick={handleDelete}
                        className="group p-2 text-red-600 hover:bg-red-100 rounded-lg transition-all duration-200 hover:shadow-md"
                        title="Delete node"
                    >
                        <span className="group-hover:scale-110 inline-block transition-transform">🗑️</span>
                    </button>
                </div>
                <p className="text-xs text-gray-600 font-medium">
                    {selectedNode.type?.charAt(0).toUpperCase() + selectedNode.type?.slice(1)} Node
                </p>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">

                {/* Dynamic config based on node type */}
                {selectedNode.type === 'message' && (
                    <MessageConfig node={selectedNode} onUpdate={updateNodeData} />
                )}
                {selectedNode.type === 'button' && (
                    <ButtonConfig node={selectedNode} onUpdate={updateNodeData} />
                )}
                {selectedNode.type === 'condition' && (
                    <ConditionConfig node={selectedNode} onUpdate={updateNodeData} />
                )}
                {selectedNode.type === 'ai' && (
                    <AIConfig node={selectedNode} onUpdate={updateNodeData} />
                )}
                {selectedNode.type === 'delay' && (
                    <DelayConfig node={selectedNode} onUpdate={updateNodeData} />
                )}
                {selectedNode.type === 'human_takeover' && (
                    <HumanTakeoverConfig node={selectedNode} onUpdate={updateNodeData} />
                )}
                {selectedNode.type === 'start' && (
                    <div className="text-sm text-gray-500">Start node has no configuration</div>
                )}
            </div>
        </div>
    );
}

function MessageConfig({ node, onUpdate }: any) {
    return (
        <div className="space-y-3">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Message Text
                </label>
                <VariablePicker
                    value={node.data.message || ''}
                    onChange={(newValue) => onUpdate(node.id, { message: newValue })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    rows={4}
                    placeholder="Enter your message..."
                />
                <p className="text-xs text-gray-500 mt-1">
                    Use {'{{'} {'variableName'} {'}'} for variables
                </p>
            </div>
        </div>
    );
}

function ButtonConfig({ node, onUpdate }: any) {
    const buttons = node.data.buttons || [];

    const addButton = () => {
        onUpdate(node.id, {
            buttons: [...buttons, { id: `btn-${Date.now()}`, title: '', value: '' }],
        });
    };

    const updateButton = (idx: number, field: string, value: string) => {
        const updated = [...buttons];
        updated[idx] = { ...updated[idx], [field]: value };
        onUpdate(node.id, { buttons: updated });
    };

    const removeButton = (idx: number) => {
        onUpdate(node.id, { buttons: buttons.filter((_: any, i: number) => i !== idx) });
    };

    return (
        <div className="space-y-3">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Question Text
                </label>
                <VariablePicker
                    value={node.data.text || ''}
                    onChange={(value) => onUpdate(node.id, { text: value })}
                    placeholder="Ask a question..."
                    rows={2}
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Buttons
                </label>
                <div className="space-y-2">
                    {buttons.map((btn: any, idx: number) => (
                        <div key={idx} className="flex gap-2">
                            <input
                                type="text"
                                value={btn.title || ''}
                                onChange={(e) => updateButton(idx, 'title', e.target.value)}
                                className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                                placeholder="Button label"
                            />
                            <button
                                onClick={() => removeButton(idx)}
                                className="p-1 text-red-600 hover:bg-red-50 rounded"
                            >
                                <span className="text-red-600">🗑️</span>
                            </button>
                        </div>
                    ))}
                </div>
                <button
                    onClick={addButton}
                    className="mt-2 text-sm text-blue-600 hover:underline"
                >
                    + Add Button
                </button>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Save Response As
                </label>
                <input
                    type="text"
                    value={node.data.saveAs || ''}
                    onChange={(e) => onUpdate(node.id, { saveAs: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    placeholder="variable_name"
                />
            </div>
        </div>
    );
}

function ConditionConfig({ node, onUpdate }: any) {
    return (
        <div className="space-y-3">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Condition Expression
                </label>
                <input
                    type="text"
                    value={node.data.condition || ''}
                    onChange={(e) => onUpdate(node.id, { condition: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
                    placeholder="{{age}} > 18"
                />
                <p className="text-xs text-gray-500 mt-1">
                    Operators: {'>'}, {'<'}, {'>='},{'<='}, ==, !=
                </p>
            </div>
        </div>
    );
}

function AIConfig({ node, onUpdate }: any) {
    return (
        <div className="space-y-3">
            <div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        AI Prompt / Instructions
                    </label>
                    <VariablePicker
                        value={node.data.prompt || ''}
                        onChange={(value) => onUpdate(node.id, { prompt: value })}
                        placeholder="You are a helpful assistant..."
                        rows={4}
                    />
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Save Response As
                </label>
                <input
                    type="text"
                    value={node.data.saveAs || ''}
                    onChange={(e) => onUpdate(node.id, { saveAs: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    placeholder="ai_response"
                />
            </div>
        </div>
    );
}

function DelayConfig({ node, onUpdate }: any) {
    const isRandom = node.data.random || false;

    return (
        <div className="space-y-3">
            <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                    <input
                        type="checkbox"
                        checked={isRandom}
                        onChange={(e) => onUpdate(node.id, { random: e.target.checked })}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    Random Delay
                </label>
            </div>

            {isRandom ? (
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                            Min (seconds)
                        </label>
                        <input
                            type="number"
                            defaultValue={node.data.minDelay || 0}
                            onBlur={(e) => onUpdate(node.id, { minDelay: parseInt(e.target.value) || 0 })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            min="0"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                            Max (seconds)
                        </label>
                        <input
                            type="number"
                            defaultValue={node.data.maxDelay || 0}
                            onBlur={(e) => onUpdate(node.id, { maxDelay: parseInt(e.target.value) || 0 })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            min="0"
                        />
                    </div>
                </div>
            ) : (
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Delay (seconds)
                    </label>
                    <input
                        type="number"
                        defaultValue={node.data.delay || 0}
                        onBlur={(e) => onUpdate(node.id, { delay: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        min="0"
                    />
                </div>
            )}
        </div>
    );
}

function HumanTakeoverConfig({ node, onUpdate }: any) {
    return (
        <div className="space-y-3">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Transfer Message
                </label>
                <VariablePicker
                    value={node.data.message || ''}
                    onChange={(value) => onUpdate(node.id, { message: value })}
                    placeholder="Transferring you to an agent..."
                    rows={3}
                />
            </div>
        </div>
    );
}
