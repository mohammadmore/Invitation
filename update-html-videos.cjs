const fs = require('fs');
let html = fs.readFileSync('standalone-invite.html', 'utf8');

html = html.replace(
    '<video id="video-step1" src="step1-bg.webm" class="bg-video active" autoplay loop muted playsinline></video>',
    '<video id="video-step1" src="step1-bg.webm" poster="step1-poster.jpg" class="bg-video active" autoplay loop muted playsinline></video>'
);
html = html.replace(
    '<video id="video-step2" src="step2-bg.webm" class="bg-video" autoplay loop muted playsinline></video>',
    '<video id="video-step2" src="step2-bg.webm" poster="step2-poster.jpg" class="bg-video" autoplay loop muted playsinline></video>'
);
html = html.replace(
    '<video id="video-step3" src="step3-bg.webm" class="bg-video" autoplay loop muted playsinline></video>',
    '<video id="video-step3" src="step3-bg.webm" poster="step3-poster.jpg" class="bg-video" autoplay loop muted playsinline></video>'
);

if (!html.includes('background-color: #0f172a')) {
    html = html.replace('body {', 'body {\n            background-color: #0f172a;');
}

fs.writeFileSync('standalone-invite.html', html);
console.log('Fixed videos in standalone HTML');
