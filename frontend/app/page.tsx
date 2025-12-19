import Header from './components/Header';
import Hero from './components/Hero';
import Pricing from './components/Pricing';
import BetaSignup from './components/BetaSignup';
import Footer from './components/Footer';
import Chatbot from './components/Chatbot';
import { ChatbotProvider } from './components/ChatbotContext';

export default function Home() {
  return (
    <ChatbotProvider>
      <div className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--ink)' }}>
        <Header />
        <main>
          <Hero />
          <Pricing />
          <BetaSignup />
          <Footer />
        </main>
        <Chatbot />
      </div>
    </ChatbotProvider>
  );
}
