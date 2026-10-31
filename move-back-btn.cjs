const fs = require('fs');

// --- 1. App.tsx ---
let app = fs.readFileSync('src/App.tsx', 'utf8');

// Remove floating button
const floatingBtnRegex = /\{\/\* Floating Back Button \*\/\}[\s\S]*?<\/AnimatePresence>\s*/;
app = app.replace(floatingBtnRegex, '');

// Add to Step 2
const step2NextBtnRegex = /(<motion\.button[^>]*onClick=\{\(\) => setStep\(3\)\}[^>]*>[\s\S]*?<\/motion\.button>)/;
const step2BackBtn = `
              <motion.button
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1 }}
                onClick={() => setStep(1)}
                className="mt-3 flex items-center justify-center gap-2 bg-white/90 text-[#1A4B62] px-8 py-3 rounded-full font-bold shadow-md hover:bg-white transition-all w-full"
              >
                <ChevronRight className="w-5 h-5" />
                بازگشت
              </motion.button>`;
app = app.replace(step2NextBtnRegex, `$1${step2BackBtn}`);

// Add to Step 3
const step3ShareBtnRegex = /(<button[^>]*onClick=\{handleShare\}[^>]*>[\s\S]*?<\/button>)/;
const step3BackBtn = `
                <button
                  onClick={() => setStep(2)}
                  className="flex items-center justify-center gap-3 w-full bg-white/80 backdrop-blur-sm text-[#256B7D] py-4 px-6 rounded-2xl font-bold transition-all shadow-md hover:bg-white transform hover:-translate-y-1 mt-3"
                >
                  <ChevronRight className="w-6 h-6" />
                  <span className="text-lg">بازگشت</span>
                </button>`;
app = app.replace(step3ShareBtnRegex, `$1${step3BackBtn}`);

fs.writeFileSync('src/App.tsx', app);


// --- 2. standalone-invite.html ---
let html = fs.readFileSync('standalone-invite.html', 'utf8');

// Remove floating button CSS, HTML, JS
const backBtnCSSRegex = /\s*\/\* Back Button \*\/[\s\S]*?\.back-btn:hover \{.*?\}\s*/;
html = html.replace(backBtnCSSRegex, '\n      ');

const backBtnHTMLRegex = /\s*<!-- Back Button -->[\s\S]*?<\/button>\s*/;
html = html.replace(backBtnHTMLRegex, '\n    ');

const backBtnJSRegex = /\s*const backBtn = document\.getElementById\('back-btn'\);[\s\S]*?backBtn\.classList\.remove\('visible'\);\s*\}/;
html = html.replace(backBtnJSRegex, '');

// Step 2 Next Button
const htmlStep2NextBtnRegex = /(<button class="btn btn-primary" onclick="goToStep\(3\)" style="margin-top: 2rem;">[\s\S]*?<\/button>)/;
const htmlStep2BackBtn = `
                <button class="btn" onclick="goToStep(1)" style="margin-top: 12px; background: rgba(255,255,255,0.9); color: #1A4B62; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                    بازگشت
                </button>`;
html = html.replace(htmlStep2NextBtnRegex, `$1${htmlStep2BackBtn}`);

// Step 3 Share Button
const htmlStep3ShareBtnRegex = /(<button class="btn" onclick="shareInvite\(\)"[^>]*>[\s\S]*?<\/button>)/;
const htmlStep3BackBtn = `
                <button class="btn" onclick="goToStep(2)" style="background: rgba(255,255,255,0.8); color: #256B7D; padding: 16px; border-radius: 16px; margin-top: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                    <span style="font-size: 1.1rem;">بازگشت</span>
                </button>`;
html = html.replace(htmlStep3ShareBtnRegex, `$1${htmlStep3BackBtn}`);

fs.writeFileSync('standalone-invite.html', html);
console.log('Update complete!');
