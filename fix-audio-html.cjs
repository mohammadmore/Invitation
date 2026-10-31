const fs = require('fs');
let html = fs.readFileSync('standalone-invite.html', 'utf8');

html = html.replace(
  /document\.addEventListener\('DOMContentLoaded', \(\) => {[\s\S]*?}\);/m,
  `document.addEventListener('DOMContentLoaded', () => {
      bgMusic.volume = 0.5;
      bgMusic.play().then(() => {
        isPlaying = true;
        updateAudioIcons();
      }).catch(e => {
        console.log("Autoplay prevented by browser, waiting for user interaction...");
        
        const playOnInteract = () => {
          if (!isPlaying) {
            bgMusic.play().then(() => {
              isPlaying = true;
              updateAudioIcons();
              document.removeEventListener('click', playOnInteract);
              document.removeEventListener('touchstart', playOnInteract);
              document.removeEventListener('scroll', playOnInteract, {passive: true});
            }).catch(()=>{});
          }
        };

        document.addEventListener('click', playOnInteract);
        document.addEventListener('touchstart', playOnInteract);
        document.addEventListener('scroll', playOnInteract, {passive: true});
      });
    });`
);
fs.writeFileSync('standalone-invite.html', html);
console.log('Fixed HTML audio');
