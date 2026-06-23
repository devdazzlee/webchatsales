'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Chatbot from '../components/Chatbot';
import { ChatbotProvider } from '../components/ChatbotContext';

function WidgetContent() {
  const searchParams = useSearchParams();
  const isEmbed = searchParams.get('embed') === 'true';

  return (
    <ChatbotProvider initialOpen={isEmbed}>
      <div
        style={{
          minHeight: isEmbed ? '100%' : '100vh',
          height: isEmbed ? '100%' : 'auto',
          background: 'var(--bg)',
          padding: isEmbed ? 0 : '20px',
        }}
      >
        <Chatbot embedMode={isEmbed} />
      </div>
    </ChatbotProvider>
  );
}

export default function WidgetPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: 'var(--bg)' }} />}>
      <WidgetContent />
    </Suspense>
  );
}
