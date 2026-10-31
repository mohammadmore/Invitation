const fs = require('fs');
let app = fs.readFileSync('src/App.tsx', 'utf8');
const lines = app.split('\n');
console.log("Checking near lines 60-90");
console.log(lines.slice(60, 90).join('\n'));
