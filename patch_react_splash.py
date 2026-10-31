import sys

with open("index.html", "r", encoding="utf-8") as f:
    content = f.read()

splash_html = """
    <!-- Global Splash Screen -->
    <div id="global-splash" style="position:fixed;inset:0;z-index:9999;background-color:#0f172a;display:flex;flex-direction:column;align-items:center;justify-content:center;transition:opacity 0.7s;">
        <div style="position:relative;display:flex;flex-direction:column;align-items:center;">
            <div style="position:absolute;inset:0;background-color:#00B4F1;border-radius:9999px;filter:blur(24px);opacity:0.2;animation:pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;"></div>
            <img src="/Logo2.png" alt="Behansar" style="width:8rem;height:auto;object-fit:contain;position:relative;z-index:10;animation:pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;margin-bottom:2rem;" onerror="this.style.display='none'">
            <div style="width:2.5rem;height:2.5rem;border:4px solid #334155;border-top-color:#00B4F1;border-radius:9999px;animation:spin 1s linear infinite;"></div>
            <p style="margin-top:1rem;color:#00B4F1;font-weight:600;font-size:0.875rem;font-family:'Vazirmatn', sans-serif;">در حال آماده‌سازی...</p>
        </div>
    </div>
    <style>
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }
        @keyframes spin { to { transform: rotate(360deg); } }
    </style>
"""

content = content.replace('<body>', '<body>\n' + splash_html)

with open("index.html", "w", encoding="utf-8") as f:
    f.write(content)
