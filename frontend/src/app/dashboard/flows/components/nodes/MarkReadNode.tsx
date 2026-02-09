import { Handle, Position, NodeProps, useReactFlow } from '@xyflow/react';
import { CheckCheck, Trash } from 'lucide-react';

export function MarkReadNode({ id, selected }: NodeProps) {
    const { setNodes } = useReactFlow();
    return (
        <div
            className={`
        px-3 py-2 rounded-lg border bg-white min-w-[150px] shadow-sm relative group
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

            <button
                onClick={(e) => {
                    e.stopPropagation();
                    setNodes((nodes) => nodes.filter((n) => n.id !== id));
                }}
                className="absolute -top-2 -right-2 p-1 bg-white border border-gray-200 rounded-full text-gray-400 hover:text-red-500 hover:border-red-300 shadow-sm transition-colors opacity-0 group-hover:opacity-100"
            >
                <Trash className="w-3 h-3" />
            </button>

            <Handle
                type="source"
                position={Position.Right}
                className="!bg-sky-500 !w-2.5 !h-2.5 !border-2 !border-white"
            />
        </div>
    );
}
