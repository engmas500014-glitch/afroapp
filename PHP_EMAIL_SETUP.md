# تشغيل إرسال الرواتب على سيرفر sys.afro-group.com (PHP)

السيرفر بتاعكم Apache + PHP، فمش محتاج Node ولا ngrok خالص.
هنرفع مجلد `api` صغير، وبمجرد ما يترفع الزرار يشتغل على طول.

## الملفات (موجودة في مجلد `php-server/api`)

| الملف | وظيفته |
|-------|--------|
| `index.php` | السيرفر — بيستقبل طلبات الإرسال ويبعت الإيميل عبر Gmail |
| `config.php` | بيانات SMTP (تعدّلها على السيرفر) |
| `.htaccess` | بيوجّه الطلبات وبيحمي ملف الإعدادات |

## الخطوات

### 1) حمّل الملفات
من الريبو: <https://github.com/engmas500014-glitch/afroapp/tree/main/php-server/api>
حمّل الثلاث ملفات: `index.php` و `config.php` و `.htaccess`.

### 2) حط الـ App Password في config.php
افتح `config.php` بأي محرر، وفي السطر:
```php
'smtp_pass'   => 'PUT_APP_PASSWORD_HERE',
```
بدّل `PUT_APP_PASSWORD_HERE` بالـ App Password بتاع Gmail (16 حرف).
> نفس الـ App Password اللي اشتغل في التجربة، لحساب `afromanagment@gmail.com`.

### 3) ارفع مجلد `api` على السيرفر
افتح لوحة الاستضافة (cPanel / Plesk / File Manager) أو برنامج FTP، وروح
لمجلد الموقع الأساسي (`public_html` أو `httpdocs` أو `wwwroot`)، وارفع
مجلد اسمه `api` جواه الثلاث ملفات. المسار النهائي يبقى:
```
public_html/api/index.php
public_html/api/config.php
public_html/api/.htaccess
```

### 4) اتأكد إنه شغال
افتح في المتصفح: <https://sys.afro-group.com/api/health>
المفروض يظهر:
```json
{"ok":true,"smtpConfigured":true}
```
- لو ظهر `smtpConfigured:false` → الباسورد في `config.php` لسه مش متحط صح.
- لو ظهر خطأ 404 → mod_rewrite مقفول؛ في الموقع حط عنوان السيرفر
  `https://sys.afro-group.com/api/index.php` بدل `https://sys.afro-group.com`.

### 5) اربط الموقع
في <https://afroapp.site> → System Settings → **Email Server (Payslips)**:
- Email Server URL = `https://sys.afro-group.com`
- اضغط **Test Email Server** → المفروض: "reachable and SMTP is configured"
- اضغط **Save**

خلاص — زرار إرسال قسيمة الراتب هيبعت إيميلات حقيقية بمجرد الضغط. 🎉

## الأمان
- `config.php` بيتنفّذ كـ PHP فمحتوياته (الباسورد) مش بتظهر لأي حد يفتح الرابط،
  وكمان `.htaccess` بيمنع فتحه مباشرة.
- لو عايز حماية زيادة تمنع أي حد يستخدم الرابط: حط قيمة في `api_key` داخل
  `config.php`، وقولي عشان أضيف خانة المفتاح في إعدادات الموقع.
