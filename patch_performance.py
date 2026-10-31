import sys

with open("asvashop/index.html", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Swap mp4 and webm
content = content.replace(
    '<source src="bg.webm" type="video/webm">\n            <source src="bg.mp4" type="video/mp4">',
    '<source src="bg.mp4" type="video/mp4">\n            <source src="bg.webm" type="video/webm">'
)

# 2. Add ID to particles and add hardware acceleration
old_particles = """    <!-- Floating Particles -->
    <div class="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div class="absolute top-1/4 left-1/4 w-64 h-64 bg-[#0033A0]/20 rounded-full blur-3xl"></div>
        <div class="absolute bottom-1/4 right-1/4 w-80 h-80 bg-[#00B4F1]/10 rounded-full blur-3xl"></div>
    </div>"""

new_particles = """    <!-- Floating Particles -->
    <div id="particles" class="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div class="absolute top-1/4 left-1/4 w-64 h-64 bg-[#0033A0]/20 rounded-full blur-3xl" style="transform: translateZ(0); will-change: transform;"></div>
        <div class="absolute bottom-1/4 right-1/4 w-80 h-80 bg-[#00B4F1]/10 rounded-full blur-3xl" style="transform: translateZ(0); will-change: transform;"></div>
    </div>"""

content = content.replace(old_particles, new_particles)


# 3. Update goToStep function
old_goto = """        // Steps Logic
        function goToStep(step) {
            // Lazy load map app when step 4 is opened
            if (step === 4) {
                const mapRoot = document.getElementById('root');
                if (mapRoot && mapRoot.classList.contains('hidden')) {
                    mapRoot.classList.remove('hidden');
                    // Load the map script dynamically to avoid parsing heavy JS on load
                    if (!document.getElementById('map-script')) {
                        const script = document.createElement('script');
                        script.id = 'map-script';
                        script.type = 'module';
                        script.src = 'assets/index-BQ2rVklb.js';
                        document.body.appendChild(script);
                    }
                }
            }"""

new_goto = """        // Steps Logic
        function goToStep(step) {
            const bgVideoEl = document.getElementById('bg-video');
            const particlesEl = document.getElementById('particles');
            
            // Lazy load map app when step 4 is opened
            if (step === 4) {
                // Pause video and hide particles to free up 100% of GPU for the 3D map
                if (bgVideoEl) bgVideoEl.pause();
                if (particlesEl) particlesEl.style.display = 'none';

                const mapRoot = document.getElementById('root');
                if (mapRoot && mapRoot.classList.contains('hidden')) {
                    mapRoot.classList.remove('hidden');
                    
                    // Add a loading indicator for iOS users
                    if (mapRoot.innerHTML === '') {
                        mapRoot.innerHTML = '<div class="absolute inset-0 flex flex-col items-center justify-center text-[#00B4F1]"><div class="w-10 h-10 border-4 border-slate-700 border-t-[#00B4F1] rounded-full animate-spin mb-4"></div><span class="font-bold">در حال بارگذاری نقشه...</span></div>';
                    }

                    // Load the map script dynamically
                    if (!document.getElementById('map-script')) {
                        const script = document.createElement('script');
                        script.id = 'map-script';
                        script.type = 'module';
                        script.crossOrigin = 'anonymous'; // Crucial for iOS Safari module loading
                        script.src = 'assets/index-BQ2rVklb.js';
                        document.body.appendChild(script);
                    }
                }
            } else {
                // Resume video and particles for other steps
                if (bgVideoEl && bgVideoEl.readyState >= 3) {
                    bgVideoEl.play().catch(e => console.log('Autoplay blocked:', e));
                }
                if (particlesEl) particlesEl.style.display = 'block';
            }"""

content = content.replace(old_goto, new_goto)

with open("asvashop/index.html", "w", encoding="utf-8") as f:
    f.write(content)
