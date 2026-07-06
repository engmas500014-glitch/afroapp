<?php
// ---------------------------------------------------------------------------
// إعدادات إرسال الإيميلات (SMTP) — عدّل القيم دي على السيرفر فقط.
// This file is executed by PHP, so its contents are NOT exposed over HTTP.
// ---------------------------------------------------------------------------
return [
    // بيانات Gmail
    'smtp_host'   => 'smtp.gmail.com',
    'smtp_port'   => 587,
    'smtp_secure' => 'tls',                      // 'tls' لبورت 587 ، 'ssl' لبورت 465
    'smtp_user'   => 'afromanagment@gmail.com',
    'smtp_pass'   => 'PUT_APP_PASSWORD_HERE',    // ← الصق الـ App Password هنا (16 حرف)
    'smtp_from'   => 'afromanagment@gmail.com',
    'from_name'   => 'AFRO HR',

    // مفتاح حماية اختياري: سيبه فاضي عشان يشتغل من غير مفتاح.
    // لو حطيت قيمة هنا، لازم الموقع يبعت نفس القيمة في هيدر X-Api-Key.
    'api_key'     => '',
];
