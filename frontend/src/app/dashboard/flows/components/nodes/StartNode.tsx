import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { PlayCircle } from 'lucide-react';

export const StartNode = memo(({ selected }: NodeProps) => {
    return (
        <div
            className={`
        px-3 py-2 rounded-lg border bg-white min-w-[120px]
        ${selected ? 'border-emerald-500 ring-1 ring-emerald-200 shadow-sm' : 'border-emerald-200'}
      `}
        >
            <div className="flex items-center justify-center gap-2">
                <div className="p-1 rounded bg-emerald-50">
                    <PlayCircle className="w-3.5 h-3.5 text-emerald-600" />
                </div>
                <span className="font-semibold text-xs text-gray-700">Start</span>
            </div>
            <Handle
                type="source"
                position={Position.Right}
                className="!bg-emerald-500 !w-2.5 !h-2.5 !border-2 !border-white"
            />
        </div>
    );
});
