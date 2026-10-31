# راهنمای نصب روی هاست (studio.asvashop.com/in)

ساختار آدرس‌ها پس از نصب:

| آدرس | کاربرد |
|---|---|
| `https://studio.asvashop.com/in/` | صفحه اصلی سازنده و پنل مدیر |
| `https://studio.asvashop.com/in/builder` | ویزارد ساخت دعوتنامه |
| `https://studio.asvashop.com/in/<slug>` | دعوتنامه هر شرکت؛ مثلاً `/in/behansar` |

## ۱. ساخت بسته انتشار (روی کامپیوتر خودتان)

```bash
npm install
BASE_PATH=/in npm run release
```

پوشه `release/` ساخته می‌شود. همه وابستگی‌ها داخل `dist-server/server.cjs` قرار دارند و روی هاست به `npm install` نیازی نیست. فقط **Node.js نسخه ۱۸ یا بالاتر** لازم است.

## ۲-الف. هاست cPanel (Setup Node.js App)

1. محتوای پوشه `release/` را در پوشه‌ای مثل `~/expo-invite-app` آپلود کنید.
2. در cPanel بخش **Setup Node.js App** را باز کنید و **Create Application** را بزنید:
   - Node.js version: ۱۸ یا بالاتر
   - Application mode: Production
   - Application root: `expo-invite-app`
   - Application URL: `studio.asvashop.com` / `in`
   - Application startup file: `app.js`
3. در بخش Environment variables این مقادیر را وارد کنید (یا فایل `.env` را از روی `.env.example` بسازید):
   - `ADMIN_PASSWORD` = یک رمز قوی
   - `BASE_PATH` = `/in`
   - `PUBLIC_URL` = `https://studio.asvashop.com/in`
   - `DATA_DIR` = `/home/<نام‌کاربری>/expo-invite-data` (**بیرون از پوشه برنامه**)
4. **Restart** را بزنید و آدرس `https://studio.asvashop.com/in/` را باز کنید.

> سرور هم درخواست‌هایی را که پیشوند `/in` دارند می‌پذیرد و هم درخواست‌هایی را که Passenger پیشوندشان را حذف کرده است. پس در هر دو حالت درست کار می‌کند.

## ۲-ب. سرور مجازی (VPS) با nginx

```bash
# روی سرور، داخل پوشه release
cp .env.example .env   # و مقادیر را تنظیم کنید
NODE_ENV=production node app.js     # یا با pm2: pm2 start app.js --name expo-invite
```

```nginx
location /in/ {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    client_max_body_size 45m;      # آپلود ویدئو
    proxy_read_timeout 300s;       # زمان تبدیل ویدئو
}
location = /in { return 301 /in/; }
```

## ۳. ffmpeg (اختیاری ولی پیشنهادی)

اگر `ffmpeg` روی سرور نصب باشد:
- ویدئوهای آپلودی به MP4 سبک تبدیل می‌شوند که روی همه گوشی‌ها پخش می‌شود.
- فایل MOV آیفون پذیرفته می‌شود.
- تصویر پیش از پخش ویدئو به‌طور خودکار ساخته می‌شود.

روی هاست اشتراکی معمولاً ffmpeg نصب نیست. در این حالت فقط فایل MP4 و WebM پذیرفته می‌شود و تصویر پیش‌نمایش ویدئو در مرورگر ساخته می‌شود. فعال یا غیرفعال بودن این قابلیت در لاگ شروع برنامه نوشته می‌شود (`video processing: on/off`).

## ۴. پشتیبان‌گیری

همه اطلاعات در پوشه `DATA_DIR` قرار دارد:
- `invitations/` شامل فایل JSON هر دعوتنامه
- `uploads/` شامل لوگوها، ویدئوها و موزیک‌ها

از این پوشه به‌طور منظم پشتیبان بگیرید؛ مثلاً با Backup در cPanel یا cron.

## ۵. به‌روزرسانی برنامه

بسته `release/` جدید را بسازید و محتوای آن را روی پوشه برنامه کپی کنید (فایل `.env` و پوشه داده دست نمی‌خورند). بعد Restart کنید.

## ۶. پس از اولین اجرا

- دعوتنامه نمونه بهان‌سار با آدرس `/in/behansar` ساخته می‌شود و لینک ویرایش آن در لاگ برنامه نوشته می‌شود.
- مدیر با رمز `ADMIN_PASSWORD` از صفحه اصلی وارد می‌شود. مدیر همه دعوتنامه‌ها را می‌بیند و می‌تواند برای مشتری‌ای که لینک ویرایشش را گم کرده لینک جدید صادر کند.
- فقط مدیر می‌تواند امضای پایین دعوتنامه («Powered by Asva Studio») را تغییر دهد.
