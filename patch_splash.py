import sys

with open("asvashop/index.html", "r", encoding="utf-8") as f:
    content = f.read()

# Insert splash screen right after <body>
splash_html = """
    <!-- Splash Screen -->
    <div id="splash-screen" class="fixed inset-0 z-[9999] bg-slate-900 flex flex-col items-center justify-center transition-opacity duration-700">
        <div class="relative flex flex-col items-center">
            <div class="absolute inset-0 bg-[#00B4F1] rounded-full blur-2xl opacity-20 animate-pulse"></div>
            <img src="Logo2.png" alt="Behansar" class="w-24 sm:w-32 h-auto object-contain relative z-10 animate-pulse mb-8" onerror="this.style.display='none'">
            <div class="w-10 h-10 border-4 border-slate-700 border-t-[#00B4F1] rounded-full animate-spin"></div>
            <p class="mt-4 text-[#00B4F1] font-semibold text-sm sm:text-base tracking-wide">در حال آماده‌سازی...</p>
        </div>
    </div>
"""

content = content.replace('<body class="relative flex flex-col items-center justify-center min-h-[100dvh]">', '<body class="relative flex flex-col items-center justify-center min-h-[100dvh]">' + splash_html)

# Insert splash JS right after <script> Initialize Icons
splash_js = """
        // Splash Screen Logic
        const removeSplash = () => {
            const splash = document.getElementById('splash-screen');
            if (splash && splash.style.opacity !== '0') {
                splash.style.opacity = '0';
                setTimeout(() => { if (splash.parentNode) splash.remove(); }, 700);
            }
        };
        window.addEventListener('load', removeSplash);
        setTimeout(removeSplash, 5000); // Fallback if loading takes too long
"""

content = content.replace('lucide.createIcons();', 'lucide.createIcons();\n' + splash_js)

with open("asvashop/index.html", "w", encoding="utf-8") as f:
    f.write(content)
