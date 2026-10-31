import sys

with open("src/App.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Swap mp4 and webm, add crossOrigin, remove darkening overlay
old_video = """        <video 
          id="bg-video"
          autoPlay loop muted playsInline preload="auto"
          onCanPlay={() => setIsVideoLoaded(true)}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out ${isVideoLoaded ? 'opacity-75' : 'opacity-0'}`}
        >
          <source src="/bg.webm" type="video/webm" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/40 via-slate-900/70 to-slate-900/95"></div>"""

new_video = """        <video 
          id="bg-video"
          autoPlay loop muted playsInline preload="auto"
          onCanPlay={() => setIsVideoLoaded(true)}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out ${isVideoLoaded ? 'opacity-75' : 'opacity-0'}`}
        >
          <source src="/bg.mp4" type="video/mp4" />
          <source src="/bg.webm" type="video/webm" />
        </video>"""

content = content.replace(old_video, new_video)

# 2. Update step 2 content (remove title, reduce padding)
old_step_2 = """            <motion.div 
              key="step-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="bg-white/90 backdrop-blur-xl p-5 sm:p-8 rounded-3xl border border-white/50 shadow-2xl text-slate-800 w-full relative"
            >
              {/* Floating Logo */}
              <div className="absolute -top-7 sm:-top-10 left-1/2 transform -translate-x-1/2 bg-white p-2.5 sm:p-3 rounded-full shadow-xl">
                <img src="/Logo2.png" alt="Logo" className="w-12 h-12 sm:w-16 sm:h-16 object-contain" />
              </div>
              
              <div className="text-center mb-3 sm:mb-6 pt-10 sm:pt-12 border-b border-slate-200 pb-2 sm:pb-4">
                <h2 className="text-[20px] sm:text-2xl font-black text-[#0033A0]">دعوت‌نامه رسمی</h2>
              </div>
              
              <div className="space-y-2 sm:space-y-4">
                <p className="text-[14.5px] sm:text-lg leading-[1.6] sm:leading-relaxed font-medium text-justify">
                  با سلام و احترام<br/>
                  با افتخار از شما دعوت میکنیم تا با حضور ارزشمند خود در نمایشگاه ایران فارما، میهمان غرفه بهان سار باشید.
                </p>
                <p className="text-[14.5px] sm:text-lg leading-[1.6] sm:leading-relaxed font-medium text-justify">
                  این دیدار، فرصتی است برای گفتوگویی تازه، آشنایی با محصولات و دستاوردهای ما و گامی برای توسعه همکاریهای ارزشمند آینده.
                </p>
              </div>
              
              <div className="text-center pt-3 sm:pt-6 border-t border-slate-200 mt-3 sm:mt-6">
                <p className="font-bold text-[#0033A0] text-base sm:text-lg">بهان سار</p>
                <p className="text-xs sm:text-sm font-semibold text-[#00B4F1] mt-1 sm:mt-2">همراه شما در مسیر سلامت و نوآوری</p>
              </div>
              
              <button
                onClick={() => setStep(3)}
                className="mt-4 sm:mt-8 flex items-center justify-center gap-2 text-white px-6 sm:px-8 py-2.5 sm:py-3 rounded-full font-bold shadow-lg transition-all w-full btn-gradient hover:scale-[1.02] hover:shadow-[0_10px_25px_rgba(26,75,98,0.4)]"
              >
                <span className="text-sm sm:text-base">مکان و زمان برگزاری</span>
                <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              
              <button
                onClick={() => setStep(1)}
                className="mt-3 sm:mt-5 text-[13px] sm:text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors flex items-center justify-center gap-1 mx-auto w-full"
              >
                <ChevronRight className="w-4 h-4" />
                بازگشت به صفحه قبل
              </button>
            </motion.div>"""

new_step_2 = """            <motion.div 
              key="step-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="bg-white/90 backdrop-blur-xl p-4 sm:p-6 pb-4 sm:pb-5 rounded-3xl border border-white/50 shadow-2xl text-slate-800 w-full relative"
            >
              {/* Floating Logo */}
              <div className="absolute -top-7 sm:-top-10 left-1/2 transform -translate-x-1/2 bg-white p-2.5 sm:p-3 rounded-full shadow-xl z-10">
                <img src="/Logo2.png" alt="Logo" className="w-12 h-12 sm:w-16 sm:h-16 object-contain" />
              </div>
              
              <div className="space-y-2 sm:space-y-3 pt-8 sm:pt-10">
                <p className="text-[14.5px] sm:text-[17px] leading-[1.6] sm:leading-[1.7] font-medium text-justify">
                  با سلام و احترام<br/>
                  با افتخار از شما دعوت میکنیم تا با حضور ارزشمند خود در نمایشگاه ایران فارما، میهمان غرفه بهان سار باشید.
                </p>
                <p className="text-[14.5px] sm:text-[17px] leading-[1.6] sm:leading-[1.7] font-medium text-justify">
                  این دیدار، فرصتی است برای گفتوگویی تازه، آشنایی با محصولات و دستاوردهای ما و گامی برای توسعه همکاریهای ارزشمند آینده.
                </p>
              </div>
              
              <div className="text-center pt-3 sm:pt-4 border-t border-slate-200 mt-3 sm:mt-4">
                <p className="font-bold text-[#0033A0] text-sm sm:text-base">بهان سار</p>
                <p className="text-xs sm:text-sm font-semibold text-[#00B4F1] mt-0.5 sm:mt-1">همراه شما در مسیر سلامت و نوآوری</p>
              </div>
              
              <button
                onClick={() => setStep(3)}
                className="mt-4 sm:mt-5 flex items-center justify-center gap-2 text-white px-6 sm:px-8 py-2.5 sm:py-3 rounded-full font-bold shadow-lg transition-all w-full btn-gradient hover:scale-[1.02] hover:shadow-[0_10px_25px_rgba(26,75,98,0.4)]"
              >
                <span className="text-sm sm:text-base">مکان و زمان برگزاری</span>
                <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              
              <button
                onClick={() => setStep(1)}
                className="mt-3 sm:mt-4 text-[13px] sm:text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors flex items-center justify-center gap-1 mx-auto w-full"
              >
                <ChevronRight className="w-4 h-4" />
                بازگشت به صفحه قبل
              </button>
            </motion.div>"""

content = content.replace(old_step_2, new_step_2)

# 3. Handle performance stuff: stop video/particles on map step, use iframe lazy correctly
old_iframe = """              <iframe src="https://asvashop.com/behansar/map" className="w-full h-full border-0" title="Map"></iframe>"""

new_iframe = """              <div id="root" className="w-full h-full border-0"></div>
              {/* Note: React version relies on external load or you can use iframe if it works better for React */}
              <iframe src="https://asvashop.com/behansar/map" className="w-full h-full border-0 absolute inset-0" title="Map"></iframe>"""

content = content.replace(old_iframe, new_iframe)


# 4. Particles update
old_particles = """      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-[#0033A0]/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-[#00B4F1]/10 rounded-full blur-3xl"></div>
      </div>"""

new_particles = """      <div id="particles" className={`absolute inset-0 z-0 overflow-hidden pointer-events-none ${step === 4 ? 'hidden' : 'block'}`}>
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-[#0033A0]/20 rounded-full blur-3xl" style={{ transform: 'translateZ(0)', willChange: 'transform' }}></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-[#00B4F1]/10 rounded-full blur-3xl" style={{ transform: 'translateZ(0)', willChange: 'transform' }}></div>
      </div>"""

content = content.replace(old_particles, new_particles)

with open("src/App.tsx", "w", encoding="utf-8") as f:
    f.write(content)
