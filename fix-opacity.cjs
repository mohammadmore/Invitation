const fs = require('fs');

let app = fs.readFileSync('src/App.tsx', 'utf8');

// Increase video opacity from 40 to 70 or 75
app = app.replace(/\? 'opacity-40' : 'opacity-0'/g, "? 'opacity-75' : 'opacity-0'");

// Let's also adjust the overlay slightly so it doesn't completely black out the bottom if the user wants it more visible.
// Currently: bg-gradient-to-b from-slate-900/60 via-slate-900/80 to-slate-900
app = app.replace(
  /bg-gradient-to-b from-slate-900\/60 via-slate-900\/80 to-slate-900/g,
  'bg-gradient-to-b from-slate-900/40 via-slate-900/70 to-slate-900/95'
);

fs.writeFileSync('src/App.tsx', app);
console.log("Opacity updated");
