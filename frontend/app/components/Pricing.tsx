'use client';

import { useRouter } from 'next/navigation';

export default function Pricing() {
  const router = useRouter();
  
  const handlePricingButton = (plan: { name: string; tier: string; price: string; planType: string }) => {
    // Navigate to payment page with plan info for all plans
    const params = new URLSearchParams({
      plan: plan.name,
      tier: plan.tier,
      price: plan.price,
      planType: plan.planType,
    });
    router.push(`/payment?${params.toString()}`);
  };

  const plans = [
    {
      name: "Abby Solo",
      tier: "Starter",
      price: "$97",
      originalPrice: null,
      planType: "starter",
      description: "Abby on your website (1 domain)",
      features: [
        "Leads engaged 24/7 (basic flows)",
        "Qualifies + books to your calendar",
        "Email transcript to your inbox",
        "30-day risk-free trial",
        "No card required to start"
      ],
      buttonText: "Get Started",
      buttonClass: "bg-gradient-emerald hover:opacity-90 text-black"
    }
  ];

  return (
    <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8" style={{ background: 'var(--bg)' }}>
      <div className="max-w-7xl mx-auto">
        {/* Pricing Banner */}
        <div className="mb-8 p-4 rounded-lg text-center" style={{ background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(34, 197, 94, 0.1) 100%)', border: '2px solid var(--emerald)' }}>
          <p className="text-lg font-semibold" style={{ color: 'var(--emerald)' }}>
            <span style={{ fontWeight: 'bold' }}>$97</span> / month • <span style={{ fontWeight: 'bold' }}>30-day risk-free trial</span> • No card required to start
          </p>
        </div>
        
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4" style={{ color: 'var(--ink)' }}>Clear, Transparent Pricing</h2>
          <p style={{ color: 'var(--muted)' }}>
            Usage limits apply; Abby scales with you.
          </p>
        </div>

        <div className="grid md:grid-cols-1 gap-6 max-w-md mx-auto">
          {plans.map((plan, index) => (
            <div
              key={index}
              className="border rounded-lg overflow-hidden"
              style={{ borderColor: 'var(--line)', background: 'var(--panel)' }}
            >
              <div className="border-b p-4" style={{ borderColor: 'var(--line)', background: 'rgba(0, 255, 153, 0.1)' }}>
                <div className="font-semibold text-sm uppercase mb-1" style={{ color: 'var(--emerald)' }}>
                  {plan.tier}
                </div>
                <h3 className="text-xl font-bold" style={{ color: 'var(--ink)' }}>{plan.name}</h3>
              </div>
              <div className="p-6">
                <div className="mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-4xl font-bold" style={{ color: 'var(--emerald)' }}>$97</span>
                    <span className="ml-2" style={{ color: 'var(--muted)' }}>/ month</span>
                  </div>
                  <p className="text-sm mt-2" style={{ color: 'var(--emerald)' }}>30-day risk-free trial • No card required</p>
                </div>
                <p className="mb-6" style={{ color: 'var(--muted)' }}>{plan.description}</p>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="mt-1" style={{ color: 'var(--emerald)' }}>✓</span>
                      <span style={{ color: 'var(--muted)' }}>{feature}</span>
                    </li>
                  ))}
                </ul>
                <button 
                  onClick={() => handlePricingButton(plan)}
                  className={`w-full py-3 px-4 rounded font-medium transition-colors ${plan.buttonClass}`}
                >
                  {plan.buttonText}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

