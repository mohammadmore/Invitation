const fs = require('fs');

// 1. Fix index.html
let index = fs.readFileSync('index.html', 'utf8');
index = index.replace('<html lang="en">', '<html lang="fa" dir="rtl">');
index = index.replace('<title>My Google AI Studio App</title>', `<link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;700;900&display=swap" rel="stylesheet">
    <title>دعوتنامه اختصاصی نمایشگاه فارمکس</title>`);
fs.writeFileSync('index.html', index);
console.log('Fixed index.html');

// 2. Fix standalone-invite.html
let html = fs.readFileSync('standalone-invite.html', 'utf8');
html = html.replace('نمایشگاه فارمکس ۱۴۰۳', 'نمایشگاه فارمکس ۱۴۰۵'); // Fix share text
html = html.replace(
    'DESCRIPTION:با افتخار منتظر حضور گرم شما در غرفه شرکت تخشا دارو بهان هستیم.\n\nمکان: مرکز نمایشگاهی ایران مال\nسالن E1، غرفه ۴۴ و ۴۵',
    'DESCRIPTION:با افتخار منتظر حضور گرم شما در غرفه شرکت تخشا دارو بهان هستیم.\\n\\nمکان: مرکز نمایشگاهی ایران مال\\nسالن E1، غرفه ۴۴ و ۴۵'
); // Fix ICS newline bug
fs.writeFileSync('standalone-invite.html', html);
console.log('Fixed standalone-invite.html');

