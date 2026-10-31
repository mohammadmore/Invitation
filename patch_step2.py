import sys

with open("asvashop/index.html", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Remove the darkening overlay
content = content.replace(
    '<div class="absolute inset-0 bg-gradient-to-b from-slate-900/40 via-slate-900/70 to-slate-900/95"></div>',
    ''
)

# 2. Re-work the Step 2 structure
old_step_2 = """        <!-- STEP 2: Message -->
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
        </div>"""

new_step_2 = """        <!-- STEP 2: Message -->
        <div id="step-2" class="step" style="transform: translateY(20px);">
            <div class="bg-white/90 backdrop-blur-xl p-4 sm:p-6 pb-4 sm:pb-5 rounded-3xl border border-white/50 shadow-2xl text-slate-800 w-full relative">
                <!-- Floating Logo -->
                <div class="absolute -top-7 sm:-top-10 left-1/2 transform -translate-x-1/2 bg-white p-2.5 sm:p-3 rounded-full shadow-xl z-10">
                    <img src="Logo2.png" alt="Logo" class="w-12 h-12 sm:w-16 sm:h-16 object-contain">
                </div>
                
                <div class="space-y-2 sm:space-y-3 pt-8 sm:pt-10">
                    <p class="text-[14.5px] sm:text-[17px] leading-[1.6] sm:leading-[1.7] font-medium text-justify">
                        با سلام و احترام<br>
                        با افتخار از شما دعوت میکنیم تا با حضور ارزشمند خود در نمایشگاه ایران فارما، میهمان غرفه بهان سار باشید.
                    </p>
                    <p class="text-[14.5px] sm:text-[17px] leading-[1.6] sm:leading-[1.7] font-medium text-justify">
                        این دیدار، فرصتی است برای گفتوگویی تازه، آشنایی با محصولات و دستاوردهای ما و گامی برای توسعه همکاریهای ارزشمند آینده.
                    </p>
                </div>
                
                <div class="text-center pt-3 sm:pt-4 border-t border-slate-200 mt-3 sm:mt-4">
                    <p class="font-bold text-[#0033A0] text-sm sm:text-base">بهان سار</p>
                    <p class="text-xs sm:text-sm font-semibold text-[#00B4F1] mt-0.5 sm:mt-1">همراه شما در مسیر سلامت و نوآوری</p>
                </div>
                
                <button onclick="goToStep(3)" class="mt-4 sm:mt-5 flex items-center justify-center gap-2 text-white px-6 sm:px-8 py-2.5 sm:py-3 rounded-full font-bold shadow-lg transition-all w-full btn-gradient hover:scale-[1.02] hover:shadow-[0_10px_25px_rgba(26,75,98,0.4)]">
                    <span class="text-sm sm:text-base">مکان و زمان برگزاری</span>
                    <i data-lucide="chevron-left" class="w-4 h-4 sm:w-5 sm:h-5"></i>
                </button>
                
                <button onclick="goToStep(1)" class="mt-3 sm:mt-4 text-[13px] sm:text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors flex items-center justify-center gap-1 mx-auto w-full">
                    <i data-lucide="chevron-right" class="w-4 h-4"></i>
                    بازگشت به صفحه قبل
                </button>
            </div>
        </div>"""

if old_step_2 in content:
    content = content.replace(old_step_2, new_step_2)
else:
    print("WARNING: Step 2 block not found! Might be due to spaces/newlines.")

with open("asvashop/index.html", "w", encoding="utf-8") as f:
    f.write(content)
