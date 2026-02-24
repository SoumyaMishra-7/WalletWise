const fs = require('fs');
const path = require('path');

function walkSync(dir, filelist = []) {
    const items = fs.readdirSync(dir);
    for (const file of items) {
        const dirFile = path.join(dir, file);
        if (fs.statSync(dirFile).isDirectory()) {
            filelist = walkSync(dirFile, filelist);
        } else if (file.endsWith('.jsx') || file.endsWith('.js')) {
            filelist.push(dirFile);
        }
    }
    return filelist;
}

const frontendPath = path.resolve(__dirname, 'src', 'pages');
const files = walkSync(frontendPath);
files.push(path.resolve(__dirname, 'src', 'components', 'Dashboard.jsx'));

let updated = 0;
files.forEach(filePath => {
    let code = fs.readFileSync(filePath, 'utf8');
    let original = code;

    // Regexes properly spaced, dot matched accurately
    const regex1 = /const formatCurrency = \(amount\) => \{\s*return new Intl\.NumberFormat\('en-IN', \{\s*style: 'currency',\s*currency: 'INR',\s*minimumFractionDigits: 0\s*\}\)\.format\(amount\);\s*\};/g;

    const replaceCurrencyFunc1 = `const formatCurrency = (amount) => {
    const currency = (typeof user !== 'undefined' && user?.currency) || 'USD';
    const locale = currency === 'INR' ? 'en-IN' : 'en-US';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };`;

    code = code.replace(regex1, replaceCurrencyFunc1);

    // Fallback direct replaces for single occurrences or mismatched formats
    const strict1 = `const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount);
  };`;

    if (code.includes(strict1)) {
        code = code.replace(strict1, replaceCurrencyFunc1);
    }

    // Replace manual string concatenations '₹' + value into ternary logic
    code = code.replace(/return '₹' \+ value;/g, 'return ((typeof user !== "undefined" && user?.currency === "INR") ? "₹" : "$") + value;');
    code = code.replace(/return \\'₹\\' \+ value;/g, 'return ((typeof user !== "undefined" && user?.currency === "INR") ? "₹" : "$") + value;');

    if (code !== original) {
        fs.writeFileSync(filePath, code);
        updated++;
    }
});
console.log('Updated ' + updated + ' files');
