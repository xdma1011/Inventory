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
function decodeBuffer(buf) {
    const bytes = new Uint8Array(buf);
    if (bytes[0] === 0x50 && bytes[1] === 0x4B) throw new Error('ملف Excel حقيقي (xlsx) — صدّره من فوديكس CSV أو XLS');
    if (bytes[0] === 0xFF && bytes[1] === 0xFE) return new TextDecoder('utf-16le').decode(buf);
    if (bytes[0] === 0xFE && bytes[1] === 0xFF) return new TextDecoder('utf-16be').decode(buf);
    const utf8 = new TextDecoder('utf-8').decode(buf);
    if (!utf8.includes('�')) return utf8;
    try { return new TextDecoder('windows-1256').decode(buf); } catch (e) { return utf8; }
}

const toNum = s => {
    const q = parseFloat(String(s || '0').replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/,/g, ''));
    return isNaN(q) ? 0 : q;
};

// ملف XLS من فوديكس هو فعلياً جدول HTML — فيه كمان اسم الفرع بسطر "الفروع"
function parseStockHtml(content) {
    const doc = new DOMParser().parseFromString(content, 'text/html');
    const result = {};
    let branchName = '', si = -1, qi = -1;
    doc.querySelectorAll('tr').forEach(tr => {
        const cells = Array.from(tr.querySelectorAll('th,td')).map(c => c.textContent.trim());
        if (!cells.length) return;
        if (cells[0] === 'الفروع' && cells[1]) { branchName = cells[1]; return; }
        const lower = cells.map(c => c.toLowerCase());
        const hs = lower.findIndex(h => h === 'sku' || h.includes('رمز'));
        const hq = lower.findIndex(h => h.includes('quantity') || h.includes('الكمية') || h.includes('كمية'));
        if (hs >= 0 && hq >= 0) { si = hs; qi = hq; return; }
        if (si < 0) return;
        const sku = (cells[si] || '').toLowerCase();
        if (sku) result[sku] = toNum(cells[qi]);
    });
    if (!Object.keys(result).length) throw new Error('ما قدرت أقرأ أي صنف من ملف XLS');
    return { data: result, branchName };
}

function parseStockCsv(content) {
    content = String(content || '').replace(/^﻿/, '').trim();
    if (!content) throw new Error('الملف فارغ');
    if (content[0] === '<') return parseStockHtml(content).data;
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
            const content = decodeBuffer(e.target.result).replace(/^﻿/, '').trim();
            let parsed, note = '';
            if (content[0] === '<') {
                const html = parseStockHtml(content);
                parsed = html.data;
                const matchId = Object.keys(PURCHASING_BRANCHES).find(id => {
                    const label = PURCHASING_BRANCHES[id].label;
                    return html.branchName && (html.branchName.includes(label) || label.includes(html.branchName));
                });
                if (matchId && matchId !== activeBranch) {
                    switchBranch(matchId);
                    note = ` — الملف لفرع ${PURCHASING_BRANCHES[matchId].label} فانتقلت لتابه`;
                }
            } else {
                parsed = parseStockCsv(content);
            }
            qtyByBranch[activeBranch] = Object.assign({}, qtyByBranch[activeBranch], parsed);
            saveQty(activeBranch);
            render();
            showMsg(`✅ تم تحميل ${Object.keys(parsed).length} صنف من الملف${note}`, 'success');
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
    const haystack = [item.name, item.filter, item.supplier, item.location].map(normalizeSearch).join(' ');
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
            const isBatch = it.batchGrams != null;
            const hasMin = isBatch ? true : (it.min !== null && it.min !== undefined);
            let below = false, need = 0, batches = null;
            if (isBatch) {
                batches = hasQty ? Math.floor(Math.max(0, q) / it.batchGrams) : null;
                below = hasQty && batches < it.batchThreshold;
                need = below ? Math.max(0, (it.batchTarget - batches) * it.batchGrams) : 0;
            } else {
                below = hasQty && hasMin && q < it.min;
                need = 0; // بالتنبيه فقط — بلا اقتراح كمية شراء محددة (إلا للمكسرات دفعة أم علي)
            }
            return { ...it, qty: q, hasQty, hasMin, isBatch, batches, below, need };
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
        const sections = [];

        // ─── تفصيل خلطة أم علي: قائمة واضحة بالجرام بالضبط عشان تطلب من الموظف ───
        const nutRows = rows.filter(r => r.isBatch);
        if (nutRows.length) {
            sections.push(renderSection('🥜 تفصيل مكسرات أم علي — الكمية بالجرام بالضبط', nutRows, true));
        }

        // ─── تجميع حسب المورد ───
        const bySupplier = new Map();
        rows.forEach(r => {
            if (!r.supplier) return;
            if (!bySupplier.has(r.supplier)) bySupplier.set(r.supplier, []);
            bySupplier.get(r.supplier).push(r);
        });
        bySupplier.forEach((items, supplier) => {
            sections.push(renderSection(`📦 احتياج من ${supplier}`, items));
        });

        // ─── كل الأصناف مع بعض، بلا فرز حسب المورد، المحتاج شراء أول ───
        sections.push(renderSection('🗂️ كل الأصناف', rows));

        list.innerHTML = sections.join('');
    }

    renderOrders();

    const withMin = branch.items.filter(it => it.min !== null && it.min !== undefined).length;
    const uploadedCount = Object.keys(qty).length;
    document.getElementById('branchStats').textContent =
        `${branch.items.length} صنف مسجّل — ${withMin} منهم له حد أدنى` +
        (uploadedCount ? ` — آخر ملف محمّل: ${uploadedCount} صنف` : ' — لسا ما انرفع ملف');
}

