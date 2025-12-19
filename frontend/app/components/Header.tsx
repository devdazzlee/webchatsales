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
        <div className="flex items-center justify-between">
          <div 
            className="flex flex-col cursor-pointer hover:opacity-80 transition-opacity"
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
              <div className="flex flex-col">
              <span className="font-semibold text-lg" style={{ color: 'var(--ink)' }}>WebChatSales</span>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>Turn Website Visitors Into Customers 24/7</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

