import { Handle, Position, NodeProps } from '@xyflow/react';
import { MessageSquare } from 'lucide-react';

export function MessageNode({ data, selected }: NodeProps) {
    return (
        <div
            className={`
        px-4 py-3 rounded-lg border-2 bg-white shadow-md min-w-[200px] max-w-[300px]
        ${selected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-300'}
      `}
        >
            <Handle
                type="target"
                position={Position.Top}
                className="!bg-gray-400 !w-3 !h-3"
            />

            <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="h-4 w-4 text-blue-500" />
                <span className="font-semibold text-sm text-gray-700">Message</span>
            </div>

            <div className="text-sm text-gray-600 line-clamp-3 whitespace-pre-wrap">
                {data.message || data.text || 'Enter message...'}
            </div>

            <Handle
                type="source"
                position={Position.Bottom}
                className="!bg-blue-500 !w-3 !h-3"
            />
        </div>
    );
}
