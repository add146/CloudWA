import { Handle, Position, NodeProps } from '@xyflow/react';
// import { Bot } from 'lucide-react';

export function AINode({ data, selected }: NodeProps) {
    return (
        <div
            className={`
        px-4 py-3 rounded-lg border-2 bg-gradient-to-br from-indigo-50 to-purple-50 shadow-md min-w-[200px] max-w-[300px]
        ${selected ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-indigo-200'}
      `}
        >
            <Handle
                type="target"
                position={Position.Top}
                className="!bg-gray-400 !w-3 !h-3"
            />

            <div className="flex items-center gap-2 mb-2">
                <span className="text-indigo-600">🤖</span>
                <span className="font-semibold text-sm text-indigo-700">AI Reply</span>
            </div>

            <div className="text-xs text-gray-600 line-clamp-2 mb-1">
                {data.prompt || data.systemPrompt || 'Enter AI prompt...'}
            </div>

            {data.saveAs && (
                <div className="text-xs text-indigo-600 bg-indigo-100 px-2 py-1 rounded mt-2">
                    Save as: {data.saveAs}
                </div>
            )}

            <Handle
                type="source"
                position={Position.Bottom}
                className="!bg-indigo-500 !w-3 !h-3"
            />
        </div>
    );
}
