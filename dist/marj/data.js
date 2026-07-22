// ═══════════ بيانات فرع مرج الحمام ═══════════
/* jshint esversion:6 */

const inventoryData = [
            { name: "صحون الباشميل المنتجة", sku: "sp-0149", unit: "PC", packageSize: 1, secondOp: "*", secondVal: 1, isFixed: false },
            { name: "صحون ام علي المنتجة", sku: "sp-180", unit: "PC", packageSize: 1, secondOp: "*", secondVal: 1, isFixed: false },
            { name: "علبة شطة منتجة", sku: "sp-0156", unit: "PC", packageSize: 1, secondOp: "*", secondVal: 1, isFixed: false },
            { name: "علبة دقة منتجة", sku: "sp-0155", unit: "PC", packageSize: 1, secondOp: "*", secondVal: 1, isFixed: false },
            { name: "علبة خبز مقلي منتجة", sku: "sp-0162", unit: "PC", packageSize: 1, secondOp: "*", secondVal: 1, isFixed: false },
            { name: "بصل مقلي", sku: "sp-0154", unit: "KG", packageSize: 1.0, secondOp: "/", secondVal: 1, isFixed: false },
            { name: "صلصة البندورة للكشري", sku: "sp-0174", unit: "KG", packageSize: 1.0, secondOp: "/", secondVal: 1, isFixed: false },
            { name: "صلصة البولونيز", sku: "sp-0150", unit: "KG", packageSize: 1.0, secondOp: "/", secondVal: 3.5, isFixed: false },
            { name: "شوربة عدس", sku: "sp-0175", unit: "Batch", packageSize: 1.0, secondOp: "*", secondVal: 1, isFixed: false },
            { name: "شعرية مطبوخة", sku: "sp-0160", unit: "G", packageSize: 1.0, secondOp: "/", secondVal: 0.4, isFixed: false },
            { name: "علبة مهلبية منتجة", sku: "p-0163", unit: "PC", packageSize: 1, secondOp: "*", secondVal: 1, isFixed: false },
            { name: "طبق كشري", sku: "sk-0042", unit: "PC", packageSize: 50.0, secondOp: "*", secondVal: 1, isFixed: false },
            { name: "علبة صوص الكشري كمالة", sku: "sk-0099", unit: "PC", packageSize: 50.0, secondOp: "*", secondVal: 1, isFixed: false },
            { name: "علبة شوربة", sku: "sk-0128", unit: "PC", packageSize: 50.0, secondOp: "*", secondVal: 1, isFixed: false, note: "كرتون = 50 علبة" },
            { name: "معالق - ملاعق", sku: "sk-0040", unit: "PC", packageSize: 25.0, secondOp: "*", secondVal: 25, isFixed: true },
            { name: "شوك", sku: "sk-0041", unit: "PC", packageSize: 25.0, secondOp: "*", secondVal: 25, isFixed: true },
            { name: "معكرونة كشري خام كوع", sku: "sk-0033", unit: "G", packageSize: 9.6, secondOp: "*", secondVal: 1, isFixed: false },
            { name: "معكرونة سباغتي خام", sku: "sk-0034", unit: "G", packageSize: 10.0, secondOp: "*", secondVal: 1, isFixed: false },
            { name: "رز خام", sku: "sk-0032", unit: "G", packageSize: 1.0, secondOp: "*", secondVal: 1, isFixed: false },
            { name: "عدس حب خام", sku: "sk-0046", unit: "G", packageSize: 1.0, secondOp: "*", secondVal: 1, isFixed: false },
            { name: "حمص خام", sku: "sk-0047", unit: "G", packageSize: 1.0, secondOp: "*", secondVal: 1, isFixed: false },
            { name: "سكر", sku: "sk-0039", unit: "G", packageSize: 1.0, secondOp: "*", secondVal: 1, isFixed: false },
            { name: "سمن", sku: "sk-0069", unit: "G", packageSize: 1.7, secondOp: "*", secondVal: 1, isFixed: false },
            { name: "ملح", sku: "sk-0038", unit: "G", packageSize: 1, secondOp: "*", secondVal: 1, isFixed: false },
            { name: "سماق", sku: "sk-0070", unit: "G", packageSize: 1.0, secondOp: "*", secondVal: 1, isFixed: false },
            { name: "ليمون", sku: "sk-0102", unit: "G", packageSize: 1.0, secondOp: "*", secondVal: 1, isFixed: false },
            { name: "مياه معدنية - ماتركس", sku: "sk-0079", unit: "PC", packageSize: 12.0, secondOp: "*", secondVal: 1, isFixed: false, category: "water" },
            { name: "ماتركس كولا", sku: "sk-0080", unit: "PC", packageSize: 24.0, secondOp: "*", secondVal: 1, isFixed: false, category: "matrix" },
            { name: "ماتركس كولا زيرو", sku: "sk-0081", unit: "PC", packageSize: 24.0, secondOp: "*", secondVal: 1, isFixed: false, category: "matrix" },
            { name: "ماتركس اب", sku: "sk-0083", unit: "PC", packageSize: 24.0, secondOp: "*", secondVal: 1, isFixed: false, category: "matrix" },
            { name: "ماتركس اب زيرو", sku: "sk-0084", unit: "PC", packageSize: 24.0, secondOp: "*", secondVal: 1, isFixed: false, category: "matrix" },
            { name: "ماتركس فروت", sku: "sk-0085", unit: "PC", packageSize: 24.0, secondOp: "*", secondVal: 1, isFixed: false, category: "matrix" },
            { name: "ماتريكس تفاح", sku: "sk-0148", unit: "PC", packageSize: 24.0, secondOp: "*", secondVal: 1, isFixed: false, category: "matrix" },
            { name: "ماتركس اورانج", sku: "sk-0082", unit: "PC", packageSize: 24.0, secondOp: "*", secondVal: 1, isFixed: false, category: "matrix" },
            { name: "اكياس الطلبات - صغير", sku: "sk-0147", unit: "KG", packageSize: 1.0, secondOp: "*", secondVal: 1, isFixed: false },
            { name: "علبة مهلبية", sku: "sk-0177", unit: "PC", packageSize: 50.0, secondOp: "*", secondVal: 1, isFixed: false }
        ];

