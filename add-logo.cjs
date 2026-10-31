const fs = require('fs');

let app = fs.readFileSync('src/App.tsx', 'utf8');

const oldStep1 = `<p className="text-xl mb-6 text-slate-200">
          به دعوت‌نامه اختصاصی نمایشگاه <span className="font-bold text-white">فارمکس</span> خوش آمدید.
        </p>`;

const newStep1 = `<img src="/pharmex.webp" alt="Pharmex" className="h-16 w-auto mx-auto mb-6 object-contain drop-shadow-lg" />
        <p className="text-xl mb-6 text-slate-200">
          به دعوت‌نامه اختصاصی نمایشگاه <span className="font-bold text-white">فارمکس</span> خوش آمدید.
        </p>`;

if(app.includes(oldStep1)) {
    app = app.replace(oldStep1, newStep1);
    fs.writeFileSync('src/App.tsx', app);
    console.log("Updated App.tsx");
} else {
    console.log("Could not find text in App.tsx");
}

let html = fs.readFileSync('standalone-invite.html', 'utf8');

const oldHtmlStep1 = `<p class="text-xl mb-6 text-slate-200">
          به دعوت‌نامه اختصاصی نمایشگاه <span class="font-bold text-white">فارمکس</span> خوش آمدید.
        </p>`;

const newHtmlStep1 = `<img src="pharmex.webp" alt="Pharmex" class="h-16 w-auto mx-auto mb-6 object-contain drop-shadow-lg" />
        <p class="text-xl mb-6 text-slate-200">
          به دعوت‌نامه اختصاصی نمایشگاه <span class="font-bold text-white">فارمکس</span> خوش آمدید.
        </p>`;

if(html.includes(oldHtmlStep1)) {
    html = html.replace(oldHtmlStep1, newHtmlStep1);
    fs.writeFileSync('standalone-invite.html', html);
    console.log("Updated standalone-invite.html");
} else {
    console.log("Could not find text in standalone-invite.html");
}
