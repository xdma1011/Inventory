// ═══════════ صفحة المشتريات الموحدة — بيانات الحدود الدنيا والموردين لكل فرع ═══════════
// عدّل هنا فقط لإضافة/تعديل حد أدنى أو مورد لصنف. لو صنف مش موجود هون، ما بيظهر بالصفحة.
/* jshint esversion:6 */

const PURCHASING_BRANCHES = {
    gardens: {
        label: 'الجاردنز',
        icon: '🌿',
        lsKey: 'purchasing_qty_gardens_v1',
        items: [
            { sku: 'sk-0037', name: 'جزر', unit: 'G', min: 5000, supplier: 'سوق مركزي', location: 'سوق مركزي' },
            { sku: 'sk-0040', name: 'معالق - ملاعق', unit: 'PC', min: 8000, supplier: 'الأهرام', location: 'توصيل' },
            { sku: 'sk-0041', name: 'شوك', unit: 'PC', min: 2000, supplier: 'البرج', location: 'الجاردنز' },
            { sku: 'sk-0062', name: 'بندق', unit: 'G', min: null, supplier: 'الشعب', location: '', batchGrams: 270, batchThreshold: 10, batchTarget: 30 },
            { sku: 'sk-0063', name: 'جوز هند', unit: 'G', min: null, supplier: 'الشعب', location: '', batchGrams: 225, batchThreshold: 10, batchTarget: 30 },
            { sku: 'sk-0064', name: 'لوز', unit: 'G', min: null, supplier: 'الشعب', location: '', batchGrams: 160, batchThreshold: 10, batchTarget: 30 },
            { sku: 'sk-0065', name: 'كاجو', unit: 'G', min: null, supplier: 'الشعب', location: '', batchGrams: 160, batchThreshold: 10, batchTarget: 30 },
            { sku: 'sk-0066', name: 'فستق حلبي', unit: 'G', min: 500, supplier: 'الشعب', location: '' },
            { sku: 'sk-0067', name: 'صنوبر', unit: 'G', min: 750, supplier: 'الشعب', location: '' },
            { sku: 'sk-0071', name: 'لحمة مفرومة', unit: 'G', min: 24000, supplier: 'الصاحب', location: 'ام نوارة' },
            { sku: 'sk-0073', name: 'بصل حب', unit: 'G', min: 10000, supplier: 'العورتاني', location: 'جمب الدار' },
            { sku: 'sk-0075', name: 'كرفس', unit: 'G', min: 4000, supplier: 'سوق مركزي', location: 'سوق مركزي' },
            { sku: 'sk-0091', name: 'صحن ام علي فاضي', unit: 'PC', min: null, supplier: 'RZ', location: 'توصيل' },
            { sku: 'sk-0092', name: 'صحن بشاميل فاضي', unit: 'PC', min: null, supplier: 'RZ', location: 'توصيل' },
            { sku: 'sk-0097', name: 'علبة الشطة والدقة ارنون', unit: 'PC', min: 6000, supplier: 'الأهرام', location: 'توصيل' },
            { sku: 'sk-0099', name: 'علبة كمالة', unit: 'PC', min: 2000, supplier: 'الأهرام', location: 'توصيل' },
            { sku: 'sk-0128', name: 'علبة شوربة فاضي', unit: 'PC', min: 250, supplier: 'هيثم صالح', location: 'مرج الحمام' },
            { sku: 'sk-0177', name: 'علب مهلبية', unit: 'PC', min: 252, supplier: 'هيثم صالح', location: 'مرج الحمام' },
            { sku: 'sk-0147', name: 'اكياس صغير', unit: 'KG', min: 80, supplier: 'هيثم صالح', location: 'مرج الحمام' }
        ]
    },
    marj: {
        label: 'مرج الحمام',
        icon: '🏙️',
        lsKey: 'purchasing_qty_marj_v1',
        items: [
            { sku: 'sk-0099', name: 'علبة كمالة', unit: 'PC', min: 1000, supplier: '', location: '' },
            { sku: 'sk-0040', name: 'ملاعق', unit: 'PC', min: 4000, supplier: '', location: '' },
            { sku: 'sk-0041', name: 'شوك', unit: 'PC', min: 2000, supplier: '', location: '' },
            { sku: 'sk-0128', name: 'علبة شوربة', unit: 'PC', min: 250, supplier: '', location: '' },
            { sku: 'sk-0177', name: 'علبة مهلبية فاضية', unit: 'PC', min: 200, supplier: '', location: '' }
        ]
    },
    central: {
        label: 'المركزي',
        icon: '🏬',
        lsKey: 'purchasing_qty_central_v1',
        items: [
            { sku: 'sk-0042', name: 'صحن كشري - طبق', unit: 'PC', min: 6000, supplier: '', location: '' },
            { sku: 'sk-0095', name: 'اغطية صحن كشري', unit: 'PC', min: 5400, supplier: '', location: '' },
            { sku: 'sk-0091', name: 'صحن ام علي', unit: 'PC', min: 1000, supplier: '', location: '' },
            { sku: 'sk-0092', name: 'صحن بشاميل - صحن باشميل', unit: 'PC', min: 1000, supplier: '', location: '' }
        ]
    }
};
