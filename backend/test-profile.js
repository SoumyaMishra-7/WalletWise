const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

async function run() {
    try {
        const registerRes = await axios.post('http://localhost:5000/api/auth/register', {
            studentId: Date.now().toString(),
            fullName: 'John Doe',
            email: Date.now() + '@example.com',
            password: 'password123',
            department: 'CS',
            year: '1st'
        });

        const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
            email: registerRes.data.user.email,
            password: 'password123'
        });

        const cookie = loginRes.headers['set-cookie'];

        const form = new FormData();
        form.append('fullName', 'John Doe');
        form.append('phoneNumber', '');
        form.append('department', 'CS');
        form.append('year', '1st');
        form.append('currency', 'EUR');
        form.append('dateFormat', 'MM/DD/YYYY');
        form.append('language', 'English');

        const res = await axios.put('http://localhost:5000/api/auth/profile', form, {
            headers: {
                ...form.getHeaders(),
                Cookie: cookie
            }
        });
        console.log(res.data);
    } catch (e) {
        console.log("ERROR:");
        console.dir(e.response ? { status: e.response.status, data: e.response.data } : e.message);
    }
}
run();
