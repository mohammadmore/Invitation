const fs = require('fs');

// --- 1. App.tsx ---
let app = fs.readFileSync('src/App.tsx', 'utf8');

// Add Volume2, VolumeX to lucide-react imports
app = app.replace(/import \{ (.*?) \} from 'lucide-react';/, (match, p1) => {
    if (!p1.includes('Volume2')) {
        return `import { ${p1}, Volume2, VolumeX } from 'lucide-react';`;
    }
    return match;
});

// Add state for music playing
const stateRegex = /const \[step, setStep\] = useState\(0\);/;
app = app.replace(stateRegex, `const [step, setStep] = useState(0);\n  const [isMusicPlaying, setIsMusicPlaying] = useState(true);`);

// Update audio element and add toggle button
const audioRegex = /<audio id="bg-music" loop>\s*<source src="\/bg-music\.mp3" type="audio\/mpeg" \/>\s*<\/audio>/;

const musicToggleCode = `
      <audio id="bg-music" loop autoPlay>
        <source src="/bg-music.mp3" type="audio/mpeg" />
      </audio>

      {/* Music Toggle Button */}
      {step > 0 && (
        <button
          onClick={() => {
            const audio = document.getElementById('bg-music') as HTMLAudioElement;
            if (audio) {
              if (isMusicPlaying) {
                audio.pause();
              } else {
                audio.play();
              }
              setIsMusicPlaying(!isMusicPlaying);
            }
          }}
          className="absolute top-6 left-6 z-50 bg-white/30 hover:bg-white/50 backdrop-blur-md p-3 rounded-full text-slate-800 transition-all shadow-md border border-white/40 flex items-center justify-center"
          title={isMusicPlaying ? "قطع صدا" : "پخش صدا"}
        >
          {isMusicPlaying ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5 text-slate-600" />}
        </button>
      )}
`;

app = app.replace(audioRegex, musicToggleCode);
fs.writeFileSync('src/App.tsx', app);

// --- 2. standalone-invite.html ---
let html = fs.readFileSync('standalone-invite.html', 'utf8');

// Add music button CSS
const cssInsert = `
      /* Music Button */
      .music-btn { position: fixed; top: 24px; left: 24px; z-index: 50; background: rgba(255,255,255,0.3); backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.4); border-radius: 50%; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; color: #1e293b; cursor: pointer; transition: all 0.3s; opacity: 0; pointer-events: none; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
      .music-btn.visible { opacity: 1; pointer-events: auto; }
      .music-btn:hover { background: rgba(255,255,255,0.5); transform: scale(1.05); }`;
html = html.replace('/* Custom Styles */', '/* Custom Styles */' + cssInsert);

// Add audio autoplay and button HTML
const audioHtmlRegex = /<audio id="bg-music" loop>\s*<source src="bg-music\.mp3" type="audio\/mpeg">\s*<\/audio>/;
const newAudioHtml = `
    <!-- Music Button -->
    <button id="music-btn" class="music-btn" onclick="toggleMusic()">
        <svg id="icon-vol-on" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path></svg>
        <svg id="icon-vol-off" style="display: none; opacity: 0.7;" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>
    </button>

    <audio id="bg-music" loop autoplay>
        <source src="bg-music.mp3" type="audio/mpeg">
    </audio>`;
html = html.replace(audioHtmlRegex, newAudioHtml);

// Add toggle logic
const jsInsert = `
        let isMusicPlaying = true;
        
        function toggleMusic() {
            const audio = document.getElementById('bg-music');
            const iconOn = document.getElementById('icon-vol-on');
            const iconOff = document.getElementById('icon-vol-off');
            
            if (isMusicPlaying) {
                audio.pause();
                iconOn.style.display = 'none';
                iconOff.style.display = 'block';
            } else {
                audio.play();
                iconOn.style.display = 'block';
                iconOff.style.display = 'none';
            }
            isMusicPlaying = !isMusicPlaying;
        }`;
html = html.replace('function startApp() {', jsInsert + '\n\n        function startApp() {');

// Make button visible in steps > 0
const stepLogicRegex = /currentStep = step;/;
const stepLogicInsert = `
                const musicBtn = document.getElementById('music-btn');
                if (step > 0) {
                    musicBtn.classList.add('visible');
                }
                currentStep = step;`;
html = html.replace(stepLogicRegex, stepLogicInsert);

fs.writeFileSync('standalone-invite.html', html);
