MPBF Mobile App — API Contract & Technical Reference
مرجع تقني شامل لتطبيق الموبايل — مصنع أكياس البلاستيك الحديث
هذا الملف يوثق كل ما يحتاجه مطوّر/وكيل السيرفر الرئيسي لضمان التوافق الكامل مع تطبيق الموبايل. أي تغيير في أي نقطة API أو شكل البيانات بدون تحديث هذا الملف سيؤدي لكسر تطبيق الموبايل.

1. معلومات عامة
البند	القيمة
Framework	Expo SDK 54 + React Native
Routing	Expo Router (file-based)
State	React Context + @tanstack/react-query v5
Language	TypeScript
Platform	iOS, Android, Web
Default Language	Arabic (RTL)
Supported Languages	Arabic, English
2. المصادقة (Authentication)
2.1 تسجيل الدخول
POST /api/mobile/login
Content-Type: application/json
Body:

{
  "username": "string",
  "password": "string"
}
Response (200):

{
  "token": "string (hex token, 64 chars)",
  "user": {
    "id": 1,
    "username": "AbuKhalid",
    "display_name": "AbuKhalid",
    "display_name_ar": "أبوخالد",
    "role_id": 10,
    "role_name": "Admin",
    "role_name_ar": "مدير النظام",
    "section_id": 1,
    "permissions": ["manage_orders", "manage_production", "admin", "..."]
  }
}
Response (401):

{
  "message": "بيانات تسجيل الدخول غير صحيحة"
}
ملاحظات مهمة:

التوكن يُخزَّن في AsyncStorage تحت المفتاح auth_token
بيانات المستخدم تُخزَّن تحت auth_user
التوكن صالح لمدة 30 يوم
عند استجابة 401 من أي endpoint، التطبيق يعمل logout تلقائي ويعيد التوجيه لصفحة الدخول
2.2 تسجيل الخروج
POST /api/mobile/logout
Authorization: Bearer <token>
2.3 حالة السيرفر
GET /api/mobile/status
(No Auth Required)
Response:

{
  "status": "online",
  "version": "1.0.0",
  "features": ["production_monitoring", "orders", "quality_control", "maintenance", "attendance", "notifications"]
}
2.4 آلية التوثيق في كل طلب
كل طلب (ما عدا login و status) يجب أن يحتوي على:
Authorization: Bearer <token>
Content-Type: application/json
إذا رجع السيرفر 401 → التطبيق يمسح التوكن ويعيد المستخدم لصفحة الدخول
3. الصلاحيات (Permissions)
التطبيق يفحص الصلاحيات من user.permissions[] المُرجَعة عند الدخول:

الصلاحية	الاستخدام في التطبيق
admin	صلاحية كاملة (تتجاوز كل القيود)
manage_orders	إنشاء/تعديل/حذف الطلبات
view_orders	عرض الطلبات
manage_production	إنشاء أوامر إنتاج، إدخال رولات
view_production	عرض لوحة الإنتاج فقط
manage_attendance	إدارة الحضور
view_attendance	عرض الحضور
manage_maintenance	إنشاء طلبات صيانة
view_maintenance	عرض الصيانة
manage_quality	إدارة الجودة
view_quality	عرض الجودة
القاعدة: إذا كان user.permissions يحتوي على "admin", كل الصلاحيات مفعّلة تلقائياً.

4. نقاط API — التفاصيل الكاملة
4.1 لوحة التحكم (Dashboard)
GET /api/dashboard/stats
// Response
{
  "totalOrders": 1,
  "totalProductionOrders": 2,
  "activeProductionOrders": 0,    // ← يُعرض كـ "أوامر الإنتاج النشطة"
  "completedToday": 0,            // ← يُعرض كـ "مكتمل اليوم"
  "totalRolls": 6,
  "pendingOrders": 0,
  "completedOrders": 0,
  "inProductionOrders": 0,
  "deliveredOrders": 0,
  "cancelledOrders": 0
}
GET /api/production/real-time-stats
{
  "active": 0,
  "completed": 0,
  "pending": 0,
  "updateInterval": 30000
}
4.2 الطلبات (Orders)
GET /api/orders
// Response
{
  "data": [
    {
      "id": 123,
      "order_number": "ORD001",
      "customer_id": "CID001",        // ← string (رمز العميل, NOT integer)
      "delivery_days": 15,
      "delivery_date": null,            // ← ISO 8601 string or null
      "status": "in_production",        // ← enum: waiting | in_production | paused | completed | cancelled
      "notes": null,
      "created_by": 1,
      "created_at": "2026-03-10T21:44:25.330Z"
    }
  ],
  "count": 1,
  "success": true
}
حالات الطلب المستخدمة في التطبيق (CRITICAL):

