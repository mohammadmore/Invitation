const fs = require('fs');

// 1. Fix main.tsx
let main = fs.readFileSync('src/main.tsx', 'utf8');
main = main.replace(/import '@fontsource\/vazirmatn\/.*?\.css';\n/g, '');
fs.writeFileSync('src/main.tsx', main);

// 2. Fix index.html
let index = fs.readFileSync('index.html', 'utf8');
index = index.replace('display=swap', 'display=block');
// Add high-priority preload for the font CSS
index = index.replace(
  '<link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;700;900&display=swap" rel="stylesheet">',
  '<link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;700;900&display=block">\n    <link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;700;900&display=block" rel="stylesheet">'
);
fs.writeFileSync('index.html', index);

// 3. Fix standalone-invite.html
let html = fs.readFileSync('standalone-invite.html', 'utf8');
html = html.replace('display=swap', 'display=block');
html = html.replace(
  '<link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;700;900&display=swap" rel="stylesheet">',
  '<link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;700;900&display=block">\n  <link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;700;900&display=block" rel="stylesheet">'
);
fs.writeFileSync('standalone-invite.html', html);

console.log('Fixed fonts');
