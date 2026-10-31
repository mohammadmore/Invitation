const fs = require('fs');

const html = `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>دعوتنامه اختصاصی نمایشگاه فارمکس</title>
  
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;700;900&display=swap" rel="stylesheet">
  
  <script src="https://cdn.tailwindcss.com"></script>
  
  <style>
    * {
      font-family: 'Vazirmatn', Tahoma, sans-serif !important;
    }
    
    body {
      margin: 0;
      background-color: #0f172a;
      overflow: hidden;
      color: white;
    }

    /* Video Backgrounds */
    .bg-video {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      opacity: 0;
      transition: opacity 1.5s ease-in-out;
      pointer-events: none;
      z-index: 0;
    }
    .bg-video.active {
      opacity: 0.75;
    }

    /* Overlay Gradient */
    .overlay-gradient {
      position: absolute;
      inset: 0;
      z-index: 10;
      background: linear-gradient(to bottom, rgba(15,23,42,0.4), rgba(15,23,42,0.7), rgba(15,23,42,0.95));
      pointer-events: none;
    }

    /* Content Area */
    .content-area {
      position: relative;
      z-index: 20;
      width: 100%;
      max-width: 480px;
      margin: 0 auto;
      padding: 1.5rem;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }

    /* Step Transitions */
    .step {
      display: none; /* JS will change this to flex when active */
      width: 100%;
      flex-direction: column;
      align-items: center;
    }
    
    .step.active {
      display: flex;
      animation: springIn 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
    }

    .step.fade-out {
      display: flex;
      animation: fadeOut 0.4s ease forwards;
    }

    @keyframes springIn {
      0% { opacity: 0; transform: translateY(40px) scale(0.95); }
      100% { opacity: 1; transform: translateY(0) scale(1); }
    }

    @keyframes fadeOut {
      0% { opacity: 1; transform: scale(1); }
      100% { opacity: 0; transform: scale(0.95); }
    }

    /* Gradient Button */
    .btn-gradient {
      background: linear-gradient(90deg, #1A4B62, #7B9C54, #256B7D, #1A4B62);
      background-size: 200% auto;
      animation: gradient-btn 4s linear infinite;
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

    /* Justify text */
    .text-justify {
      text-align: justify;
      text-justify: inter-word;
    }
  </style>
</head>
<body>

  <!-- Audio -->
  <audio id="bg-music" src="bg-music.mp3" loop></audio>

  <!-- Video Backgrounds -->
  <video id="video-step1" src="step1-bg.webm" class="bg-video active" autoplay loop muted playsinline></video>
  <video id="video-step2" src="step2-bg.webm" class="bg-video" autoplay loop muted playsinline></video>
  <video id="video-step3" src="step3-bg.webm" class="bg-video" autoplay loop muted playsinline></video>

  <!-- Overlay -->
  <div class="overlay-gradient"></div>

  <!-- Main Content -->
  <main class="content-area">
    
    <!-- Audio Control -->
    <button id="audio-toggle" class="absolute top-6 left-6 z-50 bg-white/10 backdrop-blur-md p-3 rounded-full hover:bg-white/20 transition border border-white/20 shadow-lg text-white" onclick="toggleAudio()">
      <!-- Muted Icon by default -->
      <svg id="icon-muted" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="11" y1="5" x2="11" y2="19"></line><line x1="15" y1="9" x2="15" y2="15"></line><line x1="19" y1="12" x2="19" y2="12"></line><line x1="7" y1="12" x2="7" y2="12"></line></svg>
      <!-- Playing Icon (hidden) -->
      <svg id="icon-playing" style="display: none;" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"></path><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"></path></svg>
    </button>

    <!-- STEP 0 -->
    <div id="step-0" class="step" style="display: flex;">
      <img src="Logo.webp" alt="Logo" class="w-48 mx-auto mb-10 drop-shadow-2xl" />
      <button onclick="startApp()" class="flex items-center justify-center gap-3 bg-white/10 backdrop-blur-md text-white px-8 py-4 rounded-full font-bold shadow-2xl hover:bg-white/20 border border-white/30 transition-all w-full group">
        <div class="bg-white text-slate-900 rounded-full p-2 group-hover:scale-110 transition-transform">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
        </div>
        <span class="text-xl">ورود به دعوت‌نامه</span>
      </button>
    </div>

    <!-- STEP 1 -->
    <div id="step-1" class="step">
      <img src="Logo.webp" alt="Logo" class="w-32 mx-auto mb-8 drop-shadow-2xl" />
      <div class="bg-white/10 backdrop-blur-xl border border-white/20 p-8 rounded-3xl shadow-2xl w-full text-center">
        <h1 class="text-3xl font-black mb-4 bg-gradient-to-r from-blue-100 to-teal-100 bg-clip-text text-transparent">سلام!</h1>
        <p class="text-xl mb-6 text-slate-200">
          به دعوت‌نامه اختصاصی نمایشگاه <span class="font-bold text-white">فارمکس</span> خوش آمدید.
        </p>
        <button onclick="goToStep(2)" class="flex items-center justify-center gap-2 text-white px-8 py-4 rounded-full font-bold shadow-lg transition-all w-full btn-gradient">
          <span class="text-lg">تایید و ورود</span>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
        </button>
      </div>
    </div>

    <!-- STEP 2 -->
    <div id="step-2" class="step text-slate-800">
      <div class="bg-white/95 backdrop-blur-xl p-8 rounded-3xl border border-white/50 shadow-2xl relative w-full">
        <!-- Floating Logo -->
        <div class="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-white p-3 rounded-full shadow-xl">
          <img src="Logo.webp" alt="Logo" class="w-16 h-16 object-contain" />
        </div>
        
        <div class="text-center mb-6 pt-6 border-b border-slate-200 pb-4">
          <h2 class="text-2xl font-black text-[#1A4B62]">دعوت‌نامه رسمی</h2>
        </div>
        
        <div class="space-y-4">
          <p class="text-lg leading-relaxed font-medium text-justify">
            همکار گرامی، با افتخار از شما دعوت می‌کنیم تا در ششمین نمایشگاه بین‌المللی فارمکس، همراه ما باشید. این رویداد فرصتی است بی‌نظیر برای دیدار تازه، هم‌اندیشی و معرفی جدیدترین دستاوردهای دارویی و صنایع وابسته.
          </p>
          <p class="text-lg leading-relaxed font-medium text-justify">
            حضور ارزشمند شما مایه دلگرمی و افتخار مجموعه ما خواهد بود. مشتاقانه منتظر دیدار شما در غرفه تخشا دارو بهان هستیم.
          </p>
        </div>
        
        <div class="text-center pt-6 border-t border-slate-200 mt-6">
          <p class="font-bold text-[#1A4B62] text-lg">تخشا دارو بهان</p>
          <p class="text-sm font-semibold text-[#7B9C54] mt-2">همراه شما در مسیر سلامت و نوآوری</p>
        </div>
        
        <button onclick="goToStep(3)" class="mt-8 flex items-center justify-center gap-2 text-white px-8 py-3 rounded-full font-bold shadow-lg transition-all w-full btn-gradient">
          مکان و زمان برگزاری
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
        </button>

        <button onclick="goToStep(1)" class="mt-5 text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors flex items-center justify-center gap-1 mx-auto w-full">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
          بازگشت به صفحه قبل
        </button>
      </div>
    </div>

    <!-- STEP 3 -->
    <div id="step-3" class="step text-slate-800">
      <div class="w-full flex flex-col gap-4">
        <!-- Details Card -->
        <div class="bg-white/90 backdrop-blur-xl p-6 rounded-3xl border border-white/50 shadow-2xl space-y-5">
          <!-- Date -->
          <div class="flex items-center gap-4 text-slate-800">
            <div class="bg-[#256B7D]/10 p-3 rounded-2xl text-[#256B7D]">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
            </div>
            <span class="font-bold text-lg">۱۴ الی ۱۷ تیرماه ۱۴۰۳</span>
          </div>
          <!-- Time -->
          <div class="flex items-center gap-4 text-slate-800">
            <div class="bg-[#7B9C54]/10 p-3 rounded-2xl text-[#7B9C54]">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            </div>
            <span class="font-bold text-lg">ساعت ۸:۰۰ الی ۱۵:۰۰</span>
          </div>
          <!-- Location -->
          <a href="https://maps.google.com/?q=شهرآفتاب+نمایشگاه" target="_blank" rel="noopener noreferrer" class="flex items-center gap-4 text-slate-800 hover:text-[#256B7D] transition-colors group">
            <div class="bg-[#256B7D]/10 p-3 rounded-2xl text-[#256B7D] group-hover:bg-[#256B7D]/20 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
            </div>
            <div class="flex flex-col">
              <span class="font-bold text-lg leading-tight">محل دائمی نمایشگاه‌های شهر آفتاب</span>
              <span class="text-sm text-[#256B7D] font-bold mt-1 opacity-80 group-hover:opacity-100 flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"></polygon><line x1="9" y1="3" x2="9" y2="21"></line><line x1="15" y1="3" x2="15" y2="21"></line></svg>
                مسیریابی روی نقشه
              </span>
            </div>
          </a>
          <!-- Booth -->
          <div class="flex items-center gap-4 text-slate-800 pt-4 border-t border-slate-200">
            <div class="bg-[#1A4B62]/10 p-3 rounded-2xl text-[#1A4B62]">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><path d="M9 22v-4h6v4"></path><path d="M8 6h.01"></path><path d="M16 6h.01"></path><path d="M12 6h.01"></path><path d="M12 10h.01"></path><path d="M12 14h.01"></path><path d="M16 10h.01"></path><path d="M16 14h.01"></path><path d="M8 10h.01"></path><path d="M8 14h.01"></path></svg>
            </div>
            <span class="font-black text-[#1A4B62] text-lg">سالن E1 - غرفه 43</span>
          </div>
        </div>
        
        <!-- Action Buttons -->
        <div class="flex flex-col gap-3 mt-2">
          <div class="flex gap-3 w-full">
            <a href="https://calendar.google.com/calendar/render?action=TEMPLATE&text=نمایشگاه+فارمکس+۱۴۰۳&dates=20240704T043000Z/20240707T113000Z&details=دیدار+در+غرفه+تخشا+دارو+بهان+-+سالن+E1+غرفه+43&location=شهرآفتاب" target="_blank" rel="noopener noreferrer" class="flex flex-1 flex-col items-center justify-center gap-2 bg-white text-slate-800 py-3 px-2 rounded-2xl font-bold transition-all shadow-lg border border-slate-100 hover:bg-slate-50 transform hover:-translate-y-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              <span class="text-sm text-center">ثبت در <br/>گوگل کلندر</span>
            </a>
            
            <a href="#" onclick="downloadIcs(event)" class="flex flex-1 flex-col items-center justify-center gap-2 bg-white text-slate-800 py-3 px-2 rounded-2xl font-bold transition-all shadow-lg border border-slate-100 hover:bg-slate-50 transform hover:-translate-y-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 384 512" fill="currentColor"><path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/></svg>
              <span class="text-sm text-center">ثبت در <br/>اپل / اوت‌لوک</span>
            </a>
          </div>

          <button onclick="shareInvite()" class="mt-2 flex items-center justify-center gap-3 w-full text-white py-4 px-6 rounded-2xl font-bold transition-all shadow-lg btn-gradient">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
            <span class="text-lg">اشتراک‌گذاری</span>
          </button>
          
          <button onclick="goToStep(2)" class="mt-5 text-sm font-semibold text-slate-500 hover:text-slate-200 transition-colors flex items-center justify-center gap-1 mx-auto w-full text-white">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
            بازگشت به صفحه قبل
          </button>
        </div>
      </div>
    </div>
    
  </main>

  <script>
    let currentStep = 0;
    const bgMusic = document.getElementById('bg-music');
    let isPlaying = false;
    let isAnimating = false;

    function startApp() {
      // Try play audio
      bgMusic.play().then(() => {
        isPlaying = true;
        updateAudioIcons();
      }).catch(e => console.log("Audio autoplay prevented", e));
      
      goToStep(1);
    }

    function toggleAudio() {
      if (isPlaying) {
        bgMusic.pause();
        isPlaying = false;
      } else {
        bgMusic.play();
        isPlaying = true;
      }
      updateAudioIcons();
    }

    function updateAudioIcons() {
      document.getElementById('icon-muted').style.display = isPlaying ? 'none' : 'block';
      document.getElementById('icon-playing').style.display = isPlaying ? 'block' : 'none';
    }

    function goToStep(step) {
      if (step === currentStep || isAnimating) return;
      isAnimating = true;

      const currentEl = document.getElementById(\`step-\${currentStep}\`);
      const nextEl = document.getElementById(\`step-\${step}\`);

      if (currentEl) {
        currentEl.classList.remove('active');
        currentEl.classList.add('fade-out');
        
        setTimeout(() => {
          currentEl.classList.remove('fade-out');
          currentEl.style.display = 'none';
          
          showNext(step, nextEl);
        }, 380); // Wait for fade-out animation to finish
      } else {
        showNext(step, nextEl);
      }
    }

    function showNext(step, nextEl) {
      currentStep = step;
      if (nextEl) {
        nextEl.style.display = 'flex';
        // Add a tiny delay to ensure the browser registers display:flex before applying animation
        requestAnimationFrame(() => {
          nextEl.classList.add('active');
          isAnimating = false;
        });
      } else {
        isAnimating = false;
      }
      updateVideos(step);
    }

    function updateVideos(step) {
      document.querySelectorAll('.bg-video').forEach(v => v.classList.remove('active'));
      if (step <= 1) {
        document.getElementById('video-step1').classList.add('active');
      } else if (step === 2) {
        document.getElementById('video-step2').classList.add('active');
      } else if (step === 3) {
        document.getElementById('video-step3').classList.add('active');
      }
    }

    function shareInvite() {
      if (navigator.share) {
        navigator.share({
          title: 'دعوت‌نامه نمایشگاه فارمکس',
          text: 'دعوت‌نامه رسمی حضور در غرفه تخشا دارو بهان - نمایشگاه فارمکس ۱۴۰۳',
          url: window.location.href,
        }).catch(console.error);
      } else {
        alert('مرورگر شما از قابلیت اشتراک‌گذاری پشتیبانی نمی‌کند. می‌توانید آدرس صفحه را کپی کنید.');
      }
    }

    function downloadIcs(e) {
      e.preventDefault();
      const icsData = \`BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Pharmex//Invite//FA
BEGIN:VEVENT
UID:pharmex-2024
DTSTAMP:\${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z
DTSTART:20240704T043000Z
DTEND:20240707T113000Z
SUMMARY:نمایشگاه فارمکس ۱۴۰۳
DESCRIPTION:دیدار در غرفه تخشا دارو بهان - سالن E1 غرفه 43
LOCATION:محل دائمی نمایشگاه‌های شهر آفتاب
END:VEVENT
END:VCALENDAR\`;
      
      const blob = new Blob([icsData], { type: 'text/calendar;charset=utf-8' });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.setAttribute('download', 'invite.ics');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  </script>
</body>
</html>
`;
fs.writeFileSync('standalone-invite.html', html);
