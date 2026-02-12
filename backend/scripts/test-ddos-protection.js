const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

async function testPayloadLimit() {
    console.log('\n--- Testing Payload Limit ---');
    const largeData = 'a'.repeat(2 * 1024 * 1024); // 2MB
    try {
        await axios.post(`${BASE_URL}/health`, { data: largeData });
        console.log('❌ Failed: 2MB payload was accepted');
    } catch (error) {
        if (error.response) {
            if (error.response.status === 413) {
                console.log('✅ Success: 2MB payload was rejected with 413 (Payload Too Large)');
            } else {
                console.log(`❌ Failed: Received status ${error.response.status} instead of 413`);
            }
        } else {
            console.log('❌ Error (No response):', error.message);
        }
    }
}

async function testRateLimiting() {
    console.log('\n--- Testing Rate Limiting ---');
    console.log('Sending several requests to trigger speed limiter...');
    for (let i = 0; i < 60; i++) {
        const start = Date.now();
        try {
            await axios.get(`${BASE_URL}/health`);
            const duration = Date.now() - start;
            if (i > 50) {
                console.log(`Request ${i + 1}: Duration ${duration}ms (Expected delay)`);
            }
        } catch (error) {
            if (error.response) {
                console.log(`Request ${i + 1} failed with status ${error.response.status}: ${error.response.data.message || error.message}`);
                if (error.response.status === 429) {
                    console.log('✅ Success: Rate limiter triggered!');
                    return;
                }
            } else {
                console.log(`Request ${i + 1} failed (No response): ${error.message}`);
                break;
            }
        }
    }
}

async function runTests() {
    console.log('Starting DDoS Resistance Tests...');
    console.log('NOTE: Ensure the server is running on port 5000 before starting.');
    await testPayloadLimit();
    await testRateLimiting();
}

runTests();
