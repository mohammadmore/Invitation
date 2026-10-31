const fs = require('fs');
let html = fs.readFileSync('standalone-invite.html', 'utf8');

// Change initial step in JS
html = html.replace('let currentStep = 0;', 'let currentStep = 1;');

// In CSS or JS, make step-1 display:block instead of step-0
html = html.replace('<div id="step-0" class="step" style="display: flex;">', '<div id="step-0" class="step" style="display: none;">');
html = html.replace('<div id="step-1" class="step">', '<div id="step-1" class="step" style="display: block;">');

// Remove the step-0 HTML block completely
html = html.replace(/<!-- STEP 0 -->[\s\S]*?<!-- STEP 1 -->/, '<!-- STEP 1 -->');

// Also update the button in step 1 to try to play audio if not playing
html = html.replace(
  `onclick="goToStep(2)" class="flex items-center justify-center gap-2 text-white px-8 py-4 rounded-full font-bold shadow-lg transition-all w-full bg-gradient-to-r from-[#1A4B62] via-[#7B9C54] to-[#256B7D] bg-[length:200%_auto] animate-gradient-btn hover:scale-[1.02]"`,
  `onclick="goToStep(2); if(!isPlaying) { bgMusic.play().then(() => { isPlaying = true; updateAudioIcons(); }).catch(()=>{}); }" class="flex items-center justify-center gap-2 text-white px-8 py-4 rounded-full font-bold shadow-lg transition-all w-full bg-gradient-to-r from-[#1A4B62] via-[#7B9C54] to-[#256B7D] bg-[length:200%_auto] animate-gradient-btn hover:scale-[1.02]"`
);

// We should also try to autoplay music when the script loads
html = html.replace(
  'function toggleAudio()',
  `document.addEventListener('DOMContentLoaded', () => {
      bgMusic.volume = 0.5;
      bgMusic.play().then(() => {
        isPlaying = true;
        updateAudioIcons();
      }).catch(e => {
        console.log("Autoplay prevented", e);
      });
    });

    function toggleAudio()`
);

fs.writeFileSync('standalone-invite.html', html);
console.log('Fixed HTML');
