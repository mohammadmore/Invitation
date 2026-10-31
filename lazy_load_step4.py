import sys

with open("asvashop/index.html", "r", encoding="utf-8") as f:
    content = f.read()

# Update JS goToStep function to load iframe on step 4
old_goto = """        // Steps Logic
        function goToStep(step) {"""

new_goto = """        // Steps Logic
        function goToStep(step) {
            // Lazy load map iframe when step 4 is opened
            if (step === 4) {
                const mapIframe = document.getElementById('map-iframe');
                if (mapIframe && !mapIframe.src) {
                    mapIframe.src = mapIframe.getAttribute('data-src');
                }
            }
"""

content = content.replace(old_goto, new_goto)

with open("asvashop/index.html", "w", encoding="utf-8") as f:
    f.write(content)
