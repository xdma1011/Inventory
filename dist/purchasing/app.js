// ═══════════ صفحة المشتريات الموحدة — منطق الاستيراد والفلترة والعرض ═══════════
/* jshint esversion:6 */

let activeBranch = 'gardens';
let qtyByBranch = {}; // { gardens: { sku: qty }, marj: {...}, central: {...} }

function loadQty(branchId) {
    try {
        const raw = localStorage.getItem(PURCHASING_BRANCHES[branchId].lsKey);
        return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
}
function saveQty(branchId) {
    try { localStorage.setItem(PURCHASING_BRANCHES[branchId].lsKey, JSON.stringify(qtyByBranch[branchId] || {})); } catch (e) {}
}
Object.keys(PURCHASING_BRANCHES).forEach(b => { qtyByBranch[b] = loadQty(b); });

// ─── تحليل ملف CSV/JSON من فوديكس (نفس منطق استيراد "بيانات النظام" بصفحة الجرد) ───
function detectSep(line) {
    const counts = { ',': 0, ';': 0, '\t': 0 };
    let inQ = false;
    for (const ch of line) {
        if (ch === '"') inQ = !inQ;
        else if (!inQ && counts[ch] !== undefined) counts[ch]++;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}
function splitLine(line, sep) {
    const res = []; let cur = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') { if (inQ && line[i + 1] === '"') { cur += '"'; i++; } else inQ = !inQ; continue; }
        if (ch === sep && !inQ) { res.push(cur); cur = ''; continue; }
        cur += ch;
    }
    res.push(cur);
    return res.map(c => c.trim());
}
function parseStockCsv(content) {
    content = String(content || '').replace(/^﻿/, '').trim();
    if (!content) throw new Error('الملف فارغ');
    const result = {};
    if (content[0] === '[' || content[0] === '{') {
        const arr = JSON.parse(content);
        (Array.isArray(arr) ? arr : [arr]).forEach(item => {
            const sku = (item.SKU || item.sku || '').toString().trim().toLowerCase();
            if (sku) result[sku] = parseFloat(item.Quantity || item.quantity || item.Qty || item.qty || 0);
        });
        return result;
    }
    const lines = content.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) throw new Error('الملف ناقص — سطر واحد فقط');
    const sep = detectSep(lines[0]);
    const headers = splitLine(lines[0], sep).map(h => h.toLowerCase());
    let si = headers.findIndex(h => h.includes('sku') || h.includes('كود') || h.includes('رمز'));
    let qi = headers.findIndex(h => h.includes('quantity') || h.includes('qty') || h.includes('كمية') || h.includes('الكمية') || h.includes('رصيد'));
    let start = 1;
    if (si < 0 || qi < 0) {
        const probe = splitLine(lines[1] || lines[0], sep);
        si = probe.findIndex(c => /^(sk|p)-?\d+/i.test(c));
        for (let k = probe.length - 1; k >= 0; k--) { if (/^-?[\d.,]+$/.test(probe[k])) { qi = k; break; } }
        if (si < 0 || qi < 0) throw new Error('ما لقيت أعمدة SKU والكمية — تأكد أنه ملف تقرير مستويات المواد من فوديكس');
        start = /sku|كود|quantity|كمية/i.test(lines[0]) ? 1 : 0;
    }
    for (let i = start; i < lines.length; i++) {
        const cols = splitLine(lines[i], sep);
        const sku = (cols[si] || '').toLowerCase();
        if (!sku) continue;
        const q = parseFloat(String(cols[qi] || '0').replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/,/g, ''));
        result[sku] = isNaN(q) ? 0 : q;
    }
    if (!Object.keys(result).length) throw new Error('ما قدرت أقرأ أي صنف من الملف');
    return result;
}

function uploadStockFile() {
    const input = document.getElementById('stockFile');
    const files = Array.from(input.files || []);
    if (!files.length) { showMsg('اختر ملف أولاً', 'error'); return; }
    const file = files[0];
    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const content = new TextDecoder('utf-8').decode(e.target.result);
            const parsed = parseStockCsv(content);
            qtyByBranch[activeBranch] = Object.assign({}, qtyByBranch[activeBranch], parsed);
            saveQty(activeBranch);
            showMsg(`✅ تم تحميل ${Object.keys(parsed).length} صنف من الملف`, 'success');
            render();
        } catch (err) {
            showMsg('خطأ: ' + err.message, 'error');
        }
        input.value = '';
    };
    reader.onerror = function () { showMsg('تعذّرت قراءة الملف', 'error'); input.value = ''; };
    reader.readAsArrayBuffer(file);
}

function showMsg(msg, type) {
    const el = document.getElementById('fileNote');
    el.textContent = msg;
    el.className = 'file-note ' + (type || '');
}

