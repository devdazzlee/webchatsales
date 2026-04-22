'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function Header() {
  const router = useRouter();

  const handleLogoClick = () => {
    router.push('/');
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-sm border-b py-2" style={{ background: 'var(--glass)', borderColor: 'var(--line)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 pr-1 sm:pr-2">
          <div 
            className="flex min-w-0 flex-col cursor-pointer hover:opacity-80 transition-opacity"
            onClick={handleLogoClick}
          >
            <div className="flex items-center gap-2">
              <Image 
                src="/logo.png" 
                alt="WebChatSales Logo" 
                width={72} 
                height={72}
                className="object-contain"
              />
              <div className="flex min-w-0 flex-col">
              <span className="font-semibold text-lg" style={{ color: 'var(--ink)' }}>WebChatSales</span>
              <p className="text-xs leading-snug" style={{ color: 'var(--muted)' }}>Turn Website Visitors Into Customers 24/7</p>
              </div>
            </div>
          </div>
          <button
            onClick={() => router.push('/intake')}
            className="shrink-0 self-start sm:self-center px-4 py-2 rounded text-sm text-black font-medium bg-gradient-emerald hover:opacity-90 transition-opacity"
          >
            Start Onboarding
          </button>
        </div>
      </div>
    </header>
  );
}
