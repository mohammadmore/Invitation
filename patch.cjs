const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

// Replace map link to add a routing text
const mapTarget = `                <motion.a initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 }}
                  href={eventDetails.mapUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-4 text-slate-800 hover:text-[#256B7D] transition-colors group"
                >
                  <div className="bg-[#256B7D]/10 p-3 rounded-2xl text-[#256B7D] group-hover:bg-[#256B7D]/20 transition-colors">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-lg leading-tight">{eventDetails.location}</span>
                    <span className="text-sm text-[#256B7D] font-bold mt-1 opacity-80 group-hover:opacity-100 flex items-center gap-1">
                      مسیریابی روی نقشه
                      <ChevronLeft className="w-3 h-3" />
                    </span>
                  </div>
                </motion.a>`;

content = content.replace(/<motion\.a initial=\{\{ opacity: 0, x: 20 \}\} animate=\{\{ opacity: 1, x: 0 \}\} transition=\{\{ delay: 0\.6 \}\}[\s\S]*?<\/motion\.a>/, mapTarget);

// Add generateIcsLink and update the calendar section
const icsFunction = `  const generateIcsLink = () => {
    const icsContent = \`BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
SUMMARY:بازدید از غرفه تخشا دارو بهان - \${eventDetails.title}
DESCRIPTION:با افتخار منتظر حضور گرم شما در غرفه شرکت تخشا دارو بهان هستیم.\\n\\nمکان: \${eventDetails.location}\\n\${eventDetails.booth}
LOCATION:\${eventDetails.location}
DTSTART:20260908T063000Z
DTEND:20260910T133000Z
END:VEVENT
END:VCALENDAR\`;
    return \`data:text/calendar;charset=utf-8,\${encodeURIComponent(icsContent)}\`;
  };

  const generateCalendarLink = () => {`;

content = content.replace("  const generateCalendarLink = () => {", icsFunction);

const calendarButtons = `                <div className="flex gap-3 w-full">
                  <a
                    href={generateCalendarLink()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-1 flex-col items-center justify-center gap-2 bg-[#ea4335]/10 text-[#ea4335] py-3 px-2 rounded-2xl font-bold transition-all hover:bg-[#ea4335]/20"
                  >
                    <CalendarPlus className="w-5 h-5" />
                    <span className="text-sm">گوگل کلندر</span>
                  </a>
                  
                  <a
                    href={generateIcsLink()}
                    download="invite.ics"
                    className="flex flex-1 flex-col items-center justify-center gap-2 bg-[#000000]/10 text-[#000000] py-3 px-2 rounded-2xl font-bold transition-all hover:bg-[#000000]/20"
                  >
                    <CalendarIcon className="w-5 h-5" />
                    <span className="text-sm">اپل / اوت‌لوک</span>
                  </a>
                </div>
                
                <button
                  onClick={handleShare}
                  className="flex items-center justify-center gap-3 w-full bg-white text-[#256B7D] py-4 px-6 rounded-2xl font-bold transition-all shadow-lg hover:bg-gray-50 transform hover:-translate-y-1"
                >
                  <Share2 className="w-6 h-6" />
                  <span className="text-lg">اشتراک‌گذاری</span>
                </button>`;

content = content.replace(/<a[\s\S]*?href=\{generateCalendarLink\(\)\}[\s\S]*?<\/a>\s*<button[\s\S]*?onClick=\{handleShare\}[\s\S]*?<\/button>/, calendarButtons);

fs.writeFileSync('src/App.tsx', content);
