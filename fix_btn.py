import sys

with open("src/App.tsx", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("w-full btn-gradient hover:scale-[1.02]", "w-full animate-gradient-btn hover:scale-[1.02]")

with open("src/App.tsx", "w", encoding="utf-8") as f:
    f.write(content)
