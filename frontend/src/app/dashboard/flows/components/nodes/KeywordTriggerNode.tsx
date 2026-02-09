import { memo, useState, useEffect, useCallback } from 'react';
import { Handle, Position, NodeProps, useReactFlow } from '@xyflow/react';
import { Key, Plus, Trash, Check, ChevronDown } from 'lucide-react';

interface Keyword {
    term: string;
    type: 'exact' | 'contains';
}

export const KeywordTriggerNode = memo(({ id, data, selected }: NodeProps) => {
    const { updateNodeData } = useReactFlow();
    const [keywords, setKeywords] = useState<Keyword[]>(data.keywords as Keyword[] || []);
    const [inputValue, setInputValue] = useState('');
    const [matchType, setMatchType] = useState<'exact' | 'contains'>('exact');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    // Sync local state to node data
    useEffect(() => {
        updateNodeData(id, { keywords });
    }, [keywords, id, updateNodeData]);

    const addKeyword = () => {
        if (!inputValue.trim()) return;
        setKeywords([...keywords, { term: inputValue.trim(), type: matchType }]);
        setInputValue('');
    };

    const removeKeyword = (index: number) => {
        setKeywords(keywords.filter((_, i) => i !== index));
    };

    return (
        <div
            className={`
        w-72 bg-white rounded-lg border shadow-sm transition-all duration-200
        ${selected ? 'border-amber-500 ring-1 ring-amber-200 shadow-md' : 'border-amber-200'}
      `}
        >
            {/* Header */}
            <div className="flex items-center gap-2 p-3 border-b border-amber-100 bg-amber-50/50 rounded-t-lg">
                <div className="p-1.5 rounded bg-amber-100 text-amber-600">
                    <Key className="w-4 h-4" />
                </div>
                <div>
                    <h3 className="text-sm font-semibold text-gray-800">Keyword Trigger</h3>
                    <p className="text-[10px] text-gray-500">Triggers when specific keywords match</p>
                </div>

                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        useReactFlow().setNodes((nodes) => nodes.filter((n) => n.id !== id));
                    }}
                    className="ml-auto p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                >
                    <Trash className="w-3.5 h-3.5" />
                </button>
            </div>

            {/* Content */}
            <div className="p-3 space-y-3">
                <div className="text-xs text-gray-600">
                    This flow will be triggered when specific <span className="font-semibold text-gray-900">keywords</span> are detected in user messages.
                </div>

                {/* Input Area */}
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addKeyword()}
                        placeholder="Enter keyword"
                        className="flex-1 px-3 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-200"
                    />

                    {/* Match Type Dropdown */}
                    <div className="relative">
                        <button
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-md hover:bg-gray-50 focus:outline-none focus:border-amber-500"
                        >
                            {matchType === 'exact' ? 'Exact match' : 'Contains'}
                            <ChevronDown className="w-3 h-3 text-gray-400" />
                        </button>

                        {isDropdownOpen && (
                            <div className="absolute right-0 top-full mt-1 w-32 bg-white border border-gray-200 rounded-md shadow-lg z-10 py-1">
                                <button
                                    className="w-full text-left px-3 py-1.5 text-xs hover:bg-amber-50 text-gray-700 flex items-center justify-between"
                                    onClick={() => { setMatchType('exact'); setIsDropdownOpen(false); }}
                                >
                                    Exact match
                                    {matchType === 'exact' && <Check className="w-3 h-3 text-amber-500" />}
                                </button>
                                <button
                                    className="w-full text-left px-3 py-1.5 text-xs hover:bg-amber-50 text-gray-700 flex items-center justify-between"
                                    onClick={() => { setMatchType('contains'); setIsDropdownOpen(false); }}
                                >
                                    Contains
                                    {matchType === 'contains' && <Check className="w-3 h-3 text-amber-500" />}
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Add Button */}
                <button
                    onClick={addKeyword}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-md hover:bg-amber-100 transition-colors"
                >
                    <Plus className="w-3 h-3" />
                    Add Keyword
                </button>

                {/* Keywords List */}
                {keywords.length > 0 && (
                    <div className="space-y-1.5 pt-1 max-h-32 overflow-y-auto">
                        {keywords.map((kw, idx) => (
                            <div key={idx} className="flex items-center justify-between px-2 py-1.5 bg-gray-50 rounded border border-gray-100 group">
                                <div className="flex items-center gap-2 overflow-hidden">
                                    <span className="text-xs font-medium text-gray-700 truncate">{kw.term}</span>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${kw.type === 'exact' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'
                                        }`}>
                                        {kw.type}
                                    </span>
                                </div>
                                <button
                                    onClick={() => removeKeyword(idx)}
                                    className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <Trash className="w-3 h-3" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <Handle
                type="target"
                position={Position.Left}
                className="!bg-amber-500 !w-3 !h-3 !border-2 !border-white"
            />
            <Handle
                type="source"
                position={Position.Right}
                className="!bg-amber-500 !w-3 !h-3 !border-2 !border-white"
            />
        </div>
    );
});
