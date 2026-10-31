import sys

with open("src/App.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Update React video pause logic on step 4
old_step_state = """  const [step, setStep] = useState(1);"""
new_step_state = """  const [step, setStep] = useState(1);

  // Pause background video when on step 4 (map)
  useEffect(() => {
    const video = document.getElementById('bg-video') as HTMLVideoElement;
    if (video) {
      if (step === 4) {
        video.pause();
      } else {
        if (video.readyState >= 3) {
           video.play().catch(e => console.log('Autoplay blocked:', e));
        }
      }
    }
  }, [step]);
"""
content = content.replace(old_step_state, new_step_state)

with open("src/App.tsx", "w", encoding="utf-8") as f:
    f.write(content)
