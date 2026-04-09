import { SalesAgentPromptService } from '../modules/chat/sales-agent-prompt.service';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

async function run(): Promise<void> {
  const service = new SalesAgentPromptService();

  const alphaPrompt = service.buildSalesAgentPrompt({
    conversationPhase: 'discovery',
    clientContext: {
      companyName: 'Alpha Roofing',
      assistantName: 'Ava',
      assistantRole: 'lead qualification specialist',
      brandVoice: 'short, practical, and direct',
      valueProposition: 'Convert after-hours emergency leads into booked jobs fast.',
      qualificationGoal: 'Collect lead source, urgency, and average job value.',
      responseRules: ['Keep every response under 12 words.', 'Always ask one question at a time.'],
    },
    collectedData: {},
  });

  const betaPrompt = service.buildSalesAgentPrompt({
    conversationPhase: 'discovery',
    clientContext: {
      companyName: 'Beta Legal',
      assistantName: 'Lex',
      assistantRole: 'intake specialist',
      brandVoice: 'calm, clear, and trust-building',
      valueProposition: 'Qualify legal intake and route urgent prospects correctly.',
      qualificationGoal: 'Capture case type, urgency, and preferred callback window.',
      responseRules: ['Use empathetic language.', 'Confirm understanding before next question.'],
    },
    collectedData: {},
  });

  assert(alphaPrompt !== betaPrompt, 'Prompts must differ across tenants.');
  assert(alphaPrompt.includes('Alpha Roofing'), 'Alpha tenant company context missing.');
  assert(betaPrompt.includes('Beta Legal'), 'Beta tenant company context missing.');
  assert(alphaPrompt.includes('Ava'), 'Alpha assistant identity missing.');
  assert(betaPrompt.includes('Lex'), 'Beta assistant identity missing.');
  assert(
    !alphaPrompt.includes('AI assistant for WebChatSales') && !betaPrompt.includes('AI assistant for WebChatSales'),
    'Hardcoded WebChatSales identity still present in transparency rule.',
  );

  console.log('Milestone 6 verification passed.');
  console.log('- Tenant-specific context generates distinct prompts.');
  console.log('- Assistant identity and business context are dynamically injected.');
  console.log('- No hardcoded WebChatSales transparency identity remains.');
}

run().catch((error) => {
  console.error('Milestone 6 verification failed:', error.message);
  process.exit(1);
});
