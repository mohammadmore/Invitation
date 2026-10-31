const fs = require('fs');
let html = fs.readFileSync('standalone-invite.html', 'utf8');

// Replace videos
html = html.replace(/src="step1-bg\.mp4"/g, 'src="step1-bg.webm"');
html = html.replace(/src="step2-bg\.mp4"/g, 'src="step2-bg.webm"');
html = html.replace(/src="step3-bg\.mp4"/g, 'src="step3-bg.webm"');

// Fix opacity
html = html.replace(/\.bg-video\.active { opacity: 0\.6; }/g, '.bg-video.active { opacity: 0.75; }');

fs.writeFileSync('standalone-invite.html', html);
console.log("Updated standalone-invite.html videos and opacity");
