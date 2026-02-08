import { Handle, Position, NodeProps } from '@xyflow/react';
import { Clock, User, List } from 'lucide-react';

export function DelayNode({ data, selected }: NodeProps) {
    const isRandom = data.random || false;
    const delayText = isRandom
        ? `${data.minDelay || 0}-${data.maxDelay || 0}s`
        : `${data.delay || 0}s`;

    return (
        <div
            className={`
        px-3 py-2 rounded-lg border bg-white min-w-[150px]
        ${selected ? 'border-orange-500 ring-1 ring-orange-200 shadow-sm' : 'border-orange-200'}
      `}
        >
            <Handle
                type="target"
                position={Position.Left}
                className="!bg-gray-400 !w-2.5 !h-2.5 !border-2 !border-white"
            />
            <div className="flex items-center gap-2">
                <div className="p-1 rounded bg-orange-50">
                    <Clock className="w-3.5 h-3.5 text-orange-600" />
                </div>
                <div>
                    <span className="block font-semibold text-xs text-gray-700">Delay</span>
                    <span className="text-[10px] text-gray-500">
                        {delayText} {isRandom && '(Random)'}
                    </span>
                </div>
            </div>
            <Handle
                type="source"
                position={Position.Right}
                className="!bg-orange-500 !w-2.5 !h-2.5 !border-2 !border-white"
            />
        </div>
    );
}

export function HumanTakeoverNode({ selected }: NodeProps) {
    return (
        <div
            className={`
        px-3 py-2 rounded-lg border bg-white min-w-[150px]
        ${selected ? 'border-rose-500 ring-1 ring-rose-200 shadow-sm' : 'border-rose-200'}
      `}
        >
            <Handle
                type="target"
                position={Position.Left}
                className="!bg-gray-400 !w-2.5 !h-2.5 !border-2 !border-white"
            />
            <div className="flex items-center gap-2">
                <div className="p-1 rounded bg-rose-50">
                    <User className="w-3.5 h-3.5 text-rose-600" />
                </div>
                <span className="font-semibold text-xs text-gray-700">Human Takeover</span>
            </div>
        </div>
    );
}

export function ListNode({ data, selected }: NodeProps) {
    const listItems = data.items || [];
    return (
        <div
            className={`
        px-3 py-2 rounded-lg border bg-white min-w-[200px] max-w-[280px]
        ${selected ? 'border-cyan-500 ring-1 ring-cyan-200 shadow-sm' : 'border-cyan-200'}
      `}
        >
            <Handle
                type="target"
                position={Position.Left}
                className="!bg-gray-400 !w-2.5 !h-2.5 !border-2 !border-white"
            />

            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-100">
                <div className="p-1 rounded bg-cyan-50">
                    <List className="w-3.5 h-3.5 text-cyan-600" />
                </div>
                <span className="font-semibold text-xs text-gray-700">List Message</span>
            </div>

            <div className="text-xs text-gray-600 mb-2 line-clamp-1">{data.title || 'Menu Title'}</div>

            <div className="space-y-1">
                {listItems.slice(0, 3).map((item: any, idx: number) => (
                    <div key={idx} className="bg-cyan-50 text-cyan-800 px-2 py-1 rounded border border-cyan-100 text-[10px]">
                        {item.title || `Option ${idx + 1}`}
                    </div>
                ))}
                {listItems.length > 3 && (
                    <div className="text-[10px] text-gray-400">+{listItems.length - 3} more options</div>
                )}
            </div>

            <Handle
                type="source"
                position={Position.Right}
                className="!bg-cyan-500 !w-2.5 !h-2.5 !border-2 !border-white"
            />
        </div>
    );
}
