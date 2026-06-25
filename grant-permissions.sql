-- 1. منح الصلاحيات الأساسية للمستخدمين غير المسجلين (anon) والمسجلين (authenticated)
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- 2. منح صلاحيات التعديل والقراءة لجميع الجداول الحالية
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;

-- 3. منح صلاحيات لجميع التسلسلات (sequences)
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- 4. تعيين الصلاحيات الافتراضية لأي جداول يتم إنشاؤها مستقبلاً
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated;

-- 5. تحديث (Reload) الـ Schema الخاص بـ PostgREST للتعرف على الجداول فوراً
NOTIFY pgrst, 'reload schema';
