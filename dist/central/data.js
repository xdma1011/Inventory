// ═══════════ بيانات المستودع المركزي — عدّل هنا فقط لإضافة/حذف/تعديل أصناف ═══════════
/* jshint esversion:6 */

const inventoryData = [
            { name: "صحن كشري - طبق", sku: "sk-0042", unit: "PC", packageSize: 50.0, secondOp: "*", secondVal: 1, isFixed: false, note: "كرتون = 50 صحن", pkgBarcode: "", unitBarcode: "" },
            { name: "اغطية صحن كشري", sku: "sk-0095", unit: "PC", packageSize: 1.0, secondOp: "*", secondVal: 1, isFixed: false, pkgBarcode: "", unitBarcode: "" },
            { name: "صحن ام علي", sku: "sk-0091", unit: "PC", packageSize: 1.0, secondOp: "*", secondVal: 1, isFixed: false, pkgBarcode: "", unitBarcode: "" },
            { name: "صحن بشاميل - صحن باشميل", sku: "sk-0092", unit: "PC", packageSize: 1.0, secondOp: "*", secondVal: 1, isFixed: false, pkgBarcode: "", unitBarcode: "" }
        ];

const sectionStarts = { 0: "🧾 جرد المستودع المركزي" };

const batchDefaults = {};

const countSheets = [
            { id: 'central', title: '🧾 جرد المستودع المركزي', icon: '🧾', items: [
                { n: 'صحن كشري - طبق', s: 'sk-0042' },
                { n: 'اغطية صحن كشري', s: 'sk-0095' },
                { n: 'صحن ام علي', s: 'sk-0091' },
                { n: 'صحن بشاميل - صحن باشميل', s: 'sk-0092' }
            ]}
        ];
