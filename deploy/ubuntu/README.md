# تركيب سيرفر الرواتب على سيرفر Ubuntu (خلف Caddy)

هذه الخطوات للشخص الذي يدير السيرفر (اللي ظبط Caddy). كلها نسخ-ولصق على تيرمنال Ubuntu.
النتيجة: رابط HTTPS ثابت يشتغل منه زرار إرسال الرواتب من أي جهاز.

المتطلبات: Node.js مثبّت (`node -v`). لو مش موجود:
`sudo apt update && sudo apt install -y nodejs npm`

---

## 1) جهّز مجلد الخدمة

```bash
sudo mkdir -p /opt/afro-email
cd /opt/afro-email

# انسخ email-server.mjs هنا (من مجلد الديسك توب أو نزّله من GitHub):
sudo curl -fsSL -o email-server.mjs \
  https://raw.githubusercontent.com/engmas500014-glitch/afroapp/main/deploy/ubuntu/email-server.mjs

# ثبّت المكتبتين المطلوبتين فقط
sudo npm init -y >/dev/null 2>&1
sudo npm install express nodemailer dotenv
```

## 2) ملف الإعدادات ‎.env (فيه بيانات Gmail)

```bash
sudo tee /opt/afro-email/.env >/dev/null <<'EOF'
PORT=3005
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=afromanagment@gmail.com
SMTP_PASS=ضع_الـ_APP_PASSWORD_هنا
SMTP_FROM=afromanagment@gmail.com
EOF

sudo chmod 600 /opt/afro-email/.env
sudo chown -R www-data:www-data /opt/afro-email
```
> عدّل `SMTP_PASS` بالـ App Password الجديد بتاع Gmail (بدون مسافات).

## 3) شغّلها كخدمة دائمة (systemd)

```bash
sudo curl -fsSL -o /etc/systemd/system/afro-email.service \
  https://raw.githubusercontent.com/engmas500014-glitch/afroapp/main/deploy/ubuntu/afro-email.service

sudo systemctl daemon-reload
sudo systemctl enable --now afro-email
sudo systemctl status afro-email --no-pager      # لازم تكون active (running)

# اختبار محلي على السيرفر:
curl http://127.0.0.1:3005/api/health             # المفروض: {"ok":true,"smtpConfigured":true}
```

## 4) عرّفها لـ Caddy عبر HTTPS

افتح `/etc/caddy/Caddyfile` وأضف واحد من الخيارين (التفاصيل في `Caddyfile.snippet`):

- **الأسهل — subdomain:**
  ```
  mail.afro-group.com {
      reverse_proxy 127.0.0.1:3005
  }
  ```
  (يحتاج DNS record لـ `mail.afro-group.com` يشاور على السيرفر)

- **بدون DNS جديد — مسار تحت دومين موجود:** ضع داخل بلوك الدومين الحالي:
  ```
  handle /email/* {
      uri strip_prefix /email
      reverse_proxy 127.0.0.1:3005
  }
  ```

ثم:
```bash
sudo systemctl reload caddy
```

## 5) اربط الموقع

في <https://afroapp.site> → System Settings → Email Server URL:
- لو Option A:  `https://mail.afro-group.com`
- لو Option B:  `https://sys.afro-group.com/email`  (بدّل الدومين بالدومين الفعلي)

اضغط **Test Email Server** → لازم يقول "reachable and SMTP is configured" → **Save**.

---

بعد الخطوة 4، بلّغ اللي بيساعدك (Claude) بالرابط النهائي، وهو هيتأكد إنه شغّال ويبعت قسيمة تجريبية.
