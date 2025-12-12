// Quick test script for payment API
const fetch = require('node-fetch');

async function testPaymentAPI() {
  const url = 'http://localhost:9000/api/payment/create-link';
  const payload = {
    amount: 497,
    planType: 'starter',
    sessionId: 'test_session_' + Date.now()
  };

  console.log('🧪 Testing Payment API...');
  console.log('URL:', url);
  console.log('Payload:', JSON.stringify(payload, null, 2));
  console.log('\n');

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));
    
    if (data.success && data.paymentLink) {
      console.log('\n✅ SUCCESS! Payment link generated:');
      console.log('🔗', data.paymentLink);
      console.log('\n📝 Payment ID:', data.paymentId);
    } else {
      console.log('\n❌ FAILED: No payment link in response');
    }
  } catch (error) {
    console.error('❌ ERROR:', error.message);
    console.error('\n💡 Make sure the backend server is running on port 9000');
    console.error('   Run: cd backend && npm run dev');
  }
}

testPaymentAPI();

