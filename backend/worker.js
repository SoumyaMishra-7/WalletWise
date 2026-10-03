const cron = require('node-cron');
const Subscription = require('./models/Subscription');
const { sendEmail } = require('./utils/mailer');
const { processDueRecurringTransactions } = require('./services/RecurringTransactionService');

// Helper to log structured info
const log = (level, task, message, data = {}) => {
    const logData = {
        timestamp: new Date().toISOString(),
        level,
        task,
        message,
        ...data
    };
    if (level === 'error') {
        console.error(JSON.stringify(logData));
    } else if (level === 'warn') {
        console.warn(JSON.stringify(logData));
    } else {
        console.log(JSON.stringify(logData));
    }
};

const processRecurringTransactions = async () => {
    const startTime = Date.now();
    log('info', 'RecurringTransactions', 'Starting recurring transactions processing');

    try {
        // Shared with the API's explicit trigger so there is a single
        // implementation of this logic instead of two that can race.
        const { processed, failed } = await processDueRecurringTransactions();

        log('info', 'RecurringTransactions', 'Completed recurring transactions processing', {
            processedCount: processed,
            failedCount: failed,
            durationMs: Date.now() - startTime
        });
    } catch (error) {
        log('error', 'RecurringTransactions', 'Critical error in recurring transactions processing', { error: error.stack });
    }
};

const processBillReminders = async () => {
    const startTime = Date.now();
    log('info', 'BillReminders', 'Starting bill reminders processing');

    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const maxDaysLater = new Date(today);
        maxDaysLater.setDate(today.getDate() + 7);
        maxDaysLater.setHours(23, 59, 59, 999);

        const upcomingSubscriptions = await Subscription.find({
            nextDueDate: {
                $gte: today,
                $lte: maxDaysLater
            },
            isActive: true
        }).populate('userId');

        log('info', 'BillReminders', `Found ${upcomingSubscriptions.length} active bills in 7-day window`);

        let emailsSent = 0;
        let skipped = 0;

        for (const sub of upcomingSubscriptions) {
            if (!sub.userId || !sub.userId.email) {
                skipped++;
                continue;
            }

            const prefs = sub.userId.notificationPrefs || { billRemindersEnabled: true, reminderDaysBefore: 3 };

            if (prefs.billRemindersEnabled === false) {
                skipped++;
                continue;
            }

            const reminderDays = prefs.reminderDaysBefore || 3;

            const targetDateStart = new Date(today);
            targetDateStart.setDate(today.getDate() + reminderDays);
            targetDateStart.setHours(0, 0, 0, 0);

            const targetDateEnd = new Date(targetDateStart);
            targetDateEnd.setHours(23, 59, 59, 999);

            const dueDate = new Date(sub.nextDueDate);

            if (dueDate >= targetDateStart && dueDate <= targetDateEnd) {
                try {
                    const emailSubject = `Upcoming Bill: ${sub.name} is due soon!`;
                    const emailHtml = `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                            <h2 style="color: #2563eb;">WalletWise Bill Reminder</h2>
                            <p>Hi ${sub.userId.fullName || sub.userId.email.split('@')[0] || 'there'},</p>
                            <p>This is a friendly reminder that your subscription for <strong>${sub.name}</strong> is due in ${reminderDays} day(s).</p>
                            
                            <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                                <p style="margin: 5px 0;"><strong>Amount:</strong> ${sub.currency || '₹'}${sub.amount}</p>
                                <p style="margin: 5px 0;"><strong>Due Date:</strong> ${dueDate.toLocaleDateString()}</p>
                                <p style="margin: 5px 0;"><strong>Category:</strong> ${sub.category}</p>
                            </div>
        
                            <p>Make sure you have enough balance in your account!</p>
                            <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
                                You are receiving this email because you enabled bill tracking in WalletWise. You can update your notification preferences from your Profile Settings.
                            </p>
                        </div>
                    `;

                    await sendEmail({
                        to: sub.userId.email,
                        subject: emailSubject,
                        html: emailHtml
                    });

                    emailsSent++;
                } catch (emailErr) {
                    log('error', 'BillReminders', `Failed to send email to ${sub.userId.email} for ${sub.name}`, { error: emailErr.message });
                }
            } else {
                skipped++;
            }
        }

        const duration = Date.now() - startTime;
        log('info', 'BillReminders', 'Completed bill reminders processing', { emailsSent, skipped, durationMs: duration });
    } catch (error) {
        log('error', 'BillReminders', 'Critical error in bill reminders processing', { error: error.stack });
    }
};

const runAllTasks = async () => {
    log('info', 'Worker', 'Running all background tasks');
    await processRecurringTransactions();
    await processBillReminders();
};

const initWorker = () => {
    // Recurring transactions come due at arbitrary times. They used to be
    // executed inside GET /transactions, so poll frequently to keep the delay
    // short without putting writes inside a read request.
    cron.schedule('* * * * *', async () => {
        await processRecurringTransactions();
    });

    // Bill reminders are a daily digest, so 09:00 is still right for them.
    cron.schedule('0 9 * * *', async () => {
        await processBillReminders();
    });

    log('info', 'Worker', 'Background worker initialized: recurring transactions every minute, bill reminders at 09:00 daily.');
};

module.exports = {
    initWorker,
    runAllTasks,
    processRecurringTransactions,
    processBillReminders
};
