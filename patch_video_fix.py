import sys

with open("asvashop/index.html", "r", encoding="utf-8") as f:
    content = f.read()

old_video_script = """        // Setup Video fade-in effect
        const video = document.getElementById('bg-video');
        video.addEventListener('canplay', () => {
            video.classList.remove('opacity-0');
            video.classList.add('opacity-75');
        });"""

new_video_script = """        // Setup Video fade-in effect
        const video = document.getElementById('bg-video');
        const showVideo = () => {
            if (video.classList.contains('opacity-0')) {
                video.classList.remove('opacity-0');
                video.classList.add('opacity-75');
            }
        };
        if (video) {
            // If already loaded
            if (video.readyState >= 3) {
                showVideo();
            } else {
                video.addEventListener('canplay', showVideo);
            }
            // Fallback: force show after 3 seconds anyway
            setTimeout(showVideo, 3000);
            
            // Explicit play for iOS
            video.play().catch(e => console.log('Video autoplay blocked:', e));
        }"""

content = content.replace(old_video_script, new_video_script)

with open("asvashop/index.html", "w", encoding="utf-8") as f:
    f.write(content)
