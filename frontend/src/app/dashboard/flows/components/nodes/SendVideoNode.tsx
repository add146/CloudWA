import { memo } from 'react';
import { Handle, Position, NodeProps, useReactFlow } from '@xyflow/react';
import { Trash, Video, Upload } from 'lucide-react';
import { useState } from 'react';

export const SendVideoNode = memo(({ id, data, selected }: NodeProps) => {
    const { updateNodeData, setNodes } = useReactFlow();
    const [isUploading, setIsUploading] = useState(false);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://cloudwa-flow.khibroh.workers.dev';
            const res = await fetch(`${API_URL}/api/media/upload`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: formData
            });
            const result = await res.json();

            if (result.success && result.data) {
                updateNodeData(id, {
                    fileUrl: result.data.url,
                    fileName: result.data.filename,
                    fileType: result.data.contentType
                });
            } else {
                alert('Upload failed: ' + (result.error || 'Unknown error'));
            }
        } catch (err) {
            console.error(err);
            alert('Upload error');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className={`w-[250px] bg-white rounded-lg border shadow-sm ${selected ? 'border-pink-500 ring-1 ring-pink-200' : 'border-pink-200'}`}>
            {/* Header */}
            <div className="flex items-center gap-2 p-3 border-b border-pink-100 bg-pink-50/50 rounded-t-lg">
                <div className="p-1.5 rounded bg-pink-100 text-pink-600">
                    <Video className="w-4 h-4" />
                </div>
                <div>
                    <h3 className="text-sm font-semibold text-gray-800">Send Video</h3>
                </div>

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

            <Handle type="target" position={Position.Left} className="!bg-pink-500 !w-3 !h-3 !border-2 !border-white" />

            <div className="p-3 space-y-3">
                {/* Upload Area */}
                <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 transition-colors relative">
                    <input
                        type="file"
                        accept="video/*"
                        onChange={handleUpload}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        disabled={isUploading}
                    />
                    {isUploading ? (
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-pink-500"></div>
                    ) : (
                        <>
                            <Upload className="w-6 h-6 text-gray-400 mb-2" />
                            <span className="text-xs text-center text-gray-500">
                                {data.fileName ? (data.fileName as string) : "Click to upload a video"}
                            </span>
                        </>
                    )}
                </div>

                {/* Caption Input */}
                <div>
                    <label className="text-[10px] text-gray-500 font-medium">Caption</label>
                    <textarea
                        placeholder="Add a caption..."
                        className="w-full text-xs p-2 border border-gray-200 rounded mt-1 min-h-[60px]"
                        value={data.caption as string || ''}
                        onChange={(e) => updateNodeData(id, { caption: e.target.value })}
                    />
                </div>
            </div>

            <Handle type="source" position={Position.Right} className="!bg-pink-500 !w-3 !h-3 !border-2 !border-white" />
        </div>
    );
});
