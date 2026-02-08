import { memo, useState, useEffect } from 'react';
import { Handle, Position, NodeProps, useReactFlow } from '@xyflow/react';
import { Brain, Plus, Trash2, Variable } from 'lucide-react';

export const AINode = memo(({ id, data, selected }: NodeProps) => {
    const { setNodes } = useReactFlow();
    const [availableProviders, setAvailableProviders] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const updateData = (key: string, value: any) => {
        setNodes((nodes) =>
            nodes.map((node) =>
                node.id === id
                    ? { ...node, data: { ...node.data, [key]: value } }
                    : node
            )
        );
    };

    // Fetch available AI providers from settings
    useEffect(() => {
        const fetchProviders = async () => {
            try {
                const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/settings/ai-providers`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('session_token')}`
                    }
                });
                if (response.ok) {
                    const res = await response.json();
                    setAvailableProviders(res.data || []);
                } else {
                    // Fallback to OpenAI
                    setAvailableProviders([
                        { id: 'openai', name: 'OpenAI', models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4.1', 'gpt-4.1-mini', 'gpt-3.5-turbo'] }
                    ]);
                }
            } catch (error) {
                setAvailableProviders([
                    { id: 'openai', name: 'OpenAI', models: ['gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo'] }
                ]);
            } finally {
                setIsLoading(false);
            }
        };
        fetchProviders();
    }, []);

    const temperature = data.temperature !== undefined ? Number(data.temperature) : 0.7;
    const intentions = Array.isArray(data.intentions) ? data.intentions : [];

    const addIntention = () => {
        const newIntentions = [...intentions, { name: '', description: '' }];
        updateData('intentions', newIntentions);
    };

    const updateIntention = (idx: number, field: string, value: string) => {
        const updated = [...intentions];
        updated[idx] = { ...updated[idx], [field]: value };
        updateData('intentions', updated);
    };

    const removeIntention = (idx: number) => {
        updateData('intentions', intentions.filter((_: any, i: number) => i !== idx));
    };

    // Flatten all models from all providers
    const allModels = availableProviders.flatMap((provider: any) =>
        (provider.models || []).map((modelId: string) => ({
            id: modelId,
            name: `${formatModelName(modelId)} (${provider.name})`,
            provider: provider.id
        }))
    );

    function formatModelName(modelId: string): string {
        // Format model name for display
        return modelId
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ')
            .replace(/(\d+)\.(\d+)/g, '$1.$2'); // Keep version numbers
    }

    return (
        <div
            className={`
                rounded-xl border-2 bg-white min-w-[300px] max-w-[340px] overflow-hidden shadow-sm
                ${selected ? 'border-blue-500 ring-2 ring-blue-200 shadow-lg' : 'border-blue-200'}
            `}
        >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 border-b border-blue-100">
                <div className="flex items-center gap-2">
                    <Brain className="w-5 h-5 text-blue-600" />
                    <span className="font-semibold text-blue-700">LLM Text Generation</span>
                </div>
            </div>

            <Handle
                type="target"
                position={Position.Left}
                className="!bg-blue-500 !w-3 !h-3 !border-2 !border-white !-left-1.5"
            />

            <div className="p-4 space-y-4">
                {/* Model Selection */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Model</label>
                    {isLoading ? (
                        <div className="text-xs text-gray-400 py-2">Loading models...</div>
                    ) : (
                        <select
                            value={String(data.model || 'gpt-4o-mini')}
                            onChange={(e) => updateData('model', e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                        >
                            {allModels.map((model) => (
                                <option key={model.id} value={model.id}>
                                    {model.name}
                                </option>
                            ))}
                        </select>
                    )}
                </div>

                {/* System Prompt */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">System Prompt</label>
                    <div className="relative">
                        <textarea
                            value={String(data.systemPrompt || '')}
                            onChange={(e) => updateData('systemPrompt', e.target.value)}
                            placeholder="You are a helpful AI assistant. Be concise and professional in your responses."
                            rows={3}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                        />
                        <button className="absolute bottom-2 right-2 flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600 bg-white px-2 py-1 rounded border border-gray-200 hover:border-blue-300">
                            <Variable className="w-3 h-3" />
                            Variables
                        </button>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                        Define the AI's role and behavior. Example: "You are a customer service representative for a tech company. Be friendly and helpful."
                    </p>
                </div>

                {/* User Prompt */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">User Prompt</label>
                    <div className="relative">
                        <textarea
                            value={String(data.userPrompt || '')}
                            onChange={(e) => updateData('userPrompt', e.target.value)}
                            placeholder="Enter your prompt here..."
                            rows={3}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                        />
                        <button className="absolute bottom-2 right-2 flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600 bg-white px-2 py-1 rounded border border-gray-200 hover:border-blue-300">
                            <Variable className="w-3 h-3" />
                            Variables
                        </button>
                    </div>
                </div>

                {/* Intentions */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-gray-700">Intentions</label>
                        <button
                            onClick={addIntention}
                            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            Add Intention
                        </button>
                    </div>
                    <p className="text-xs text-gray-500 mb-2">
                        Add intentions to help the AI classify user messages and respond appropriately. Each intention will be available as a variable.
                    </p>

                    {intentions.length > 0 && (
                        <div className="space-y-2">
                            {intentions.map((intent: any, idx: number) => (
                                <div key={idx} className="flex gap-2 items-center bg-gray-50 p-2 rounded-lg border border-gray-200">
                                    <input
                                        type="text"
                                        value={intent.name || ''}
                                        onChange={(e) => updateIntention(idx, 'name', e.target.value)}
                                        placeholder="Intent name"
                                        className="flex-1 text-xs px-2 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-400"
                                    />
                                    <button
                                        onClick={() => removeIntention(idx)}
                                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Temperature */}
                <div>
                    <div className="flex items-center justify-between mb-1">
                        <label className="text-sm font-medium text-gray-700">Temperature ({temperature.toFixed(1)})</label>
                    </div>
                    <input
                        type="range"
                        min="0"
                        max="2"
                        step="0.1"
                        value={temperature}
                        onChange={(e) => updateData('temperature', parseFloat(e.target.value))}
                        className="w-full h-2 bg-gradient-to-r from-blue-200 via-blue-400 to-blue-600 rounded-lg appearance-none cursor-pointer"
                        style={{
                            background: `linear-gradient(to right, #93c5fd 0%, #3b82f6 ${(temperature / 2) * 100}%, #e5e7eb ${(temperature / 2) * 100}%, #e5e7eb 100%)`
                        }}
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>More focused</span>
                        <span>More creative</span>
                    </div>
                </div>

                {/* Max Tokens */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Max Tokens</label>
                    <input
                        type="number"
                        value={Number(data.maxTokens) || 1000}
                        onChange={(e) => updateData('maxTokens', parseInt(e.target.value))}
                        min={1}
                        max={4000}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                    />
                </div>

                {/* Variable Name */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Variable Name</label>
                    <input
                        type="text"
                        value={String(data.variableName || '')}
                        onChange={(e) => updateData('variableName', e.target.value)}
                        placeholder="e.g. ai_response"
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                        Store the LLM response in this variable. If intentions are defined, the detected intent will be stored in <code className="bg-gray-100 px-1 rounded">variableName_intent</code>
                    </p>
                </div>
            </div>

            <Handle
                type="source"
                position={Position.Right}
                className="!bg-blue-500 !w-3 !h-3 !border-2 !border-white !-right-1.5"
            />
        </div>
    );
});