waiting → بانتظار (لون تحذيري)
in_production → قيد الإنتاج (لون أساسي)
paused → متوقف (لون رمادي)
completed → مكتمل (لون أخضر)
cancelled → ملغي (لون أحمر)
تحذير: لا تستخدم pending للطلبات — التطبيق يستخدم waiting فقط.

GET /api/orders/enhanced
يُستخدم في شاشة الطلبات الرئيسية — يرجع بيانات إضافية مقارنة بـ /api/orders:

{
  "success": true,
  "data": [
    {
      "id": 123,
      "order_number": "ORD001",
      "customer_id": "CID001",
      "customer_name": "Modern Plastic Bags Factory",      // ← مطلوب
      "customer_name_ar": "مصنع أكياس الحديث للمنتجات البلاستيكية",  // ← مطلوب
      "delivery_days": 15,
      "delivery_date": null,
      "status": "in_production",
      "notes": null,
      "created_by": 1,
      "created_at": "2026-03-10T21:44:25.330Z",
      "production_orders_count": 2,                         // ← مطلوب
      "production_orders": [                                // ← مصفوفة مطلوبة
        {
          "id": 116,
          "production_order_number": "PO002",
          "quantity_kg": "100.00",
          "final_quantity_kg": "120.00",
          "produced_quantity_kg": "120.00",
          "film_completion_percentage": "100.00",
          "printing_completion_percentage": "100.00",
          "cutting_completion_percentage": "100.00",
          "status": "completed"
        }
      ]
    }
  ]
}
مهم جداً: التطبيق يعرض customer_name_ar في الوضع العربي و customer_name في الإنجليزي. إذا كلاهما فارغين يعرض customer_id.

GET /api/orders/next-number
{ "orderNumber": "ORD002" }
POST /api/orders
// Body
{
  "order_number": "ORD002",
  "customer_id": "CID001",
  "delivery_days": 15,
  "delivery_date": "2026-04-01",  // optional
  "notes": "ملاحظات"              // optional
}
// Response
{
  "data": { "id": 124, "..." },
  "message": "تم إنشاء الطلب بنجاح",
  "success": true
}
PATCH /api/orders/:id/status
// Body
{ "status": "completed" }
DELETE /api/orders/:id
4.3 أوامر الإنتاج (Production Orders)
GET /api/production-orders
// Response — Array NOT wrapped in {data:[]}
[
  {
    "id": 116,
    "production_order_number": "PO002",    // ← string (NOT order_number)
    "order_id": 123,
    "customer_product_id": 19425,
    "quantity_kg": "100.00",               // ← STRING not number
    "overrun_percentage": "20.00",         // ← STRING
    "final_quantity_kg": "120.00",         // ← STRING
    "produced_quantity_kg": "120.00",      // ← STRING
    "printed_quantity_kg": "0.00",         // ← STRING
    "net_quantity_kg": "0.00",             // ← STRING
    "waste_quantity_kg": "0.00",           // ← STRING
    "film_completion_percentage": "100.00",     // ← STRING (0.00 to 100.00)
    "printing_completion_percentage": "100.00", // ← STRING
    "cutting_completion_percentage": "100.00",  // ← STRING
    "film_completed": false,
    "printing_completed": false,
    "cutting_completed": false,
    "assigned_machine_id": null,           // ← string or null
    "assigned_operator_id": null,
    "production_start_time": null,
    "production_end_time": null,
    "production_time_minutes": null,
    "is_final_roll_created": false,
    "warehouse_received_kg": "0.00",
    "status": "completed",                 // ← enum: pending | active | completed | cancelled
    "created_at": "2026-03-10T21:44:25.646Z"
  }
]
حالات أمر الإنتاج:

pending → معلّق
active → نشط
completed → مكتمل
cancelled → ملغي
تحذير: حالات أمر الإنتاج مختلفة عن حالات الطلب! الطلبات تستخدم waiting بينما أوامر الإنتاج تستخدم pending.

قاعدة حرجة: كل القيم الرقمية (الكميات والنسب) تُرجَع كـ STRING — التطبيق يستخدم parseFloat() لتحويلها عند العرض.

