import { memo } from 'react';
import { Handle, Position, NodeProps, useReactFlow } from '@xyflow/react';
import { GitFork, Trash } from 'lucide-react';

export const ConditionNode = memo(({ id, data, selected }: NodeProps) => {
    const { setNodes } = useReactFlow();

    const updateData = (key: string, value: any) => {
        setNodes((nodes) =>
            nodes.map((node) =>
                node.id === id
                    ? { ...node, data: { ...node.data, [key]: value } }
                    : node
            )
        );
    };

    return (
        <div
            className={`
                px-3 py-2 rounded-lg border bg-white min-w-[220px] max-w-[280px]
                ${selected ? 'border-amber-500 ring-2 ring-amber-200 shadow-lg' : 'border-amber-200'}
            `}
        >
            <Handle
                type="target"
                position={Position.Left}
                className="!bg-gray-400 !w-2.5 !h-2.5 !border-2 !border-white"
            />

            {/* Header */}
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-100">
                <div className="p-1.5 rounded bg-amber-50">
                    <GitFork className="w-4 h-4 text-amber-600" />
                </div>
                <span className="font-semibold text-sm text-gray-700">Condition</span>

                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setNodes((nodes) => nodes.filter((n) => n.id !== id));
                    }}
                    className="ml-auto p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                >
                    <Trash className="w-3.5 h-3.5" />
                </button>
            </div>

            {/* Variable to Check */}
            <div className="mb-2">
                <label className="text-[10px] text-gray-500 font-medium">Variable</label>
                <input
                    type="text"
                    value={data.variable || ''}
                    onChange={(e) => updateData('variable', e.target.value)}
                    placeholder="e.g., {{user_intent}}"
                    className="w-full text-xs p-1.5 border border-gray-200 rounded-md focus:ring-1 focus:ring-amber-300"
                />
            </div>

            {/* Operator */}
            <div className="mb-2">
                <label className="text-[10px] text-gray-500 font-medium">Operator</label>
                <select
                    value={data.operator || 'equals'}
                    onChange={(e) => updateData('operator', e.target.value)}
                    className="w-full text-xs p-1.5 border border-gray-200 rounded-md bg-white focus:ring-1 focus:ring-amber-300"
                >
                    <option value="equals">Equals</option>
                    <option value="not_equals">Not Equals</option>
                    <option value="contains">Contains</option>
                    <option value="not_contains">Not Contains</option>
                    <option value="starts_with">Starts With</option>
                    <option value="ends_with">Ends With</option>
                    <option value="greater_than">Greater Than</option>
                    <option value="less_than">Less Than</option>
                    <option value="is_empty">Is Empty</option>
                    <option value="is_not_empty">Is Not Empty</option>
                </select>
            </div>

            {/* Value to Compare */}
            <div className="mb-3">
                <label className="text-[10px] text-gray-500 font-medium">Value</label>
                <input
                    type="text"
                    value={data.value || ''}
                    onChange={(e) => updateData('value', e.target.value)}
                    placeholder="Value to compare"
                    className="w-full text-xs p-1.5 border border-gray-200 rounded-md focus:ring-1 focus:ring-amber-300"
                />
            </div>

            {/* Output Handles */}
            <div className="flex flex-col gap-1.5">
                <div className="relative flex items-center justify-between bg-green-50 px-2 py-1.5 rounded border border-green-100">
                    <span className="text-[10px] font-medium text-green-700">✓ True</span>
                    <Handle
                        type="source"
                        position={Position.Right}
                        id="true"
                        className="!bg-green-500 !w-2 !h-2 !right-[-5px] !border-2 !border-white"
                    />
                </div>

                <div className="relative flex items-center justify-between bg-red-50 px-2 py-1.5 rounded border border-red-100">
                    <span className="text-[10px] font-medium text-red-700">✗ False</span>
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
});

// Legacy export for backwards compatibility
export function ConditionNodeLegacy({ data, selected }: NodeProps) {
    return <ConditionNode id="" data={data} selected={selected} />;
}
