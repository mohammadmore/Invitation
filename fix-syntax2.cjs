const fs = require('fs');

let app = fs.readFileSync('src/App.tsx', 'utf8');

const lines = app.split('\n');
console.log("Checking near lines 90-110");
console.log(lines.slice(85, 110).join('\n'));
