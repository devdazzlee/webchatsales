'use client';

import { useChatbot } from './ChatbotContext';

export default function Footer() {
  const { openChatbot } = useChatbot();

  return (
    <footer className="border-t py-8 px-4 sm:px-6 lg:px-8" style={{ borderColor: 'var(--line)' }}>
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            © 2025 WebChatSales • Sales While You Sleep™ • Made by Abby
          </p>
          <button 
            onClick={openChatbot}
            className="px-4 py-2 text-black font-medium rounded transition-colors flex items-center gap-2 bg-gradient-emerald hover:opacity-90"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            Chat with Abby
          </button>
        </div>
      </div>
    </footer>
  );
}

