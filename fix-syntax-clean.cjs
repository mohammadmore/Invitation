const fs = require('fs');
let app = fs.readFileSync('src/App.tsx', 'utf8');

// I need to carefully replace the whole malformed part. Let's see what is currently in the file.
// The broken section starts from `{step > 0 && (` which was supposed to be the music button
// Let's replace the whole section starting from `{/* Music Toggle Button */}` down to the end of the file.

const brokenPartStart = app.indexOf('{/* Music Toggle Button */}');
if (brokenPartStart > -1) {
    const validTop = app.substring(0, brokenPartStart);
    
    // I will reconstruct the bottom part exactly as it should be.
    const bottomPart = `{/* Music Toggle Button */}
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

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center max-w-lg mx-auto w-full">
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
                <img src="/logo.png" alt="Takhsha Darou Behan" className="w-48 h-auto mx-auto drop-shadow-2xl relative z-10" />
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.8 }}
                className="bg-white/90 backdrop-blur-xl p-8 rounded-3xl border border-white/50 shadow-2xl"
              >
                <h1 className="text-3xl font-black text-[#1A4B62] mb-6 leading-tight">
                  <span className="block text-[#7B9C54] text-xl mb-2 font-bold">دعوتنامه رسمی</span>
                  {eventDetails.title}
                </h1>
                
                <p className="text-slate-600 mb-8 font-medium text-lg">
                  مفتخریم میزبان شما در این رویداد بزرگ باشیم
                </p>

                <div className="relative w-full group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-[#1A4B62] via-[#7B9C54] to-[#256B7D] rounded-full blur-md opacity-60 group-hover:opacity-100 transition duration-1000 animate-float-gradient"></div>
                  <button
                    onClick={() => setStep(2)}
                    className="relative flex items-center justify-center gap-2 bg-[#1A4B62] text-white px-8 py-4 rounded-full font-bold shadow-lg hover:bg-[#12384a] transition-all w-full"
                  >
                    <span className="text-lg">تایید و ورود</span>
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                </div>
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
              className="bg-white/90 backdrop-blur-xl p-8 rounded-3xl border border-white/50 shadow-2xl text-slate-800 w-full"
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
              
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} className="relative w-full group mt-8">
                <div className="absolute -inset-1 bg-gradient-to-r from-[#1A4B62] via-[#7B9C54] to-[#256B7D] rounded-full blur-md opacity-60 group-hover:opacity-100 transition duration-1000 animate-float-gradient"></div>
                <button
                  onClick={() => setStep(3)}
                  className="relative flex items-center justify-center gap-2 bg-[#1A4B62] text-white px-8 py-3 rounded-full font-bold shadow-lg hover:bg-[#12384a] transition-all w-full"
                >
                  مکان و زمان برگزاری
                  <ChevronLeft className="w-5 h-5" />
                </button>
              </motion.div>
              
              <motion.button
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1 }}
                onClick={() => setStep(1)}
                className="mt-5 text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors flex items-center justify-center gap-1 mx-auto"
              >
                <ChevronRight className="w-4 h-4" />
                بازگشت به صفحه قبل
              </motion.button>
            </motion.div>
          )}

          {/* STEP 3: DETAILS & CTA */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, scale: 0.95, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 50 }}
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
                    className="flex flex-1 flex-col items-center justify-center gap-2 bg-white text-slate-800 py-3 px-2 rounded-2xl font-bold transition-all shadow-lg border border-slate-100 hover:bg-slate-50 transform hover:-translate-y-1"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                    <span className="text-sm text-center">ثبت در <br/>گوگل کلندر</span>
                  </a>
                  
                  <a
                    href={generateIcsLink()}
                    download="invite.ics"
                    className="flex flex-1 flex-col items-center justify-center gap-2 bg-white text-slate-800 py-3 px-2 rounded-2xl font-bold transition-all shadow-lg border border-slate-100 hover:bg-slate-50 transform hover:-translate-y-1"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 384 512" fill="currentColor"><path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/></svg>
                    <span className="text-sm text-center">ثبت در <br/>اپل / اوت‌لوک</span>
                  </a>
                </div>
                
                <div className="relative w-full group mt-2">
                  <div className="absolute -inset-1 bg-gradient-to-r from-[#256B7D] via-[#7B9C54] to-[#1A4B62] rounded-2xl blur-md opacity-40 group-hover:opacity-80 transition duration-1000 animate-float-gradient"></div>
                  <button
                    onClick={handleShare}
                    className="relative flex items-center justify-center gap-3 w-full bg-white text-[#256B7D] py-4 px-6 rounded-2xl font-bold transition-all shadow-lg hover:bg-gray-50"
                  >
                    <Share2 className="w-6 h-6" />
                    <span className="text-lg">اشتراک‌گذاری</span>
                  </button>
                </div>
                
                <button
                  onClick={() => setStep(2)}
                  className="mt-5 text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors flex items-center justify-center gap-1 mx-auto"
                >
                  <ChevronRight className="w-4 h-4" />
                  بازگشت به صفحه قبل
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}`;

    fs.writeFileSync('src/App.tsx', validTop + bottomPart);
}
