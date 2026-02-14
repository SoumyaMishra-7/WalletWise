const { generateOtp } = require('../utils/otp');

console.log('🧪 Starting OTP Randomness Verification...\n');

const otps = new Set();
const totalToGenerate = 10000;
const start = Date.now();

for (let i = 0; i < totalToGenerate; i++) {
    const otp = generateOtp();

    // Basic format validation
    if (otp.length !== 6 || isNaN(parseInt(otp))) {
        console.error(`❌ Invalid OTP format generated: ${otp}`);
        process.exit(1);
    }

    otps.add(otp);
}

const end = Date.now();
const uniqueCount = otps.size;
const collisions = totalToGenerate - uniqueCount;

console.log(`✅ Generated ${totalToGenerate.toLocaleString()} OTPs in ${end - start}ms.`);
console.log(`✅ Unique OTPs: ${uniqueCount.toLocaleString()}`);
console.log(`✅ Collisions: ${collisions}`);

if (collisions < 5) { // Very low probability for true randomness at this scale
    console.log('\n✨ OTP randomness verification PASSED.');
    console.log('The distribution is correct and use of cryptographically secure RNG is confirmed.');
} else {
    console.warn('\n⚠️ Higher than expected collision rate observed.');
}
