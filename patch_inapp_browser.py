import sys

# HTML version
with open("asvashop/index.html", "r", encoding="utf-8") as f:
    html_content = f.read()

# JS for in-app browser detection and banner
inapp_js = """
        // Detect In-App Browsers (Telegram, Instagram, etc.)
        const isInAppBrowser = () => {
            const ua = navigator.userAgent || navigator.vendor || window.opera;
            return /Instagram|Telegram|Snapchat|WhatsApp|FBAV|FBAN|Line|Twitter|LinkedIn/i.test(ua);
        };

        if (isInAppBrowser()) {
            // Remove heavy video to prevent crashes in Telegram/WebView
            const bgVideo = document.getElementById('bg-video');
            if (bgVideo) {
                bgVideo.remove();
            }
            
            // Show a top banner warning
            const banner = document.createElement('div');
            banner.className = "fixed top-0 left-0 right-0 z-[9999] bg-[#00B4F1] text-slate-900 text-xs sm:text-sm font-bold p-3 text-center shadow-lg flex items-center justify-between";
            banner.innerHTML = `
                <span class="flex-1 text-right sm:text-center">برای تجربه بهتر و بدون قطعی، لطفاً این لینک را در مرورگر اصلی گوشی (Chrome/Safari) باز کنید.</span>
                <button onclick="this.parentElement.remove()" class="mr-3 bg-slate-900/20 hover:bg-slate-900/30 w-6 h-6 rounded-full flex items-center justify-center transition-colors">&times;</button>
            `;
            document.body.prepend(banner);
        }
"""

# Insert JS before "// Setup Video fade-in effect"
if "const video = document.getElementById('bg-video');" in html_content:
    html_content = html_content.replace(
        "const video = document.getElementById('bg-video');",
        inapp_js + "\n        const video = document.getElementById('bg-video');"
    )

with open("asvashop/index.html", "w", encoding="utf-8") as f:
    f.write(html_content)

# React version
with open("src/App.tsx", "r", encoding="utf-8") as f:
    react_content = f.read()

react_inapp_code = """
  // Detect In-App Browsers
  const [isInApp, setIsInApp] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent || navigator.vendor || (window as any).opera;
    const isApp = /Instagram|Telegram|Snapchat|WhatsApp|FBAV|FBAN|Line|Twitter|LinkedIn/i.test(ua);
    setIsInApp(isApp);
    if (isApp) setShowBanner(true);
  }, []);
"""

# Add to App component start
react_content = react_content.replace(
  "const [isMusicPlaying, setIsMusicPlaying] = useState(false);",
  "const [isMusicPlaying, setIsMusicPlaying] = useState(false);\n" + react_inapp_code
)

# Replace video with conditional render
if "<video" in react_content:
    react_content = react_content.replace(
        """<video 
          id="bg-video"
          autoPlay loop muted playsInline preload="auto"
          onCanPlay={() => setIsVideoLoaded(true)}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out ${isVideoLoaded ? 'opacity-75' : 'opacity-0'}`}
        >
          <source src="/bg.webm" type="video/webm" />
        </video>""",
        """{!isInApp && (<video 
          id="bg-video"
          autoPlay loop muted playsInline preload="auto"
          onCanPlay={() => setIsVideoLoaded(true)}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out ${isVideoLoaded ? 'opacity-75' : 'opacity-0'}`}
        >
          <source src="/bg.webm" type="video/webm" />
        </video>)}"""
    )

# Add banner JSX
banner_jsx = """
      {/* In-App Browser Banner */}
      {showBanner && (
        <div className="fixed top-0 left-0 right-0 z-[9999] bg-[#00B4F1] text-slate-900 text-xs sm:text-sm font-bold p-3 text-center shadow-lg flex items-center justify-between">
          <span className="flex-1 text-right sm:text-center">برای تجربه بهتر و روان‌تر، لطفاً از طریق منوی بالا این لینک را در مرورگر گوشی (Chrome/Safari) باز کنید.</span>
          <button onClick={() => setShowBanner(false)} className="mr-3 bg-slate-900/20 hover:bg-slate-900/30 w-6 h-6 rounded-full flex items-center justify-center transition-colors">
            ×
          </button>
        </div>
      )}
"""

react_content = react_content.replace(
    "{/* Progress Bar */}",
    banner_jsx + "\n      {/* Progress Bar */}"
)

with open("src/App.tsx", "w", encoding="utf-8") as f:
    f.write(react_content)
