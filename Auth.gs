/**
 * @fileoverview Authorization Helper
 * 
 * يحتوي هذا الملف على دالة واحدة هدفها الوحيد هو إجبار Google Apps Script 
 * على طلب جميع الصلاحيات اللازمة (Sheets, Drive, Email) دفعة واحدة.
 * 
 * طريقة الاستخدام:
 * 1. افتح هذا الملف (Auth.gs) في المحرر.
 * 2. اختر الدالة authorizeApp من القائمة العلوية.
 * 3. اضغط على زر "Run" (تشغيل) ▶
 * 4. ستظهر نافذة تطلب منك الموافقة على الصلاحيات، وافق عليها.
 */

function authorizeApp() {
  try {
    // 1. صلاحية قراءة وتعديل ملفات Google Sheets
    SpreadsheetApp.getActive();
    
    // 2. صلاحية الوصول إلى Google Drive (للتأكد من الوصول للملفات)
    DriveApp.getFiles();
    
    // 3. صلاحية معرفة البريد الإلكتروني للمستخدم الحالي
    Session.getActiveUser().getEmail();
    
    // 4. صلاحية إرسال إيميلات (في حال احتجتها لاحقاً للإشعارات)
    MailApp.getRemainingDailyQuota();
    
    // 5. صلاحية استخدام خدمات التخزين المؤقت (موجودة افتراضياً)
    CacheService.getScriptCache();
    
    // 6. صلاحية إعدادات السكريبت
    PropertiesService.getScriptProperties();

    console.log("✅ تمت الموافقة على جميع الصلاحيات بنجاح! يمكنك الآن استخدام التطبيق.");
    return "تمت الموافقة بنجاح";
    
  } catch (e) {
    console.log("⚠️ تم طلب الصلاحيات. إذا ظهرت لك نافذة الموافقة، فهذا يعني أن الأمر نجح.");
  }
}
