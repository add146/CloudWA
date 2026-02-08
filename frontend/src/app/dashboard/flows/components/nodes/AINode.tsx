import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Bot } from 'lucide-react';

export const AINode = memo(({ data, selected }: NodeProps) => {
    return (
        <div
            className={`
        px-3 py-2 rounded-lg border bg-white min-w-[200px] max-w-[280px]
        ${selected ? 'border-indigo-500 ring-1 ring-indigo-200 shadow-sm' : 'border-indigo-200'}
      `}
        >
            <Handle
                type="target"
                position={Position.Left}
                className="!bg-gray-400 !w-2.5 !h-2.5 !border-2 !border-white"
            />

            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-100">
                <div className="p-1 rounded bg-indigo-50">
                    <Bot className="w-3.5 h-3.5 text-indigo-600" />
                </div>
                <span className="font-semibold text-xs text-gray-700">AI Reply</span>
            </div>

            <div className="space-y-1">
                <div className="text-[10px] text-gray-500 font-medium">Prompt:</div>
                <div className="text-xs text-gray-600 line-clamp-3 bg-gray-50 p-1.5 rounded border border-gray-100">
                    {data.prompt || <span className="text-gray-400 italic">Enter AI prompt...</span>}
                </div>
            </div>

            <Handle
                type="source"
                position={Position.Right}
                className="!bg-indigo-500 !w-2.5 !h-2.5 !border-2 !border-white"
            />
        </div>
    );
});
