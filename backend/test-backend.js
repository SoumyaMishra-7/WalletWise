// test-backend.js
const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

async function testBackend() {
  try {
    console.log('=== Testing WalletWise Backend ===\n');

    // 1. Test health endpoint
    console.log('1. Testing health endpoint...');
    const health = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Health check:', health.data);

    // 2. Register a test user
    console.log('\n2. Registering test user...');
    const registerData = {
      studentId: 'TEST' + Date.now(),
      fullName: 'Test User',
      email: `test${Date.now()}@example.com`,
      password: 'password123',
      department: 'Computer Science',
      year: '3rd'
    };

    let token;
    try {
      const registerRes = await axios.post(`${BASE_URL}/auth/register`, registerData);
      console.log('✅ Registration successful');
      token = registerRes.data.token;
      console.log('Token received:', token ? 'YES' : 'NO');
    } catch (regError) {
      // If user exists, try login instead
      console.log('User may exist, trying login...');
      const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
        email: 'test@example.com',
        password: 'password123'
      });
      token = loginRes.data.token;
    }

    if (!token) {
      console.log('❌ No token received');
      return;
    }

    // 3. Test creating savings goal WITH token
    console.log('\n3. Testing savings goal creation...');
    const goalData = {
      name: 'New Laptop',
      description: 'Save for a new gaming laptop',
      targetAmount: 50000,
      currentAmount: 5000,
      targetDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(), // 6 months from now
      category: 'Other',
      priority: 'Medium',
      monthlyContribution: 7500,
      isActive: true
    };

    console.log('Goal data:', goalData);
    console.log('Using token:', token.substring(0, 20) + '...');

    try {
      const goalRes = await axios.post(`${BASE_URL}/savings-goals`, goalData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('✅ Savings goal created successfully!');
      console.log('Response:', JSON.stringify(goalRes.data, null, 2));
    } catch (goalError) {
      console.log('❌ Error creating savings goal:');
      console.log('Status:', goalError.response?.status);
      console.log('Error message:', goalError.response?.data?.message);
      console.log('Full error:', goalError.response?.data);
    }

    // 4. Test getting savings goals
    try {
      const goalsRes = await axios.get(`${BASE_URL}/savings-goals`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log('✅ Got savings goals:', goalsRes.data.goals?.length || 0, 'goals');
    } catch (getError) {
      console.log('❌ Error getting savings goals:', getError.response?.data?.message);
    }

    // 5. Test pagination
    console.log('\n5. Testing transaction pagination...');
    try {
      // First add some dummy transactions to ensure we have data
      for (let i = 0; i < 5; i++) {
        await axios.post(`${BASE_URL}/transactions`, {
          type: 'expense',
          amount: 100 * (i + 1),
          category: 'Food',
          description: `Test Transaction ${i + 1}`,
          date: new Date()
        }, { headers: { 'Authorization': `Bearer ${token}` } });
      }

      const pageRes = await axios.get(`${BASE_URL}/transactions?page=1&limit=2`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      console.log('✅ Pagination response:', {
        total: pageRes.data.pagination?.total,
        page: pageRes.data.pagination?.page,
        limit: pageRes.data.pagination?.limit,
        count: pageRes.data.transactions?.length
      });

      if (pageRes.data.transactions?.length === 2 && pageRes.data.pagination?.page === 1) {
        console.log('✅ Pagination fetch successful');
      } else {
        console.log('❌ Pagination data mismatch');
      }

    } catch (pageError) {
      console.log('❌ Error testing pagination:', pageError.response?.data?.message || pageError.message);
    }

  } catch (error) {
    console.error('❌ General error:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('⚠️  Make sure backend is running: node server.js');
    }
  }
}

testBackend();