POST /api/production-orders
// Body
{
  "order_id": 123,
  "customer_product_id": 19425,
  "quantity_kg": 500
}
POST /api/production-orders/batch
// Body
{
  "orders": [
    { "order_id": 123, "customer_product_id": 19424, "quantity_kg": 500 },
    { "order_id": 123, "customer_product_id": 19425, "quantity_kg": 100 }
  ]
}
4.4 الرولات (Rolls) — مرحلة الفيلم
GET /api/rolls
// Response — Array
[
  {
    "id": 207,
    "roll_seq": 5,
    "roll_number": "PO001-R005",
    "production_order_id": 115,
    "qr_code_text": "{...}",
    "qr_png_base64": null,
    "stage": "done",                    // ← enum: film | printed | waiting_cut | done
    "weight_kg": "90.000",             // ← STRING
    "cut_weight_total_kg": "90.000",   // ← STRING
    "waste_kg": "0.000",               // ← STRING
    "printed_at": "2026-03-10T21:46:31.385Z",
    "cut_completed_at": "2026-03-10T21:47:20.766Z",
    "performed_by": null,
    "film_machine_id": "MAC01",
    "printing_machine_id": "MAC11",
    "cutting_machine_id": "MAC17",
    "machine_id": null,
    "employee_id": null,
    "created_by": 1,
    "printed_by": 1,
    "cut_by": 1,
    "is_last_roll": false,
    "production_time_minutes": null,
    "roll_created_at": "2026-03-10T21:46:08.787Z",
    "qr_code": null,
    "created_at": "2026-03-10T21:46:08.787Z",
    "completed_at": null
  }
]
مراحل الرول (Roll Stages):

film أو film_done أو waiting_print → رول تم إنتاجه (فيلم) وينتظر الطباعة
printed أو waiting_cut → تم طباعته وينتظر التقطيع
done أو cut → مكتمل
مهم: التطبيق يفلتر الرولات حسب stage لعرضها في الشاشة المناسبة

GET /api/rolls?production_order_id=115
يرجع فقط الرولات الخاصة بأمر إنتاج معين.

POST /api/rolls/create-with-timing
// Body
{
  "production_order_id": 115,
  "weight_kg": 90,                    // ← number (NOT string)
  "film_machine_id": "MAC01",         // ← string
  "is_last_roll": false,
  "production_time_minutes": 30       // ← integer
}
POST /api/rolls/create-final
// Body
{
  "production_order_id": 115,
  "weight_kg": 90,
  "film_machine_id": "MAC01",
  "production_time_minutes": 30
}
4.5 الطباعة (Printing)
PATCH /api/rolls/:id/print
// Body
{
  "printing_machine_id": "MAC11",     // ← string
  "printed_by": 1                     // ← user.id (integer)
}
POST /api/rolls/:id/mark-printed
// Body
{
  "printing_machine_id": "MAC11"
}
GET /api/production/printing-queue
يرجع قائمة الرولات الجاهزة للطباعة.

GET /api/rolls/active-for-printing
GET /api/rolls/printing-queue-by-section
4.6 التقطيع (Cutting)
POST /api/rolls/:id/complete-cutting
// Body
{
  "cutting_machine_id": "MAC17",      // ← string
  "cut_weight_total_kg": 90,          // ← number
  "waste_kg": 0,                      // ← number
  "cut_by": 1                         // ← user.id (integer)
}
GET /api/production/cutting-queue
GET /api/production/grouped-cutting-queue
GET /api/rolls/active-for-cutting
GET /api/rolls/cutting-queue-by-section
4.7 قوائم الإنتاج (Production Queues)
GET /api/production/film-queue
// Response — Array
[
  {
    "id": 115,
    "production_order_number": "PO001",
    "customer_name": "Factory Name",
    "product_info": "Size info",
    "quantity_kg": "500.00",
    "produced_quantity_kg": "635.00",
    "film_completion_percentage": "100.00",
    "assigned_machine_id": null,
    "status": "completed"
  }
]
GET /api/production/order-progress/:jobOrderId
GET /api/production/hierarchical-orders
GET /api/production/stats-by-section/:section
GET /api/production/users-performance/:section
GET /api/production/machines-production/:section
GET /api/production/rolls-tracking/:section
4.8 الآلات (Machines)
GET /api/machines
// Response — Array (NOT wrapped in {data:[]})
[
  {
    "id": "MAC20",                    // ← STRING (e.g., "MAC01", "MAC17")
    "name": "Cutting Core",
    "name_ar": "Cutting Core",
    "type": "cutting",               // ← enum: film | printing | cutting
    "section_id": "SEC05",
    "status": "active",              // ← enum: active | maintenance | inactive
    "capacity_small_kg_per_hour": "67.00",
    "capacity_medium_kg_per_hour": "67.00",
    "capacity_large_kg_per_hour": "67.00",
    "screw_type": "A"
  }
]
تحذير: machine.id هو STRING (مثال: "MAC01") وليس integer — التطبيق يمرره كـ string في كل الطلبات.

