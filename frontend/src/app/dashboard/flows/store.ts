import { create } from 'zustand';
import { Node, Edge, Connection, applyNodeChanges, applyEdgeChanges, NodeChange, EdgeChange } from '@xyflow/react';

interface FlowStore {
    nodes: Node[];
    edges: Edge[];
    selectedNode: Node | null;

    // Node actions
    setNodes: (nodes: Node[] | ((nodes: Node[]) => Node[])) => void;
    onNodesChange: (changes: NodeChange[]) => void;
    updateNodeData: (nodeId: string, data: Partial<any>) => void;
    addNode: (node: Node) => void;
    deleteNode: (nodeId: string) => void;

    // Edge actions
    setEdges: (edges: Edge[] | ((edges: Edge[]) => Edge[])) => void;
    onEdgesChange: (changes: EdgeChange[]) => void;
    onConnect: (connection: Connection) => void;

    // Selection
    selectNode: (nodeId: string | null) => void;

    // Utilities
    resetFlow: () => void;
}

export const useFlowStore = create<FlowStore>((set, get) => ({
    nodes: [],
    edges: [],
    selectedNode: null,

    setNodes: (nodes) => {
        if (typeof nodes === 'function') {
            set({ nodes: nodes(get().nodes) });
        } else {
            set({ nodes });
        }
    },

    onNodesChange: (changes) => {
        set({
            nodes: applyNodeChanges(changes, get().nodes),
        });
    },

    updateNodeData: (nodeId, data) => {
        set({
            nodes: get().nodes.map((node) =>
                node.id === nodeId
                    ? { ...node, data: { ...node.data, ...data } }
                    : node
            ),
        });
    },

    addNode: (node) => {
        set({ nodes: [...get().nodes, node] });
    },

    deleteNode: (nodeId) => {
        set({
            nodes: get().nodes.filter((n) => n.id !== nodeId),
            edges: get().edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
            selectedNode: get().selectedNode?.id === nodeId ? null : get().selectedNode,
        });
    },

    setEdges: (edges) => {
        if (typeof edges === 'function') {
            set({ edges: edges(get().edges) });
        } else {
            set({ edges });
        }
    },

    onEdgesChange: (changes) => {
        set({
            edges: applyEdgeChanges(changes, get().edges),
        });
    },

    onConnect: (connection) => {
        const newEdge: Edge = {
            id: `edge-${connection.source}-${connection.target}`,
            source: connection.source!,
            target: connection.target!,
            sourceHandle: connection.sourceHandle,
            targetHandle: connection.targetHandle,
            type: 'deletable',
        };
        set({ edges: [...get().edges, newEdge] });
    },

    selectNode: (nodeId) => {
        const node = nodeId ? get().nodes.find((n) => n.id === nodeId) || null : null;
        set({ selectedNode: node });
    },

    resetFlow: () => {
        set({
            nodes: [],
            edges: [],
            selectedNode: null,
        });
    },
}));
