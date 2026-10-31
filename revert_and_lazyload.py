import sys

with open("asvashop/index.html", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Revert the In-App browser detection and banner completely
# Remove banner script
if "// Detect In-App Browsers" in content:
    start_idx = content.find("// Detect In-App Browsers")
    end_idx = content.find("const video = document.getElementById('bg-video');")
    if start_idx != -1 and end_idx != -1:
        content = content[:start_idx] + content[end_idx:]

# 2. Implement Lazy Loading for iframe
# Remove the src attribute initially
content = content.replace(
    '<iframe src="https://asvashop.com/behansar/map" class="w-full h-full border-0" title="Map"></iframe>',
    '<iframe id="map-iframe" data-src="https://asvashop.com/behansar/map" class="w-full h-full border-0" title="Map"></iframe>'
)

# 3. Update JS goToStep function to load iframe on step 4
old_goto = """        const goToStep = (step) => {
            if (step > 1 && step !== 4) {
                audioBtn.classList.remove('hidden');"""

new_goto = """        const goToStep = (step) => {
            // Lazy load map iframe when step 4 is opened
            if (step === 4) {
                const mapIframe = document.getElementById('map-iframe');
                if (mapIframe && !mapIframe.src) {
                    mapIframe.src = mapIframe.getAttribute('data-src');
                }
            }

            if (step > 1 && step !== 4) {
                audioBtn.classList.remove('hidden');"""

content = content.replace(old_goto, new_goto)

with open("asvashop/index.html", "w", encoding="utf-8") as f:
    f.write(content)
