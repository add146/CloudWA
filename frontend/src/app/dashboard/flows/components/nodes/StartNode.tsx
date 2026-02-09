import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Trash, PlayCircle } from 'lucide-react';
import { useReactFlow } from '@xyflow/react';

export const StartNode = memo(({ id, selected }: NodeProps) => {
    const { setNodes } = useReactFlow();

    return (
        <div
            className={`
        px-3 py-2 rounded-lg border bg-white min-w-[120px]
        ${selected ? 'border-emerald-500 ring-1 ring-emerald-200 shadow-sm' : 'border-emerald-200'}
      `}
        >
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <div className="p-1 rounded bg-emerald-50">
                        <PlayCircle className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                    <span className="font-semibold text-xs text-gray-700">Start</span>
                </div>

                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setNodes((nodes) => nodes.filter((n) => n.id !== id));
                    }}
                    className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                >
                    <Trash className="w-3 h-3" />
                </button>
            </div>
            <Handle
                type="source"
                position={Position.Right}
                className="!bg-emerald-500 !w-2.5 !h-2.5 !border-2 !border-white"
            />
        </div>
    );
});
