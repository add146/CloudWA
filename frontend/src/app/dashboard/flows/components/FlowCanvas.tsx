'use client';

import { useCallback, DragEvent } from 'react';
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    NodeTypes,
    Connection,
    ConnectionMode,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useFlowStore } from '../store';
import { StartNode } from './nodes/StartNode';
import { MessageNode } from './nodes/MessageNode';
import { ButtonNode } from './nodes/ButtonNode';
import { DelayNode, HumanTakeoverNode, ListNode } from './nodes/MiscNodes';
import { ConditionNode } from './nodes/ConditionNode';
import { AINode } from './nodes/AINode';
import { KeywordTriggerNode } from './nodes/KeywordTriggerNode';
import { QuickReplyNode } from './nodes/QuickReplyNode';
import { SendPDFNode } from './nodes/SendPDFNode';
import { SendVideoNode } from './nodes/SendVideoNode';
import { SendImageNode } from './nodes/SendImageNode';

const nodeTypes: NodeTypes = {
    start: StartNode,
    message: MessageNode,
    button: ButtonNode,
    list: ListNode,
    condition: ConditionNode,
    ai: AINode,
    delay: DelayNode,
    human_takeover: HumanTakeoverNode,
    keyword_trigger: KeywordTriggerNode,
    quick_reply: QuickReplyNode,
    send_pdf: SendPDFNode,
    send_video: SendVideoNode,
    send_image: SendImageNode,
};

export function FlowCanvas() {
    const {
        nodes,
        edges,
        onNodesChange,
        onEdgesChange,
        onConnect,
        addNode,
        selectNode,
    } = useFlowStore();

    const onDragOver = useCallback((event: DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    const onDrop = useCallback(
        (event: DragEvent) => {
            event.preventDefault();

            const type = event.dataTransfer.getData('application/reactflow');
            if (!type) return;

            const reactFlowBounds = (event.target as HTMLElement)
                .closest('.react-flow')
                ?.getBoundingClientRect();

            if (!reactFlowBounds) return;

            const position = {
                x: event.clientX - reactFlowBounds.left,
                y: event.clientY - reactFlowBounds.top,
            };

            const newNode = {
                id: `${type}-${Date.now()}`,
                type,
                position,
                data: {},
            };

            addNode(newNode);
        },
        [addNode]
    );

    const isValidConnection = useCallback((connection: Connection | any) => {
        // Prevent connecting to start node
        const targetNode = nodes.find((n) => n.id === connection.target);
        if (targetNode?.type === 'start') return false;

        return true;
    }, [nodes]);

    const handleNodeClick = useCallback(
        (_: any, node: any) => {
            selectNode(node.id);
        },
        [selectNode]
    );

    const handlePaneClick = useCallback(() => {
        selectNode(null);
    }, [selectNode]);

    return (
        <div className="flex-1 h-full">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onDrop={onDrop}
                onDragOver={onDragOver}
                onNodeClick={handleNodeClick}
                onPaneClick={handlePaneClick}
                nodeTypes={nodeTypes}
                isValidConnection={isValidConnection}
                connectionMode={ConnectionMode.Loose}
                fitView
                className="bg-gray-100"
            >
                <Background />
                <Controls />
                <MiniMap
                    nodeColor={(node) => {
                        const colors: Record<string, string> = {
                            start: '#22c55e',
                            message: '#3b82f6',
                            button: '#a855f7',
                            list: '#14b8a6',
                            condition: '#eab308',
                            ai: '#6366f1',
                            delay: '#f97316',
                            human_takeover: '#ef4444',
                        };
                        return colors[node.type || ''] || '#6b7280';
                    }}
                />
            </ReactFlow>
        </div>
    );
}