استخدام الآلات في التطبيق:

شاشة الفيلم: تعرض فقط الآلات من نوع film مع status === 'active'
شاشة الطباعة: تعرض فقط نوع printing مع status === 'active'
شاشة التقطيع: تعرض فقط نوع cutting مع status === 'active'
4.9 العملاء (Customers)
GET /api/customers?all=true
// Response — Array
[
  {
    "id": "CID002",                   // ← STRING
    "name": "Ibrahem Alhajj",
    "name_ar": "Ibrahem Alhajj",
    "code": null,
    "user_id": null,
    "city": "Ad Dammam الدمام",
    "address": "...",
    "phone": "055...",
    "is_active": true
  }
]
4.10 منتجات العملاء (Customer Products)
GET /api/customer-products
{
  "data": [
    {
      "id": 19424,
      "customer_id": "CID001",
      "category_id": "CAT03",
      "item_id": "ITM23",
      "size_caption": "40+10+10X61",
      "width": "40.00",
      "left_facing": "10.00",
      "right_facing": "10.00",
      "thickness": 15,
      "printing_cylinder": "24\"",
      "cutting_length_cm": 61,
      "raw_material": "HDPE",
      "master_batch_id": "PT-000000",
      "is_printed": true,
      "cutting_unit": "كيلو",
      "punching": "علاقي",
      "unit_weight_kg": "1.000",
      "unit_quantity": 20,
      "package_weight_kg": "20.00"
    }
  ]
}
4.11 ألوان الماستر باتش (Master Batch Colors)
GET /api/master-batch-colors
// Response — Array
[
  {
    "id": "150095",
    "name": "Green Dark",
    "name_ar": "أخضر غامق",
    "color_hex": "#006400",
    "text_color": "#FFFFFF",
    "brand": "Polytec",
    "aliases": "150095",
    "is_active": true,
    "sort_order": 24,
    "created_at": "2026-01-20T09:30:49.977Z",
    "updated_at": "2026-01-20T10:28:12.504Z"
  }
]
4.12 الحضور (Attendance)
GET /api/attendance
{
  "data": [
    {
      "id": 1,
      "user_id": 1,
      "date": "2026-03-12",
      "check_in": "08:00:00",
      "check_out": "17:00:00",
      "check_in_latitude": 24.7136,
      "check_in_longitude": 46.6753,
      "check_out_latitude": null,
      "check_out_longitude": null,
      "status": "حاضر",
      "total_hours": 9.0,
      "notes": null
    }
  ]
}
POST /api/attendance/check-in
// Body — تنسيق محدد ومطلوب:
{
  "user_id": 1,
  "status": "حاضر",                  // ← بالعربي دائماً
  "location": {
    "lat": 24.7136,                  // ← latitude (number)
    "lng": 46.6753,                  // ← longitude (number)
    "accuracy": 15,                  // ← GPS accuracy in meters (number)
    "isMocked": false                // ← boolean — مطلوب
  }
}
تحذير حرج: التطبيق يرسل isMocked: false دائماً. إذا كانت القيمة true يجب على السيرفر رفض الحضور.

POST /api/attendance/check-out
نفس تنسيق check-in بالضبط.

4.13 الإشعارات (Notifications)
GET /api/notifications
// Response — قد يكون {data:[]} أو Array مباشرة
// التطبيق يتعامل مع كلتا الحالتين بـ catch fallback
{
  "data": [
    {
      "id": 12538,
      "title": "رسالة واردة",
      "title_ar": null,
      "message": "محتوى الرسالة",
      "message_ar": null,
      "type": "whatsapp",            // ← أنواع مختلفة
      "priority": "normal",
      "is_read": false,
      "created_at": "2026-03-12T..."
    }
  ]
}
ملاحظة: التطبيق يعد الإشعارات غير المقروءة (is_read === false) ويعرض badge في التاب.

