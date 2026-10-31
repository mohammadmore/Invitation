import sys

with open("asvashop/index.html", "r", encoding="utf-8") as f:
    content = f.read()

# Insert button above calendar links
button_code = """                    <button onclick="goToStep(4)" class="mb-2 sm:mb-3 flex items-center justify-center gap-2 sm:gap-3 w-full text-white py-3 sm:py-4 px-6 rounded-2xl font-bold transition-all shadow-lg btn-gradient hover:scale-[1.02] hover:shadow-[0_10px_25px_rgba(26,75,98,0.4)]">
                        <i data-lucide="map" class="w-5 h-5 sm:w-6 sm:h-6"></i>
                        <span class="text-base sm:text-lg">مکان‌یابی دقیق غرفه</span>
                    </button>
"""
target_1 = '<div class="flex gap-2 sm:gap-3 w-full">'
content = content.replace(target_1, button_code + '                    ' + target_1)

# Insert step 4 code
step_4_code = """
        <!-- STEP 4: Fullscreen Map -->
        <div id="step-4" class="step" style="transform: translateY(20px); padding: 0; max-width: 100%;">
            <div class="fixed inset-0 z-[100] w-full h-full bg-slate-900">
                <button onclick="goToStep(3)" class="absolute top-4 sm:top-6 left-4 sm:left-6 z-50 bg-slate-800/60 hover:bg-slate-800/80 backdrop-blur-md p-3 rounded-full text-white transition-all border border-white/20 shadow-lg flex items-center justify-center">
                    <i data-lucide="chevron-right" class="w-6 h-6"></i>
                </button>
                <iframe src="https://asvashop.com/behansar/map" class="w-full h-full border-0" title="Map"></iframe>
            </div>
        </div>
"""
target_2 = '    </div>\n\n    <!-- Footer Credits -->'
content = content.replace(target_2, step_4_code + target_2)

# Update Javascript
js_code_old = """            if (step > 1) {
                audioBtn.classList.remove('hidden');
            } else {
                audioBtn.classList.add('hidden');
            }
        
            // Hide all steps"""
js_code_new = """            if (step > 1 && step !== 4) {
                audioBtn.classList.remove('hidden');
            } else {
                audioBtn.classList.add('hidden');
            }
        
            // Hide all steps"""
content = content.replace(js_code_old, js_code_new)

js_code_old2 = """            if (step === 2) {
                footer.style.opacity = '0';
                footer.style.pointerEvents = 'none';
            } else {
                footer.style.opacity = '1';
                footer.style.pointerEvents = 'auto';
            }"""
js_code_new2 = """            if (step === 2 || step === 4) {
                footer.style.opacity = '0';
                footer.style.pointerEvents = 'none';
            } else {
                footer.style.opacity = '1';
                footer.style.pointerEvents = 'auto';
            }"""
content = content.replace(js_code_old2, js_code_new2)

with open("asvashop/index.html", "w", encoding="utf-8") as f:
    f.write(content)
