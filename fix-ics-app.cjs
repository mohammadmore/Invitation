const fs = require('fs');
let app = fs.readFileSync('src/App.tsx', 'utf8');

const oldIcs = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
SUMMARY:بازدید از غرفه تخشا دارو بهان - \${eventDetails.title}
DESCRIPTION:با افتخار منتظر حضور گرم شما در غرفه شرکت تخشا دارو بهان هستیم.\\\\n\\\\nمکان: \${eventDetails.location}\\\\n\${eventDetails.booth}
LOCATION:\${eventDetails.location}
DTSTART:20260908T063000Z
DTEND:20260910T133000Z
END:VEVENT
END:VCALENDAR`;

const newIcs = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Pharmex//Invite//FA
BEGIN:VEVENT
UID:pharmex-2026
DTSTAMP:\${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z
SUMMARY:بازدید از غرفه تخشا دارو بهان - \${eventDetails.title}
DESCRIPTION:با افتخار منتظر حضور گرم شما در غرفه شرکت تخشا دارو بهان هستیم.\\\\n\\\\nمکان: \${eventDetails.location}\\\\n\${eventDetails.booth}
LOCATION:\${eventDetails.location}
DTSTART:20260908T063000Z
DTEND:20260910T133000Z
END:VEVENT
END:VCALENDAR`;

app = app.replace(oldIcs, newIcs);
fs.writeFileSync('src/App.tsx', app);
console.log('Fixed ICS in App.tsx');
