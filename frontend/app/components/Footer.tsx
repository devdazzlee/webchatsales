'use client';

export default function Footer() {
  return (
    <footer className="border-t py-8 px-4 sm:px-6 lg:px-8" style={{ borderColor: 'var(--line)' }}>
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            © 2025 WebChatSales • Sales While You Sleep™ • Made by Abby
          </p>
        </div>
      </div>
    </footer>
  );
}

