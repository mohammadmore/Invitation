const fs = require('fs');

let html = fs.readFileSync('standalone-invite.html', 'utf8');

// Add object-fit to bg-video
html = html.replace(
  '.bg-video {\n      position: absolute;',
  '.bg-video {\n      position: absolute;\n      object-fit: cover;'
);

// Fix videos
html = html.replace(
  '<video id="video-step1" src="step1-bg.webm" poster="step1-poster.jpg" class="bg-video active" autoplay loop muted playsinline></video>',
  '<video id="video-step1" src="step1-bg.webm" poster="step1-poster.jpg" class="bg-video active" autoplay loop muted playsinline preload="auto"></video>'
);

html = html.replace(
  '<video id="video-step2" src="step2-bg.webm" poster="step2-poster.jpg" class="bg-video" autoplay loop muted playsinline></video>',
  '<video id="video-step2" src="step2-bg.webm" poster="step2-poster.jpg" class="bg-video" loop muted playsinline preload="none"></video>'
);

html = html.replace(
  '<video id="video-step3" src="step3-bg.webm" poster="step3-poster.jpg" class="bg-video" autoplay loop muted playsinline></video>',
  '<video id="video-step3" src="step3-bg.webm" poster="step3-poster.jpg" class="bg-video" loop muted playsinline preload="none"></video>'
);

// Update JS for playing/pausing videos
html = html.replace(
  /function updateVideos\(step\) \{[\s\S]*?\}\n/,
  `function updateVideos(step) {
      document.querySelectorAll('.bg-video').forEach(v => {
        v.classList.remove('active');
        v.pause(); // Pause inactive videos to save resources
      });
      
      let activeVid;
      if (step <= 1) {
        activeVid = document.getElementById('video-step1');
      } else if (step === 2) {
        activeVid = document.getElementById('video-step2');
      } else if (step === 3) {
        activeVid = document.getElementById('video-step3');
      }
      
      if (activeVid) {
        activeVid.classList.add('active');
        // Play the active video (it will buffer if preload was none)
        const playPromise = activeVid.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {});
        }
      }
    }\n`
);

fs.writeFileSync('standalone-invite.html', html);
console.log('Optimized HTML');
