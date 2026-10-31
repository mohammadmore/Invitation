import re

html = """<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>دعوتنامه رسمی نمایشگاه ایران فارما</title>
    
    <!-- Fonts -->
    <link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;700;900&display=swap" rel="stylesheet">
    
    <!-- Tailwind CSS (CDN) -->
    <script src="https://cdn.tailwindcss.com"></script>
    
    <!-- Lucide Icons (CDN) -->
    <script src="https://unpkg.com/lucide@latest"></script>
    
    <!-- Tailwind Config -->
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    fontFamily: {
                        sans: ['Vazirmatn', 'sans-serif'],
                    }
                }
            }
        }
    </script>
    
    <!-- Custom Styles -->
    <style>
        html, body { 
            height: 100%; 
            overflow: hidden; 
            background-color: #0f172a; 
            color: white; 
        }
        
        /* Gradient Button Animation */
        @keyframes fluid-ink {
            0% { background-position: 0% 0%, 100% 100%, 50% 50%, 0% 100%; }
            33% { background-position: 100% 0%, 0% 100%, 20% 80%, 100% 0%; }
            66% { background-position: 100% 100%, 0% 0%, 80% 20%, 50% 50%; }
            100% { background-position: 0% 0%, 100% 100%, 50% 50%, 0% 100%; }
        }
        .btn-gradient {
            background-color: #0033A0;
            background-image: 
                radial-gradient(circle at 0% 0%, #00B4F1 0%, transparent 60%),
                radial-gradient(circle at 100% 100%, #0033A0 0%, transparent 60%),
                radial-gradient(circle at 50% 50%, #00B4F1 0%, transparent 60%),
                radial-gradient(circle at 100% 0%, #0033A0 0%, transparent 60%);
            background-size: 250% 250%, 200% 200%, 300% 300%, 250% 250%;
            animation: fluid-ink 10s ease-in-out infinite;
        }

        /* Step Transitions */
        .step {
            position: absolute; 
            inset: 0; 
            display: flex; 
            flex-direction: column; 
            align-items: center; 
            justify-content: center;
            opacity: 0; 
            pointer-events: none;
            transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
            transform: scale(0.95);
            padding: 1.25rem;
            padding-bottom: 4rem;
            width: 100%;
            max-width: 32rem;
            margin: 0 auto;
            z-index: 10;
        }
        .step.active {
            opacity: 1; 
            pointer-events: auto;
            transform: scale(1);
        }
    </style>
</head>
<body class="relative flex flex-col items-center justify-center min-h-[100dvh]">
    
    <!-- Background Video -->
    <div class="absolute inset-0 z-0 bg-slate-900">
        <video id="bg-video" autoplay loop muted playsinline preload="auto" class="absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 opacity-0">
            <source src="bg.webm" type="video/webm">
            <source src="bg.mp4" type="video/mp4">
        </video>
        <div class="absolute inset-0 bg-gradient-to-b from-slate-900/40 via-slate-900/70 to-slate-900/95"></div>
    </div>

    <!-- Floating Particles -->
    <div class="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div class="absolute top-1/4 left-1/4 w-64 h-64 bg-[#0033A0]/20 rounded-full blur-3xl"></div>
        <div class="absolute bottom-1/4 right-1/4 w-80 h-80 bg-[#00B4F1]/10 rounded-full blur-3xl"></div>
    </div>

    <!-- Background Audio -->
    <audio id="bg-music" loop preload="auto">
        <source src="background-music.mp3" type="audio/mpeg">
    </audio>

    <!-- Audio Toggle Button -->
    <button id="audio-toggle" class="absolute top-6 left-6 z-50 bg-white/30 hover:bg-white/50 backdrop-blur-md p-3 rounded-full text-slate-800 transition-all shadow-md border border-white/40 flex items-center justify-center hidden">
        <i data-lucide="volume-x" id="audio-icon-off" class="w-5 h-5 text-slate-600"></i>
        <i data-lucide="volume-2" id="audio-icon-on" class="w-5 h-5 hidden"></i>
    </button>

    <!-- Main Content -->
    <div class="relative z-10 flex-1 flex flex-col items-center justify-center max-w-lg mx-auto w-full pb-8 pt-2 sm:pt-0 sm:pb-16 h-full">
        
        <!-- STEP 1: Welcome -->
        <div id="step-1" class="step active">
            <div class="text-center w-full">
                <!-- Preload images -->
                <div class="hidden">
                    <img src="Logo.png" alt="preload">
                    <img src="Logo2.png" alt="preload">
                </div>

                <div class="mb-8 relative">
                    <div class="absolute inset-0 bg-white/20 blur-xl rounded-full"></div>
                    <img src="Logo.png" alt="Behan Sar" class="w-72 h-auto mx-auto drop-shadow-2xl relative z-10">
                </div>
                
                <div class="bg-white/90 backdrop-blur-xl p-5 sm:p-8 rounded-3xl border border-white/50 shadow-2xl">
                    <h1 class="text-3xl font-black text-[#0033A0] mb-0 leading-tight relative z-10">
                        <span class="block text-[#00B4F1] text-xl mb-2 sm:mb-3 font-bold">دعوتنامه رسمی</span>
                        نمایشگاه ایران فارما
                    </h1>
                    
                    <div class="w-full flex justify-center items-center -mt-4 sm:-mt-5 -mb-3 sm:-mb-5 relative z-0">
                        <img src="iranpharma.svg" alt="Iran Pharma" class="h-24 sm:h-28 w-auto object-contain">
                    </div>
                    
                    <p class="text-slate-600 mb-4 sm:mb-6 font-medium text-lg relative z-10">
                        مفتخریم میزبان شما در این رویداد بزرگ باشیم
                    </p>
                    <button onclick="goToStep(2)" class="flex items-center justify-center gap-2 text-white px-8 py-4 rounded-full font-bold shadow-lg transition-all w-full btn-gradient hover:scale-[1.02] hover:shadow-[0_10px_25px_rgba(26,75,98,0.4)]">
                        <span class="text-lg">تایید و ورود</span>
                        <i data-lucide="chevron-left" class="w-5 h-5"></i>
                    </button>
                </div>
            </div>
        </div>

        <!-- STEP 2: Message -->
        <div id="step-2" class="step" style="transform: translateY(20px);">
            <div class="bg-white/90 backdrop-blur-xl p-5 sm:p-8 rounded-3xl border border-white/50 shadow-2xl text-slate-800 w-full relative">
                <!-- Floating Logo -->
                <div class="absolute -top-7 sm:-top-10 left-1/2 transform -translate-x-1/2 bg-white p-2.5 sm:p-3 rounded-full shadow-xl">
                    <img src="Logo2.png" alt="Logo" class="w-12 h-12 sm:w-16 sm:h-16 object-contain">
                </div>
                
                <div class="text-center mb-3 sm:mb-6 pt-10 sm:pt-12 border-b border-slate-200 pb-2 sm:pb-4">
                    <h2 class="text-[20px] sm:text-2xl font-black text-[#0033A0]">دعوت‌نامه رسمی</h2>
                </div>
                
                <div class="space-y-2 sm:space-y-4">
                    <p class="text-[14.5px] sm:text-lg leading-[1.6] sm:leading-relaxed font-medium text-justify">
                        با سلام و احترام<br>
                        با افتخار از شما دعوت میکنیم تا با حضور ارزشمند خود در نمایشگاه ایران فارما، میهمان غرفه بهان سار باشید.
                    </p>
                    <p class="text-[14.5px] sm:text-lg leading-[1.6] sm:leading-relaxed font-medium text-justify">
                        این دیدار، فرصتی است برای گفتوگویی تازه، آشنایی با محصولات و دستاوردهای ما و گامی برای توسعه همکاریهای ارزشمند آینده.
                    </p>
                </div>
                
                <div class="text-center pt-3 sm:pt-6 border-t border-slate-200 mt-3 sm:mt-6">
                    <p class="font-bold text-[#0033A0] text-base sm:text-lg">بهان سار</p>
                    <p class="text-xs sm:text-sm font-semibold text-[#00B4F1] mt-1 sm:mt-2">همراه شما در مسیر سلامت و نوآوری</p>
                </div>
                
                <button onclick="goToStep(3)" class="mt-4 sm:mt-8 flex items-center justify-center gap-2 text-white px-6 sm:px-8 py-2.5 sm:py-3 rounded-full font-bold shadow-lg transition-all w-full btn-gradient hover:scale-[1.02] hover:shadow-[0_10px_25px_rgba(26,75,98,0.4)]">
                    <span class="text-sm sm:text-base">مکان و زمان برگزاری</span>
                    <i data-lucide="chevron-left" class="w-4 h-4 sm:w-5 sm:h-5"></i>
                </button>
                
                <button onclick="goToStep(1)" class="mt-3 sm:mt-5 text-[13px] sm:text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors flex items-center justify-center gap-1 mx-auto w-full">
                    <i data-lucide="chevron-right" class="w-4 h-4"></i>
                    بازگشت به صفحه قبل
                </button>
            </div>
        </div>

        <!-- STEP 3: Details -->
        <div id="step-3" class="step" style="transform: translateY(20px);">
            <div class="w-full flex flex-col gap-4">
                <div class="bg-white/90 backdrop-blur-xl p-4 sm:p-6 rounded-3xl border border-white/50 shadow-2xl space-y-3 sm:space-y-5">
                    <div class="flex items-center gap-3 sm:gap-4 text-slate-800">
                        <div class="bg-[#00B4F1]/10 p-2 sm:p-3 rounded-2xl text-[#00B4F1]"><i data-lucide="calendar" class="w-5 h-5 sm:w-6 sm:h-6"></i></div>
                        <span class="font-bold text-base sm:text-lg">۱ تا ۳ مهر ماه ۱۴۰۵</span>
                    </div>
                    <div class="flex items-center gap-3 sm:gap-4 text-slate-800">
                        <div class="bg-[#00B4F1]/10 p-2 sm:p-3 rounded-2xl text-[#00B4F1]"><i data-lucide="clock" class="w-5 h-5 sm:w-6 sm:h-6"></i></div>
                        <span class="font-bold text-base sm:text-lg">ساعت ۹ الی ۱۷</span>
                    </div>
                    <a href="https://nshn.ir/68rbvzO9Ox2O" target="_blank" class="flex items-center gap-3 sm:gap-4 text-slate-800 hover:text-[#00B4F1] transition-colors group">
                        <div class="bg-[#00B4F1]/10 p-2 sm:p-3 rounded-2xl text-[#00B4F1] group-hover:bg-[#00B4F1]/20 transition-colors"><i data-lucide="map-pin" class="w-5 h-5 sm:w-6 sm:h-6"></i></div>
                        <div class="flex flex-col">
                            <span class="font-bold text-base sm:text-lg leading-tight">مصلی تهران</span>
                            <span class="text-xs sm:text-sm text-[#00B4F1] font-bold mt-1 opacity-80 group-hover:opacity-100 flex items-center gap-1">
                                <i data-lucide="map" class="w-3.5 h-3.5 sm:w-4 sm:h-4"></i> برای مسیریابی روی نقشه کلیک کنید
                            </span>
                        </div>
                    </a>
                    <a href="https://asvashop.com/behansar/map" target="_blank" class="flex items-center gap-3 sm:gap-4 text-slate-800 hover:text-[#00B4F1] transition-colors group pt-3 sm:pt-4 border-t border-slate-200">
                        <div class="bg-[#00B4F1]/10 p-2 sm:p-3 rounded-2xl text-[#00B4F1] group-hover:bg-[#00B4F1]/20 transition-colors"><i data-lucide="building" class="w-5 h-5 sm:w-6 sm:h-6"></i></div>
                        <div class="flex flex-col">
                            <span class="font-bold text-base sm:text-lg leading-tight">سالن E، غرفه ۱۰۲</span>
                            <span class="text-xs sm:text-sm text-[#00B4F1] font-bold mt-1 opacity-80 group-hover:opacity-100 flex items-center gap-1">
                                <i data-lucide="map-pin" class="w-3.5 h-3.5 sm:w-4 sm:h-4"></i> برای یافتن مکان دقیق غرفه کلیک کنید
                            </span>
                        </div>
                    </a>
                </div>
                
                <div class="flex flex-col gap-2 sm:gap-3 mt-1 sm:mt-2">
                    <div class="flex gap-2 sm:gap-3 w-full">
                        <a href="#" id="gcal-link" target="_blank" class="flex flex-1 flex-col items-center justify-center gap-1.5 sm:gap-2 bg-white text-slate-800 py-2 sm:py-3 px-2 rounded-2xl font-bold transition-all shadow-lg border border-slate-100 hover:bg-slate-50 transform hover:-translate-y-1">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" class="sm:w-6 sm:h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                            <span class="text-[11px] sm:text-sm text-center leading-tight">ثبت در <br>گوگل کلندر</span>
                        </a>
                        <a href="#" id="ics-link" download="invite.ics" class="flex flex-1 flex-col items-center justify-center gap-1.5 sm:gap-2 bg-white text-slate-800 py-2 sm:py-3 px-2 rounded-2xl font-bold transition-all shadow-lg border border-slate-100 hover:bg-slate-50 transform hover:-translate-y-1">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" class="sm:w-[22px] sm:h-[22px]" viewBox="0 0 384 512" fill="currentColor"><path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/></svg>
                            <span class="text-[11px] sm:text-sm text-center leading-tight">ثبت در <br>اپل / اوت‌لوک</span>
                        </a>
                    </div>
                    <button onclick="shareInvite()" class="mt-1 sm:mt-2 flex items-center justify-center gap-2 sm:gap-3 w-full text-white py-3 sm:py-4 px-6 rounded-2xl font-bold transition-all shadow-lg btn-gradient hover:scale-[1.02] hover:shadow-[0_10px_25px_rgba(26,75,98,0.4)]">
                        <i data-lucide="share-2" class="w-5 h-5 sm:w-6 sm:h-6"></i>
                        <span class="text-base sm:text-lg">اشتراک‌گذاری</span>
                    </button>
                    <button onclick="goToStep(2)" class="mt-2 sm:mt-5 text-xs sm:text-sm font-semibold text-slate-400 hover:text-slate-200 transition-colors flex items-center justify-center gap-1 mx-auto">
                        <i data-lucide="chevron-right" class="w-4 h-4"></i>
                        بازگشت به صفحه قبل
                    </button>
                </div>
            </div>
        </div>

    </div>

    <!-- Footer Credits -->
    <a id="footer" href="https://instagram.com/asvastudio" target="_blank" class="absolute bottom-3 sm:bottom-4 left-0 w-full z-10 flex flex-col items-center justify-center cursor-pointer group transition-opacity duration-500">
        <div dir="ltr" class="flex items-center gap-1.5 text-white/80 group-hover:text-white transition-colors drop-shadow-md">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-3.5 h-3.5 sm:w-4 sm:h-4"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"></line></svg>
            <p class="text-[9px] sm:text-[10px] font-semibold tracking-[0.2em] mt-0.5 uppercase">Powered by Asva Studio</p>
        </div>
        <p class="text-[10px] sm:text-[11px] text-white/60 group-hover:text-white/80 transition-colors font-medium drop-shadow-md mt-1 tracking-wide">توسعه یافته توسط شرکت داده‌پردازان اسوا</p>
    </a>

    <!-- Scripts (Logic) -->
    <script>
        // Initialize Icons
        lucide.createIcons();

        // Setup Video fade-in effect
        const video = document.getElementById('bg-video');
        video.addEventListener('canplay', () => {
            video.classList.remove('opacity-0');
            video.classList.add('opacity-75');
        });

        // Audio Logic
        const audio = document.getElementById('bg-music');
        const audioBtn = document.getElementById('audio-toggle');
        const iconOn = document.getElementById('audio-icon-on');
        const iconOff = document.getElementById('audio-icon-off');
        let isPlaying = false;

        audioBtn.addEventListener('click', () => {
            if (isPlaying) {
                audio.pause();
                iconOn.classList.add('hidden');
                iconOff.classList.remove('hidden');
            } else {
                audio.play().catch(e => console.log('Audio play failed:', e));
                iconOff.classList.add('hidden');
                iconOn.classList.remove('hidden');
            }
            isPlaying = !isPlaying;
        });

        // Steps Logic
        function goToStep(step) {
            // Show audio button when navigating away from step 1
            if (step > 1) {
                audioBtn.classList.remove('hidden');
            } else {
                audioBtn.classList.add('hidden');
            }
        
            // Hide all steps
            document.querySelectorAll('.step').forEach(el => {
                el.classList.remove('active');
                el.style.transform = 'scale(0.95) translateY(20px)';
            });
            // Show target step
            const target = document.getElementById('step-' + step);
            target.classList.add('active');
            target.style.transform = 'scale(1) translateY(0)';
            
            // Show/hide footer
            const footer = document.getElementById('footer');
            if (step === 2) {
                footer.style.opacity = '0';
                footer.style.pointerEvents = 'none';
            } else {
                footer.style.opacity = '1';
                footer.style.pointerEvents = 'auto';
            }

            // Autoplay audio on first interaction (if not already playing)
            if (step === 2 && !isPlaying) {
                audio.play().then(() => {
                    isPlaying = true;
                    iconOff.classList.add('hidden');
                    iconOn.classList.remove('hidden');
                }).catch(e => console.log('Autoplay blocked by browser', e));
            }
        }

        // Initialize proper CSS transform for non-active steps
        document.querySelectorAll('.step:not(.active)').forEach(el => {
            el.style.transform = 'scale(0.95) translateY(20px)';
        });

        // Calendar & Share Data
        const eventDetails = {
            title: "نمایشگاه ایران فارما",
            date: "۱ تا ۳ مهر ماه ۱۴۰۵",
            location: "مصلی تهران",
            booth: "سالن E، غرفه ۱۰۲"
        };

        // Setup Google Calendar Link
        const text = encodeURIComponent(`بازدید از غرفه بهان سار - ${eventDetails.title}`);
        const details = encodeURIComponent(`با افتخار منتظر حضور گرم شما در غرفه شرکت بهان سار هستیم.\n\nمکان: ${eventDetails.location}\n${eventDetails.booth}`);
        const loc = encodeURIComponent(eventDetails.location);
        const dates = "20260923T053000Z/20260925T133000Z";
        document.getElementById('gcal-link').href = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${dates}&details=${details}&location=${loc}`;

        // Setup Apple/Outlook ICS File Download
        const icsContent = `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//IranPharma//Invite//FA\nBEGIN:VEVENT\nUID:iranpharma-2026\nDTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z\nSUMMARY:بازدید از غرفه بهان سار - ${eventDetails.title}\nDESCRIPTION:با افتخار منتظر حضور گرم شما در غرفه شرکت بهان سار هستیم.\\n\\nمکان: ${eventDetails.location}\\n${eventDetails.booth}\nLOCATION:${eventDetails.location}\nDTSTART:20260923T053000Z\nDTEND:20260925T133000Z\nEND:VEVENT\nEND:VCALENDAR`;
        const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
        document.getElementById('ics-link').href = URL.createObjectURL(blob);

        // Share API Logic
        async function shareInvite() {
            const shareData = {
                title: eventDetails.title,
                text: `دعوتنامه نمایشگاه ${eventDetails.title}\nزمان: ${eventDetails.date}\nمکان: ${eventDetails.location}\n${eventDetails.booth}`,
                url: window.location.href
            };
            try {
                if (navigator.share) {
                    await navigator.share(shareData);
                } else {
                    await navigator.clipboard.writeText(window.location.href);
                    alert('لینک دعوتنامه با موفقیت در کلیپ‌بورد کپی شد.');
                }
            } catch (err) {
                if (err.name !== 'AbortError') {
                    navigator.clipboard.writeText(window.location.href);
                    alert('لینک دعوتنامه با موفقیت در کلیپ‌بورد کپی شد.');
                }
            }
        }
    </script>
</body>
</html>"""

with open("asvashop/index.html", "w", encoding="utf-8") as f:
    f.write(html)
