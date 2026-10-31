const fs = require('fs');

// Fix App.tsx
let app = fs.readFileSync('src/App.tsx', 'utf8');
const oldApp = `<span className="block text-[#7B9C54] text-xl mb-2 font-bold">دعوتنامه رسمی</span>`;
const newApp = `<img src="/pharmex.webp" alt="Pharmex" className="h-16 w-auto mx-auto mb-4 object-contain drop-shadow-md" />\n                  <span className="block text-[#7B9C54] text-xl mb-2 font-bold">دعوتنامه رسمی</span>`;
app = app.replace(oldApp, newApp);
fs.writeFileSync('src/App.tsx', app);

// Fix standalone-invite.html
let html = fs.readFileSync('standalone-invite.html', 'utf8');
const oldHtml = `<h1 class="text-3xl font-black mb-4 bg-gradient-to-r from-blue-100 to-teal-100 bg-clip-text text-transparent">سلام!</h1>`;
const newHtml = `<img src="pharmex.webp" alt="Pharmex" class="h-16 w-auto mx-auto mb-4 object-contain drop-shadow-md" />\n        <h1 class="text-3xl font-black mb-4 bg-gradient-to-r from-blue-100 to-teal-100 bg-clip-text text-transparent">سلام!</h1>`;
html = html.replace(oldHtml, newHtml);
fs.writeFileSync('standalone-invite.html', html);

console.log("Logos fixed.");
