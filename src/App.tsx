import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarPlus, MapPin, Clock, Building, Calendar as CalendarIcon, Share2, ChevronLeft, ChevronRight, Map, Volume2, VolumeX } from 'lucide-react';

const InstagramIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
  </svg>
);

export default function App() {
  const [step, setStep] = useState(1);

  // Pause background video when on step 4 (map)
  useEffect(() => {
    const video = document.getElementById('bg-video') as HTMLVideoElement;
    if (video) {
      if (step === 4) {
        video.pause();
      } else {
        if (video.readyState >= 3) {
           video.play().catch(e => console.log('Autoplay blocked:', e));
        }
      }
    }
  }, [step]);

  const [isMusicPlaying, setIsMusicPlaying] = useState(false);

  // Detect In-App Browsers
  const [isInApp, setIsInApp] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent || navigator.vendor || (window as any).opera;
    const isApp = /Instagram|Telegram|Snapchat|WhatsApp|FBAV|FBAN|Line|Twitter|LinkedIn/i.test(ua);
    setIsInApp(isApp);
    if (isApp) setShowBanner(true);
  }, []);

  const [isVideoLoaded, setIsVideoLoaded] = useState(false);


  // Remove splash screen when app is loaded
  useEffect(() => {
    const splash = document.getElementById('global-splash');
    const handleLoad = () => {
      if (splash) {
        splash.style.opacity = '0';
        setTimeout(() => splash.remove(), 700);
      }
    };
    
    // Check if document is already loaded
    if (document.readyState === 'complete') {
      handleLoad();
    } else {
      window.addEventListener('load', handleLoad);
      // Fallback
      const timeout = setTimeout(handleLoad, 4000);
      return () => {
        window.removeEventListener('load', handleLoad);
        clearTimeout(timeout);
      };
    }
  }, []);

  useEffect(() => {
    const audio = document.getElementById('bg-music') as HTMLAudioElement;
    if (audio) {
      audio.volume = 0.5;
      
      const tryPlay = () => {
        audio.play().then(() => {
          setIsMusicPlaying(true);
          document.removeEventListener('click', tryPlay);
          document.removeEventListener('touchstart', tryPlay);
          document.removeEventListener('scroll', tryPlay);
        }).catch(error => {
          console.log('Autoplay prevented:', error);
          setIsMusicPlaying(false);
        });
      };

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.then(_ => {
          setIsMusicPlaying(true);
        }).catch(error => {
          console.log('Autoplay prevented, adding interaction listeners');
          setIsMusicPlaying(false);
          document.addEventListener('click', tryPlay);
          document.addEventListener('touchstart', tryPlay);
          document.addEventListener('scroll', tryPlay, { passive: true });
        });
      }
    }
    
    return () => {
      document.removeEventListener('click', () => {});
      document.removeEventListener('touchstart', () => {});
      document.removeEventListener('scroll', () => {});
    };
  }, []);



  const eventDetails = {
    title: "نمایشگاه ایران فارما",
    date: "۱ تا ۳ مهر ماه ۱۴۰۵",
    time: "ساعت ۹ الی ۱۷",
    location: "مصلی تهران",
    mapUrl: "https://maps.google.com/?q=مصلی+تهران",
    booth: "سالن E، غرفه‌های ۱۵۹ تا ۱۶۲",
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        try {
          await navigator.share({
            title: eventDetails.title,
            text: `دعوتنامه نمایشگاه ${eventDetails.title}\nزمان: ${eventDetails.date}\nمکان: ${eventDetails.location}\n${eventDetails.booth}`,
            url: window.location.href,
          });
        } catch (e) {
          // Fallback to clipboard if share dialog was cancelled or failed
          await navigator.clipboard.writeText(window.location.href);
          alert("لینک در حافظه کپی شد!");
        }
      } else {
        await navigator.clipboard.writeText(window.location.href);
        alert("لینک در حافظه کپی شد!");
      }
    } catch (error) {
      try {
        await navigator.clipboard.writeText(window.location.href);
        alert("لینک در حافظه کپی شد!");
      } catch (err) {
        alert("مرورگر شما از این قابلیت پشتیبانی نمی‌کند.");
      }
    }
  };

  const generateIcsLink = () => {
    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//IranPharma//Invite//FA
BEGIN:VEVENT
UID:iranpharma-2026
DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z
SUMMARY:بازدید از غرفه بهان سار - ${eventDetails.title}
DESCRIPTION:با افتخار منتظر حضور گرم شما در غرفه شرکت بهان سار هستیم.\\n\\nمکان: ${eventDetails.location}\\n${eventDetails.booth}
LOCATION:${eventDetails.location}
DTSTART:20260923T053000Z
DTEND:20260925T133000Z
END:VEVENT
END:VCALENDAR`;
    return `data:text/calendar;charset=utf-8,${encodeURIComponent(icsContent)}`;
  };

  const generateCalendarLink = () => {
    const text = encodeURIComponent(`بازدید از غرفه بهان سار - ${eventDetails.title}`);
    const details = encodeURIComponent(
      `با افتخار منتظر حضور گرم شما در غرفه شرکت بهان سار هستیم.\n\nمکان: ${eventDetails.location}\n${eventDetails.booth}`
    );
    const location = encodeURIComponent(eventDetails.location);
    const dates = "20260923T053000Z/20260925T133000Z";
    
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${dates}&details=${details}&location=${location}`;
  };

  
  return (
    <div className="min-h-[100dvh] flex flex-col px-5 py-2 sm:p-6 relative bg-slate-900 overflow-hidden text-white">
      
      {/* Preload images to prevent flashing when changing steps */}
      <div className="hidden">
        <img src="/Logo.png" alt="preload" />
        <img src="/Logo2.png" alt="preload" />
      </div>

      <div className="absolute inset-0 z-0 bg-slate-900">
        <video id="bg-video" autoPlay loop muted playsInline preload="auto" onCanPlay={() => setIsVideoLoaded(true)} className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out ${isVideoLoaded ? "opacity-75" : "opacity-0"}`}><source src="/bg.mp4" type="video/mp4" /><source src="/bg.webm" type="video/webm" /></video>
        
      </div>
      
      {/* Floating Particles for extra depth */}
      <div id="particles" className={`absolute inset-0 z-0 overflow-hidden pointer-events-none ${step === 4 ? 'hidden' : 'block'}`}>
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-[#0033A0]/20 rounded-full blur-3xl" style={{ transform: 'translateZ(0)', willChange: 'transform' }}></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-[#00B4F1]/10 rounded-full blur-3xl" style={{ transform: 'translateZ(0)', willChange: 'transform' }}></div>
      </div>

      {/* Background Audio */}
            
      <audio id="bg-music" loop autoPlay>
        <source src="/background-music.mp3" type="audio/mpeg" />
      </audio>

      {/* Music Toggle Button */}
      {step > 0 && (
        <button
          onClick={() => {
            const audio = document.getElementById('bg-music') as HTMLAudioElement;
            if (audio) {
              if (isMusicPlaying) {
                audio.pause();
              } else {
                audio.play();
              }
              setIsMusicPlaying(!isMusicPlaying);
            }
          }}
          className="absolute top-6 left-6 z-50 bg-white/30 hover:bg-white/50 backdrop-blur-md p-3 rounded-full text-slate-800 transition-all shadow-md border border-white/40 flex items-center justify-center"
          title={isMusicPlaying ? "قطع صدا" : "پخش صدا"}
        >
          {isMusicPlaying ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5 text-slate-600" />}
        </button>
      )}

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center max-w-lg mx-auto w-full pb-8 pt-2 sm:pt-0 sm:pb-16">
        <AnimatePresence mode="wait">

          {/* STEP 1: WELCOME SCREEN */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, scale: 0.95, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -50 }}
              transition={{ duration: 0.8, type: "spring", bounce: 0.4 }}
              className="text-center w-full"
            >
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.8 }}
                className="mb-8 relative"
              >
                <div className="absolute inset-0 bg-white/20 blur-xl rounded-full"></div>
                <img src="/Logo.png" alt="Behan Sar" className="w-72 h-auto mx-auto drop-shadow-2xl relative z-10" />
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.8 }}
                className="bg-white/90 backdrop-blur-xl p-5 sm:p-8 rounded-3xl border border-white/50 shadow-2xl"
              >
                <h1 className="text-3xl font-black text-[#0033A0] mb-0 leading-tight relative z-10">
                  <span className="block text-[#00B4F1] text-xl mb-2 sm:mb-3 font-bold">دعوتنامه رسمی</span>
                  {eventDetails.title}
                </h1>
                
                <div className="w-full flex justify-center items-center -mt-4 sm:-mt-5 -mb-3 sm:-mb-5 relative z-0">
                  <img src="/iranpharma.svg" alt="Iran Pharma" className="h-24 sm:h-28 w-auto object-contain" />
                </div>
                
                <p className="text-slate-600 mb-4 sm:mb-6 font-medium text-lg relative z-10">
                  مفتخریم میزبان شما در این رویداد بزرگ باشیم
                </p>

                <button
                    onClick={() => {
                      setStep(2);
                      const audio = document.getElementById('bg-music') as HTMLAudioElement;
                      if (audio && !isMusicPlaying) {
                        audio.play().then(() => setIsMusicPlaying(true)).catch(() => {});
                      }
                    }}
                    className="flex items-center justify-center gap-2 text-white px-8 py-4 rounded-full font-bold shadow-lg transition-all w-full  animate-gradient-btn hover:scale-[1.02] hover:shadow-[0_10px_25px_rgba(26,75,98,0.4)]"
                  >
                    <span className="text-lg">تایید و ورود</span>
                    <ChevronLeft className="w-5 h-5" />
                  </button>
              </motion.div>
            </motion.div>
          )}

          {/* STEP 2: INVITATION MESSAGE */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, scale: 0.95, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -50 }}
              transition={{ duration: 0.8, type: "spring", bounce: 0.4 }}
              className="bg-white/90 backdrop-blur-xl p-4 sm:p-6 pb-4 sm:pb-5 rounded-3xl border border-white/50 shadow-2xl text-slate-800 w-full relative"
            >
              {/* Floating Logo */}
              <div className="absolute -top-7 sm:-top-10 left-1/2 transform -translate-x-1/2 bg-white p-2.5 sm:p-3 rounded-full shadow-xl z-10">
                <img src="/Logo2.png" alt="Logo" className="w-12 h-12 sm:w-16 sm:h-16 object-contain" />
              </div>
              
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
                className="space-y-2 sm:space-y-3 pt-8 sm:pt-10"
              >
                <p className="text-[14.5px] sm:text-[17px] leading-[1.6] sm:leading-[1.7] font-medium text-justify">
                  با سلام و احترام<br/>
                  با افتخار از شما دعوت می کنیم تا با حضور ارزشمند خود در نمایشگاه ایران فارما، میهمان غرفه بهان سار باشید.
                </p>
                <p className="text-[14.5px] sm:text-[17px] leading-[1.6] sm:leading-[1.7] font-medium text-justify">
                  این دیدار، فرصتی است برای گفت و گویی تازه، آشنایی با محصولات و دستاوردهای ما و گامی برای توسعه همکاری های ارزشمند آینده.
                </p>
              </motion.div>
              
              <motion.div 
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                className="text-center pt-3 sm:pt-4 border-t border-slate-200 mt-3 sm:mt-4"
              >
                <p className="font-bold text-[#0033A0] text-sm sm:text-base">بهان سار</p>
                <p className="text-xs sm:text-sm font-semibold text-[#00B4F1] mt-0.5 sm:mt-1">همراه شما در مسیر سلامت و نوآوری</p>
              </motion.div>
              
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.6 }}
                onClick={() => setStep(3)}
                className="mt-4 sm:mt-5 flex items-center justify-center gap-2 text-white px-6 sm:px-8 py-2.5 sm:py-3 rounded-full font-bold shadow-lg transition-all w-full animate-gradient-btn hover:scale-[1.02] hover:shadow-[0_10px_25px_rgba(26,75,98,0.4)]"
              >
                <span className="text-sm sm:text-base">مکان و زمان برگزاری</span>
                <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              </motion.button>
              
              <motion.button
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
                onClick={() => setStep(1)}
                className="mt-3 sm:mt-4 text-[13px] sm:text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors flex items-center justify-center gap-1 mx-auto w-full"
              >
                <ChevronRight className="w-4 h-4" />
                بازگشت به صفحه قبل
              </motion.button>
            </motion.div>
          )}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, scale: 0.95, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 50 }}
              transition={{ duration: 0.8, type: "spring", bounce: 0.4 }}
              className="w-full flex flex-col gap-4"
            >
              <div className="bg-white/90 backdrop-blur-xl p-4 sm:p-6 rounded-3xl border border-white/50 shadow-2xl space-y-3 sm:space-y-5">
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="flex items-center gap-3 sm:gap-4 text-slate-800">
                  <div className="bg-[#00B4F1]/10 p-2 sm:p-3 rounded-2xl text-[#00B4F1]">
                    <CalendarIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <span className="font-bold text-base sm:text-lg">{eventDetails.date}</span>
                </motion.div>
                
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }} className="flex items-center gap-3 sm:gap-4 text-slate-800">
                  <div className="bg-[#00B4F1]/10 p-2 sm:p-3 rounded-2xl text-[#00B4F1]">
                    <Clock className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <span className="font-bold text-base sm:text-lg">{eventDetails.time}</span>
                </motion.div>
                
                <motion.a initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 }}
                  href={eventDetails.mapUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 sm:gap-4 text-slate-800 hover:text-[#00B4F1] transition-colors group"
                >
                  <div className="bg-[#00B4F1]/10 p-2 sm:p-3 rounded-2xl text-[#00B4F1] group-hover:bg-[#00B4F1]/20 transition-colors">
                    <MapPin className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-base sm:text-lg leading-tight">{eventDetails.location}</span>
                    <span className="text-xs sm:text-sm text-[#00B4F1] font-bold mt-1 opacity-80 group-hover:opacity-100 flex items-center gap-1">
                      <Map className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      برای مسیریابی روی نقشه کلیک کنید
                    </span>
                  </div>
                </motion.a>
                
                <motion.a 
                  initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.8 }} 
                  href="https://asvashop.com/behansar/map" target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 sm:gap-4 text-slate-800 hover:text-[#00B4F1] transition-colors group pt-3 sm:pt-4 border-t border-slate-200"
                >
                  <div className="bg-[#00B4F1]/10 p-2 sm:p-3 rounded-2xl text-[#00B4F1] group-hover:bg-[#00B4F1]/20 transition-colors">
                    <Building className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-base sm:text-lg leading-tight">{eventDetails.booth}</span>
                  </div>
                </motion.a>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1 }}
                className="flex flex-col gap-2 sm:gap-3 mt-1 sm:mt-2"
              >
                
                <button
                  onClick={() => setStep(4)}
                  className="flex items-center justify-center gap-2 sm:gap-3 w-full text-white py-3 sm:py-4 px-6 rounded-2xl font-bold transition-all shadow-lg animate-gradient-btn hover:scale-[1.02] hover:shadow-[0_10px_25px_rgba(26,75,98,0.4)] mb-2 sm:mb-3"
                >
                  <Map className="w-5 h-5 sm:w-6 sm:h-6" />
                  <span className="text-base sm:text-lg">مکان‌یابی دقیق غرفه</span>
                </button>

                <div className="flex gap-2 sm:gap-3 w-full">
                  <a
                    href={generateCalendarLink()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-1 flex-col items-center justify-center gap-1.5 sm:gap-2 bg-white text-slate-800 py-2 sm:py-3 px-2 rounded-2xl font-bold transition-all shadow-lg border border-slate-100 hover:bg-slate-50 transform hover:-translate-y-1"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" className="sm:w-6 sm:h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                    <span className="text-[11px] sm:text-sm text-center leading-tight">ثبت در <br/>گوگل کلندر</span>
                  </a>
                  
                  <a
                    href={generateIcsLink()}
                    download="invite.ics"
                    className="flex flex-1 flex-col items-center justify-center gap-1.5 sm:gap-2 bg-white text-slate-800 py-2 sm:py-3 px-2 rounded-2xl font-bold transition-all shadow-lg border border-slate-100 hover:bg-slate-50 transform hover:-translate-y-1"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" className="sm:w-[22px] sm:h-[22px]" viewBox="0 0 384 512" fill="currentColor"><path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/></svg>
                    <span className="text-[11px] sm:text-sm text-center leading-tight">ثبت در <br/>اپل / اوت‌لوک</span>
                  </a>
                </div>
                
                <button
                  onClick={handleShare}
                  className="mt-1 sm:mt-2 flex items-center justify-center gap-2 sm:gap-3 w-full text-white py-3 sm:py-4 px-6 rounded-2xl font-bold transition-all shadow-lg  animate-gradient-btn hover:scale-[1.02] hover:shadow-[0_10px_25px_rgba(26,75,98,0.4)]"
                >
                  <Share2 className="w-5 h-5 sm:w-6 sm:h-6" />
                  <span className="text-base sm:text-lg">اشتراک‌گذاری</span>
                </button>
                
                <button
                  onClick={() => setStep(2)}
                  className="mt-2 sm:mt-5 text-xs sm:text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors flex items-center justify-center gap-1 mx-auto"
                >
                  <ChevronRight className="w-4 h-4" />
                  بازگشت به صفحه قبل
                </button>
              </motion.div>
            </motion.div>
          )}
          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, scale: 0.95, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 50 }}
              transition={{ duration: 0.8, type: "spring", bounce: 0.4 }}
              className="fixed inset-0 z-[100] w-full h-full bg-slate-900"
            >
              <button
                onClick={() => setStep(3)}
                className="absolute top-20 sm:top-24 left-6 z-[110] bg-white/30 hover:bg-white/50 backdrop-blur-md p-3 rounded-full text-slate-800 transition-all shadow-md border border-white/40 flex items-center justify-center"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              <div id="root" className="w-full h-full border-0"></div>
              {/* Note: React version relies on external load or you can use iframe if it works better for React */}
              <iframe src="https://asvashop.com/behansar/map" className="w-full h-full border-0 absolute inset-0" title="Map"></iframe>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Credits */}
      <AnimatePresence>
        {(step === 1 || step === 3) && (
          <motion.a
            href="https://instagram.com/asvastudio"
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-3 sm:bottom-4 left-0 w-full z-10 flex flex-col items-center justify-center cursor-pointer group"
          >
            <div dir="ltr" className="flex items-center gap-1.5 text-white/80 group-hover:text-white transition-colors drop-shadow-md">
              <InstagramIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <p className="text-[9px] sm:text-[10px] font-semibold tracking-[0.2em] mt-0.5 uppercase">Powered by Asva Studio</p>
            </div>
            <p className="text-[10px] sm:text-[11px] text-white/60 group-hover:text-white/80 transition-colors font-medium drop-shadow-md mt-1 tracking-wide">توسعه یافته توسط شرکت داده‌پردازان اسوا</p>
          </motion.a>
        )}
      </AnimatePresence>
    </div>
  );
}