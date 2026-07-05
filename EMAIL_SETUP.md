# تشغيل إرسال قسائم الرواتب عبر Gmail

الإيميلات بتتبعت من سيرفر المشروع (`server.ts`) عبر SMTP بتاع Gmail.
الأفضل تشغيله على **نفس الجهاز اللي عليه Supabase وngrok** عشان يفضل متاح دايماً.

## 1) اعمل App Password في حساب Google

> مينفعش تستخدم باسورد حسابك العادي — Google بترفضه.

1. افتح: <https://myaccount.google.com/apppasswords>
2. لو طلب منك تفعيل **2-Step Verification** فعّلها الأول من صفحة Security
3. اكتب اسم للتطبيق (مثلاً `afroapp`) واضغط Create
4. هيظهرلك باسورد من 16 حرف — انسخه (هتحتاجه في الخطوة الجاية)

## 2) جهّز المشروع على جهاز السيرفر

```bash
git clone https://github.com/engmas500014-glitch/afroapp.git
cd afroapp
npm install
```

أنشئ ملف اسمه `.env` في فولدر المشروع وحط فيه (بدّل الإيميل والباسورد ببتوعك):

```env
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="xxxx xxxx xxxx xxxx"
SMTP_FROM="your-email@gmail.com"
```

> `SMTP_PASS` هو الـ App Password المكوّن من 16 حرف — مش باسورد الجيميل العادي.
> ملف `.env` موجود في `.gitignore` فمش هيترفع على GitHub أبداً.

## 3) شغّل السيرفر

```bash
npm run dev
```

هيشتغل على البورت 3000. جرّب محلياً إن كل حاجة تمام:

```bash
curl http://localhost:3000/api/health
```

المفروض يرد: `{"ok":true,"smtpConfigured":true}` — لو `smtpConfigured: false` راجع ملف `.env`.

## 4) اعمل تانل ngrok للبورت 3000

> **مهم:** عندك تانل Supabase شغال بالفعل على نفس الجهاز. متشغّلش `ngrok http 3000`
> لوحده في جلسة منفصلة — الخطة المجانية بتسمح بجلسة agent واحدة بس،
> وممكن يفصل تانل الـ Supabase. بدل كده ضيف الاتنين في ملف الإعدادات وشغّلهم مع بعض.

عدّل ملف إعدادات ngrok (`ngrok config edit` بيفتحه) وخليه بالشكل ده:

```yaml
version: 3
agent:
  authtoken: <التوكن بتاعك زي ما هو>
endpoints:
  - name: supabase
    url: https://flaxseed-ritalin-moneybags.ngrok-free.dev
    upstream:
      url: 8000
  - name: email
    upstream:
      url: 3000
```

بعدين شغّل الاتنين مع بعض:

```bash
ngrok start --all
```

هيظهرلك رابط جديد للتانل بتاع الإيميل (بيتغير مع كل إعادة تشغيل) — انسخه.

## 5) اربط الموقع بالسيرفر

1. افتح <https://afroapp.site> وسجّل دخول كـ Admin
2. روح **System Settings → Email Server (Payslips)**
3. الصق رابط التانل واضغط **Test Email Server**
   - المفروض تشوف: "Email server reachable and SMTP is configured"
4. اضغط **Save Email Server URL**

خلاص — زرار إرسال قسيمة الراتب هيبعت إيميلات حقيقية من جيميلك. 🎉

## ملاحظات

- Gmail ليه حد إرسال يومي (~500 إيميل/يوم للحسابات العادية) — كافي لإرسال شهري لـ 190 موظف.
- لو رابط التانل اتغير بعد إعادة تشغيل، حدّثه من نفس صفحة الإعدادات.
- رسالة "لم يتم إرسال حقيقي" معناها السيرفر شغال لكن ملف `.env` ناقص أو غلط.
