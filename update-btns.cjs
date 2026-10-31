const fs = require('fs');

// --- 1. App.tsx ---
let app = fs.readFileSync('src/App.tsx', 'utf8');

const step1Old = `<div className="relative w-full group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-[#1A4B62] via-[#7B9C54] to-[#256B7D] rounded-full blur-md opacity-60 group-hover:opacity-100 transition duration-1000 animate-float-gradient"></div>
                  <button
                    onClick={() => setStep(2)}
                    className="relative flex items-center justify-center gap-2 bg-[#1A4B62] text-white px-8 py-4 rounded-full font-bold shadow-lg hover:bg-[#12384a] transition-all w-full"
                  >
                    <span className="text-lg">تایید و ورود</span>
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                </div>`;
const step1New = `<button
                    onClick={() => setStep(2)}
                    className="flex items-center justify-center gap-2 text-white px-8 py-4 rounded-full font-bold shadow-lg transition-all w-full bg-gradient-to-r from-[#1A4B62] via-[#7B9C54] to-[#256B7D] bg-[length:200%_auto] animate-gradient-btn hover:scale-[1.02] hover:shadow-[0_10px_25px_rgba(26,75,98,0.4)]"
                  >
                    <span className="text-lg">تایید و ورود</span>
                    <ChevronLeft className="w-5 h-5" />
                  </button>`;
app = app.replace(step1Old, step1New);

const step2Old = `<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} className="relative w-full group mt-8">
                <div className="absolute -inset-1 bg-gradient-to-r from-[#1A4B62] via-[#7B9C54] to-[#256B7D] rounded-full blur-md opacity-60 group-hover:opacity-100 transition duration-1000 animate-float-gradient"></div>
                <button
                  onClick={() => setStep(3)}
                  className="relative flex items-center justify-center gap-2 bg-[#1A4B62] text-white px-8 py-3 rounded-full font-bold shadow-lg hover:bg-[#12384a] transition-all w-full"
                >
                  مکان و زمان برگزاری
                  <ChevronLeft className="w-5 h-5" />
                </button>
              </motion.div>`;
const step2New = `<motion.button
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}
                onClick={() => setStep(3)}
                className="mt-8 flex items-center justify-center gap-2 text-white px-8 py-3 rounded-full font-bold shadow-lg transition-all w-full bg-gradient-to-r from-[#1A4B62] via-[#7B9C54] to-[#256B7D] bg-[length:200%_auto] animate-gradient-btn hover:scale-[1.02] hover:shadow-[0_10px_25px_rgba(26,75,98,0.4)]"
              >
                مکان و زمان برگزاری
                <ChevronLeft className="w-5 h-5" />
              </motion.button>`;
app = app.replace(step2Old, step2New);

const step3Old = `<div className="relative w-full group mt-2">
                  <div className="absolute -inset-1 bg-gradient-to-r from-[#256B7D] via-[#7B9C54] to-[#1A4B62] rounded-2xl blur-md opacity-40 group-hover:opacity-80 transition duration-1000 animate-float-gradient"></div>
                  <button
                    onClick={handleShare}
                    className="relative flex items-center justify-center gap-3 w-full bg-white text-[#256B7D] py-4 px-6 rounded-2xl font-bold transition-all shadow-lg hover:bg-gray-50"
                  >
                    <Share2 className="w-6 h-6" />
                    <span className="text-lg">اشتراک‌گذاری</span>
                  </button>
                </div>`;
const step3New = `<button
                  onClick={handleShare}
                  className="mt-2 flex items-center justify-center gap-3 w-full text-white py-4 px-6 rounded-2xl font-bold transition-all shadow-lg bg-gradient-to-r from-[#256B7D] via-[#7B9C54] to-[#1A4B62] bg-[length:200%_auto] animate-gradient-btn hover:scale-[1.02] hover:shadow-[0_10px_25px_rgba(26,75,98,0.4)]"
                >
                  <Share2 className="w-6 h-6" />
                  <span className="text-lg">اشتراک‌گذاری</span>
                </button>`;
app = app.replace(step3Old, step3New);

fs.writeFileSync('src/App.tsx', app);

// --- 2. index.css ---
let css = fs.readFileSync('src/index.css', 'utf8');
if (!css.includes('animate-gradient-btn')) {
  css += `\n
@keyframes gradient-btn {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
.animate-gradient-btn {
  animation: gradient-btn 4s linear infinite;
}
`;
  fs.writeFileSync('src/index.css', css);
}

// --- 3. standalone-invite.html ---
let html = fs.readFileSync('standalone-invite.html', 'utf8');

const htmlStep1Old = `<div class="btn-wrapper">
                <div class="btn-glow"></div>
                <button class="btn btn-primary" onclick="goToStep(2)">
                    تایید و ورود
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;"><polyline points="15 18 9 12 15 6"/></svg>
                </button>
            </div>`;
const htmlStep1New = `<button class="btn btn-primary btn-gradient" onclick="goToStep(2)" style="margin-top: 2rem;">
                    تایید و ورود
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;"><polyline points="15 18 9 12 15 6"/></svg>
                </button>`;
html = html.replace(htmlStep1Old, htmlStep1New);

const htmlStep2Old = `<div class="btn-wrapper">
                    <div class="btn-glow"></div>
                    <button class="btn btn-primary" onclick="goToStep(3)">
                        مکان و زمان برگزاری
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;"><polyline points="15 18 9 12 15 6"/></svg>
                    </button>
                </div>`;
const htmlStep2New = `<button class="btn btn-primary btn-gradient" onclick="goToStep(3)" style="margin-top: 2rem;">
                        مکان و زمان برگزاری
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;"><polyline points="15 18 9 12 15 6"/></svg>
                    </button>`;
html = html.replace(htmlStep2Old, htmlStep2New);

const htmlStep3Old = `<div class="btn-wrapper mt-sm">
                    <div class="btn-glow btn-glow-rect"></div>
                    <button class="btn" onclick="shareInvite()" style="background: #fff; color: #256B7D; padding: 16px; border-radius: 16px; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                        <span style="font-size: 1.1rem; margin-right: 8px;">اشتراک‌گذاری</span>
                    </button>
                </div>`;
const htmlStep3New = `<button class="btn btn-gradient" onclick="shareInvite()" style="padding: 16px; border-radius: 16px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); margin-top: 15px;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                        <span style="font-size: 1.1rem; margin-right: 8px;">اشتراک‌گذاری</span>
                    </button>`;
html = html.replace(htmlStep3Old, htmlStep3New);

const btnCSS = `
      .btn-gradient {
        background: linear-gradient(90deg, #1A4B62, #7B9C54, #256B7D, #1A4B62);
        background-size: 300% 100%;
        animation: gradient-btn 4s linear infinite;
        color: white !important;
        border: none !important;
        transition: transform 0.2s, box-shadow 0.2s;
      }
      .btn-gradient:hover {
        transform: scale(1.02);
        box-shadow: 0 10px 25px rgba(26, 75, 98, 0.4);
      }
      @keyframes gradient-btn {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
      }
`;
if (!html.includes('.btn-gradient')) {
  html = html.replace('/* Custom Styles */', '/* Custom Styles */\n' + btnCSS);
}

fs.writeFileSync('standalone-invite.html', html);
