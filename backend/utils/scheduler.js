const cron = require('node-cron');
const Subscription = require('../models/Subscription');
const { sendEmail } = require('./mailer');
const User = require('../models/User'); // Assuming you have a User model to get email

const checkUpcomingBills = async () => {
    console.log('⏳ Checking for upcoming bills...');
    try {
        const today = new Date();
        const threeDaysLater = new Date(today);
        threeDaysLater.setDate(today.getDate() + 3);
        threeDaysLater.setHours(0, 0, 0, 0);

        const endOfThreeDaysLater = new Date(threeDaysLater);
        endOfThreeDaysLater.setHours(23, 59, 59, 999);

        // Find subscriptions due in 3 days
        const upcomingSubscriptions = await Subscription.find({
            nextDueDate: {
                $gte: threeDaysLater,
                $lte: endOfThreeDaysLater
            },
            isActive: true
        }).populate('userId');

        console.log(`🔎 Found ${upcomingSubscriptions.length} bills due in 3 days.`);

        for (const sub of upcomingSubscriptions) {
            if (!sub.userId || !sub.userId.email) {
                console.warn(`⚠️ Skipped subscription ${sub.name} (no user email)`);
                continue;
            }

            const emailSubject = `Upcoming Bill: ${sub.name} is due soon!`;
            const emailHtml = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #2563eb;">WalletWise Bill Reminder</h2>
                    <p>Hi ${sub.userId.name || 'there'},</p>
                    <p>This is a friendly reminder that your subscription for <strong>${sub.name}</strong> is due in 3 days.</p>
                    
                    <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <p style="margin: 5px 0;"><strong>Amount:</strong> ₹${sub.amount}</p>
                        <p style="margin: 5px 0;"><strong>Due Date:</strong> ${threeDaysLater.toLocaleDateString()}</p>
                        <p style="margin: 5px 0;"><strong>Category:</strong> ${sub.category}</p>
                    </div>

                    <p>Make sure you have enough balance in your account!</p>
                    <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
                        You are receiving this email because you enabled bill tracking in WalletWise.
                    </p>
                </div>
            `;

            await sendEmail({
                to: sub.userId.email,
                subject: emailSubject,
                html: emailHtml
            });

            console.log(`✅ Email sent to ${sub.userId.email} for ${sub.name}`);
        }

    } catch (error) {
        console.error('❌ Error in bill scheduler:', error);
    }
};

// Schedule the task to run every day at 9:00 AM
const initScheduler = () => {
    // Cron syntax: Second Minute Hour Day Month DayOfWeek
    // '0 9 * * *' = At 09:00 AM every day
    cron.schedule('0 9 * * *', () => {
        checkUpcomingBills();
    });

    console.log('📅 Scheduler initialized: Bill checks running daily at 9:00 AM.');
};

module.exports = { initScheduler, checkUpcomingBills }; // Export checkUpcomingBills for testing
