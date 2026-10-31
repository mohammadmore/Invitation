import sys

with open("asvashop/index.html", "r", encoding="utf-8") as f:
    content = f.read()

# Replace root div with root so map code finds it
content = content.replace(
    '<div id="map-root" class="w-full h-full border-0 hidden"></div>',
    '<div id="root" class="w-full h-full border-0 hidden"></div>'
)

new_goto = """        // Steps Logic
        function goToStep(step) {
            // Lazy load map app when step 4 is opened
            if (step === 4) {
                const mapRoot = document.getElementById('map-root');
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

fixed_goto = """        // Steps Logic
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

content = content.replace(new_goto, fixed_goto)

with open("asvashop/index.html", "w", encoding="utf-8") as f:
    f.write(content)
