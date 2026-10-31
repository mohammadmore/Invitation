import sys
import os

with open("asvashop/index.html", "r", encoding="utf-8") as f:
    content = f.read()

# Replace iframe with root div for map app
content = content.replace(
    '<iframe id="map-iframe" data-src="https://asvashop.com/behansar/map" class="w-full h-full border-0" title="Map"></iframe>',
    '<div id="map-root" class="w-full h-full border-0 hidden"></div>'
)

# Inject CSS
content = content.replace(
    '</head>',
    '    <link rel="stylesheet" href="assets/index-Byc5hbCu.css">\n</head>'
)

# Update lazy load logic
old_goto = """        // Steps Logic
        function goToStep(step) {
            // Lazy load map iframe when step 4 is opened
            if (step === 4) {
                const mapIframe = document.getElementById('map-iframe');
                if (mapIframe && !mapIframe.src) {
                    mapIframe.src = mapIframe.getAttribute('data-src');
                }
            }"""

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

content = content.replace(old_goto, new_goto)

with open("asvashop/index.html", "w", encoding="utf-8") as f:
    f.write(content)

# Move assets to asvashop/assets
os.makedirs('asvashop/assets', exist_ok=True)
os.system('cp index-Byc5hbCu.css asvashop/assets/')
os.system('cp index-BQ2rVklb.js asvashop/assets/')
if os.path.exists('logotype-huZ9N_xw.png'):
    os.system('cp logotype-huZ9N_xw.png asvashop/assets/')
if os.path.exists('Logo2-r-jjx8AQ.png'):
    os.system('cp Logo2-r-jjx8AQ.png asvashop/assets/')
