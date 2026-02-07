'use client';

import { DragEvent } from 'react';

const nodeTypes = [
    { type: 'start', label: 'Start', emoji: '▶️', desc: 'Begin the flow', color: 'text-emerald-600', bgColor: 'bg-gradient-to-br from-emerald-50 to-emerald-100', borderColor: 'border-emerald-200 hover:border-emerald-400' },
    { type: 'message', label: 'Message', emoji: '💬', desc: 'Send a text message', color: 'text-blue-600', bgColor: 'bg-gradient-to-br from-blue-50 to-blue-100', borderColor: 'border-blue-200 hover:border-blue-400' },
    { type: 'button', label: 'Button', emoji: '🔘', desc: 'Show buttons to user', color: 'text-purple-600', bgColor: 'bg-gradient-to-br from-purple-50 to-purple-100', borderColor: 'border-purple-200 hover:border-purple-400' },
    { type: 'list', label: 'List', emoji: '📋', desc: 'Display list options', color: 'text-cyan-600', bgColor: 'bg-gradient-to-br from-cyan-50 to-cyan-100', borderColor: 'border-cyan-200 hover:border-cyan-400' },
    { type: 'condition', label: 'Condition', emoji: '🔀', desc: 'Branch based on logic', color: 'text-amber-600', bgColor: 'bg-gradient-to-br from-amber-50 to-amber-100', borderColor: 'border-amber-200 hover:border-amber-400' },
    { type: 'ai', label: 'AI Reply', emoji: '🤖', desc: 'Generate AI response', color: 'text-indigo-600', bgColor: 'bg-gradient-to-br from-indigo-50 to-indigo-100', borderColor: 'border-indigo-200 hover:border-indigo-400' },
    { type: 'delay', label: 'Delay', emoji: '⏱️', desc: 'Wait before next step', color: 'text-orange-600', bgColor: 'bg-gradient-to-br from-orange-50 to-orange-100', borderColor: 'border-orange-200 hover:border-orange-400' },
    { type: 'human_takeover', label: 'Human', emoji: '👤', desc: 'Transfer to human agent', color: 'text-rose-600', bgColor: 'bg-gradient-to-br from-rose-50 to-rose-100', borderColor: 'border-rose-200 hover:border-rose-400' },
];

export function NodePalette() {
    const onDragStart = (event: DragEvent, nodeType: string) => {
        event.dataTransfer.setData('application/reactflow', nodeType);
        event.dataTransfer.effectAllowed = 'move';
    };

    return (
        <div className="w-72 bg-white border-r border-gray-200 flex flex-col h-full">
            {/* Header */}
            <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-bold text-gray-900">Node Library</h3>
                <p className="text-xs text-gray-500 mt-1">Drag to add nodes</p>
            </div>

            {/* Node Grid */}
            <div className="flex-1 overflow-y-auto p-4">
                <div className="grid grid-cols-1 gap-3">
                    {nodeTypes.map(({ type, label, emoji, desc, color, bgColor, borderColor }) => (
                        <div
                            key={type}
                            draggable
                            onDragStart={(e) => onDragStart(e, type)}
                            className={`
                                group relative flex items-start gap-3 p-4 rounded-xl border-2 
                                cursor-grab active:cursor-grabbing transition-all duration-200
                                ${bgColor} ${borderColor} hover:shadow-lg hover:scale-[1.02]
                            `}
                        >
                            <div className={`text-2xl flex-shrink-0 ${color}`}>
                                {emoji}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className={`text-sm font-semibold ${color}`}>
                                    {label}
                                </div>
                                <div className="text-xs text-gray-600 mt-0.5">
                                    {desc}
                                </div>
                            </div>
                            {/* Drag indicator */}
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                                </svg>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Footer Tip */}
            <div className="p-4 border-t border-gray-200 bg-gradient-to-br from-blue-50 to-indigo-50">
                <div className="flex items-start gap-3">
                    <span className="text-lg flex-shrink-0">💡</span>
                    <div className="text-xs text-gray-700">
                        <strong className="font-semibold text-blue-900">Quick Tip:</strong>
                        <p className="text-gray-600 mt-1">Drag any node onto the canvas and connect them to build your conversation flow.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
