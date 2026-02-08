'use client';

import { useState, useEffect } from 'react';
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
    const [showIntentions, setShowIntentions] = useState(false);
    const [availableProviders, setAvailableProviders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Fetch available providers from API
    useEffect(() => {
        const fetchProviders = async () => {
            try {
                const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/settings/ai-providers`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('session_token')}`
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    setAvailableProviders(data.data || []);
                } else {
                    console.error('Failed to fetch AI providers');
                    // Fallback to OpenAI only
                    setAvailableProviders([
                        { id: 'openai', name: 'OpenAI', models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'], configured: true }
                    ]);
                }
            } catch (error) {
                console.error('Error fetching AI providers:', error);
                // Fallback
                setAvailableProviders([
                    { id: 'openai', name: 'OpenAI', models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'], configured: true }
                ]);
            } finally {
                setLoading(false);
            }
        };

        fetchProviders();
    }, []);

    const currentProvider = availableProviders.find(p => p.id === (node.data.provider || 'openai'));
    const intentions = node.data.intentions || [];
    const temperature = node.data.temperature !== undefined ? node.data.temperature : 0.7;

    const addIntention = () => {
        const newIntentions = [...intentions, { name: '', description: '' }];
        onUpdate(node.id, { intentions: newIntentions });
    };

    const updateIntention = (index: number, field: 'name' | 'description', value: string) => {
        const newIntentions = [...intentions];
        newIntentions[index][field] = value;
        onUpdate(node.id, { intentions: newIntentions });
    };

    const removeIntention = (index: number) => {
        const newIntentions = intentions.filter((_: any, i: number) => i !== index);
        onUpdate(node.id, { intentions: newIntentions });
    };

    return (
        <div className="space-y-4">
            {/* Title */}
            <div className="flex items-center gap-2 pb-2 border-b">
                <span className="text-lg">🤖</span>
                <h4 className="font-semibold text-sm">LLM Text Generation</h4>
            </div>

            {/* Model Selection */}
            <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Model
                </label>
                {loading ? (
                    <div className="text-xs text-gray-500">Loading models...</div>
                ) : (
                    <select
                        value={node.data.model || 'gpt-4o-mini'}
                        onChange={(e) => onUpdate(node.id, { model: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        {availableProviders.flatMap((provider: any) =>
                            provider.models.map((modelId: string) => (
                                <option key={`${provider.id}-${modelId}`} value={modelId}>
                                    {modelId.split('-').map((word: string) =>
                                        word.charAt(0).toUpperCase() + word.slice(1)
                                    ).join(' ')} ({provider.name})
                                </option>
                            ))
                        )}
                    </select>
                )}
            </div>

            {/* System Prompt */}
            <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    System Prompt
                </label>
                <VariablePicker
                    value={node.data.systemPrompt || ''}
                    onChange={(value) => onUpdate(node.id, { systemPrompt: value })}
                    placeholder="You are a helpful AI assistant. Be concise and professional in your responses."
                    rows={3}
                    className="text-sm"
                />
                <div className="flex justify-end mt-1">
                    <button className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                        <span>🔗</span> Variables
                    </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                    Define the AI's role and behavior. Example: "You are a customer service representative for a tech company. Be friendly and helpful."
                </p>
            </div>

            {/* User Prompt */}
            <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    User Prompt
                </label>
                <VariablePicker
                    value={node.data.userPrompt || ''}
                    onChange={(value) => onUpdate(node.id, { userPrompt: value })}
                    placeholder="Enter your prompt here..."
                    rows={3}
                    className="text-sm"
                />
                <div className="flex justify-end mt-1">
                    <button className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                        <span>🔗</span> Variables
                    </button>
                </div>
            </div>

            {/* Intentions Section */}
            <div>
                <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-medium text-gray-700">
                        Intentions
                    </label>
                    <button
                        onClick={addIntention}
                        className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                    >
                        <span>+</span> Add Intention
                    </button>
                </div>
                <p className="text-xs text-gray-500 mb-2">
                    Add intentions to help the AI classify user messages and respond appropriately. Each intention will be available as a variable.
                </p>
                {intentions.length > 0 && (
                    <div className="space-y-2 mt-2">
                        {intentions.map((intent: any, idx: number) => (
                            <div key={idx} className="p-2 border border-gray-200 rounded-lg bg-gray-50">
                                <div className="flex items-center justify-between mb-2">
                                    <input
                                        type="text"
                                        value={intent.name || ''}
                                        onChange={(e) => updateIntention(idx, 'name', e.target.value)}
                                        placeholder="Intent name (e.g., complaint, inquiry)"
                                        className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs"
                                    />
                                    <button
                                        onClick={() => removeIntention(idx)}
                                        className="ml-2 text-red-500 hover:text-red-700 text-xs"
                                    >
                                        ✕
                                    </button>
                                </div>
                                <input
                                    type="text"
                                    value={intent.description || ''}
                                    onChange={(e) => updateIntention(idx, 'description', e.target.value)}
                                    placeholder="Description"
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                                />
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Temperature */}
            <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Temperature ({temperature.toFixed(1)})
                </label>
                <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={temperature}
                    onChange={(e) => onUpdate(node.id, { temperature: parseFloat(e.target.value) })}
                    className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>More focused</span>
                    <span>More creative</span>
                </div>
            </div>

            {/* Max Tokens */}
            <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Max Tokens
                </label>
                <input
                    type="number"
                    value={node.data.maxTokens || 1000}
                    onChange={(e) => onUpdate(node.id, { maxTokens: parseInt(e.target.value) || 1000 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    placeholder="1000"
                    min="1"
                    max="4000"
                />
            </div>

            {/* Variable Name */}
            <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Variable Name
                </label>
                <input
                    type="text"
                    value={node.data.saveAs || ''}
                    onChange={(e) => onUpdate(node.id, { saveAs: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    placeholder="e.g. ai_response"
                />
                <p className="text-xs text-gray-500 mt-1">
                    Store the LLM response in this variable. If intentions are defined, the detected intent will be stored in variableName_intent.
                </p>
            </div>
        </div>
    );
}

function DelayConfig({ node, onUpdate }: any) {
    const [isRandom, setIsRandom] = useState(node.data.random || false);

    const handleRandomToggle = (checked: boolean) => {
        setIsRandom(checked);
        onUpdate(node.id, { random: checked });
    };

    return (
        <div className="space-y-3">
            <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                    <input
                        type="checkbox"
                        checked={isRandom}
                        onChange={(e) => handleRandomToggle(e.target.checked)}
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
