const fs = require('fs');
let app = fs.readFileSync('src/App.tsx', 'utf8');
console.log(app.includes('bg-video-1.mp4') ? "Videos restored" : "Videos MISSING");
console.log(app.includes('STEP 0: INITIAL ENTRY') ? "Step 0 restored" : "Step 0 MISSING");
