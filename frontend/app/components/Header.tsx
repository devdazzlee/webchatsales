'use client';

import { useChatbot } from './ChatbotContext';

export default function Header() {
  const { openChatbot } = useChatbot();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-sm border-b" style={{ background: 'var(--glass)', borderColor: 'var(--line)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded flex items-center justify-center bg-gradient-emerald">
              <span className="text-black text-xs font-bold">A</span>
            </div>
            <span className="font-semibold text-lg" style={{ color: 'var(--ink)' }}>WebChat Sales</span>
          </div>
          <button 
            onClick={openChatbot}
            className="px-4 py-2 font-medium rounded transition-colors bg-gradient-emerald text-black hover:opacity-90"
          >
            Talk to Abby
          </button>
        </div>
      </div>
    </header>
  );
}

