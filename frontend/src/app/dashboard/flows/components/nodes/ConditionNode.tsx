import { Handle, Position, NodeProps } from '@xyflow/react';
import { GitBranch } from 'lucide-react';

export function ConditionNode({ data, selected }: NodeProps) {
    return (
        <div
            className={`
        px-4 py-3 rounded-lg border-2 bg-white shadow-md min-w-[200px] max-w-[300px]
        ${selected ? 'border-yellow-500 ring-2 ring-yellow-200' : 'border-gray-300'}
      `}
        >
            <Handle
                type="target"
                position={Position.Top}
                className="!bg-gray-400 !w-3 !h-3"
            />

            <div className="flex items-center gap-2 mb-2">
                <GitBranch className="h-4 w-4 text-yellow-500" />
                <span className="font-semibold text-sm text-gray-700">Condition</span>
            </div>

            <div className="text-sm text-gray-600 line-clamp-2 font-mono bg-gray-50 px-2 py-1 rounded">
                {data.condition || 'Enter condition...'}
            </div>

            <div className="flex justify-between items-center mt-3 gap-4">
                <div className="relative flex-1">
                    <div className="text-xs text-green-600 font-medium mb-1">True</div>
                    <Handle
                        type="source"
                        position={Position.Bottom}
                        id="true"
                        className="!bg-green-500 !w-3 !h-3 !left-[25%]"
                    />
                </div>

                <div className="relative flex-1">
                    <div className="text-xs text-red-600 font-medium mb-1 text-right">False</div>
                    <Handle
                        type="source"
                        position={Position.Bottom}
                        id="false"
                        className="!bg-red-500 !w-3 !h-3 !left-[75%]"
                    />
                </div>
            </div>
        </div>
    );
}
