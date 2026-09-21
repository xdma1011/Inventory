// ═══════════ عميل Supabase الموحّد — يُحمَّل من كل صفحة (الرئيسية وصفحات الفروع) ═══════════
// ملاحظة: هاد المفتاح "publishable" مصمم يكون عام بالكود، وصلاحياته محصورة بجدول واحد فقط عبر RLS
/* jshint esversion:8 */
const SUPABASE_URL = 'https://ygeyqhjrjvstczrbbzrx.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_f33Cf2VzJM_aXNIppG_APQ_0csM9L12';
const SUPABASE_TABLE = 'inventory_sync';

let supabaseClient = null;
try {
    if (window.supabase && window.supabase.createClient) {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
} catch (e) { console.error('Supabase init failed', e); }

// طلب خفيف بيلمس قاعدة البيانات بدون ما يقرأ/يكتب شي فعلي — بس عشان يحافظ على نشاطها
// (مشروع Supabase المجاني بيوقف تلقائياً بعد 7 أيام سكون بدون أي طلب). تُستدعى من أي صفحة مع branchId المناسب.
async function pingSupabase(branchId) {
    if (!supabaseClient) return;
    try {
        await supabaseClient.from(SUPABASE_TABLE).select('branch_id').eq('branch_id', branchId || 'home').limit(1);
    } catch (e) { console.error('Supabase ping failed', e); }
}
