const fs = require('fs');
let app = fs.readFileSync('src/App.tsx', 'utf8');

// Change initial state
app = app.replace(
  'const [step, setStep] = useState(0);\n  const [isMusicPlaying, setIsMusicPlaying] = useState(true);',
  `const [step, setStep] = useState(1);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);

  useEffect(() => {
    const audio = document.getElementById('bg-music') as HTMLAudioElement;
    if (audio) {
      audio.volume = 0.5;
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.then(_ => {
          setIsMusicPlaying(true);
        }).catch(error => {
          console.log('Autoplay prevented:', error);
          setIsMusicPlaying(false);
        });
      }
    }
  }, []);`
);

// Remove handleStart
app = app.replace(
  /const handleStart = \(\) => \{\n\s+setStep\(1\);\n\s+\/\/ Try to play audio\n\s+const audio = document\.getElementById\('bg-music'\) as HTMLAudioElement;\n\s+if \(audio\) \{\n\s+audio\.volume = 0\.5;\n\s+audio\.play\(\)\.catch\(e => console\.log\('Audio play failed:', e\)\);\n\s+\}\n\s+\};\n/,
  ''
);

// Remove STEP 0 block
app = app.replace(
  /\s+\{\/\* STEP 0: INITIAL ENTRY \*\/\}\n\s+\{step === 0 && \(\n\s+<motion\.div[\s\S]*?<\/motion\.div>\n\s+\)\}\n/,
  '\n'
);

// We need to also try to play music if user clicks the button in step 1, in case it was blocked
app = app.replace(
  'onClick={() => setStep(2)}',
  `onClick={() => {
                      setStep(2);
                      const audio = document.getElementById('bg-music') as HTMLAudioElement;
                      if (audio && !isMusicPlaying) {
                        audio.play().then(() => setIsMusicPlaying(true)).catch(() => {});
                      }
                    }}`
);

fs.writeFileSync('src/App.tsx', app);
console.log('Fixed React');
