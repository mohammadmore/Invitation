const fs = require('fs');

let app = fs.readFileSync('src/App.tsx', 'utf8');

app = app.replace('const dates = "20241002T053000Z/20241004T133000Z";', 'const dates = "20260908T063000Z/20260910T133000Z";');

fs.writeFileSync('src/App.tsx', app);
console.log('Fixed App.tsx dates');
