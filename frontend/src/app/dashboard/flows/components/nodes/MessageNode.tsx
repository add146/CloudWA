import { memo, useState } from 'react';
import { Handle, Position, NodeProps, useReactFlow } from '@xyflow/react';
import { MessageSquare } from 'lucide-react';

export const MessageNode = memo(({ id, data, selected }: NodeProps) => {
    const { setNodes } = useReactFlow();
    const [isEditing, setIsEditing] = useState(false);

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
                px-3 py-2 rounded-lg border bg-white min-w-[200px] max-w-[300px]
                ${selected ? 'border-blue-500 ring-2 ring-blue-200 shadow-lg' : 'border-blue-200'}
            `}
        >
            <Handle
                type="target"
                position={Position.Left}
                className="!bg-gray-400 !w-2.5 !h-2.5 !border-2 !border-white"
            />

            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-100">
                <div className="p-1.5 rounded bg-blue-50">
                    <MessageSquare className="w-4 h-4 text-blue-600" />
                </div>
                <span className="font-semibold text-sm text-gray-700">Message</span>
            </div>

            {/* Inline Editable Message */}
            <textarea
                value={data.message || ''}
                onChange={(e) => updateData('message', e.target.value)}
                onFocus={() => setIsEditing(true)}
                onBlur={() => setIsEditing(false)}
                placeholder="Enter your message..."
                rows={3}
                className={`
                    w-full text-sm text-gray-700 resize-none rounded-md p-2
                    border transition-all duration-200
                    ${isEditing
                        ? 'border-blue-400 bg-blue-50/50 focus:outline-none focus:ring-1 focus:ring-blue-300'
                        : 'border-transparent bg-gray-50 hover:bg-gray-100'
                    }
                `}
            />

            <div className="text-[10px] text-gray-400 mt-1">
                Use {'{{variableName}}'} for dynamic content
            </div>

            <Handle
                type="source"
                position={Position.Right}
                className="!bg-blue-500 !w-2.5 !h-2.5 !border-2 !border-white"
            />
        </div>
    );
});
