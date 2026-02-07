import { Handle, Position, NodeProps } from '@xyflow/react';
import { Play } from 'lucide-react';

export function StartNode({ data, selected }: NodeProps) {
    return (
        <div
            className={`
        px-4 py-3 rounded-lg border-2 bg-gradient-to-br from-green-50 to-green-100 shadow-md min-w-[150px]
        ${selected ? 'border-green-500 ring-2 ring-green-200' : 'border-green-300'}
      `}
        >
            <div className="flex items-center justify-center gap-2">
                <Play className="h-5 w-5 text-green-600 fill-green-600" />
                <span className="font-semibold text-green-700">Start</span>
            </div>

            <Handle
                type="source"
                position={Position.Bottom}
                className="!bg-green-500 !w-3 !h-3"
            />
        </div>
    );
}
