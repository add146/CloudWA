import { Handle, Position, NodeProps } from '@xyflow/react';
import { MousePointerClick } from 'lucide-react';

export function ButtonNode({ data, selected }: NodeProps) {
    const buttons = data.buttons || [];

    return (
        <div
            className={`
        px-3 py-2 rounded-lg border bg-white min-w-[200px] max-w-[280px]
        ${selected ? 'border-purple-500 ring-1 ring-purple-200 shadow-sm' : 'border-purple-200'}
      `}
        >
            <Handle
                type="target"
                position={Position.Top}
                className="!bg-gray-400 !w-2.5 !h-2.5 !border-2 !border-white"
            />

            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-100">
                <div className="p-1 rounded bg-purple-50">
                    <MousePointerClick className="w-3.5 h-3.5 text-purple-600" />
                </div>
                <span className="font-semibold text-xs text-gray-700">Buttons</span>
            </div>

            <div className="text-xs text-gray-600 mb-3 line-clamp-2">
                {data.text || <span className="text-gray-400 italic">Enter question...</span>}
            </div>

            <div className="space-y-1.5">
                {buttons.slice(0, 3).map((btn: any, idx: number) => (
                    <div
                        key={idx}
                        className="relative text-[10px] font-medium bg-purple-50 text-purple-700 px-2 py-1.5 rounded border border-purple-100"
                    >
                        {btn.title || btn.label || `Button ${idx + 1}`}
                        <Handle
                            type="source"
                            position={Position.Right}
                            id={btn.id}
                            className="!bg-purple-500 !w-2 !h-2 !right-[-5px] !border-2 !border-white"
                            style={{ top: '50%', transform: 'translateY(-50%)' }}
                        />
                    </div>
                ))}
                {buttons.length > 3 && (
                    <div className="text-[10px] text-gray-400 text-center">+{buttons.length - 3} more</div>
                )}
            </div>
        </div>
    );
}
