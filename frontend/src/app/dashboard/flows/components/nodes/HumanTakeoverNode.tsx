import { Handle, Position, NodeProps } from '@xyflow/react';
// import { UserCircle } from 'lucide-react';

export function HumanTakeoverNode({ data, selected }: NodeProps) {
    return (
        <div
            className={`
        px-4 py-3 rounded-lg border-2 bg-gradient-to-br from-red-50 to-pink-50 shadow-md min-w-[200px]
        ${selected ? 'border-red-500 ring-2 ring-red-200' : 'border-red-200'}
      `}
        >
            <Handle
                type="target"
                position={Position.Top}
                className="!bg-gray-400 !w-3 !h-3"
            />

            <div className="flex items-center gap-2 mb-2">
                <span className="text-red-600">👤</span>
                <span className="font-semibold text-sm text-red-700">Human Takeover</span>
            </div>

            <div className="text-sm text-gray-600 line-clamp-2">
                {data.message || 'Transferring to agent...'}
            </div>

            {/* No source handle - this is a terminal node */}
        </div>
    );
}
