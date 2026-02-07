'use client';

import { DragEvent } from 'react';
// import { Play, MessageSquare, Square, List, GitBranch, Bot, Clock, UserCircle } from 'lucide-react';

const nodeTypes = [
    { type: 'start', label: 'Start', emoji: '▶️', color: 'text-green-600', bgColor: 'bg-green-50', borderColor: 'border-green-300' },
    { type: 'message', label: 'Message', emoji: '💬', color: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-300' },
    { type: 'button', label: 'Button', emoji: '🔘', color: 'text-purple-600', bgColor: 'bg-purple-50', borderColor: 'border-purple-300' },
    { type: 'list', label: 'List', emoji: '📋', color: 'text-teal-600', bgColor: 'bg-teal-50', borderColor: 'border-teal-300' },
    { type: 'condition', label: 'Condition', emoji: '🔀', color: 'text-yellow-600', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-300' },
    { type: 'ai', label: 'AI Reply', emoji: '🤖', color: 'text-indigo-600', bgColor: 'bg-indigo-50', borderColor: 'border-indigo-300' },
    { type: 'delay', label: 'Delay', emoji: '⏱️', color: 'text-orange-600', bgColor: 'bg-orange-50', borderColor: 'border-orange-300' },
    { type: 'human_takeover', label: 'Human', emoji: '👤', color: 'text-red-600', bgColor: 'bg-red-50', borderColor: 'border-red-300' },
];

export function NodePalette() {
    const onDragStart = (event: DragEvent, nodeType: string) => {
        event.dataTransfer.setData('application/reactflow', nodeType);
        event.dataTransfer.effectAllowed = 'move';
    };

    return (
        <div className="w-64 bg-gray-50 border-r border-gray-200 p-4 overflow-y-auto">
            <h3 className="font-semibold text-gray-700 mb-4">Node Types</h3>
            <div className="space-y-2">
                {nodeTypes.map(({ type, label, emoji, color, bgColor, borderColor }) => (
                    <div
                        key={type}
                        draggable
                        onDragStart={(e) => onDragStart(e, type)}
                        className={`
              flex items-center gap-3 p-3 rounded-lg border-2 cursor-grab active:cursor-grabbing
              ${bgColor} ${borderColor} hover:shadow-md transition
            `}
                    >
                        <span className={`text-lg ${color}`}>{emoji}</span>
                        <span className="text-sm font-medium text-gray-700">{label}</span>
                    </div>
                ))}
            </div>

            <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-700">
                    💡 <strong>Tip:</strong> Drag nodes onto the canvas to build your flow
                </p>
            </div>
        </div>
    );
}