const sectionStarts = { 0: "🏭 شيت الجرد ١ — الإنتاج", 11: "📦 شيت الجرد ٢ — المواد والمشروبات" };

const batchDefaults = {};

const countSheets = [
            { id: 'sheet1', title: 'شيت الجرد ١ — الإنتاج', icon: '🏭', items: [
                { n: 'صحون الباشميل المنتجة - نقطة بيع مرج الحمام', s: 'sp-0149' },
                { n: 'صحون ام علي المنتجة', s: 'sp-180' },
                { n: 'علبة شطة منتجة -نقطة بيع مرج الحمام', s: 'sp-0156' },
                { n: 'علبة دقة منتجة - نقطة بيع مرج الحمام', s: 'sp-0155' },
                { n: 'علبة خبز مقلي منتجة', s: 'sp-0162' },
                { n: 'بصل مقلي - نقطة بيع مرج الحمام', s: 'sp-0154' },
                { n: 'صلصة البندورة للكشري - نقطة مبيعات مرج الحمام', s: 'sp-0174' },
                { n: 'صلصة البولونيز - نقطة بيع مرج الحمام', s: 'sp-0150' },
                { n: 'شوربة عدس - نقطة مبيعات مرج الحمام', s: 'sp-0175' },
                { n: 'شعرية مطبوخة - نقطة بيع مرج الحمام', s: 'sp-0160' },
                { n: 'علبة مهلبية منتجة', s: 'p-0163' }
            ]},
            { id: 'sheet2', title: 'شيت الجرد ٢ — المواد والمشروبات', icon: '📦', items: [
                { n: 'طبق كشري', s: 'sk-0042' },
                { n: 'علبة صوص الكشري كمالة', s: 'sk-0099' },
                { n: 'علبة شوربة', s: 'sk-0128' },
                { n: 'معالق', s: 'sk-0040' },
                { n: 'شوك', s: 'sk-0041' },
                { n: 'معكرونة كشري خام', s: 'sk-0033' },
                { n: 'معكرونة سباغتي خام', s: 'sk-0034' },
                { n: 'رز خام', s: 'sk-0032' },
                { n: 'عدس حب خام', s: 'sk-0046' },
                { n: 'حمص خام', s: 'sk-0047' },
                { n: 'سكر', s: 'sk-0039' },
                { n: 'سمن', s: 'sk-0069' },
                { n: 'ملح', s: 'sk-0038' },
                { n: 'سماق', s: 'sk-0070' },
                { n: 'ليمون', s: 'sk-0102' },
                { n: 'مياه معدنية', s: 'sk-0079' },
                { n: 'ماتركس كولا', s: 'sk-0080' },
                { n: 'ماتركس كولا زيرو', s: 'sk-0081' },
                { n: 'ماتركس اب', s: 'sk-0083' },
                { n: 'ماتركس اب زيرو', s: 'sk-0084' },
                { n: 'ماتركس فروت', s: 'sk-0085' },
                { n: 'ماتريكس تفاح', s: 'sk-0148' },
                { n: 'ماتركس اورانج', s: 'sk-0082' },
                { n: 'اكياس الطلبات - صغير', s: 'sk-0147' },
                { n: 'علبة مهلبية', s: 'sk-0177' }
            ]}
        ];