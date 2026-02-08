import { memo, useState } from 'react';
import { Handle, Position, NodeProps, useReactFlow } from '@xyflow/react';
import { MousePointerClick, Plus, Trash2 } from 'lucide-react';

export const ButtonNode = memo(({ id, data, selected }: NodeProps) => {
    const { setNodes } = useReactFlow();
    const buttons = data.buttons || [];

    const updateData = (key: string, value: any) => {
        setNodes((nodes) =>
            nodes.map((node) =>
                node.id === id
                    ? { ...node, data: { ...node.data, [key]: value } }
                    : node
            )
        );
    };

    const addButton = () => {
        const newBtn = { id: `btn_${Date.now()}`, title: '', value: '' };
        updateData('buttons', [...buttons, newBtn]);
    };

    const updateButton = (idx: number, field: string, value: string) => {
        const updated = [...buttons];
        updated[idx][field] = value;
        updateData('buttons', updated);
    };

    const removeButton = (idx: number) => {
        updateData('buttons', buttons.filter((_: any, i: number) => i !== idx));
    };

    return (
        <div
            className={`
                px-3 py-2 rounded-lg border bg-white min-w-[220px] max-w-[300px]
                ${selected ? 'border-purple-500 ring-2 ring-purple-200 shadow-lg' : 'border-purple-200'}
            `}
        >
            <Handle
                type="target"
                position={Position.Left}
                className="!bg-gray-400 !w-2.5 !h-2.5 !border-2 !border-white"
            />

            {/* Header */}
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-100">
                <div className="p-1.5 rounded bg-purple-50">
                    <MousePointerClick className="w-4 h-4 text-purple-600" />
                </div>
                <span className="font-semibold text-sm text-gray-700">Buttons</span>
            </div>

            {/* Question Text */}
            <div className="mb-2">
                <label className="text-[10px] text-gray-500 font-medium">Question</label>
                <textarea
                    value={data.text || ''}
                    onChange={(e) => updateData('text', e.target.value)}
                    placeholder="Enter your question..."
                    rows={2}
                    className="w-full text-xs p-2 border border-gray-200 rounded-md resize-none focus:ring-1 focus:ring-purple-300"
                />
            </div>

            {/* Buttons List */}
            <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                    <label className="text-[10px] text-gray-500 font-medium">Buttons</label>
                    <button
                        onClick={addButton}
                        className="text-[10px] text-purple-600 hover:text-purple-800 flex items-center gap-0.5"
                    >
                        <Plus className="w-3 h-3" /> Add
                    </button>
                </div>

                {buttons.map((btn: any, idx: number) => (
                    <div
                        key={btn.id || idx}
                        className="relative flex items-center gap-1 text-xs bg-purple-50 p-1.5 rounded border border-purple-100"
                    >
                        <input
                            type="text"
                            value={btn.title || btn.label || ''}
                            onChange={(e) => updateButton(idx, 'title', e.target.value)}
                            placeholder={`Button ${idx + 1}`}
                            className="flex-1 bg-transparent border-none text-xs text-purple-700 focus:outline-none focus:ring-0 p-0"
                        />
                        <button
                            onClick={() => removeButton(idx)}
                            className="p-0.5 text-red-400 hover:text-red-600"
                        >
                            <Trash2 className="w-3 h-3" />
                        </button>
                        <Handle
                            type="source"
                            position={Position.Right}
                            id={btn.id}
                            className="!bg-purple-500 !w-2 !h-2 !right-[-5px] !border-2 !border-white"
                            style={{ top: '50%', transform: 'translateY(-50%)' }}
                        />
                    </div>
                ))}

                {buttons.length === 0 && (
                    <div className="text-[10px] text-gray-400 text-center py-2 bg-gray-50 rounded">
                        No buttons yet. Click Add to create one.
                    </div>
                )}
            </div>
        </div>
    );
});

export function ButtonNodeLegacy({ data, selected }: NodeProps) {
    // Legacy export for backwards compatibility
    return <ButtonNode id="" data={data} selected={selected} />;
}
