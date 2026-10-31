const fs = require('fs');

let content = fs.readFileSync('standalone-invite.html', 'utf8');

const mapTargetHtml = `            <a href="https://maps.app.goo.gl/xBEPdvT2qrKixN7x9" target="_blank" class="detail-item" style="text-decoration: none; color: inherit;">
                <div class="icon-box bg-blue-light" style="background: rgba(37,107,125,0.1); color: #256B7D;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                </div>
                <div style="display: flex; flex-direction: column;">
                    <span class="font-bold">مرکز نمایشگاهی ایران مال</span>
                    <span style="font-size: 0.85rem; color: #256B7D; margin-top: 2px; font-weight: bold; display: flex; align-items: center; gap: 4px;">
                        مسیریابی روی نقشه
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                    </span>
                </div>
            </a>`;

content = content.replace(/<a href="https:\/\/maps\.app\.goo\.gl\/xBEPdvT2qrKixN7x9"[\s\S]*?<\/a>/, mapTargetHtml);


const calendarBtnsHtml = `        <div style="display: flex; gap: 12px; margin-top: 15px; width: 100%;">
            <a href="#" id="cal-link" target="_blank" class="btn" style="flex: 1; flex-direction: column; background: rgba(234, 67, 53, 0.1); color: #ea4335; border-radius: 16px; padding: 12px; gap: 5px;">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/><line x1="10" x2="14" y1="14" y2="14"/><line x1="12" x2="12" y1="12" y2="16"/></svg>
                <span style="font-size: 0.9rem;">گوگل کلندر</span>
            </a>
            <a href="#" id="ics-link" download="invite.ics" class="btn" style="flex: 1; flex-direction: column; background: rgba(0, 0, 0, 0.1); color: #000; border-radius: 16px; padding: 12px; gap: 5px;">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
                <span style="font-size: 0.9rem;">اپل / اوت‌لوک</span>
            </a>
        </div>
        <div style="display: flex; flex-direction: column; gap: 12px; margin-top: 12px; width: 100%;">
            <button onclick="shareInvite()" class="btn btn-light" style="padding: 16px;">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" x2="12" y1="2" y2="15"/></svg>
                اشتراک‌گذاری
            </button>
        </div>`;

content = content.replace(/<div style="display: flex; flex-direction: column; gap: 12px; margin-top: 15px; width: 100%;">[\s\S]*?<\/div>/, calendarBtnsHtml);


const scriptIcs = `            const dates = "20241002T053000Z/20241004T133000Z";
            document.getElementById('cal-link').href = \`https://calendar.google.com/calendar/render?action=TEMPLATE&text=\${title}&dates=\${dates}&details=\${details}&location=\${location}\`;

            // Generate ICS link for Apple/Outlook
            const icsContent = \`BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
SUMMARY:بازدید از غرفه تخشا دارو بهان - نمایشگاه فارمکس
DESCRIPTION:با افتخار منتظر حضور گرم شما در غرفه شرکت تخشا دارو بهان هستیم.\\n\\nمکان: مرکز نمایشگاهی ایران مال\\nسالن E1، غرفه ۴۴ و ۴۵
LOCATION:مرکز نمایشگاهی ایران مال
DTSTART:20260908T063000Z
DTEND:20260910T133000Z
END:VEVENT
END:VCALENDAR\`;
            document.getElementById('ics-link').href = \`data:text/calendar;charset=utf-8,\${encodeURIComponent(icsContent)}\`;`;

content = content.replace(/const dates = "20241002T053000Z\/20241004T133000Z";\s*document.getElementById\('cal-link'\).href = `https:\/\/calendar.google.com[\s\S]*?`;/, scriptIcs);

fs.writeFileSync('standalone-invite.html', content);
