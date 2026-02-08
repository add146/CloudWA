'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';

// Dynamic import to avoid SSR issues with react-flow and 'self'
const FlowEditor = dynamic(
    () => import('../flows/[flowId]/edit/FlowEditorPageClient').then(mod => mod.FlowEditorPageClient),
    { ssr: false }
);

export default function Page() {
    return (
        <Suspense fallback={<div>Loading editor...</div>}>
            <FlowEditor />
        </Suspense>
    );
}
