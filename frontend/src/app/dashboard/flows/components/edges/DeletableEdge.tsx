import React from 'react';
import {
    BaseEdge,
    EdgeLabelRenderer,
    EdgeProps,
    getBezierPath,
    useReactFlow,
} from '@xyflow/react';
import { useFlowStore } from '../../store';

export default function DeletableEdge({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style = {},
    markerEnd,
}: EdgeProps) {
    const { deleteEdge } = useFlowStore();
    const [edgePath, labelX, labelY] = getBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
    });

    const onEdgeClick = (evt: React.MouseEvent) => {
        evt.stopPropagation();
        console.log('[DeletableEdge] Deleting edge:', id);
        deleteEdge(id);
    };

    return (
        <>
            <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
            <EdgeLabelRenderer>
                <div
                    style={{
                        position: 'absolute',
                        transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                        fontSize: 12,
                        pointerEvents: 'all',
                    }}
                    className="nodrag nopan group"
                >
                    <button
                        className="w-5 h-5 bg-white border border-gray-200 text-red-500 rounded-full cursor-pointer hover:bg-red-50 hover:border-red-300 flex items-center justify-center shadow-sm text-xs leading-none transition-all opacity-0 group-hover:opacity-100"
                        onMouseDown={(e) => {
                            e.stopPropagation();
                            console.log('[DeletableEdge] Clicked delete (onMouseDown):', id);
                            deleteEdge(id);
                        }}
                        title="Delete connection"
                    >
                        ×
                    </button>
                </div>
            </EdgeLabelRenderer>
        </>
    );
}
