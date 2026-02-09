import { Handle, Position, NodeProps } from '@xyflow/react';
import { CheckCheck } from 'lucide-react';

export function MarkReadNode({ selected }: NodeProps) {
    return (
        <div
            className={`
        px-3 py-2 rounded-lg border bg-white min-w-[150px] shadow-sm
        ${selected ? 'border-sky-500 ring-1 ring-sky-200' : 'border-sky-200'}
      `}
        >
            <Handle
                type="target"
                position={Position.Left}
                className="!bg-gray-400 !w-2.5 !h-2.5 !border-2 !border-white"
            />

            <div className="flex items-center gap-2">
                <div className="p-1.5 rounded bg-sky-50">
                    <CheckCheck className="w-4 h-4 text-sky-600" />
                </div>
                <div className="flex flex-col">
                    <span className="font-semibold text-xs text-gray-700">Mark as Read</span>
                    <span className="text-[10px] text-gray-400">Update status</span>
                </div>
            </div>

            <Handle
                type="source"
                position={Position.Right}
                className="!bg-sky-500 !w-2.5 !h-2.5 !border-2 !border-white"
            />
        </div>
    );
}
