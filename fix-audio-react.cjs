const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  /useEffect\(\(\) => \{[\s\S]*?\}, \[\]\);/m,
  `useEffect(() => {
    const audio = document.getElementById('bg-music') as HTMLAudioElement;
    if (audio) {
      audio.volume = 0.5;
      
      const tryPlay = () => {
        audio.play().then(() => {
          setIsMusicPlaying(true);
          document.removeEventListener('click', tryPlay);
          document.removeEventListener('touchstart', tryPlay);
          document.removeEventListener('scroll', tryPlay);
        }).catch(error => {
          console.log('Autoplay prevented:', error);
          setIsMusicPlaying(false);
        });
      };

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.then(_ => {
          setIsMusicPlaying(true);
        }).catch(error => {
          console.log('Autoplay prevented, adding interaction listeners');
          setIsMusicPlaying(false);
          document.addEventListener('click', tryPlay);
          document.addEventListener('touchstart', tryPlay);
          document.addEventListener('scroll', tryPlay, { passive: true });
        });
      }
    }
    
    return () => {
      document.removeEventListener('click', () => {});
      document.removeEventListener('touchstart', () => {});
      document.removeEventListener('scroll', () => {});
    };
  }, []);`
);
fs.writeFileSync('src/App.tsx', code);
console.log('Fixed React audio');