// ─── بحث نصي: بالاسم أو المورد أو مكان الشراء، بلا ترتيب معيّن للكلمات ───
function normalizeSearch(str) {
    return String(str || '')
        .toLowerCase()
        .replace(/[ةه]/g, 'ه')
        .replace(/[أإآا]/g, 'ا')
        .replace(/[يى]/g, 'ي');
}
function itemMatchesSearch(item, normalizedTerm) {
    if (!normalizedTerm) return true;
    const sku = (item.sku || '').toLowerCase();
    if (sku.includes(normalizedTerm)) return true;
    const haystack = normalizeSearch(item.name) + ' ' + normalizeSearch(item.supplier || '') + ' ' + normalizeSearch(item.location || '');
    const words = normalizedTerm.split(/\s+/).filter(Boolean);
    return words.length > 0 && words.every(w => haystack.includes(w));
}

const fmt = n => Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 });
const unitLabel = u => ({ G: 'جم', KG: 'كجم', PC: 'قطعة', L: 'لتر', ML: 'مل' }[u] || u);

function switchBranch(branchId) {
    activeBranch = branchId;
    document.querySelectorAll('.branch-tab').forEach(t => t.classList.toggle('active', t.dataset.branch === branchId));
    document.getElementById('fileNote').textContent = '';
    document.getElementById('fileNote').className = 'file-note';
    render();
}

function render() {
    const branch = PURCHASING_BRANCHES[activeBranch];
    const qty = qtyByBranch[activeBranch] || {};
    const term = normalizeSearch(document.getElementById('searchInput').value.trim());

    const rows = branch.items
        .filter(it => itemMatchesSearch(it, term))
        .map(it => {
            const q = qty[it.sku.toLowerCase()];
            const hasQty = q !== undefined;
            const hasMin = it.min !== null && it.min !== undefined;
            const below = hasQty && hasMin && q < it.min;
            const need = below ? Math.ceil(it.min - q) : 0;
            return { ...it, qty: q, hasQty, hasMin, below, need };
        })
        .sort((a, b) => {
            if (a.below !== b.below) return a.below ? -1 : 1;
            if (a.hasMin !== b.hasMin) return a.hasMin ? -1 : 1;
            return a.name.localeCompare(b.name, 'ar');
        });

    const list = document.getElementById('itemsList');
    if (!rows.length) {
        list.innerHTML = `<div class="empty">ما في نتائج مطابقة</div>`;
    } else {
        list.innerHTML = rows.map(r => {
            const badge = !r.hasMin
                ? `<span class="badge b-none">بلا حد أدنى محدد</span>`
                : !r.hasQty
                    ? `<span class="badge b-wait">بانتظار رفع الملف</span>`
                    : r.below
                        ? `<span class="badge b-buy">تحت الحد — اشترِ</span>`
                        : `<span class="badge b-ok">متوفر ✓</span>`;
            const qtyTxt = r.hasQty ? `${fmt(r.qty)} ${unitLabel(r.unit)}` : '—';
            const minTxt = r.hasMin ? `${fmt(r.min)} ${unitLabel(r.unit)}` : '—';
            const needLine = r.below ? `<div class="need-line">🛒 اشترِ ${fmt(r.need)} ${unitLabel(r.unit)}</div>` : '';
            const supplierLine = (r.supplier || r.location)
                ? `<div class="supplier-line">📍 ${[r.supplier, r.location].filter(Boolean).join(' — ')}</div>` : '';
            return `<div class="item-row ${r.below ? 'urgent' : ''}">
                <div class="row-top">
                    <div class="iname">${r.name}<span class="isku">${r.sku}</span></div>
                    ${badge}
                </div>
                <div class="row-mid">
                    <span>المتوفر: <b>${qtyTxt}</b></span>
                    <span>الحد الأدنى: <b>${minTxt}</b></span>
                </div>
                ${needLine}
                ${supplierLine}
            </div>`;
        }).join('');
    }

    const withMin = branch.items.filter(it => it.min !== null && it.min !== undefined).length;
    const uploadedCount = Object.keys(qty).length;
    document.getElementById('branchStats').textContent =
        `${branch.items.length} صنف مسجّل — ${withMin} منهم له حد أدنى` +
        (uploadedCount ? ` — آخر ملف محمّل: ${uploadedCount} صنف` : ' — لسا ما انرفع ملف');
}

document.addEventListener('DOMContentLoaded', () => {
    const tabsEl = document.getElementById('branchTabs');
    tabsEl.innerHTML = Object.keys(PURCHASING_BRANCHES).map(id => {
        const b = PURCHASING_BRANCHES[id];
        return `<button class="branch-tab ${id === activeBranch ? 'active' : ''}" data-branch="${id}" onclick="switchBranch('${id}')">${b.icon} ${b.label}</button>`;
    }).join('');
    document.getElementById('searchInput').addEventListener('input', render);
    document.getElementById('stockFile').addEventListener('change', uploadStockFile);
    render();
});
