const fs = require('fs');

try {
  // --- 1. React (src/App.tsx) ---
  let app = fs.readFileSync('src/App.tsx', 'utf8');

  // Remove the useEffect that manages v1, v2, v3
  const effectStart = app.indexOf('  useEffect(() => {\n    const v1 = document.getElementById(\'video-step1\')');
  if (effectStart !== -1) {
    const effectEnd = app.indexOf('  }, [step]);\n', effectStart) + '  }, [step]);\n'.length;
    app = app.slice(0, effectStart) + app.slice(effectEnd);
  }

  // Replace the 3 videos with a single persistent one
  const vidStart = app.indexOf('<video \n          id="video-step1"');
  const vidEndStr = '<source src="/step3-bg.webm" type="video/webm" />\n        </video>';
  const vidEnd = app.indexOf(vidEndStr);
  
  if (vidStart !== -1 && vidEnd !== -1) {
    const singleVid = `<video 
          id="bg-video"
          autoPlay loop muted playsInline preload="auto" poster="/step1-poster.jpg"
          className="absolute inset-0 w-full h-full object-cover opacity-75"
        >
          <source src="/step1-bg.webm" type="video/webm" />
        </video>`;
    app = app.slice(0, vidStart) + singleVid + app.slice(vidEnd + vidEndStr.length);
  } else {
    console.log("Could not find video block in React");
  }

  fs.writeFileSync('src/App.tsx', app);
  console.log('Updated src/App.tsx');


  // --- 2. HTML (standalone-invite.html) ---
  let html = fs.readFileSync('standalone-invite.html', 'utf8');
  
  // Remove video 2 and 3 tags
  const step2Vid = '<video id="video-step2" src="step2-bg.webm" poster="step2-poster.jpg" class="bg-video" loop muted playsinline preload="none"></video>';
  const step3Vid = '<video id="video-step3" src="step3-bg.webm" poster="step3-poster.jpg" class="bg-video" loop muted playsinline preload="none"></video>';
  html = html.replace(step2Vid, '');
  html = html.replace(step3Vid, '');
  
  // Remove the extra newlines if any
  html = html.replace(/\n\s*\n\s*<!-- Overlay -->/, '\n  <!-- Overlay -->');

  // Clean up JS logic for switching videos
  html = html.replace(/[ \t]*updateVideos\(step\);\n/, '');
  
  const funcStart = html.indexOf('    function updateVideos(step) {');
  if (funcStart !== -1) {
    const funcEnd = html.indexOf('    function shareInvite() {', funcStart);
    if (funcEnd !== -1) {
      html = html.slice(0, funcStart) + html.slice(funcEnd);
    }
  }

  fs.writeFileSync('standalone-invite.html', html);
  console.log('Updated standalone-invite.html');

} catch(e) {
  console.error(e);
}
