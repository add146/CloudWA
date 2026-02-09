'use client';

import { DragEvent } from 'react';
import {
    PlayCircle,
    MessageSquare,
    MousePointerClick,
    List,
    GitFork,
    Bot,
    Clock,
    User,
    GripVertical,
    Key,
    FileText,
    Video,
    Image as ImageIcon,
    CheckCheck
} from 'lucide-react';

const nodeTypes = [
    { type: 'start', label: 'Start', icon: PlayCircle, desc: 'Begin the flow', color: 'text-emerald-600', borderColor: 'border-emerald-200 hover:border-emerald-500' },
    { type: 'message', label: 'Message', icon: MessageSquare, desc: 'Send a text message', color: 'text-blue-600', borderColor: 'border-blue-200 hover:border-blue-500' },
    { type: 'button', label: 'Button', icon: MousePointerClick, desc: 'Show buttons to user', color: 'text-purple-600', borderColor: 'border-purple-200 hover:border-purple-500' },
    { type: 'list', label: 'List', icon: List, desc: 'Display list options', color: 'text-cyan-600', borderColor: 'border-cyan-200 hover:border-cyan-500' },
    { type: 'condition', label: 'Condition', icon: GitFork, desc: 'Branch based on logic', color: 'text-amber-600', borderColor: 'border-amber-200 hover:border-amber-500' },
    { type: 'ai', label: 'AI Reply', icon: Bot, desc: 'Generate AI response', color: 'text-indigo-600', borderColor: 'border-indigo-200 hover:border-indigo-500' },
    { type: 'keyword_trigger', label: 'Keyword Trigger', icon: Key, desc: 'Start flow on keyword match', color: 'text-amber-600', borderColor: 'border-amber-200 hover:border-amber-500' },
    { type: 'delay', label: 'Delay', icon: Clock, desc: 'Wait before next step', color: 'text-orange-600', borderColor: 'border-orange-200 hover:border-orange-500' },
    { type: 'human_takeover', label: 'Human', icon: User, desc: 'Transfer to human agent', color: 'text-rose-600', borderColor: 'border-rose-200 hover:border-rose-500' },
    { type: 'send_pdf', label: 'Send PDF', icon: FileText, desc: 'Send a PDF file', color: 'text-red-600', borderColor: 'border-red-200 hover:border-red-500' },
    { type: 'send_video', label: 'Send Video', icon: Video, desc: 'Send a video file', color: 'text-pink-600', borderColor: 'border-pink-200 hover:border-pink-500' },
    { type: 'send_image', label: 'Send Image', icon: ImageIcon, desc: 'Send an image', color: 'text-violet-600', borderColor: 'border-violet-200 hover:border-violet-500' },
    { type: 'quick_reply', label: 'Quick Reply', icon: MessageSquare, desc: 'Message with buttons', color: 'text-purple-600', borderColor: 'border-purple-200 hover:border-purple-500' },
    { type: 'mark_read', label: 'Mark Read', icon: CheckCheck, desc: 'Send blue ticks', color: 'text-sky-600', borderColor: 'border-sky-200 hover:border-sky-500' },
];

export function NodePalette() {
    const onDragStart = (event: DragEvent, nodeType: string) => {
        event.dataTransfer.setData('application/reactflow', nodeType);
        event.dataTransfer.effectAllowed = 'move';
    };

    return (
        <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b border-gray-200">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Node Library</h3>
                <p className="text-xs text-gray-400 mt-1">Drag to add nodes</p>
            </div>

            {/* Node Grid */}
            <div className="flex-1 overflow-y-auto p-3">
                <div className="flex flex-col gap-2">
                    {nodeTypes.map(({ type, label, icon: Icon, desc, color, borderColor }) => (
                        <div
                            key={type}
                            draggable
                            onDragStart={(e) => onDragStart(e, type)}
                            className={`
                                group relative flex items-center gap-3 p-3 rounded-lg border 
                                cursor-grab active:cursor-grabbing transition-all duration-200
                                bg-white hover:bg-gray-50 ${borderColor}
                            `}
                        >
                            <div className={`p-1.5 rounded-md bg-opacity-10 ${color.replace('text-', 'bg-')}`}>
                                <Icon className={`w-4 h-4 ${color}`} />
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-gray-700 group-hover:text-gray-900 transition-colors">
                                    {label}
                                </div>
                                <div className="text-[10px] text-gray-400 truncate">
                                    {desc}
                                </div>
                            </div>

                            {/* Drag handle */}
                            <div className="text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity">
                                <GripVertical className="w-4 h-4" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Footer Tip */}
            <div className="p-3 border-t border-gray-200 bg-gray-50">
                <p className="text-[10px] text-gray-500 text-center">
                    Drag nodes onto the canvas to build your flow.
                </p>
            </div>
        </div>
    );
}
