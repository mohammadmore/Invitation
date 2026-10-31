const fs = require('fs');
let app = fs.readFileSync('src/App.tsx', 'utf8');

// I accidentally deleted the background videos when I did `app = app.replace(/\{step > 0 && \(\s*<div className="relative w-full group mt-2">[\s\S]*?<\/motion\.div>\s*<\/motion\.div>\s*\)\}/, ...)`
// Wait, no, the check-top script showed:
/*
  return (
    <div className="min-h-screen flex flex-col p-4 sm:p-6 relative bg-slate-900 overflow-hidden text-white">
      {/* Background Audio *\/}
                  <audio id="bg-music" loop autoPlay>
*/
// The background video block WAS deleted!
// It was right after `<div className="min-h-screen ...">`

const bgVideosHTML = `
      <div className="absolute inset-0 z-0">
        <video 
          autoPlay loop muted playsInline
          className={\`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 \${step === 0 ? 'opacity-30' : 'opacity-0'}\`}
        >
          <source src="/bg-video-1.mp4" type="video/mp4" />
        </video>
        <video 
          autoPlay loop muted playsInline
          className={\`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 \${step > 0 ? 'opacity-40' : 'opacity-0'}\`}
        >
          <source src="/bg-video-2.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/60 via-slate-900/80 to-slate-900"></div>
      </div>
      
      {/* Floating Particles for extra depth */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-[#1A4B62]/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-[#7B9C54]/10 rounded-full blur-3xl"></div>
      </div>
`;

// Also, the Start button block (Step 0) is missing!! 
/*
          {/* STEP 0: INITIAL ENTRY *\/}
          {step === 0 && (
            <motion.div
              key="step0"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              transition={{ duration: 0.8 }}
              className="text-center w-full flex flex-col items-center justify-center min-h-[60vh]"
            >
              <img src="/logo.png" alt="Takhsha Darou Behan" className="w-56 h-auto mx-auto mb-12 drop-shadow-2xl brightness-110" />
              <button
                onClick={handleStart}
                className="group relative overflow-hidden bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/30 text-white px-12 py-5 rounded-full font-bold text-xl shadow-[0_0_40px_rgba(255,255,255,0.1)] transition-all duration-300 transform hover:scale-105"
              >
                <div className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-[200%] group-hover:animate-[shimmer_2s_infinite]"></div>
                <span>شروع دعوتنامه</span>
              </button>
            </motion.div>
          )}
*/

app = app.replace(
  /<div className="min-h-screen flex flex-col p-4 sm:p-6 relative bg-slate-900 overflow-hidden text-white">\s*\{\/\* Background Audio \*\/\}/,
  `<div className="min-h-screen flex flex-col p-4 sm:p-6 relative bg-slate-900 overflow-hidden text-white">\n${bgVideosHTML}\n      {/* Background Audio */}`
);

app = app.replace(
  /<AnimatePresence mode="wait">\s*\{\/\* STEP 1: WELCOME SCREEN \*\/\}/,
  `<AnimatePresence mode="wait">\n          {/* STEP 0: INITIAL ENTRY */}\n          {step === 0 && (\n            <motion.div\n              key="step0"\n              initial={{ opacity: 0, scale: 0.9 }}\n              animate={{ opacity: 1, scale: 1 }}\n              exit={{ opacity: 0, scale: 1.1 }}\n              transition={{ duration: 0.8 }}\n              className="text-center w-full flex flex-col items-center justify-center min-h-[60vh]"\n            >\n              <img src="/logo.png" alt="Takhsha Darou Behan" className="w-56 h-auto mx-auto mb-12 drop-shadow-2xl brightness-110" />\n              <button\n                onClick={handleStart}\n                className="group relative overflow-hidden bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/30 text-white px-12 py-5 rounded-full font-bold text-xl shadow-[0_0_40px_rgba(255,255,255,0.1)] transition-all duration-300 transform hover:scale-105"\n              >\n                <div className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-[200%] group-hover:animate-[shimmer_2s_infinite]"></div>\n                <span>شروع دعوتنامه</span>\n              </button>\n            </motion.div>\n          )}\n\n          {/* STEP 1: WELCOME SCREEN */}`
);

fs.writeFileSync('src/App.tsx', app);
