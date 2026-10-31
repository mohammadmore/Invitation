const fs = require('fs');

let app = fs.readFileSync('src/App.tsx', 'utf8');

const appStep2Old = /<motion\.button[^>]*onClick=\{\(\) => setStep\(1\)\}[^>]*>[\s\S]*?<\/motion\.button>/;
const appStep2New = `
              <motion.button
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1 }}
                onClick={() => setStep(1)}
                className="mt-5 text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors flex items-center justify-center gap-1 mx-auto"
              >
                <ChevronRight className="w-4 h-4" />
                بازگشت به صفحه قبل
              </motion.button>`;
app = app.replace(appStep2Old, appStep2New.trim());

const appStep3Old = /<button[^>]*onClick=\{\(\) => setStep\(2\)\}[^>]*>[\s\S]*?<\/button>/;
const appStep3New = `
                <button
                  onClick={() => setStep(2)}
                  className="mt-5 text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors flex items-center justify-center gap-1 mx-auto"
                >
                  <ChevronRight className="w-4 h-4" />
                  بازگشت به صفحه قبل
                </button>`;
app = app.replace(appStep3Old, appStep3New.trim());

fs.writeFileSync('src/App.tsx', app);

// --- HTML ---
let html = fs.readFileSync('standalone-invite.html', 'utf8');

const htmlStep2Old = /<button class="btn" onclick="goToStep\(1\)"[^>]*>[\s\S]*?<\/button>/;
const htmlStep2New = `
                <button onclick="goToStep(1)" style="background: transparent; border: none; color: #64748b; font-weight: 600; font-size: 0.85rem; margin-top: 24px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px; width: 100%; font-family: inherit;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                    بازگشت به صفحه قبل
                </button>`;
html = html.replace(htmlStep2Old, htmlStep2New.trim());

const htmlStep3Old = /<button class="btn" onclick="goToStep\(2\)"[^>]*>[\s\S]*?<\/button>/;
const htmlStep3New = `
                <button onclick="goToStep(2)" style="background: transparent; border: none; color: #64748b; font-weight: 600; font-size: 0.85rem; margin-top: 24px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px; width: 100%; font-family: inherit;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                    بازگشت به صفحه قبل
                </button>`;
html = html.replace(htmlStep3Old, htmlStep3New.trim());

fs.writeFileSync('standalone-invite.html', html);
