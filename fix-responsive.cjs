const fs = require('fs');

const userTextP1 = "همکار گرامی، با افتخار از شما دعوت میکنیم تا در ششمین نمایشگاه بینالمللی فارمکس، همراه ما باشید. این رویداد فرصتی است بینظیر برای دیدار تازه، هماندیشی و معرفی جدیدترین دستاوردهای دارویی و صنایع وابسته.";
const userTextP2 = "حضور ارزشمند شما مایه دلگرمی و افتخار مجموعه ما خواهد بود. مشتاقانه منتظر دیدار شما در غرفه تخشا دارو بهان هستیم.";

// 1. React (src/App.tsx)
let app = fs.readFileSync('src/App.tsx', 'utf8');

// The react file has:
// className="bg-white/90 backdrop-blur-xl p-8 rounded-3xl border border-white/50 shadow-2xl text-slate-800 w-full"
// let's replace this with responsive classes
app = app.replace(
  'className="bg-white/90 backdrop-blur-xl p-8 rounded-3xl border border-white/50 shadow-2xl text-slate-800 w-full"',
  'className="bg-white/90 backdrop-blur-xl p-5 sm:p-8 rounded-3xl border border-white/50 shadow-2xl text-slate-800 w-full"'
);

// wait, the react version's step 2 has different content right now. 
// Let's replace the whole step 2 block inner contents.
const step2Regex = /\{step === 2 && \([\s\S]*?className="bg-white\/90 backdrop-blur-xl p-8 rounded-3xl border border-white\/50 shadow-2xl text-slate-800 w-full"[\s\S]*?>([\s\S]*?)<\/motion\.div>/;
const match = app.match(/\{step === 2 && \([\s\S]*?className="bg-white\/90 backdrop-blur-xl p-[\d]+ sm:p-[\d]+ rounded-3xl border border-white\/50 shadow-2xl text-slate-800 w-full"[\s\S]*?>([\s\S]*?)<\/motion\.div>/);

// Instead of regex which might fail, let's just do targeted string replacements.
app = app.replace('p-8 rounded-3xl', 'p-5 sm:p-8 rounded-3xl');

app = app.replace('mb-4 leading-tight', 'mb-2 sm:mb-4 leading-tight');
app = app.replace('mb-8 drop-shadow-2xl', 'mb-4 sm:mb-8 drop-shadow-2xl');
app = app.replace('mb-6 object-contain', 'mb-4 sm:mb-6 object-contain');
app = app.replace('mb-8 font-medium', 'mb-4 sm:mb-8 font-medium');

// React Step 2 has:
// <motion.p ... >با سلام و احترام</motion.p>
// <motion.p ... >با افتخار از شما دعوت می‌کنیم تا با حضور ارزشمند خود در ...</motion.p>
// <motion.p ... >این دیدار، فرصتی است برای گفت‌وگویی تازه...</motion.p>

// Let's rewrite React step 2 completely via regex since it's cleaner.
const reactStep2Start = app.indexOf('{step === 2 && (');
const reactStep3Start = app.indexOf('{step === 3 && (');
if(reactStep2Start !== -1 && reactStep3Start !== -1) {
  const newReactStep2 = `{step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, scale: 0.95, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -50 }}
              transition={{ duration: 0.8, type: "spring", bounce: 0.4 }}
              className="bg-white/90 backdrop-blur-xl p-5 sm:p-8 rounded-3xl border border-white/50 shadow-2xl text-slate-800 w-full relative"
            >
              {/* Floating Logo */}
              <div className="absolute -top-7 sm:-top-10 left-1/2 transform -translate-x-1/2 bg-white p-2.5 sm:p-3 rounded-full shadow-xl">
                <img src="/Logo.webp" alt="Logo" className="w-12 h-12 sm:w-16 sm:h-16 object-contain" />
              </div>
              
              <motion.div 
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                className="text-center mb-3 sm:mb-6 pt-5 sm:pt-6 border-b border-slate-200 pb-2 sm:pb-4"
              >
                <h2 className="text-[20px] sm:text-2xl font-black text-[#1A4B62]">دعوت‌نامه رسمی</h2>
              </motion.div>
              
              <div className="space-y-2 sm:space-y-4">
                <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="text-[14.5px] sm:text-lg leading-[1.6] sm:leading-relaxed font-medium text-justify">
                  ${userTextP1}
                </motion.p>
                <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="text-[14.5px] sm:text-lg leading-[1.6] sm:leading-relaxed font-medium text-justify">
                  ${userTextP2}
                </motion.p>
              </div>

              <motion.div 
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}
                className="text-center pt-3 sm:pt-6 border-t border-slate-200 mt-3 sm:mt-6"
              >
                <p className="font-bold text-[#1A4B62] text-base sm:text-lg">تخشا دارو بهان</p>
                <p className="text-xs sm:text-sm font-semibold text-[#7B9C54] mt-1 sm:mt-2">همراه شما در مسیر سلامت و نوآوری</p>
              </motion.div>
              
              <motion.button
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}
                onClick={() => setStep(3)}
                className="mt-4 sm:mt-8 flex items-center justify-center gap-2 text-white px-6 sm:px-8 py-2.5 sm:py-3 rounded-full font-bold shadow-lg transition-all w-full bg-gradient-to-r from-[#1A4B62] via-[#7B9C54] to-[#256B7D] bg-[length:200%_auto] animate-gradient-btn hover:scale-[1.02] hover:shadow-[0_10px_25px_rgba(26,75,98,0.4)]"
              >
                <span className="text-sm sm:text-base">مکان و زمان برگزاری</span>
                <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              </motion.button>
              
              <motion.button
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1 }}
                onClick={() => setStep(1)}
                className="mt-3 sm:mt-5 text-[13px] sm:text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors flex items-center justify-center gap-1 mx-auto w-full"
              >
                <ChevronRight className="w-4 h-4" />
                بازگشت به صفحه قبل
              </motion.button>
            </motion.div>
          )}
          `;
  
  app = app.slice(0, reactStep2Start) + newReactStep2 + app.slice(reactStep3Start);
}
fs.writeFileSync('src/App.tsx', app);
console.log('React updated');

// 2. HTML (standalone-invite.html)
let html = fs.readFileSync('standalone-invite.html', 'utf8');

const htmlStep2Start = html.indexOf('<div id="step-2" class="step text-slate-800">');
const htmlStep3Start = html.indexOf('<!-- STEP 3 -->');
if (htmlStep2Start !== -1 && htmlStep3Start !== -1) {
  const newHtmlStep2 = `<div id="step-2" class="step text-slate-800">
      <div class="bg-white/95 backdrop-blur-xl p-5 sm:p-8 rounded-3xl border border-white/50 shadow-2xl relative w-full">
        <!-- Floating Logo -->
        <div class="absolute -top-7 sm:-top-10 left-1/2 transform -translate-x-1/2 bg-white p-2.5 sm:p-3 rounded-full shadow-xl">
          <img src="Logo.webp" alt="Logo" class="w-12 h-12 sm:w-16 sm:h-16 object-contain" />
        </div>
        
        <div class="text-center mb-3 sm:mb-6 pt-5 sm:pt-6 border-b border-slate-200 pb-2 sm:pb-4">
          <h2 class="text-[20px] sm:text-2xl font-black text-[#1A4B62]">دعوت‌نامه رسمی</h2>
        </div>
        
        <div class="space-y-2 sm:space-y-4">
          <p class="text-[14.5px] sm:text-lg leading-[1.6] sm:leading-relaxed font-medium text-justify">
            ${userTextP1}
          </p>
          <p class="text-[14.5px] sm:text-lg leading-[1.6] sm:leading-relaxed font-medium text-justify">
            ${userTextP2}
          </p>
        </div>
        
        <div class="text-center pt-3 sm:pt-6 border-t border-slate-200 mt-3 sm:mt-6">
          <p class="font-bold text-[#1A4B62] text-base sm:text-lg">تخشا دارو بهان</p>
          <p class="text-xs sm:text-sm font-semibold text-[#7B9C54] mt-1 sm:mt-2">همراه شما در مسیر سلامت و نوآوری</p>
        </div>
        
        <button onclick="goToStep(3)" class="mt-4 sm:mt-8 flex items-center justify-center gap-2 text-white px-6 sm:px-8 py-2.5 sm:py-3 rounded-full font-bold shadow-lg transition-all w-full btn-gradient">
          <span class="text-sm sm:text-base">مکان و زمان برگزاری</span>
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
        </button>

        <button onclick="goToStep(1)" class="mt-3 sm:mt-5 text-[13px] sm:text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors flex items-center justify-center gap-1 mx-auto w-full">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
          بازگشت به صفحه قبل
        </button>
      </div>
    </div>

    `;
  html = html.slice(0, htmlStep2Start) + newHtmlStep2 + html.slice(htmlStep3Start);
}

// Ensure Step 1 also fits well on small screens
html = html.replace('p-8 rounded-3xl', 'p-6 sm:p-8 rounded-3xl');
html = html.replace('mb-8 drop-shadow-2xl', 'mb-5 sm:mb-8 drop-shadow-2xl');
html = html.replace('mb-4 leading-tight', 'mb-3 sm:mb-4 leading-tight');
html = html.replace('mb-6 object-contain', 'mb-4 sm:mb-6 object-contain');
html = html.replace('mb-8 font-medium', 'mb-5 sm:mb-8 font-medium');
html = html.replace('px-8 py-4', 'px-6 sm:px-8 py-3.5 sm:py-4');

// Ensure Step 3 also fits well
html = html.replace('p-6 rounded-2xl', 'p-4 sm:p-6 rounded-2xl');
html = html.replace('p-5 rounded-2xl', 'p-4 sm:p-5 rounded-2xl');
html = html.replace('mb-4 font-black', 'mb-3 sm:mb-4 font-black');

// Check app.tsx step 3
app = app.replace('p-6 rounded-2xl', 'p-4 sm:p-6 rounded-2xl');
app = app.replace('p-5 rounded-2xl', 'p-4 sm:p-5 rounded-2xl');
app = app.replace('mb-4 font-black', 'mb-3 sm:mb-4 font-black');

fs.writeFileSync('standalone-invite.html', html);
fs.writeFileSync('src/App.tsx', app);
console.log('HTML and React updated');