PUT /api/notifications/:id/read
4.14 طلبات الصيانة (Maintenance Requests)
GET /api/maintenance-requests
// Response — Array مباشرة
[
  {
    "id": 1,
    "machine_id": "MAC01",            // ← string
    "machine_name": "Film Machine A",
    "description": "...",
    "priority": "medium",             // ← low | medium | high | critical
    "type": "corrective",             // ← corrective | preventive
    "status": "pending",              // ← pending | assigned | in_progress | completed | cancelled
    "requested_by": 1,
    "requested_by_name": "AbuKhalid",
    "assigned_to": null,
    "assigned_to_name": null,
    "created_at": "2026-03-12T...",
    "completed_at": null,
    "notes": null
  }
]
POST /api/maintenance-requests
// Body
{
  "machine_id": "MAC01",              // ← string
  "description": "وصف العطل",
  "priority": "high",                 // ← low | medium | high | critical
  "type": "corrective"                // ← corrective | preventive
}
4.15 مشاكل الجودة (Quality Issues)
GET /api/quality-issues
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "عنوان المشكلة",
      "description": "...",
      "severity": "high",              // ← low | medium | high | critical
      "status": "open",               // ← open | investigating | resolved | closed
      "production_order_id": 115,
      "production_number": "PO001",
      "reported_by": 1,
      "reported_by_name": "AbuKhalid",
      "created_at": "2026-03-12T...",
      "resolved_at": null,
      "resolution": null,
      "images": []
    }
  ]
}
5. أشكال البيانات — قواعد حرجة
5.1 القيم الرقمية كـ String
جميع القيم العشرية ترجع من السيرفر كـ STRING. التطبيق يستخدم parseFloat() لتحويلها:

quantity_kg: "500.00"         → parseFloat("500.00") = 500
film_completion_percentage: "57.14" → parseFloat("57.14") = 57.14
weight_kg: "90.000"          → parseFloat("90.000") = 90
القيم المتأثرة: quantity_kg, final_quantity_kg, produced_quantity_kg, film_completion_percentage, printing_completion_percentage, cutting_completion_percentage, weight_kg, cut_weight_total_kg, waste_kg, overrun_percentage, capacity_*_kg_per_hour, unit_weight_kg, package_weight_kg.

5.2 المعرّفات String vs Integer
الحقل	النوع	مثال
user.id	integer	1
order.id	integer	123
production_order.id	integer	115
roll.id	integer	207
customer.id	string	"CID001"
machine.id	string	"MAC01"
master_batch.id	string	"150095"
customer_product.id	integer	19424
5.3 التواريخ
كل التواريخ بصيغة ISO 8601: "2026-03-10T21:44:25.330Z"
التطبيق يعرضها بصيغة محلية حسب اللغة (ar-SA أو en-US)
5.4 رسائل الخطأ
رسائل الخطأ من السيرفر بالعربية: { "message": "رسالة الخطأ" }
التطبيق يعرض error.message مباشرة للمستخدم
6. أشكال الاستجابة (Response Wrappers)
لا يوجد شكل موحد — بعض الـ endpoints ترجع مباشرة وبعضها wrapped:

Endpoint	شكل الاستجابة
/api/orders	{ data: [], count, success }
/api/orders/enhanced	{ data: [], success }
/api/production-orders	[] (مصفوفة مباشرة)
/api/rolls	[] (مصفوفة مباشرة)
/api/machines	[] (مصفوفة مباشرة)
/api/customers?all=true	[] (مصفوفة مباشرة)
/api/customer-products	{ data: [] }
/api/notifications	[] أو { data: [] }
/api/maintenance-requests	[] (مصفوفة مباشرة)
/api/quality-issues	{ data: [], success }
/api/master-batch-colors	[] (مصفوفة مباشرة)
/api/attendance	{ data: [] }
/api/dashboard/stats	{ ... } (كائن مباشر)
التطبيق يتعامل مع هذا بمرونة باستخدام: const items = data?.data || (Array.isArray(data) ? data : []);

7. نقاط API تعمل بـ Fallback
هذه النقاط قد لا تكون موجودة في بعض إصدارات السيرفر. التطبيق يستخدم .catch(() => []) لتجنب الأخطاء:

