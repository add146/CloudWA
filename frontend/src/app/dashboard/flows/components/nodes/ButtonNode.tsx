import { Handle, Position, NodeProps } from '@xyflow/react';
import { Square } from 'lucide-react';

export function ButtonNode({ data, selected }: NodeProps) {
    const buttons = data.buttons || [];

    return (
        <div
            className={`
        px-4 py-3 rounded-lg border-2 bg-white shadow-md min-w-[200px] max-w-[300px]
        ${selected ? 'border-purple-500 ring-2 ring-purple-200' : 'border-gray-300'}
      `}
        >
            <Handle
                type="target"
                position={Position.Top}
                className="!bg-gray-400 !w-3 !h-3"
            />

            <div className="flex items-center gap-2 mb-2">
                <Square className="h-4 w-4 text-purple-500" />
                <span className="font-semibold text-sm text-gray-700">Button</span>
            </div>

            <div className="text-sm text-gray-600 mb-2 line-clamp-2">
                {data.text || 'Enter question...'}
            </div>

            <div className="space-y-1">
                {buttons.slice(0, 3).map((btn: any, idx: number) => (
                    <div
                        key={idx}
                        className="relative text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded border border-purple-200"
                    >
                        {btn.title || btn.label || `Button ${idx + 1}`}
                        <Handle
                            type="source"
                            position={Position.Right}
                            id={btn.id}
                            className="!bg-purple-500 !w-2.5 !h-2.5 !right-[-8px]"
                            style={{ top: `${(idx + 1) * 25}px` }}
                        />
                    </div>
                ))}
                {buttons.length > 3 && (
                    <div className="text-xs text-gray-400">+{buttons.length - 3} more</div>
                )}
            </div>
        </div>
    );
}
