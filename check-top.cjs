const fs = require('fs');
let app = fs.readFileSync('src/App.tsx', 'utf8');
const lines = app.split('\n');
console.log("Checking top of file where background video should be:");
console.log(lines.slice(0, 100).join('\n'));
