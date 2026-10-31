const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Replace videos
code = code.replace(
  /<video \n          autoPlay loop muted playsInline poster="\/step1-poster\.jpg"\n          className=\{`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 \$\{step <= 1 \? 'opacity-75' : 'opacity-0'\}`\}\n        >/,
  '<video \n          id="video-step1"\n          autoPlay loop muted playsInline preload="auto" poster="/step1-poster.jpg"\n          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${step <= 1 ? "opacity-75" : "opacity-0"}`}\n        >'
);

code = code.replace(
  /<video \n          autoPlay loop muted playsInline poster="\/step2-poster\.jpg"\n          className=\{`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 \$\{step === 2 \? 'opacity-75' : 'opacity-0'\}`\}\n        >/,
  '<video \n          id="video-step2"\n          loop muted playsInline preload="none" poster="/step2-poster.jpg"\n          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${step === 2 ? "opacity-75" : "opacity-0"}`}\n        >'
);

code = code.replace(
  /<video \n          autoPlay loop muted playsInline poster="\/step3-poster\.jpg"\n          className=\{`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 \$\{step === 3 \? 'opacity-75' : 'opacity-0'\}`\}\n        >/,
  '<video \n          id="video-step3"\n          loop muted playsInline preload="none" poster="/step3-poster.jpg"\n          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${step === 3 ? "opacity-75" : "opacity-0"}`}\n        >'
);

// We need a useEffect to handle playing/pausing based on step
const effectCode = `
  useEffect(() => {
    const v1 = document.getElementById('video-step1') as HTMLVideoElement;
    const v2 = document.getElementById('video-step2') as HTMLVideoElement;
    const v3 = document.getElementById('video-step3') as HTMLVideoElement;
    
    if (v1 && v2 && v3) {
      if (step <= 1) {
        v1.play().catch(()=>{});
        v2.pause();
        v3.pause();
      } else if (step === 2) {
        v2.play().catch(()=>{});
        v1.pause();
        v3.pause();
      } else if (step === 3) {
        v3.play().catch(()=>{});
        v1.pause();
        v2.pause();
      }
    }
  }, [step]);
`;

// Insert the new useEffect before the existing eventDetails
code = code.replace(
  '  const eventDetails = {',
  effectCode + '\n  const eventDetails = {'
);

fs.writeFileSync('src/App.tsx', code);
console.log('Optimized React');
