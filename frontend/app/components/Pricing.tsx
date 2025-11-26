export default function Pricing() {
  const plans = [
    {
      name: "Abby Solo",
      tier: "Starter",
      price: "$497",
      description: "Abby on your website (1 domain)",
      features: [
        "Leads engaged 24/7 (basic flows)",
        "Qualifies + books to your calendar",
        "Email transcript to your inbox"
      ],
      buttonText: "Start Starter",
      buttonClass: "bg-gradient-emerald hover:opacity-90 text-black"
    },
    {
      name: "Abby + Channels",
      tier: "Growth",
      price: "$897",
      description: "Everything in Starter",
      features: [
        "Social & email channels connected",
        "Custom qualify flows + routing",
        "Weekly content pack (12 posts)"
      ],
      buttonText: "Choose Growth",
      buttonClass: "bg-gradient-emerald hover:opacity-90 text-black"
    },
    {
      name: "Abby Full Stack",
      tier: "Enterprise",
      price: "$1,999",
      description: "Everything in Growth",
      features: [
        "White-glove optimization + SLAs",
        "Advanced analytics & reporting",
        "Priority support + training"
      ],
      buttonText: "Talk Enterprise",
      buttonClass: "bg-gradient-emerald hover:opacity-90 text-black"
    }
  ];

  return (
    <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8" style={{ background: 'var(--bg)' }}>
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4" style={{ color: 'var(--ink)' }}>Clear, Transparent Pricing</h2>
          <p style={{ color: 'var(--muted)' }}>
            Usage limits apply; Abby scales with you. Ask Abby for today&apos;s rate details.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
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
                  <span className="text-4xl font-bold" style={{ color: 'var(--emerald)' }}>{plan.price}</span>
                  <span className="ml-2" style={{ color: 'var(--muted)' }}>/ month</span>
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
                <button className={`w-full py-3 px-4 rounded font-medium transition-colors ${plan.buttonClass}`}>
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

