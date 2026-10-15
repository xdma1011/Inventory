// ═══════════ بيانات المستودع المركزي — عدّل هنا فقط لإضافة/حذف/تعديل أصناف ═══════════
/* jshint esversion:6 */

const inventoryData = [
            { name: "صحن كشري - طبق", sku: "sk-0042", unit: "PC", packageSize: 300, oldPackageSizes: [50], secondOp: "*", secondVal: 50, oldSecondVals: [1], pkgName: "كرتونة", pkgPlural: "كراتين", unitName: "ربطة", unitPlural: "ربطات", isFixed: false, note: "كرتونة = 300 صحن — الخانات التانية ربطات (الربطة = 50)", pkgBarcode: "", unitBarcode: "" },
            { name: "اغطية صحن كشري", sku: "sk-0095", unit: "PC", packageSize: 300, oldPackageSizes: [1], secondOp: "*", secondVal: 50, oldSecondVals: [1], pkgName: "كرتونة", pkgPlural: "كراتين", unitName: "ربطة", unitPlural: "ربطات", isFixed: false, note: "كرتونة = 300 غطا — الخانات التانية ربطات (الربطة = 50)", pkgBarcode: "", unitBarcode: "" },
            { name: "صحن ام علي", sku: "sk-0091", unit: "PC", packageSize: 1000, oldPackageSizes: [1], secondOp: "*", secondVal: 125, oldSecondVals: [1], pkgName: "كرتونة", pkgPlural: "كراتين", unitName: "ربطة", unitPlural: "ربطات", isFixed: false, note: "كرتونة = 1000 صحن — الخانات التانية ربطات (الربطة = 125)", pkgBarcode: "", unitBarcode: "" },
            { name: "صحن بشاميل - صحن باشميل", sku: "sk-0092", unit: "PC", packageSize: 500, oldPackageSizes: [1], secondOp: "*", secondVal: 125, oldSecondVals: [1], pkgName: "كرتونة", pkgPlural: "كراتين", unitName: "ربطة", unitPlural: "ربطات", isFixed: false, note: "كرتونة = 500 صحن — الخانات التانية ربطات (الربطة = 125)", pkgBarcode: "", unitBarcode: "" }
        ];

const sectionStarts = { 0: "🧾 جرد المستودع المركزي" };

const batchDefaults = {};

// صورة الفروقات: هالأصناف (بالحبة — صحون وتعبئة وماتركس ومياه) بتطلع أول شي، وبعدها باقي المواد
const diffPhotoPriority = ['sk-0042', 'sk-0092', 'sk-0091'];

const countSheets = [
            { id: 'central', title: '🧾 جرد المستودع المركزي', icon: '🧾', items: [
                { n: 'صحن كشري - طبق', s: 'sk-0042' },
                { n: 'اغطية صحن كشري', s: 'sk-0095' },
                { n: 'صحن ام علي', s: 'sk-0091' },
                { n: 'صحن بشاميل - صحن باشميل', s: 'sk-0092' }
            ]}
        ];
