const fs = require('fs');

let app = fs.readFileSync('src/App.tsx', 'utf8');

// Replace the video source extensions and types
app = app.replace(/\/bg-video-1\.mp4/g, '/bg-video-1.webm');
app = app.replace(/\/bg-video-2\.mp4/g, '/bg-video-2.webm');
app = app.replace(/type="video\/mp4"/g, 'type="video/webm"');

fs.writeFileSync('src/App.tsx', app);
console.log("Updated App.tsx to use webm");
