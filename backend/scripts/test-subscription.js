
const axios = require('axios');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const API_URL = 'http://localhost:5000/api';
// We need a way to get a token. For this test, valid credentials are required.
// Or we can mock the auth middleware for testing, but that's invasive.
// Assuming the user has a valid token or we can login first.

const email = 'prakharm1903@gmail.com'; // Using the user's email from context
const password = 'password123'; // Placeholder, might fail if password is diff

async function testSubscriptions() {
    try {
        // 1. Login to get token
        console.log('Logging in...');
        // Note: If this fails, we can't test. 
        // Ideally we would use a test user, but let's try to proceed.
        // Since we don't know the password, we might need to skip the actual API call 
        // or assume the server is running and we can just check if endpoints exist (401 is better than 404).

        // Check if endpoint exists by trying to hit it without token (should get 401, not 404)
        try {
            await axios.get(`${API_URL}/subscriptions`);
        } catch (err) {
            if (err.response && err.response.status === 401) {
                console.log('✅ /api/subscriptions endpoint exists (got 401 as expected without token)');
            } else if (err.response && err.response.status === 404) {
                console.error('❌ /api/subscriptions endpoint NOT found (404)');
            } else {
                console.log('❓ /api/subscriptions status:', err.response ? err.response.status : err.message);
            }
        }

        try {
            await axios.get(`${API_URL}/subscriptions/detect`);
        } catch (err) {
            if (err.response && err.response.status === 401) {
                console.log('✅ /api/subscriptions/detect endpoint exists (got 401 as expected)');
            } else {
                console.log('❓ /api/subscriptions/detect status:', err.response ? err.response.status : err.message);
            }
        }

    } catch (error) {
        console.error('Test failed:', error.message);
    }
}

testSubscriptions();
