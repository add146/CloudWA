import { memo } from 'react';
import { Handle, Position, NodeProps, useReactFlow } from '@xyflow/react';
import { Clock, User, List, Plus, Trash2 } from 'lucide-react';

export const DelayNode = memo(({ id, data, selected }: NodeProps) => {
    const { setNodes } = useReactFlow();
    const isRandom = data.random || false;

    const updateData = (key: string, value: any) => {
        setNodes((nodes) =>
            nodes.map((node) =>
                node.id === id
                    ? { ...node, data: { ...node.data, [key]: value } }
                    : node
            )
        );
    };

    return (
        <div
            className={`
                px-3 py-2 rounded-lg border bg-white min-w-[180px] max-w-[240px]
                ${selected ? 'border-orange-500 ring-2 ring-orange-200 shadow-lg' : 'border-orange-200'}
            `}
        >
            <Handle
                type="target"
                position={Position.Left}
                className="!bg-gray-400 !w-2.5 !h-2.5 !border-2 !border-white"
            />

            {/* Header */}
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-100">
                <div className="p-1.5 rounded bg-orange-50">
                    <Clock className="w-4 h-4 text-orange-600" />
                </div>
                <span className="font-semibold text-sm text-gray-700">⏱️ Delay</span>
            </div>

            {/* Random Toggle */}
            <label className="flex items-center gap-2 mb-2 cursor-pointer">
                <input
                    type="checkbox"
                    checked={isRandom}
                    onChange={(e) => updateData('random', e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-gray-300 text-orange-500 focus:ring-orange-300"
                />
                <span className="text-xs text-gray-600">Random delay</span>
            </label>

            {/* Delay Inputs */}
            {isRandom ? (
                <div className="flex gap-2 items-center">
                    <div className="flex-1">
                        <label className="text-[10px] text-gray-500">Min (s)</label>
                        <input
                            type="number"
                            value={data.minDelay || 0}
                            onChange={(e) => updateData('minDelay', parseFloat(e.target.value))}
                            min={0}
                            className="w-full text-xs p-1.5 border border-gray-200 rounded-md focus:ring-1 focus:ring-orange-300"
                        />
                    </div>
                    <div className="flex-1">
                        <label className="text-[10px] text-gray-500">Max (s)</label>
                        <input
                            type="number"
                            value={data.maxDelay || 0}
                            onChange={(e) => updateData('maxDelay', parseFloat(e.target.value))}
                            min={0}
                            className="w-full text-xs p-1.5 border border-gray-200 rounded-md focus:ring-1 focus:ring-orange-300"
                        />
                    </div>
                </div>
            ) : (
                <div>
                    <label className="text-[10px] text-gray-500">Delay (seconds)</label>
                    <input
                        type="number"
                        value={data.delay || 0}
                        onChange={(e) => updateData('delay', parseFloat(e.target.value))}
                        min={0}
                        className="w-full text-xs p-1.5 border border-gray-200 rounded-md focus:ring-1 focus:ring-orange-300"
                    />
                </div>
            )}

            <Handle
                type="source"
                position={Position.Right}
                className="!bg-orange-500 !w-2.5 !h-2.5 !border-2 !border-white"
            />
        </div>
    );
});

export const HumanTakeoverNode = memo(({ id, data, selected }: NodeProps) => {
    const { setNodes } = useReactFlow();

    const updateData = (key: string, value: any) => {
        setNodes((nodes) =>
            nodes.map((node) =>
                node.id === id
                    ? { ...node, data: { ...node.data, [key]: value } }
                    : node
            )
        );
    };

    return (
        <div
            className={`
                px-3 py-2 rounded-lg border bg-white min-w-[180px] max-w-[240px]
                ${selected ? 'border-rose-500 ring-2 ring-rose-200 shadow-lg' : 'border-rose-200'}
            `}
        >
            <Handle
                type="target"
                position={Position.Left}
                className="!bg-gray-400 !w-2.5 !h-2.5 !border-2 !border-white"
            />

            {/* Header */}
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-100">
                <div className="p-1.5 rounded bg-rose-50">
                    <User className="w-4 h-4 text-rose-600" />
                </div>
                <span className="font-semibold text-sm text-gray-700">👤 Human Takeover</span>
            </div>

            {/* Message to send when takeover starts */}
            <div className="mb-2">
                <label className="text-[10px] text-gray-500 font-medium">Auto-reply message</label>
                <textarea
                    value={data.message || ''}
                    onChange={(e) => updateData('message', e.target.value)}
                    placeholder="A human will assist you shortly..."
                    rows={2}
                    className="w-full text-xs p-2 border border-gray-200 rounded-md resize-none focus:ring-1 focus:ring-rose-300"
                />
            </div>

            <div className="text-[10px] text-rose-600 bg-rose-50 px-2 py-1 rounded text-center">
                Flow pauses here until agent resumes
            </div>
        </div>
    );
});

export const ListNode = memo(({ id, data, selected }: NodeProps) => {
    const { setNodes } = useReactFlow();
    const listItems = data.items || [];

    const updateData = (key: string, value: any) => {
        setNodes((nodes) =>
            nodes.map((node) =>
                node.id === id
                    ? { ...node, data: { ...node.data, [key]: value } }
                    : node
            )
        );
    };

    const addItem = () => {
        const newItem = { id: `item_${Date.now()}`, title: '', description: '' };
        updateData('items', [...listItems, newItem]);
    };

    const updateItem = (idx: number, field: string, value: string) => {
        const updated = [...listItems];
        updated[idx][field] = value;
        updateData('items', updated);
    };

    const removeItem = (idx: number) => {
        updateData('items', listItems.filter((_: any, i: number) => i !== idx));
    };

    return (
        <div
            className={`
                px-3 py-2 rounded-lg border bg-white min-w-[220px] max-w-[300px]
                ${selected ? 'border-cyan-500 ring-2 ring-cyan-200 shadow-lg' : 'border-cyan-200'}
            `}
        >
            <Handle
                type="target"
                position={Position.Left}
                className="!bg-gray-400 !w-2.5 !h-2.5 !border-2 !border-white"
            />

            {/* Header */}
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-100">
                <div className="p-1.5 rounded bg-cyan-50">
                    <List className="w-4 h-4 text-cyan-600" />
                </div>
                <span className="font-semibold text-sm text-gray-700">📋 List Message</span>
            </div>

            {/* Title */}
            <div className="mb-2">
                <label className="text-[10px] text-gray-500 font-medium">Title</label>
                <input
                    type="text"
                    value={data.title || ''}
                    onChange={(e) => updateData('title', e.target.value)}
                    placeholder="Menu Title"
                    className="w-full text-xs p-1.5 border border-gray-200 rounded-md focus:ring-1 focus:ring-cyan-300"
                />
            </div>

            {/* Body */}
            <div className="mb-2">
                <label className="text-[10px] text-gray-500 font-medium">Body</label>
                <textarea
                    value={data.body || ''}
                    onChange={(e) => updateData('body', e.target.value)}
                    placeholder="Select an option..."
                    rows={2}
                    className="w-full text-xs p-1.5 border border-gray-200 rounded-md resize-none focus:ring-1 focus:ring-cyan-300"
                />
            </div>

            {/* Button Text */}
            <div className="mb-2">
                <label className="text-[10px] text-gray-500 font-medium">Button Text</label>
                <input
                    type="text"
                    value={data.buttonText || ''}
                    onChange={(e) => updateData('buttonText', e.target.value)}
                    placeholder="View Options"
                    className="w-full text-xs p-1.5 border border-gray-200 rounded-md focus:ring-1 focus:ring-cyan-300"
                />
            </div>

            {/* List Items */}
            <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                    <label className="text-[10px] text-gray-500 font-medium">Options</label>
                    <button
                        onClick={addItem}
                        className="text-[10px] text-cyan-600 hover:text-cyan-800 flex items-center gap-0.5"
                    >
                        <Plus className="w-3 h-3" /> Add
                    </button>
                </div>

                {listItems.slice(0, 5).map((item: any, idx: number) => (
                    <div
                        key={item.id || idx}
                        className="relative flex items-center gap-1 text-xs bg-cyan-50 p-1.5 rounded border border-cyan-100"
                    >
                        <input
                            type="text"
                            value={item.title || ''}
                            onChange={(e) => updateItem(idx, 'title', e.target.value)}
                            placeholder={`Option ${idx + 1}`}
                            className="flex-1 bg-transparent border-none text-xs text-cyan-700 focus:outline-none focus:ring-0 p-0"
                        />
                        <button
                            onClick={() => removeItem(idx)}
                            className="p-0.5 text-red-400 hover:text-red-600"
                        >
                            <Trash2 className="w-3 h-3" />
                        </button>
                        <Handle
                            type="source"
                            position={Position.Right}
                            id={item.id}
                            className="!bg-cyan-500 !w-2 !h-2 !right-[-5px] !border-2 !border-white"
                            style={{ top: '50%', transform: 'translateY(-50%)' }}
                        />
                    </div>
                ))}

                {listItems.length === 0 && (
                    <div className="text-[10px] text-gray-400 text-center py-2 bg-gray-50 rounded">
                        No options yet. Click Add.
                    </div>
                )}
            </div>
        </div>
    );
});