// ─── طلبيات جاهزة للنسخ (مصنع الأهرام) ───
const cartonsTxt = n => n === 1 ? 'كرتونة وحدة' : n === 2 ? 'كرتونتين' : `${n} كراتين`;

function buildOrder(order, qty) {
    const calc = [], blocks = [];
    let missing = false;
    order.lines.forEach(l => {
        const q = qty[l.sku.toLowerCase()];
        if (q === undefined) { missing = true; calc.push(`${l.label}: <b>ما في كمية بالملف</b>`); return; }
        const have = Math.max(0, q) / l.perCarton;
        const n = Math.max(0, Math.round(l.target - have));
        calc.push(`${l.label}: عندك <b>${fmt(have)}</b> كرتونة — الهدف ${l.target} → اطلب <b>${n}</b>`);
        if (n > 0) blocks.push(l.text.replace('{n}', cartonsTxt(n)));
    });
    const message = blocks.length
        ? `${order.header}\n\n\n${blocks.join('\n----------\n\n')}\n\n${order.footer}`
        : '';
    return { calc, message, missing };
}

let currentOrderMessages = [];

function renderOrders() {
    const box = document.getElementById('ordersBox');
    const branch = PURCHASING_BRANCHES[activeBranch];
    const qty = qtyByBranch[activeBranch] || {};
    currentOrderMessages = [];
    if (!branch.orders || !branch.orders.length) { box.innerHTML = ''; return; }
    if (!Object.keys(qty).length) {
        box.innerHTML = branch.orders.map(o => `<div class="panel order-panel"><div class="order-head"><h3>${o.title}</h3></div>
            <div class="order-calc">ارفع ملف المستويات أول عشان تنحسب الطلبية</div></div>`).join('');
        return;
    }
    box.innerHTML = branch.orders.map((o, i) => {
        const r = buildOrder(o, qty);
        currentOrderMessages[i] = r.message;
        const body = r.message
            ? `<div class="order-preview">${escapeHtml(r.message)}</div>`
            : `<div class="order-empty">✓ كل شي فوق الهدف — ما في داعي تطلب هلق</div>`;
        return `<div class="panel order-panel">
            <div class="order-head"><h3>${o.title}</h3>
                <button class="copy-btn" onclick="copyOrder(${i}, this)" ${r.message ? '' : 'disabled'}>📋 نسخ الرسالة</button></div>
            <div class="order-calc">${r.calc.join('<br>')}</div>
            ${body}
        </div>`;
    }).join('');
}

function escapeHtml(s) {
    return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function copyOrder(i, btn) {
    const text = currentOrderMessages[i];
    if (!text) return;
    const done = () => { const t = btn.textContent; btn.textContent = '✅ انسخت'; setTimeout(() => { btn.textContent = t; }, 1500); };
    const fallback = () => {
        const ta = document.createElement('textarea');
        ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); done(); } catch (e) { alert('ما قدرت أنسخ — انسخها يدوي من المعاينة'); }
        ta.remove();
    };
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, fallback);
    else fallback();
}

function renderSection(title, items, nutsDetail) {
    return `<div class="group-section">
        <h3 class="group-title">${title}</h3>
        <div class="items-list">${items.map(r => renderRow(r, nutsDetail)).join('')}</div>
    </div>`;
}

function renderRow(r, nutsDetail) {
    const badge = !r.hasMin
        ? `<span class="badge b-none">بلا حد أدنى محدد</span>`
        : !r.hasQty
            ? `<span class="badge b-wait">بانتظار رفع الملف</span>`
            : r.below
                ? `<span class="badge b-buy">تحت الحد — انتبه</span>`
                : `<span class="badge b-ok">متوفر ✓</span>`;
    const qtyTxt = r.hasQty
        ? (r.isBatch ? `${fmt(r.qty)} ${unitLabel(r.unit)} (~${fmt(r.batches)} خلطة)` : `${fmt(r.qty)} ${unitLabel(r.unit)}`)
        : '—';
    const minTxt = r.isBatch
        ? `${fmt(r.batchThreshold)} خلطة (${fmt(r.batchThreshold * r.batchGrams)} ${unitLabel(r.unit)})`
        : (r.hasMin ? `${fmt(r.min)} ${unitLabel(r.unit)}` : '—');
    const needLine = (r.below && r.isBatch)
        ? `<div class="need-line">🛒 اشترِ ${fmt(r.need)} ${unitLabel(r.unit)} لترجع لـ ${fmt(r.batchTarget)} خلطة</div>`
        : (nutsDetail && r.isBatch ? `<div class="need-line ok-line">✓ فوق حد التنبيه (${fmt(r.batchThreshold)} خلطات) — ما في داعي تطلب هلق</div>` : '');
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
