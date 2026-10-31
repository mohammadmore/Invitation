import sys

with open("src/App.tsx", "r", encoding="utf-8") as f:
    content = f.read()

remove_splash_js = """
  // Remove splash screen when app is loaded
  useEffect(() => {
    const splash = document.getElementById('global-splash');
    const handleLoad = () => {
      if (splash) {
        splash.style.opacity = '0';
        setTimeout(() => splash.remove(), 700);
      }
    };
    
    // Check if document is already loaded
    if (document.readyState === 'complete') {
      handleLoad();
    } else {
      window.addEventListener('load', handleLoad);
      // Fallback
      const timeout = setTimeout(handleLoad, 4000);
      return () => {
        window.removeEventListener('load', handleLoad);
        clearTimeout(timeout);
      };
    }
  }, []);
"""

content = content.replace('  useEffect(() => {\n    const audio = document.getElementById(\'bg-music\')', remove_splash_js + '\n  useEffect(() => {\n    const audio = document.getElementById(\'bg-music\')')

with open("src/App.tsx", "w", encoding="utf-8") as f:
    f.write(content)
