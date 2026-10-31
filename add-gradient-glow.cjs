const fs = require('fs');

// --- 1. index.css ---
let css = fs.readFileSync('src/index.css', 'utf8');
if (!css.includes('animate-float-gradient')) {
    css += `\n
@keyframes float-gradient {
  0% { transform: translate(0, 0) rotate(0deg) scale(1); filter: hue-rotate(0deg); }
  50% { transform: translate(0, -4px) rotate(1deg) scale(1.03); filter: hue-rotate(10deg); }
  100% { transform: translate(0, 0) rotate(0deg) scale(1); filter: hue-rotate(0deg); }
}
.animate-float-gradient {
  animation: float-gradient 4s ease-in-out infinite;
  background-size: 200% 200%;
}
`;
    fs.writeFileSync('src/index.css', css);
}

// --- 2. App.tsx ---
let app = fs.readFileSync('src/App.tsx', 'utf8');

// Step 1 Button
const step1BtnRegex = /<button[\s\S]*?onClick=\{\(\) => setStep\(2\)\}[\s\S]*?تایید و ورود[\s\S]*?<\/button>/;
const step1BtnMatch = app.match(step1BtnRegex);
if (step1BtnMatch) {
    const newStep1Btn = `
              <div className="relative w-full group">
                <div className="absolute -inset-1 bg-gradient-to-r from-[#1A4B62] via-[#7B9C54] to-[#256B7D] rounded-full blur-md opacity-60 group-hover:opacity-100 transition duration-1000 animate-float-gradient"></div>
                <button
                  onClick={() => setStep(2)}
                  className="relative flex items-center justify-center gap-2 bg-[#1A4B62] text-white px-8 py-4 rounded-full font-bold shadow-lg hover:bg-[#12384a] transition-all w-full"
                >
                  <span className="text-lg">تایید و ورود</span>
                  <ChevronLeft className="w-5 h-5" />
                </button>
              </div>`;
    app = app.replace(step1BtnRegex, newStep1Btn.trim());
}

// Step 2 Button
const step2BtnRegex = /<motion\.button[\s\S]*?onClick=\{\(\) => setStep\(3\)\}[\s\S]*?مکان و زمان برگزاری[\s\S]*?<\/motion\.button>/;
const step2BtnMatch = app.match(step2BtnRegex);
if (step2BtnMatch) {
    const newStep2Btn = `
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} className="relative w-full group mt-8">
                <div className="absolute -inset-1 bg-gradient-to-r from-[#1A4B62] via-[#7B9C54] to-[#256B7D] rounded-full blur-md opacity-60 group-hover:opacity-100 transition duration-1000 animate-float-gradient"></div>
                <button
                  onClick={() => setStep(3)}
                  className="relative flex items-center justify-center gap-2 bg-[#1A4B62] text-white px-8 py-3 rounded-full font-bold shadow-lg hover:bg-[#12384a] transition-all w-full"
                >
                  مکان و زمان برگزاری
                  <ChevronLeft className="w-5 h-5" />
                </button>
              </motion.div>`;
    app = app.replace(step2BtnRegex, newStep2Btn.trim());
}

// Step 3 Share Button
const step3ShareBtnRegex = /<button[\s\S]*?onClick=\{handleShare\}[\s\S]*?اشتراک‌گذاری[\s\S]*?<\/button>/;
const step3ShareBtnMatch = app.match(step3ShareBtnRegex);
if (step3ShareBtnMatch) {
    const newStep3Btn = `
                <div className="relative w-full group mt-2">
                  <div className="absolute -inset-1 bg-gradient-to-r from-[#256B7D] via-[#7B9C54] to-[#1A4B62] rounded-2xl blur-md opacity-40 group-hover:opacity-80 transition duration-1000 animate-float-gradient"></div>
                  <button
                    onClick={handleShare}
                    className="relative flex items-center justify-center gap-3 w-full bg-white text-[#256B7D] py-4 px-6 rounded-2xl font-bold transition-all shadow-lg hover:bg-gray-50"
                  >
                    <Share2 className="w-6 h-6" />
                    <span className="text-lg">اشتراک‌گذاری</span>
                  </button>
                </div>`;
    app = app.replace(step3ShareBtnRegex, newStep3Btn.trim());
}

