'use client';

import { useFlowStore } from '../store';
import { Trash } from 'lucide-react';
import { VariablePicker } from './VariablePicker'; // Assuming VariablePicker is in a local file

export function NodeConfigPanel() {
    const { selectedNode, updateNodeData, deleteNode } = useFlowStore();

    if (!selectedNode) {
        return (
            <div className="w-80 bg-gray-50 border-l border-gray-200 p-6">
                <div className="text-center text-gray-500 mt-12">
                    <p className="text-sm">Select a node to configure</p>
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
        <div className="w-80 bg-gray-50 border-l border-gray-200 p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-700">Node Settings</h3>
                <button
                    onClick={handleDelete}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                    title="Delete node"
                >
                    <Trash className="h-4 w-4" />
                </button>
            </div>

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
                                <Trash className="h-4 w-4" />
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
    return (
        <div className="space-y-3">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Delay (seconds)
                </label>
                <input
                    type="number"
                    value={node.data.delay || 0}
                    onChange={(e) => onUpdate(node.id, { delay: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    min="0"
                />
            </div>
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
