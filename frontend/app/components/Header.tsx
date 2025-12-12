'use client';

import { useRouter } from 'next/navigation';

export default function Header() {
  const router = useRouter();

  const handleLogoClick = () => {
    router.push('/');
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-sm border-b" style={{ background: 'var(--glass)', borderColor: 'var(--line)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div 
            className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={handleLogoClick}
          >
            <div className="w-6 h-6 rounded flex items-center justify-center bg-gradient-emerald">
              <span className="text-black text-xs font-bold">A</span>
            </div>
            <span className="font-semibold text-lg" style={{ color: 'var(--ink)' }}>WebChat Sales</span>
          </div>
        </div>
      </div>
    </header>
  );
}

