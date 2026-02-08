'use client';

import dynamic from 'next/dynamic';

// Dynamically import with no SSR to avoid 'self is not defined' error from ReactFlow
const FlowEditorPageClient = dynamic(
    () => import('./FlowEditorPageClient').then(mod => mod.FlowEditorPageClient),
    {
        ssr: false,
        loading: () => (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        )
    }
);

export function FlowEditorWrapper() {
    return <FlowEditorPageClient />;
}
