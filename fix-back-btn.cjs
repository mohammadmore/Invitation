const fs = require('fs');

// --- App.tsx ---
let app = fs.readFileSync('src/App.tsx', 'utf8');

// The back button was added *outside* the relative container and the AnimatePresence that wraps step 0..3
// Wait, looking at the code, it is currently:
// </AnimatePresence>
// 
//       {/* Floating Back Button */}
//       <AnimatePresence>
//         {step > 1 && ( ...
//       </div>
// 
//       <div className="relative z-10 flex-1 flex flex-col items-center justify-center max-w-lg mx-auto w-full">

// The first div is `<div className="absolute inset-0 z-0">` which contains the background videos.
// We put the back button inside the background video container! 
// This means it has z-index 0 and gets covered by the z-10 container.

// Let's remove it from there.
const backBtnCode = `      {/* Floating Back Button */}
      <AnimatePresence>
        {step > 1 && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => setStep(step - 1)}
            className="absolute top-6 right-6 z-50 bg-white/20 hover:bg-white/40 backdrop-blur-xl p-3 rounded-full text-white transition-all shadow-lg border border-white/30"
          >
            <ChevronRight className="w-6 h-6" />
          </motion.button>
        )}
      </AnimatePresence>`;

// Remove the old one
app = app.replace(backBtnCode, '');
// It also has an extra closing div that got messed up?
// The original had:
//         </AnimatePresence>
//       </div>
//       <div className="relative z-10 flex-1
app = app.replace(/<\/AnimatePresence>\s*<\/div>\s*<div className="relative z-10 flex-1/, '</AnimatePresence>\n      </div>\n      <div className="relative z-10 flex-1');

// Now add it properly INSIDE the `min-h-screen` container, right before the background video container, with a high z-index.
// Actually, putting it right after `<audio ...>`
const correctPlacement = `      <audio id="bg-music" loop>
        <source src="/bg-music.mp3" type="audio/mpeg" />
      </audio>

${backBtnCode}
`;
app = app.replace(/<audio id="bg-music" loop>[\s\S]*?<\/audio>/, correctPlacement);

fs.writeFileSync('src/App.tsx', app);
