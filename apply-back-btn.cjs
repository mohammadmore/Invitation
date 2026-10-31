const fs = require('fs');

// --- Backup ---
fs.copyFileSync('src/App.tsx', 'src/App.backup.tsx');
fs.copyFileSync('standalone-invite.html', 'standalone-invite.backup.html');

// --- App.tsx ---
let app = fs.readFileSync('src/App.tsx', 'utf8');
app = app.replace('ChevronLeft, Map', 'ChevronLeft, ChevronRight, Map');

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

app = app.replace(/<\/AnimatePresence>\s*<\/div>\s*<div className="relative z-10 flex-1/, '</AnimatePresence>\n\n' + backBtnCode + '\n      </div>\n\n      <div className="relative z-10 flex-1');

app = app.replace(/<motion\.div\s*key="step3"\s*initial=\{\{\s*opacity:\s*0,\s*scale:\s*0\.95,\s*y:\s*50\s*\}\}\s*animate=\{\{\s*opacity:\s*1,\s*scale:\s*1,\s*y:\s*0\s*\}\}/, `<motion.div
              key="step3"
              initial={{ opacity: 0, scale: 0.95, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 50 }}`);

fs.writeFileSync('src/App.tsx', app);


// --- standalone-invite.html ---
let html = fs.readFileSync('standalone-invite.html', 'utf8');
const backCss = `      /* Back Button */
      .back-btn { position: fixed; top: 20px; right: 20px; z-index: 50; background: rgba(255,255,255,0.2); backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.3); border-radius: 50%; width: 45px; height: 45px; display: flex; align-items: center; justify-content: center; color: #fff; cursor: pointer; transition: all 0.3s; opacity: 0; pointer-events: none; }
      .back-btn.visible { opacity: 1; pointer-events: auto; }
      .back-btn:hover { background: rgba(255,255,255,0.4); transform: scale(1.05); }`;
html = html.replace('/* Background Videos */', backCss + '\n      /* Background Videos */');

const backHtml = `    <!-- Back Button -->
    <button id="back-btn" class="back-btn" onclick="goBack()">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
    </button>`;
html = html.replace('<!-- Splash Screen -->', backHtml + '\n\n    <!-- Splash Screen -->');

const backJs = `        function goBack() {
            if (currentStep > 1) {
                goToStep(currentStep - 1);
            }
        }`;
html = html.replace('function goToStep(step) {', backJs + '\n\n        function goToStep(step) {');

const backLogic = `                const backBtn = document.getElementById('back-btn');
                if (step > 1) {
                    backBtn.classList.add('visible');
                } else {
                    backBtn.classList.remove('visible');
                }
                currentStep = step;`;
html = html.replace('currentStep = step;', backLogic);

fs.writeFileSync('standalone-invite.html', html);
