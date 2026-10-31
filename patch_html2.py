import sys

with open("asvashop/index.html", "r", encoding="utf-8") as f:
    content = f.read()

target = 'class="absolute top-4 sm:top-6 left-4 sm:left-6 z-50 bg-slate-800/60 hover:bg-slate-800/80 backdrop-blur-md p-3 rounded-full text-white transition-all border border-white/20 shadow-lg flex items-center justify-center"'
replacement = 'class="absolute top-20 sm:top-24 left-6 z-[110] bg-white/30 hover:bg-white/50 backdrop-blur-md p-3 rounded-full text-slate-800 transition-all shadow-md border border-white/40 flex items-center justify-center"'
content = content.replace(target, replacement)

target2 = '<i data-lucide="chevron-right" class="w-6 h-6"></i>'
replacement2 = '<i data-lucide="chevron-right" class="w-5 h-5 text-slate-800"></i>'
content = content.replace(target2, replacement2)

with open("asvashop/index.html", "w", encoding="utf-8") as f:
    f.write(content)
