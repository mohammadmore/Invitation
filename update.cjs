const fs = require('fs');

let app = fs.readFileSync('src/App.tsx', 'utf8');

const oldAppStr = `<h1 className="text-3xl font-black text-[#1A4B62] mb-6 leading-tight">
                  <img src="/pharmex.webp" alt="Pharmex" className="h-16 w-auto mx-auto mb-4 object-contain drop-shadow-md" />
                  <span className="block text-[#7B9C54] text-xl mb-2 font-bold">دعوتنامه رسمی</span>
                  {eventDetails.title}
                </h1>`;

const newAppStr = `<h1 className="text-3xl font-black text-[#1A4B62] mb-4 leading-tight">
                  <span className="block text-[#7B9C54] text-xl mb-2 font-bold">دعوتنامه رسمی</span>
                  {eventDetails.title}
                </h1>
                <img src="/pharmex.webp" alt="Pharmex" className="h-16 w-auto mx-auto mb-6 object-contain drop-shadow-md" />`;

if (app.includes(oldAppStr)) {
    app = app.replace(oldAppStr, newAppStr);
    fs.writeFileSync('src/App.tsx', app);
    console.log('App.tsx updated');
} else {
    console.log('Could not find text in App.tsx');
}

let html = fs.readFileSync('standalone-invite.html', 'utf8');

const oldHtmlStep1 = `<div class="bg-white/10 backdrop-blur-xl border border-white/20 p-8 rounded-3xl shadow-2xl w-full text-center">
        <img src="pharmex.webp" alt="Pharmex" class="h-16 w-auto mx-auto mb-4 object-contain drop-shadow-md" />
        <h1 class="text-3xl font-black mb-4 bg-gradient-to-r from-blue-100 to-teal-100 bg-clip-text text-transparent">سلام!</h1>
        <img src="pharmex.webp" alt="Pharmex" class="h-16 w-auto mx-auto mb-6 object-contain drop-shadow-lg" />
        <p class="text-xl mb-6 text-slate-200">
          به دعوت‌نامه اختصاصی نمایشگاه <span class="font-bold text-white">فارمکس</span> خوش آمدید.
        </p>
        <button onclick="goToStep(2)" class="flex items-center justify-center gap-2 text-white px-8 py-4 rounded-full font-bold shadow-lg transition-all w-full btn-gradient">
          <span class="text-lg">تایید و ورود</span>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
        </button>
      </div>`;

const newHtmlStep1 = `<div class="bg-white/90 backdrop-blur-xl border border-white/50 p-8 rounded-3xl shadow-2xl w-full text-center">
        <h1 class="text-3xl font-black text-[#1A4B62] mb-4 leading-tight">
          <span class="block text-[#7B9C54] text-xl mb-2 font-bold">دعوتنامه رسمی</span>
          نمایشگاه فارمکس
        </h1>
        <img src="pharmex.webp" alt="Pharmex" class="h-16 w-auto mx-auto mb-6 object-contain drop-shadow-md" />
        <p class="text-slate-600 mb-8 font-medium text-lg">
          مفتخریم میزبان شما در این رویداد بزرگ باشیم
        </p>
        <button onclick="goToStep(2)" class="flex items-center justify-center gap-2 text-white px-8 py-4 rounded-full font-bold shadow-lg transition-all w-full btn-gradient">
          <span class="text-lg">تایید و ورود</span>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
        </button>
      </div>`;

if (html.includes(oldHtmlStep1)) {
    html = html.replace(oldHtmlStep1, newHtmlStep1);
    fs.writeFileSync('standalone-invite.html', html);
    console.log('standalone-invite.html updated');
} else {
    console.log('Could not find text in standalone-invite.html');
}
