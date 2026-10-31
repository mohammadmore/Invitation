const fs = require('fs');

let html = fs.readFileSync('standalone-invite.html', 'utf8');

// Replace date
html = html.replace('۱۴ الی ۱۷ تیرماه ۱۴۰۳', '۱۷ تا ۱۹ شهریور ماه ۱۴۰۵');

// Replace time
html = html.replace('ساعت ۸:۰۰ الی ۱۵:۰۰', 'ساعت ۱۰ تا ۱۷');

// Replace map link
html = html.replace('https://maps.google.com/?q=شهرآفتاب+نمایشگاه', 'https://maps.app.goo.gl/xBEPdvT2qrKixN7x9');

// Replace location text
html = html.replace('محل دائمی نمایشگاه‌های شهر آفتاب', 'مرکز نمایشگاهی ایران مال');

// Replace booth text
html = html.replace('سالن E1 - غرفه 43', 'سالن E1، غرفه ۴۴ و ۴۵');

// Replace Google Calendar Link
const oldGCal = 'href="https://calendar.google.com/calendar/render?action=TEMPLATE&text=نمایشگاه+فارمکس+۱۴۰۳&dates=20240704T043000Z/20240707T113000Z&details=دیدار+در+غرفه+تخشا+دارو+بهان+-+سالن+E1+غرفه+43&location=شهرآفتاب"';
const newGCal = 'href="https://calendar.google.com/calendar/render?action=TEMPLATE&text=%D8%A8%D8%A7%D8%B2%D8%AF%DB%8C%D8%AF%20%D8%A7%D8%B2%20%D8%BA%D8%B1%D9%81%D9%87%20%D8%AA%D8%AE%D8%B4%D8%A7%20%D8%AF%D8%A7%D8%B1%D9%88%20%D8%A8%D9%87%D8%A7%D9%86%20-%20%D9%86%D9%85%D8%A7%DB%8C%D8%B4%DA%AF%D8%A7%D9%87%20%D9%81%D8%A7%D8%B1%D9%85%DA%A9%D8%B3&dates=20260908T063000Z/20260910T133000Z&details=%D8%A8%D8%A7%20%D8%A7%D9%81%D8%AA%D8%AE%D8%A7%D8%B1%20%D9%85%D9%86%D8%AA%D8%B8%D8%B1%20%D8%AD%D8%B6%D9%88%D8%B1%20%DA%AF%D8%B1%D9%85%20%D8%B4%D9%85%D8%A7%20%D8%AF%D8%B1%20%D8%BA%D8%B1%D9%81%D9%87%20%D8%B4%D8%B1%DA%A9%D8%AA%20%D8%AA%D8%AE%D8%B4%D8%A7%20%D8%AF%D8%A7%D8%B1%D9%88%20%D8%A8%D9%87%D8%A7%D9%86%20%D9%87%D8%B3%D8%AA%DB%8C%D9%85.%0A%0A%D9%55%DA%A9%D8%A7%D9%86%3A%20%D9%55%D8%B1%DA%A9%D8%B2%20%D9%86%D9%55%D8%A7%DB%8C%D8%B4%DA%AF%D8%A7%D9%87%DB%8C%20%D8%A7%DB%8C%D8%B1%D8%A7%D9%86%20%D9%55%D8%A7%D9%84%0A%D8%B3%D8%A7%D9%84%D9%86%20E1%D8%8C%20%D8%BA%D8%B1%D9%81%D9%87%20%DB%B4%DB%B4%20%D9%88%20%DB%B4%DB%B5&location=%D9%55%D8%B1%DA%A9%D8%B2%20%D9%86%D9%55%D8%A7%DB%8C%D8%B4%DA%AF%D8%A7%D9%87%DB%8C%20%D8%A7%DB%8C%D8%B1%D8%A7%D9%86%20%D9%55%D8%A7%D9%84"';
html = html.replace(oldGCal, newGCal);

// Replace ICS content
const oldIcs = `DTSTART:20240704T043000Z
DTEND:20240707T113000Z
SUMMARY:نمایشگاه فارمکس ۱۴۰۳
DESCRIPTION:دیدار در غرفه تخشا دارو بهان - سالن E1 غرفه 43
LOCATION:محل دائمی نمایشگاه‌های شهر آفتاب`;

const newIcs = `DTSTART:20260908T063000Z
DTEND:20260910T133000Z
SUMMARY:بازدید از غرفه تخشا دارو بهان - نمایشگاه فارمکس
DESCRIPTION:با افتخار منتظر حضور گرم شما در غرفه شرکت تخشا دارو بهان هستیم.\\n\\nمکان: مرکز نمایشگاهی ایران مال\\nسالن E1، غرفه ۴۴ و ۴۵
LOCATION:مرکز نمایشگاهی ایران مال`;

html = html.replace(oldIcs, newIcs);

fs.writeFileSync('standalone-invite.html', html);
console.log('Fixed standalone HTML details');
