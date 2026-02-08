import { Handle, Position, NodeProps } from '@xyflow/react';
import { User } from 'lucide-react';

export function HumanTakeoverNode({ selected }: NodeProps) {
    return (
        <div
            className={`
        px-3 py-2 rounded-lg border bg-white min-w-[150px]
        ${selected ? 'border-rose-500 ring-1 ring-rose-200 shadow-sm' : 'border-rose-200'}
      `}
        >
            <Handle
                type="target"
                position={Position.Left}
                className="!bg-gray-400 !w-2.5 !h-2.5 !border-2 !border-white"
            />
            <div className="flex items-center gap-2">
                <div className="p-1 rounded bg-rose-50">
                    <User className="w-3.5 h-3.5 text-rose-600" />
                </div>
                <span className="font-semibold text-xs text-gray-700">Human Takeover</span>
            </div>
        </div>
    );
}
