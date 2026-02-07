'use client';

import { useState, useRef, useEffect } from 'react';
// import { ChevronDown } from 'lucide-react';

interface VariablePickerProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    rows?: number;
}

// Extract variables from all nodes in the flow
const getAvailableVariables = (): string[] => {
    // This should be passed from the store or parent component
    // For now, we'll return common variables
    return [
        'name',
        'email',
        'phone',
        'age',
        'language',
        'selection',
        'ai_response',
        'user_input',
    ];
};

export function VariablePicker({
    value,
    onChange,
    placeholder = 'Enter text...',
    className = '',
    rows = 3,
}: VariablePickerProps) {
    const [showMenu, setShowMenu] = useState(false);
    const [cursorPosition, setCursorPosition] = useState(0);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const availableVars = getAvailableVariables();

    const insertVariable = (varName: string) => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart || 0;
        const end = textarea.selectionEnd || 0;
        const text = value || '';

        const before = text.substring(0, start);
        const after = text.substring(end);
        const newValue = before + `{{${varName}}}` + after;

        onChange(newValue);
        setShowMenu(false);

        // Set cursor position after inserted variable
        setTimeout(() => {
            const newPos = start + varName.length + 4; // 4 for {{}}
            textarea.setSelectionRange(newPos, newPos);
            textarea.focus();
        }, 0);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        // Open menu with Ctrl+Space or @
        if ((e.ctrlKey && e.key === ' ') || e.key === '@') {
            e.preventDefault();
            setCursorPosition(textareaRef.current?.selectionStart || 0);
            setShowMenu(true);
        }
    };

    return (
        <div className="relative">
            <textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={handleKeyDown}
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-sm ${className}`}
                rows={rows}
                placeholder={placeholder}
            />

            <button
                type="button"
                onClick={() => setShowMenu(!showMenu)}
                className="absolute top-2 right-2 p-1 text-gray-500 hover:bg-gray-100 rounded transition"
                title="Insert variable (Ctrl+Space)"
            >
                <span className="text-gray-500">▼</span>
            </button>

            {showMenu && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    <div className="p-2 border-b bg-gray-50 text-xs text-gray-600">
                        Available Variables
                    </div>
                    {availableVars.length > 0 ? (
                        availableVars.map((varName) => (
                            <button
                                key={varName}
                                type="button"
                                onClick={() => insertVariable(varName)}
                                className="w-full text-left px-3 py-2 hover:bg-blue-50 transition text-sm font-mono"
                            >
                                {`{{${varName}}}`}
                            </button>
                        ))
                    ) : (
                        <div className="px-3 py-2 text-sm text-gray-500">
                            No variables available
                        </div>
                    )}
                </div>
            )}

            <div className="mt-1 text-xs text-gray-500">
                💡 Press <kbd className="px-1 py-0.5 bg-gray-100 rounded">Ctrl+Space</kbd> or click ↓ to insert variables
            </div>
        </div>
    );
}
