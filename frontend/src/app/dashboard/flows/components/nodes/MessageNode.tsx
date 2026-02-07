import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { MessageSquare } from 'lucide-react';

export const MessageNode = memo(({ data, selected }: NodeProps) => {
    return (
        <div
            className={`
        px-3 py-2 rounded-lg border bg-white min-w-[180px] max-w-[280px]
        ${selected ? 'border-blue-500 ring-1 ring-blue-200 shadow-sm' : 'border-blue-200'}
      `}
        >
            <Handle
                type="target"
                position={Position.Top}
                className="!bg-gray-400 !w-2.5 !h-2.5 !border-2 !border-white"
            />

            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-100">
                <div className="p-1 rounded bg-blue-50">
                    <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                </div>
                <span className="font-semibold text-xs text-gray-700">Message</span>
            </div>

            <div className="text-xs text-gray-600 line-clamp-3 whitespace-pre-wrap leading-relaxed">
                {data.message || data.text || <span className="text-gray-400 italic">Enter message...</span>}
            </div>

            <Handle
                type="source"
                position={Position.Bottom}
                className="!bg-blue-500 !w-2.5 !h-2.5 !border-2 !border-white"
            />
        </div>
    );
});
