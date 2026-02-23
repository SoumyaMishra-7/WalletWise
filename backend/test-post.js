const User = require('./models/User');
const currencyMiddleware = require('./middleware/currencyConverter.middleware');

const testPost = async () => {
    // mock req
    const req = {
        userId: '123',
        method: 'POST',
        body: { amount: 1000, type: 'expense' }
    };

    User.findById = async () => ({ currency: 'INR' });

    console.log("Input body:", req.body);
    await currencyMiddleware(req, {}, () => {
        console.log("Next called! Output body:", req.body);
    });
};
testPost();
