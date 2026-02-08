import { memo, useCallback } from 'react';
import { Handle, Position, NodeProps, useReactFlow } from '@xyflow/react';
import { MessageSquare, Plus, X } from 'lucide-react';

export const QuickReplyNode = memo(({ id, data, selected }: NodeProps) => {
    const { updateNodeData } = useReactFlow();
    const buttons = (data.buttons as any[]) || [];

    const updateLabel = (index: number, val: string) => {
        const newButtons = [...buttons];
        newButtons[index] = { ...newButtons[index], label: val };
        updateNodeData(id, { buttons: newButtons });
    };

    const addButton = () => {
        if (buttons.length >= 3) return; // WhatsApp limits
        const newButtons = [...buttons, { id: `btn-${Date.now()}`, label: `Button ${buttons.length + 1}` }];
        updateNodeData(id, { buttons: newButtons });
    };

    const removeButton = (index: number) => {
        const newButtons = buttons.filter((_, i) => i !== index);
        updateNodeData(id, { buttons: newButtons });
    };

    return (
        <div className={`w-[280px] bg-white rounded-lg border shadow-sm ${selected ? 'border-purple-500 ring-1 ring-purple-200' : 'border-purple-200'}`}>
            {/* Header */}
            <div className="flex items-center gap-2 p-3 border-b border-purple-100 bg-purple-50/50 rounded-t-lg">
                <div className="p-1.5 rounded bg-purple-100 text-purple-600">
                    <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                    <h3 className="text-sm font-semibold text-gray-800">Quick Replies Message</h3>
                </div>
            </div>

            <Handle type="target" position={Position.Left} className="!bg-purple-500 !w-3 !h-3 !border-2 !border-white" />

            <div className="p-3 space-y-3">
                {/* Header Input */}
                <div>
                    <label className="text-[10px] text-gray-500 font-medium">Header</label>
                    <input
                        type="text"
                        placeholder="Enter header text"
                        className="w-full text-xs p-2 border border-gray-200 rounded mt-1"
                        value={data.header as string || ''}
                        onChange={(e) => updateNodeData(id, { header: e.target.value })}
                    />
                </div>

                {/* Body Input */}
                <div>
                    <label className="text-[10px] text-gray-500 font-medium">Body</label>
                    <textarea
                        placeholder="Enter message body"
                        className="w-full text-xs p-2 border border-gray-200 rounded mt-1 min-h-[60px]"
                        value={data.body as string || ''}
                        onChange={(e) => updateNodeData(id, { body: e.target.value })}
                    />
                </div>

                {/* Footer Input */}
                <div>
                    <label className="text-[10px] text-gray-500 font-medium">Footer</label>
                    <input
                        type="text"
                        placeholder="Enter footer text"
                        className="w-full text-xs p-2 border border-gray-200 rounded mt-1"
                        value={data.footer as string || ''}
                        onChange={(e) => updateNodeData(id, { footer: e.target.value })}
                    />
                </div>

                {/* Buttons */}
                <div className="space-y-2">
                    <label className="text-[10px] text-gray-500 font-medium">Buttons (Max 3)</label>
                    {buttons.map((btn, idx) => (
                        <div key={idx} className="flex gap-1 relative">
                            <input
                                type="text"
                                value={btn.label}
                                onChange={(e) => updateLabel(idx, e.target.value)}
                                className="flex-1 text-xs p-2 border border-purple-200 rounded bg-purple-50 text-purple-700"
                            />
                            <button onClick={() => removeButton(idx)} className="text-gray-400 hover:text-red-500">
                                <X className="w-4 h-4" />
                            </button>
                            <Handle
                                type="source"
                                position={Position.Right}
                                id={btn.id}
                                className="!bg-purple-500 !w-2.5 !h-2.5 !right-[-5px] !border-2 !border-white"
                                style={{ top: '50%', transform: 'translateY(-50%)' }}
                            />
                        </div>
                    ))}
                    {buttons.length < 3 && (
                        <button onClick={addButton} className="w-full py-1.5 text-xs font-medium text-purple-600 bg-purple-50 border border-purple-100 rounded hover:bg-purple-100 flex items-center justify-center gap-1">
                            <Plus className="w-3 h-3" /> Add Button
                        </button>
                    )}
                </div>
            </div>

            {/* Fallback exit handle */}
            <div className="p-2 border-t border-gray-100 flex justify-end items-center gap-2">
                <span className="text-[10px] text-gray-400">Else exit</span>
                <Handle type="source" position={Position.Right} id="fallback" className="!bg-gray-400 !w-2 !h-2 !border-2 !border-white" />
            </div>
        </div>
    );
});
