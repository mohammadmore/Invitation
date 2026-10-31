import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarPlus, MapPin, Clock, Building, Calendar as CalendarIcon, Share2, ChevronLeft, Map } from 'lucide-react';

export default function App() {
  const [step, setStep] = useState(0);

  const eventDetails = {
    title: "نمایشگاه فارمکس",
    date: "۱۷ تا ۱۹ شهریور ماه ۱۴۰۵",
    time: "ساعت ۱۰ تا ۱۷",
    location: "مرکز نمایشگاهی ایران مال",
    mapUrl: "https://maps.app.goo.gl/xBEPdvT2qrKixN7x9",
    booth: "سالن E1، غرفه ۴۴ و ۴۵",
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
BEGIN:VEVENT
SUMMARY:بازدید از غرفه تخشا دارو بهان - ${eventDetails.title}
DESCRIPTION:با افتخار منتظر حضور گرم شما در غرفه شرکت تخشا دارو بهان هستیم.\\n\\nمکان: ${eventDetails.location}\\n${eventDetails.booth}
LOCATION:${eventDetails.location}
DTSTART:20260908T063000Z
DTEND:20260910T133000Z
END:VEVENT
END:VCALENDAR`;
    return `data:text/calendar;charset=utf-8,${encodeURIComponent(icsContent)}`;
  };

  const generateCalendarLink = () => {
    const text = encodeURIComponent(`بازدید از غرفه تخشا دارو بهان - ${eventDetails.title}`);
    const details = encodeURIComponent(
      `با افتخار منتظر حضور گرم شما در غرفه شرکت تخشا دارو بهان هستیم.\n\nمکان: ${eventDetails.location}\n${eventDetails.booth}`
    );
    const location = encodeURIComponent(eventDetails.location);
    const dates = "20241002T053000Z/20241004T133000Z";
    
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${dates}&details=${details}&location=${location}`;
  };

  const handleStart = () => {
    setStep(1);
    // Try to play audio
    const audio = document.getElementById('bg-music') as HTMLAudioElement;
    if (audio) {
      audio.volume = 0.5;
      audio.play().catch(e => console.log('Audio play failed:', e));
    }
  };

  return (
    <div className="min-h-screen flex flex-col p-4 sm:p-6 relative bg-slate-900 overflow-hidden text-white">
      {/* Background Audio */}
      <audio id="bg-music" loop>
        <source src="/bg-music.mp3" type="audio/mpeg" />
      </audio>

      {/* Background Videos for different steps */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-black/60 z-10" />
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.video
              key="video1"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1 }}
              autoPlay muted loop playsInline
              className="absolute inset-0 w-full h-full object-cover"
              src="/step1-bg.mp4"
            />
          )}
          {step === 2 && (
            <motion.video
              key="video2"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1 }}
              autoPlay muted loop playsInline
              className="absolute inset-0 w-full h-full object-cover"
              src="/step2-bg.mp4"
            />
          )}
          {step === 3 && (
            <motion.video
              key="video3"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1 }}
              autoPlay muted loop playsInline
              className="absolute inset-0 w-full h-full object-cover"
              src="/step3-bg.mp4"
            />
          )}
        </AnimatePresence>
      </div>

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center max-w-lg mx-auto w-full">
        <AnimatePresence mode="wait">
          
          {/* STEP 0: SPLASH SCREEN (Needed to trigger audio autoplay) */}
          {step === 0 && (
            <motion.div
              key="step0"
              exit={{ opacity: 0, scale: 0.9, filter: "blur(10px)" }}
              transition={{ duration: 0.5 }}
              className="w-full flex flex-col items-center justify-center space-y-8"
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white/10 p-10 rounded-full backdrop-blur-md border border-white/20 shadow-2xl"
              >
                <img 
                  src="/Logo.webp" 
                  alt="لوگو" 
                  className="w-32 h-32 object-contain drop-shadow-xl"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              </motion.div>
              <h1 className="text-3xl sm:text-4xl font-black text-center drop-shadow-lg tracking-tight">
                تخشا دارو بهان
              </h1>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleStart}
                className="mt-12 bg-white text-[#1A4B62] px-10 py-4 rounded-full font-bold text-lg shadow-[0_0_40px_rgba(255,255,255,0.3)] hover:shadow-[0_0_60px_rgba(255,255,255,0.5)] transition-all flex items-center gap-3"
              >
                مشاهده دعوتنامه
                <ChevronLeft className="w-5 h-5" />
              </motion.button>
            </motion.div>
          )}

          {/* STEP 1: LOGO AND TITLE */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              transition={{ duration: 0.8, type: "spring", bounce: 0.3 }}
              className="w-full flex flex-col items-center text-center space-y-10"
            >
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white/90 p-6 rounded-3xl shadow-lg w-full"
              >
                <img 
                  src="/Logo.webp" 
                  alt="لوگو" 
                  className="h-24 w-auto mx-auto object-contain drop-shadow-md"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="space-y-4"
              >
                <h2 className="text-3xl font-black bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent drop-shadow-md">
                  دعوتنامه نمایشگاه
                </h2>
                <img 
                    src="/pharmex.webp" 
                    alt="فارمکس" 
                    className="h-16 w-auto mx-auto object-contain drop-shadow-lg"
                />
              </motion.div>

              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                onClick={() => setStep(2)}
                className="mt-8 flex items-center justify-center gap-2 bg-white text-[#1A4B62] px-8 py-3 rounded-full font-bold shadow-lg hover:bg-gray-100 transition-all w-full"
              >
                ادامه
                <ChevronLeft className="w-5 h-5" />
              </motion.button>
            </motion.div>
          )}

          {/* STEP 2: CONTENT */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              transition={{ duration: 0.8, type: "spring", bounce: 0.3 }}
              className="w-full bg-white/90 backdrop-blur-xl p-8 rounded-3xl border border-white/50 shadow-2xl text-slate-800 space-y-6 text-justify"
              style={{ textAlignLast: 'center' }}
            >
              <motion.p 
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                className="font-black text-[#1A4B62] text-center text-xl mb-4"
              >
                با سلام و احترام
              </motion.p>
              <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="text-lg leading-relaxed font-medium">
                با افتخار از شما دعوت می‌کنیم تا با حضور ارزشمند خود در <strong className="text-[#1A4B62]">{eventDetails.title}</strong>، میهمان غرفه تخشا دارو بهان باشید.
              </motion.p>
              <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="text-lg leading-relaxed font-medium">
                این دیدار، فرصتی است برای گفت‌وگویی تازه، آشنایی با محصولات و دستاوردهای ما و گامی برای توسعه همکاری‌های ارزشمند آینده.
              </motion.p>

              <motion.div 
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}
                className="text-center pt-6 border-t border-slate-200 mt-6"
              >
                <p className="font-bold text-[#1A4B62] text-lg">تخشا دارو بهان</p>
                <p className="text-sm font-semibold text-[#7B9C54] mt-2">همراه شما در مسیر سلامت و نوآوری</p>
              </motion.div>

              <motion.button
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}
                onClick={() => setStep(3)}
                className="mt-8 flex items-center justify-center gap-2 bg-[#1A4B62] text-white px-8 py-3 rounded-full font-bold shadow-lg hover:bg-[#12384a] transition-all w-full"
              >
                مکان و زمان برگزاری
                <ChevronLeft className="w-5 h-5" />
              </motion.button>
            </motion.div>
          )}

          {/* STEP 3: DETAILS & CTA */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, scale: 0.95, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.8, type: "spring", bounce: 0.4 }}
              className="w-full flex flex-col gap-4"
            >
              <div className="bg-white/90 backdrop-blur-xl p-6 rounded-3xl border border-white/50 shadow-2xl space-y-5">
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="flex items-center gap-4 text-slate-800">
                  <div className="bg-[#256B7D]/10 p-3 rounded-2xl text-[#256B7D]">
                    <CalendarIcon className="w-6 h-6" />
                  </div>
                  <span className="font-bold text-lg">{eventDetails.date}</span>
                </motion.div>
                
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }} className="flex items-center gap-4 text-slate-800">
                  <div className="bg-[#7B9C54]/10 p-3 rounded-2xl text-[#7B9C54]">
                    <Clock className="w-6 h-6" />
                  </div>
                  <span className="font-bold text-lg">{eventDetails.time}</span>
                </motion.div>
                
                <motion.a initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 }}
                  href={eventDetails.mapUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-4 text-slate-800 hover:text-[#256B7D] transition-colors group"
                >
                  <div className="bg-[#256B7D]/10 p-3 rounded-2xl text-[#256B7D] group-hover:bg-[#256B7D]/20 transition-colors">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-lg leading-tight">{eventDetails.location}</span>
                    <span className="text-sm text-[#256B7D] font-bold mt-1 opacity-80 group-hover:opacity-100 flex items-center gap-1">
                      <Map className="w-4 h-4" />
                      مسیریابی روی نقشه
                    </span>
                  </div>
                </motion.a>
                
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.8 }} className="flex items-center gap-4 text-slate-800 pt-4 border-t border-slate-200">
                  <div className="bg-[#1A4B62]/10 p-3 rounded-2xl text-[#1A4B62]">
                    <Building className="w-6 h-6" />
                  </div>
                  <span className="font-black text-[#1A4B62] text-lg">{eventDetails.booth}</span>
                </motion.div>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1 }}
                className="flex flex-col gap-3 mt-2"
              >
                <div className="flex gap-3 w-full">
                  <a
                    href={generateCalendarLink()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-1 flex-col items-center justify-center gap-2 bg-[#ea4335] text-white py-3 px-2 rounded-2xl font-bold transition-all shadow-lg hover:bg-[#d33a2d] transform hover:-translate-y-1"
                  >
                    <CalendarPlus className="w-5 h-5" />
                    <span className="text-sm text-center">ثبت در <br/>گوگل کلندر</span>
                  </a>
                  
                  <a
                    href={generateIcsLink()}
                    download="invite.ics"
                    className="flex flex-1 flex-col items-center justify-center gap-2 bg-slate-800 text-white py-3 px-2 rounded-2xl font-bold transition-all shadow-lg hover:bg-slate-700 transform hover:-translate-y-1"
                  >
                    <CalendarIcon className="w-5 h-5" />
                    <span className="text-sm text-center">ثبت در <br/>اپل / اوت‌لوک</span>
                  </a>
                </div>
                
                <button
                  onClick={handleShare}
                  className="flex items-center justify-center gap-3 w-full bg-white text-[#256B7D] py-4 px-6 rounded-2xl font-bold transition-all shadow-lg hover:bg-gray-50 transform hover:-translate-y-1"
                >
                  <Share2 className="w-6 h-6" />
                  <span className="text-lg">اشتراک‌گذاری</span>
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
