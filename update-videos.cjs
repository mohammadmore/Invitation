const fs = require('fs');
let app = fs.readFileSync('src/App.tsx', 'utf8');

const oldVideos = `<video 
          autoPlay loop muted playsInline
          className={\`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 \${step === 0 ? 'opacity-30' : 'opacity-0'}\`}
        >
          <source src="/bg-video-1.webm" type="video/webm" />
        </video>
        <video 
          autoPlay loop muted playsInline
          className={\`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 \${step > 0 ? 'opacity-40' : 'opacity-0'}\`}
        >
          <source src="/bg-video-2.webm" type="video/webm" />
        </video>`;

const newVideos = `<video 
          autoPlay loop muted playsInline
          className={\`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 \${step <= 1 ? 'opacity-40' : 'opacity-0'}\`}
        >
          <source src="/step1-bg.webm" type="video/webm" />
        </video>
        <video 
          autoPlay loop muted playsInline
          className={\`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 \${step === 2 ? 'opacity-40' : 'opacity-0'}\`}
        >
          <source src="/step2-bg.webm" type="video/webm" />
        </video>
        <video 
          autoPlay loop muted playsInline
          className={\`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 \${step === 3 ? 'opacity-40' : 'opacity-0'}\`}
        >
          <source src="/step3-bg.webm" type="video/webm" />
        </video>`;

app = app.replace(oldVideos, newVideos);
fs.writeFileSync('src/App.tsx', app);
