import sys

with open("src/App.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Remove the gradient overlay from src/App.tsx
overlay_code = '<div className="absolute inset-0 bg-gradient-to-b from-slate-900/40 via-slate-900/70 to-slate-900/95"></div>'
content = content.replace(overlay_code, '')

with open("src/App.tsx", "w", encoding="utf-8") as f:
    f.write(content)
