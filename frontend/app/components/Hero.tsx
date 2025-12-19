'use client';

import { useChatbot } from './ChatbotContext';

export default function Hero() {
  const { openChatbot } = useChatbot();

  const handleQuickQuestion = (question: string) => {
    openChatbot();
    // Store the question to send automatically when chatbot opens
    setTimeout(() => {
      const event = new CustomEvent('quick-question', { detail: question });
      window.dispatchEvent(event);
    }, 300);
  };

  const handleScrollToPricing = () => {
    const pricingSection = document.getElementById('pricing');
    pricingSection?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Founder Special Banner */}
        <div className="mb-8 p-4 rounded-lg text-center" style={{ background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(34, 197, 94, 0.1) 100%)', border: '2px solid var(--emerald)' }}>
          <p className="text-lg font-semibold" style={{ color: 'var(--emerald)' }}>
            <span style={{ textDecoration: 'line-through', opacity: 0.6, marginRight: '8px' }}>$497</span>
            <span style={{ fontWeight: 'bold' }}>$297</span> / month • Founder Special: First 20 spots • <span style={{ fontWeight: 'bold' }}>4 spots left</span>
          </p>
        </div>
        
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Left Column - Main Content */}
          <div className="space-y-8">
            <div>
              <h1 className="text-5xl md:text-6xl font-bold mb-4" style={{ color: 'var(--ink)' }}>
                WebChatSales
              </h1>
              <p className="text-xl max-w-2xl" style={{ color: 'var(--muted)' }}>
                Abby responds instantly, qualifies buyers, and books meetings. She augments your team - she doesn&apos;t replace it.
              </p>
            </div>

            {/* Metrics */}
            <div className="flex gap-4 flex-wrap">
              <div className="border rounded-lg p-4" style={{ borderColor: 'var(--line)', background: 'var(--panel)' }}>
                <div className="text-sm" style={{ color: 'var(--muted)' }}>18 Conversations (today)</div>
                <div className="text-2xl font-bold" style={{ color: 'var(--emerald)' }}>18</div>
              </div>
              <div className="border rounded-lg p-4" style={{ borderColor: 'var(--line)', background: 'var(--panel)' }}>
                <div className="text-sm" style={{ color: 'var(--muted)' }}>7 Active</div>
                <div className="text-2xl font-bold" style={{ color: 'var(--emerald)' }}>7</div>
              </div>
              <div className="border rounded-lg p-4" style={{ borderColor: 'var(--line)', background: 'var(--panel)' }}>
                <div className="text-sm" style={{ color: 'var(--muted)' }}>2 Booked</div>
                <div className="text-2xl font-bold" style={{ color: 'var(--emerald)' }}>2</div>
              </div>
            </div>


            {/* CTA Buttons */}
            <div className="flex gap-4 flex-wrap">
              <button 
                onClick={handleScrollToPricing}
                className="px-6 py-3 text-black font-medium rounded transition-colors bg-gradient-emerald hover:opacity-90"
              >
                See Pricing
              </button>
              <button 
                onClick={openChatbot}
                className="px-6 py-3 border-2 font-medium rounded transition-colors hover:opacity-80"
                style={{ borderColor: 'var(--emerald)', color: 'var(--emerald)', background: 'var(--emerald)/10' }}
              >
                See it in Action
              </button>
            </div>

            {/* Testimonial */}
            <div className="border rounded-lg p-6" style={{ borderColor: 'var(--line)', background: 'var(--panel)' }}>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 bg-gradient-emerald">
                  <span className="text-black font-bold">SC</span>
                </div>
                <div>
                  <p className="italic mb-2" style={{ color: 'var(--muted)' }}>
                    &quot;Response time dropped from hours to seconds, and bookings now arrive overnight. Abby augments our team - she doesn&apos;t replace it.&quot;
                  </p>
                  <p className="font-medium" style={{ color: 'var(--ink)' }}>Sarah Chen - Head of Sales, Innovate-Corp</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Live Demo */}
          <div className="border rounded-lg p-8 h-full" style={{ borderColor: 'var(--line)', background: 'var(--panel)' }}>
            <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--ink)' }}>Live Abby Demo</h2>
            <p className="mb-6" style={{ color: 'var(--muted)' }}>
              Open the chat (bottom-right) and tap a question.
            </p>
            <div className="space-y-3">
              <button 
                onClick={() => handleQuickQuestion('What can Abby do for my business?')}
                className="w-full text-left px-4 py-3 border rounded transition-colors"
                style={{ borderColor: 'var(--line)', color: 'var(--muted)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--emerald)';
                  e.currentTarget.style.color = 'var(--emerald)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--line)';
                  e.currentTarget.style.color = 'var(--muted)';
                }}
              >
                What can Abby do for my business?
              </button>
              <button 
                onClick={() => handleQuickQuestion('How does pricing work?')}
                className="w-full text-left px-4 py-3 border rounded transition-colors"
                style={{ borderColor: 'var(--line)', color: 'var(--muted)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--emerald)';
                  e.currentTarget.style.color = 'var(--emerald)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--line)';
                  e.currentTarget.style.color = 'var(--muted)';
                }}
              >
                How does pricing work?
              </button>
              <button 
                onClick={() => handleQuickQuestion('Can I try Abby on my website?')}
                className="w-full text-left px-4 py-3 border rounded transition-colors"
                style={{ borderColor: 'var(--line)', color: 'var(--muted)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--emerald)';
                  e.currentTarget.style.color = 'var(--emerald)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--line)';
                  e.currentTarget.style.color = 'var(--muted)';
                }}
              >
                Can I try Abby on my website?
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

