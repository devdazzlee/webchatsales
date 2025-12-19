'use client';

import Chatbot from '../components/Chatbot';
import { ChatbotProvider } from '../components/ChatbotContext';

export default function WidgetPage() {
  return (
    <ChatbotProvider>
      <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '20px' }}>
        <Chatbot />
      </div>
    </ChatbotProvider>
  );
}

