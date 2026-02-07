import { Handle, Position, NodeProps } from '@xyflow/react';
import { Clock, List } from 'lucide-react';

export function DelayNode({ data, selected }: NodeProps) {
    const delay = data.delay || 0;

    return (
        <div
            className={`
        px-4 py-3 rounded-lg border-2 bg-white shadow-md min-w-[150px]
        ${selected ? 'border-orange-500 ring-2 ring-orange-200' : 'border-gray-300'}
      `}
        >
            <Handle
                type="target"
                position={Position.Top}
                className="!bg-gray-400 !w-3 !h-3"
            />

            <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-orange-500" />
                <span className="font-semibold text-sm text-gray-700">Delay</span>
            </div>

            <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{delay}s</div>
                <div className="text-xs text-gray-500">Wait time</div>
            </div>

            <Handle
                type="source"
                position={Position.Bottom}
                className="!bg-orange-500 !w-3 !h-3"
            />
        </div>
    );
}

export function ListNode({ data, selected }: NodeProps) {
    const sections = data.sections || [];
    let totalRows = 0;
    sections.forEach((s: any) => totalRows += (s.rows || []).length);

    return (
        <div
            className={`
        px-4 py-3 rounded-lg border-2 bg-white shadow-md min-w-[200px] max-w-[300px]
        ${selected ? 'border-teal-500 ring-2 ring-teal-200' : 'border-gray-300'}
      `}
        >
            <Handle
                type="target"
                position={Position.Top}
                className="!bg-gray-400 !w-3 !h-3"
            />

            <div className="flex items-center gap-2 mb-2">
                <List className="h-4 w-4 text-teal-500" />
                <span className="font-semibold text-sm text-gray-700">List</span>
            </div>

            <div className="text-sm text-gray-600 mb-2 line-clamp-2">
                {data.text || 'Enter question...'}
            </div>

            <div className="text-xs text-gray-500">
                {totalRows} options in {sections.length} section(s)
            </div>

            <Handle
                type="source"
                position={Position.Bottom}
                className="!bg-teal-500 !w-3 !h-3"
            />
        </div>
    );
}
