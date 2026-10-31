import sys

with open("asvashop/index.html", "r", encoding="utf-8") as f:
    content = f.read()

import re

# Find the block
pattern = r"const video = document\.getElementById\('bg-video'\);\s*video\.addEventListener\('canplay', \(\) => \{\s*video\.classList\.remove\('opacity-0'\);\s*video\.classList\.add\('opacity-75'\);\s*\}\);"

new_video_script = """const video = document.getElementById('bg-video');
        const showVideo = () => {
            if (video && video.classList.contains('opacity-0')) {
                video.classList.remove('opacity-0');
                video.classList.add('opacity-75');
            }
        };
        if (video) {
            if (video.readyState >= 3) {
                showVideo();
            } else {
                video.addEventListener('canplay', showVideo);
            }
            setTimeout(showVideo, 3000);
            video.play().catch(e => console.log('Autoplay blocked:', e));
        }"""

content = re.sub(pattern, new_video_script, content)

with open("asvashop/index.html", "w", encoding="utf-8") as f:
    f.write(content)
