const fs = require('fs');

// 1. Fix standalone-invite.html
let html = fs.readFileSync('standalone-invite.html', 'utf8');

// Fix syntax error
html = html.replace('      });\n    });\n    });', '      });\n    });');

// Replace button text
html = html.replace('مسیریابی روی نقشه', 'برای مسیریابی روی نقشه کلیک کنید');

// Replace time
html = html.replace('ساعت ۱۰ تا ۱۷', 'ساعت ۱۰ تا ۱۸');

fs.writeFileSync('standalone-invite.html', html);

// 2. Fix App.tsx
let app = fs.readFileSync('src/App.tsx', 'utf8');

// Replace button text
app = app.replace('مسیریابی روی نقشه', 'برای مسیریابی روی نقشه کلیک کنید');

// Replace time
app = app.replace('ساعت ۱۰ تا ۱۷', 'ساعت ۱۰ تا ۱۸');

fs.writeFileSync('src/App.tsx', app);

console.log('Fixed stuff');