fs.writeFileSync('src/App.tsx', app);


// --- 3. standalone-invite.html ---
let html = fs.readFileSync('standalone-invite.html', 'utf8');

const glowCSS = `
      /* Glow Animation */
      @keyframes float-gradient {
        0% { transform: translate(0, 0) rotate(0deg) scale(1); filter: hue-rotate(0deg); }
        50% { transform: translate(0, -4px) rotate(1deg) scale(1.03); filter: hue-rotate(10deg); }
        100% { transform: translate(0, 0) rotate(0deg) scale(1); filter: hue-rotate(0deg); }
      }
      .btn-wrapper { position: relative; width: 100%; margin-top: 2rem; }
      .btn-wrapper.mt-0 { margin-top: 0; }
      .btn-wrapper.mt-sm { margin-top: 15px; }
      .btn-glow {
        position: absolute; top: -4px; left: -4px; right: -4px; bottom: -4px;
        background: linear-gradient(90deg, #1A4B62, #7B9C54, #256B7D);
        border-radius: 9999px; filter: blur(10px); opacity: 0.6;
        animation: float-gradient 4s ease-in-out infinite; z-index: 0; transition: opacity 0.5s;
      }
      .btn-wrapper:hover .btn-glow { opacity: 1; }
      .btn-wrapper .btn { position: relative; z-index: 1; margin-top: 0 !important; width: 100%; }
      .btn-glow-rect { border-radius: 16px; background: linear-gradient(90deg, #256B7D, #7B9C54, #1A4B62); opacity: 0.4; filter: blur(12px); }
`;
if (!html.includes('float-gradient')) {
    html = html.replace('/* Custom Styles */', '/* Custom Styles */\n' + glowCSS);
}

// Step 1 HTML
const htmlStep1Regex = /<button class="btn btn-primary" onclick="goToStep\(2\)">[\s\S]*?<\/button>/;
const htmlStep1Match = html.match(htmlStep1Regex);
if (htmlStep1Match && !htmlStep1Match[0].includes('btn-wrapper')) {
    const newHtmlStep1 = `
            <div class="btn-wrapper">
                <div class="btn-glow"></div>
                <button class="btn btn-primary" onclick="goToStep(2)">
                    تایید و ورود
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;"><polyline points="15 18 9 12 15 6"/></svg>
                </button>
            </div>`;
    html = html.replace(htmlStep1Regex, newHtmlStep1.trim());
}

// Step 2 HTML
const htmlStep2Regex = /<button class="btn btn-primary" onclick="goToStep\(3\)" style="margin-top: 2rem;">[\s\S]*?<\/button>/;
const htmlStep2Match = html.match(htmlStep2Regex);
if (htmlStep2Match && !htmlStep2Match[0].includes('btn-wrapper')) {
    const newHtmlStep2 = `
                <div class="btn-wrapper">
                    <div class="btn-glow"></div>
                    <button class="btn btn-primary" onclick="goToStep(3)">
                        مکان و زمان برگزاری
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;"><polyline points="15 18 9 12 15 6"/></svg>
                    </button>
                </div>`;
    html = html.replace(htmlStep2Regex, newHtmlStep2.trim());
}

// Step 3 HTML
const htmlStep3Regex = /<button class="btn" onclick="shareInvite\(\)"[^>]*>[\s\S]*?<\/button>/;
const htmlStep3Match = html.match(htmlStep3Regex);
if (htmlStep3Match && !htmlStep3Match[0].includes('btn-wrapper')) {
    const newHtmlStep3 = `
                <div class="btn-wrapper mt-sm">
                    <div class="btn-glow btn-glow-rect"></div>
                    <button class="btn" onclick="shareInvite()" style="background: #fff; color: #256B7D; padding: 16px; border-radius: 16px; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                        <span style="font-size: 1.1rem; margin-right: 8px;">اشتراک‌گذاری</span>
                    </button>
                </div>`;
    html = html.replace(htmlStep3Regex, newHtmlStep3.trim());
}

fs.writeFileSync('standalone-invite.html', html);