GET /api/notifications          → fallback: { data: [] }
GET /api/quality-issues         → fallback: { data: [] }
GET /api/maintenance-requests   → fallback: { data: [] }
GET /api/machines               → fallback: { data: [] }
GET /api/rolls                  → fallback: []
GET /api/production/film-queue  → fallback: []
GET /api/production/printing-queue → fallback: []
GET /api/production/cutting-queue  → fallback: []
GET /api/customers?all=true     → fallback: []
GET /api/customer-products      → fallback: { data: [] }
GET /api/master-batch-colors    → fallback: []
8. هيكل التطبيق (App Structure)
app/
  _layout.tsx              # Root (Auth guard, Theme provider, Stack navigator)
  login.tsx                # تسجيل الدخول
  (tabs)/
    _layout.tsx            # Bottom tabs (5 tabs)
    index.tsx              # لوحة الإنتاج + أزرار التنقل للمراحل
    orders.tsx             # الطلبات مع أوامر الإنتاج وأشرطة التقدم
    approvals.tsx          # الإشعارات
    quality.tsx            # مشاكل الجودة
    more.tsx               # الحضور + الصيانة + الإعدادات
  production/
    _layout.tsx            # Stack navigator لشاشات الإنتاج
    film.tsx               # إنشاء رولات (مرحلة الفيلم)
    printing.tsx           # تسجيل الطباعة
    cutting.tsx            # تسجيل التقطيع
9. سير عمل الإنتاج (Production Workflow)
1. إنشاء طلب (Order)
   POST /api/orders
   ↓
2. إنشاء أوامر إنتاج (Production Orders)
   POST /api/production-orders
   ↓
3. مرحلة الفيلم — إنشاء رولات
   POST /api/rolls/create-with-timing
   يرسل: production_order_id, weight_kg, film_machine_id, is_last_roll, production_time_minutes
   ↓
4. مرحلة الطباعة — تسجيل طباعة الرول
   PATCH /api/rolls/:id/print
   يرسل: printing_machine_id, printed_by
   ↓
5. مرحلة التقطيع — إتمام التقطيع
   POST /api/rolls/:id/complete-cutting
   يرسل: cutting_machine_id, cut_weight_total_kg, waste_kg, cut_by
   ↓
6. الرول يصبح stage: "done"
السيرفر مسؤول عن تحديث نسب الإكمال تلقائياً بعد كل عملية:

film_completion_percentage يتحدث عند إنشاء رول
printing_completion_percentage يتحدث عند طباعة رول
cutting_completion_percentage يتحدث عند تقطيع رول
10. تحديث حالة الرول (Roll Stage Transitions)
film → printed (via PATCH /api/rolls/:id/print)
printed → done (via POST /api/rolls/:id/complete-cutting)
التطبيق يعتمد على حقل stage لفلترة الرولات:

شاشة الطباعة تعرض: stage === 'film' || stage === 'waiting_print' || stage === 'film_done'
شاشة التقطيع تعرض: stage === 'printed' || stage === 'waiting_cut'
11. CORS & Security
السيرفر يجب أن يدعم:
Access-Control-Allow-Origin: *
Access-Control-Allow-Headers: Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, Pragma, Cookie, Set-Cookie
Access-Control-Allow-Methods: GET, PUT, POST, DELETE, OPTIONS, PATCH
Access-Control-Allow-Credentials: true
كل الطلبات تستخدم Content-Type: application/json
التوثيق عبر Authorization: Bearer <token>
12. ملاحظات إضافية للمطوّر
لا تغير أسماء الحقول — التطبيق يعتمد على أسماء محددة مثل production_order_number وليس order_number لأوامر الإنتاج.

لا تغير أنواع البيانات — إذا كان quantity_kg يرجع كـ string، لا تحوله لـ number في الاستجابة.

اختبار أي تغيير — قبل نشر أي تحديث على السيرفر, تأكد أن هذه النقاط لا تزال تعمل:

POST /api/mobile/login
GET /api/dashboard/stats
GET /api/orders/enhanced
GET /api/production-orders
GET /api/rolls
GET /api/machines
النقاط المستقبلية — إذا أضفت نقاط API جديدة, أضف وثائقها هنا وأبلغ مطوّر الموبايل.

Backward Compatibility — لا تحذف حقول موجودة، يمكنك إضافة حقول جديدة بدون كسر التطبيق.

آخر تحديث: مارس 2026 إصدار التطبيق: 1.0.0 إصدار Expo SDK: 54