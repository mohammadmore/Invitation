const fs = require('fs');

// --- App.tsx ---
let app = fs.readFileSync('src/App.tsx', 'utf8');

const appleIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 20.592c-1.344 0-2.688-.768-4.032-1.92-1.344-1.152-2.304-2.88-2.688-4.8-.384-1.92-.192-3.84.576-5.76.768-1.92 2.112-3.456 4.032-4.032 1.92-.576 3.648-.384 4.8.576.96.768 1.92 1.92 2.112 3.456.192 1.536-.192 2.88-.96 4.032-.768 1.152-1.728 2.112-2.88 2.688a5.57 5.57 0 0 1-4.032-1.152c-1.344-1.152-2.112-2.688-2.304-4.416.96.576 2.112.768 3.264.384 1.152-.384 2.112-1.152 2.688-2.304.576-1.152.768-2.304.192-3.456-.576-1.152-1.536-1.92-2.88-2.304a5.053 5.053 0 0 0-4.032 1.152c-.96.96-1.536 2.112-1.536 3.456 0 1.344.384 2.688 1.152 3.648.768.96 1.728 1.536 2.88 1.728 1.152.192 2.304-.192 3.072-.96.768-.768 1.152-1.728.96-3.072m1.92-11.712c0-1.152.384-2.112 1.152-2.88.768-.768 1.728-1.152 2.88-1.152-.192 1.152-.768 2.112-1.536 2.88-.768.768-1.728 1.152-2.496 1.152z"/></svg>`;
const googleIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>`;

const calendarButtonsRegex = /<div className="flex gap-3 w-full">[\s\S]*?<\/div>\s*<button/;

const updatedCalendarButtons = `<div className="flex gap-3 w-full">
                  <a
                    href={generateCalendarLink()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-1 flex-col items-center justify-center gap-2 bg-white text-slate-800 py-3 px-2 rounded-2xl font-bold transition-all shadow-lg border border-slate-100 hover:bg-slate-50 transform hover:-translate-y-1"
                  >
                    ${googleIcon}
                    <span className="text-sm text-center">ثبت در <br/>گوگل کلندر</span>
                  </a>
                  
                  <a
                    href={generateIcsLink()}
                    download="invite.ics"
                    className="flex flex-1 flex-col items-center justify-center gap-2 bg-slate-800 text-white py-3 px-2 rounded-2xl font-bold transition-all shadow-lg hover:bg-slate-700 transform hover:-translate-y-1"
                  >
                    ${appleIcon}
                    <span className="text-sm text-center">ثبت در <br/>اپل / اوت‌لوک</span>
                  </a>
                </div>
                
                <button`;

app = app.replace(calendarButtonsRegex, updatedCalendarButtons);
fs.writeFileSync('src/App.tsx', app);


// --- standalone-invite.html ---
let html = fs.readFileSync('standalone-invite.html', 'utf8');

const htmlCalendarButtonsRegex = /<div style="display: flex; gap: 12px; margin-top: 15px; width: 100%;">[\s\S]*?<\/div>/;

const updatedHtmlCalendarButtons = `<div style="display: flex; gap: 12px; margin-top: 15px; width: 100%;">
            <a href="#" id="cal-link" target="_blank" class="btn" style="flex: 1; flex-direction: column; background: #fff; color: #1e293b; border-radius: 16px; padding: 12px; gap: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border: 1px solid rgba(0,0,0,0.05);">
                ${googleIcon}
                <span style="font-size: 0.9rem;">گوگل کلندر</span>
            </a>
            <a href="#" id="ics-link" download="invite.ics" class="btn" style="flex: 1; flex-direction: column; background: #1e293b; color: #fff; border-radius: 16px; padding: 12px; gap: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.2);">
                ${appleIcon}
                <span style="font-size: 0.9rem;">اپل / اوت‌لوک</span>
            </a>
        </div>`;

html = html.replace(htmlCalendarButtonsRegex, updatedHtmlCalendarButtons);
fs.writeFileSync('standalone-invite.html', html);
