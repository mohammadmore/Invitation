import sys
import re

with open("src/App.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update Video block
old_video = """        {!isInApp && (<video 
          id="bg-video"
          autoPlay loop muted playsInline preload="auto"
          onCanPlay={() => setIsVideoLoaded(true)}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out ${isVideoLoaded ? 'opacity-75' : 'opacity-0'}`}
        >
          <source src="/bg.webm" type="video/webm" />
        </video>)}
      {/* In-App Browser Banner */}"""

new_video = """        <video 
          id="bg-video"
          autoPlay loop muted playsInline preload="auto"
          onCanPlay={() => setIsVideoLoaded(true)}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out ${isVideoLoaded ? 'opacity-75' : 'opacity-0'}`}
        >
          <source src="/bg.mp4" type="video/mp4" />
          <source src="/bg.webm" type="video/webm" />
        </video>
      {/* In-App Browser Banner */}"""

if old_video in content:
    content = content.replace(old_video, new_video)
else:
    # Try more loose replace
    import re
    content = re.sub(
        r'\{\!isInApp && \(<video[^>]+>.*?<source src="/bg\.webm"[^>]+>.*?</video>\)\}',
        r'<video id="bg-video" autoPlay loop muted playsInline preload="auto" onCanPlay={() => setIsVideoLoaded(true)} className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out ${isVideoLoaded ? "opacity-75" : "opacity-0"}`}><source src="/bg.mp4" type="video/mp4" /><source src="/bg.webm" type="video/webm" /></video>',
        content,
        flags=re.DOTALL
    )

# 2. Step 2 Update
old_step_2 = """            <motion.div
              key="step2"
              initial={{ opacity: 0, scale: 0.95, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -50 }}
              transition={{ duration: 0.8, type: "spring", bounce: 0.4 }}
              className="bg-white/90 backdrop-blur-xl p-5 sm:p-8 rounded-3xl border border-white/50 shadow-2xl text-slate-800 w-full relative"
            >
              {/* Floating Logo */}
              <div className="absolute -top-7 sm:-top-10 left-1/2 transform -translate-x-1/2 bg-white p-2.5 sm:p-3 rounded-full shadow-xl">
                <img src="/Logo2.png" alt="Logo" className="w-12 h-12 sm:w-16 sm:h-16 object-contain" />
              </div>
              
              <motion.div 
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                className="text-center mb-3 sm:mb-6 pt-10 sm:pt-12 border-b border-slate-200 pb-2 sm:pb-4"
              >
                <h2 className="text-[20px] sm:text-2xl font-black text-[#0033A0]">دعوت‌نامه رسمی</h2>
              </motion.div>
              
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
                className="space-y-2 sm:space-y-4"
              >
                <p className="text-[14.5px] sm:text-lg leading-[1.6] sm:leading-relaxed font-medium text-justify">
                  با سلام و احترام<br/>
                  با افتخار از شما دعوت میکنیم تا با حضور ارزشمند خود در نمایشگاه ایران فارما، میهمان غرفه بهان سار باشید.
                </p>
                <p className="text-[14.5px] sm:text-lg leading-[1.6] sm:leading-relaxed font-medium text-justify">
                  این دیدار، فرصتی است برای گفتوگویی تازه، آشنایی با محصولات و دستاوردهای ما و گامی برای توسعه همکاریهای ارزشمند آینده.
                </p>
              </motion.div>
              
              <motion.div 
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
                className="text-center pt-3 sm:pt-6 border-t border-slate-200 mt-3 sm:mt-6"
              >
                <p className="font-bold text-[#0033A0] text-base sm:text-lg">بهان سار</p>
                <p className="text-xs sm:text-sm font-semibold text-[#00B4F1] mt-1 sm:mt-2">همراه شما در مسیر سلامت و نوآوری</p>
              </motion.div>
              
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.8 }}
                onClick={() => setStep(3)}
                className="mt-4 sm:mt-8 flex items-center justify-center gap-2 text-white px-6 sm:px-8 py-2.5 sm:py-3 rounded-full font-bold shadow-lg transition-all w-full btn-gradient hover:scale-[1.02] hover:shadow-[0_10px_25px_rgba(26,75,98,0.4)]"
              >
                <span className="text-sm sm:text-base">مکان و زمان برگزاری</span>
                <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              </motion.button>
              
              <motion.button
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}
                onClick={() => setStep(1)}
                className="mt-3 sm:mt-5 text-[13px] sm:text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors flex items-center justify-center gap-1 mx-auto w-full"
              >
                <ChevronRight className="w-4 h-4" />
                بازگشت به صفحه قبل
              </motion.button>
            </motion.div>"""

new_step_2 = """            <motion.div
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
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
                className="space-y-2 sm:space-y-3 pt-8 sm:pt-10"
              >
                <p className="text-[14.5px] sm:text-[17px] leading-[1.6] sm:leading-[1.7] font-medium text-justify">
                  با سلام و احترام<br/>
                  با افتخار از شما دعوت میکنیم تا با حضور ارزشمند خود در نمایشگاه ایران فارما، میهمان غرفه بهان سار باشید.
                </p>
                <p className="text-[14.5px] sm:text-[17px] leading-[1.6] sm:leading-[1.7] font-medium text-justify">
                  این دیدار، فرصتی است برای گفتوگویی تازه، آشنایی با محصولات و دستاوردهای ما و گامی برای توسعه همکاریهای ارزشمند آینده.
                </p>
              </motion.div>
              
              <motion.div 
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
                className="text-center pt-3 sm:pt-4 border-t border-slate-200 mt-3 sm:mt-4"
              >
                <p className="font-bold text-[#0033A0] text-sm sm:text-base">بهان سار</p>
                <p className="text-xs sm:text-sm font-semibold text-[#00B4F1] mt-0.5 sm:mt-1">همراه شما در مسیر سلامت و نوآوری</p>
              </motion.div>
              
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.8 }}
                onClick={() => setStep(3)}
                className="mt-4 sm:mt-5 flex items-center justify-center gap-2 text-white px-6 sm:px-8 py-2.5 sm:py-3 rounded-full font-bold shadow-lg transition-all w-full btn-gradient hover:scale-[1.02] hover:shadow-[0_10px_25px_rgba(26,75,98,0.4)]"
              >
                <span className="text-sm sm:text-base">مکان و زمان برگزاری</span>
                <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              </motion.button>
              
              <motion.button
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}
                onClick={() => setStep(1)}
                className="mt-3 sm:mt-4 text-[13px] sm:text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors flex items-center justify-center gap-1 mx-auto w-full"
              >
                <ChevronRight className="w-4 h-4" />
                بازگشت به صفحه قبل
              </motion.button>
            </motion.div>"""

if old_step_2 in content:
    content = content.replace(old_step_2, new_step_2)
else:
    print("Warning: old step 2 not matched perfectly.")

with open("src/App.tsx", "w", encoding="utf-8") as f:
    f.write(content)
