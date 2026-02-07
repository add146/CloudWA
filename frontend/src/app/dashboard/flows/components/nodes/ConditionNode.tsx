import { Handle, Position, NodeProps } from '@xyflow/react';
import { GitFork } from 'lucide-react';

export function ConditionNode({ data, selected }: NodeProps) {
    return (
        <div
            className={`
        px-3 py-2 rounded-lg border bg-white min-w-[180px]
        ${selected ? 'border-amber-500 ring-1 ring-amber-200 shadow-sm' : 'border-amber-200'}
      `}
        >
            <Handle
                type="target"
                position={Position.Top}
                className="!bg-gray-400 !w-2.5 !h-2.5 !border-2 !border-white"
            />

            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
                <div className="p-1 rounded bg-amber-50">
                    <GitFork className="w-3.5 h-3.5 text-amber-600" />
                </div>
                <span className="font-semibold text-xs text-gray-700">Condition</span>
            </div>

            <div className="flex flex-col gap-2">
                <div className="relative flex items-center justify-between bg-green-50 px-2 py-1.5 rounded border border-green-100">
                    <span className="text-[10px] font-medium text-green-700">True / Match</span>
                    <Handle
                        type="source"
                        position={Position.Right}
                        id="true"
                        className="!bg-green-500 !w-2 !h-2 !right-[-5px] !border-2 !border-white"
                    />
                </div>

                <div className="relative flex items-center justify-between bg-red-50 px-2 py-1.5 rounded border border-red-100">
                    <span className="text-[10px] font-medium text-red-700">False / Else</span>
                    <Handle
                        type="source"
                        position={Position.Right}
                        id="false"
                        className="!bg-red-500 !w-2 !h-2 !right-[-5px] !border-2 !border-white"
                    />
                </div>
            </div>
        </div>
    );
}
