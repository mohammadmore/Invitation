const fs = require('fs');

let index = fs.readFileSync('index.html', 'utf8');
index = index.replace(
  '<link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;700;900&display=block" rel="stylesheet">',
  '<link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;700;900&display=block">\n    <link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;700;900&display=block" rel="stylesheet">'
);
fs.writeFileSync('index.html', index);

let html = fs.readFileSync('standalone-invite.html', 'utf8');
html = html.replace(
  '<link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;700;900&display=block" rel="stylesheet">',
  '<link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;700;900&display=block">\n  <link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;700;900&display=block" rel="stylesheet">'
);
fs.writeFileSync('standalone-invite.html', html);

console.log('Fixed fonts 2');
