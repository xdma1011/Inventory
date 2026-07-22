// ═══════════ منطق التطبيق المشترك — app.js ═══════════
// البيانات (الأصناف والشيتات والمعاملات) في data.js تبعك
// لا تعدل هنا إلا إذا كان التغيير يخص المنطق أو واجهة المستخدم
/* jshint esversion:6 */

/* DEFINED IN data.js */

        // ─── أقسام شيتات الجرد (عناوين فواصل داخل الجدول) ───
        /* DEFINED IN data.js */

        // ─── معامل التحويل إلى باتش لكل 1000 من الوحدة الحالية ───
        // القيم الافتراضية مأخوذة من جداول Foodics (إدخال 1000 → كم باتش ظهر)
        const BATCH_LS_KEY = 'batchFactors_gardens_v1';
        /* DEFINED IN data.js */
        function loadBatchFactorsFromLS() {
            const f = Object.assign({}, batchDefaults);
            try {
                const raw = localStorage.getItem(BATCH_LS_KEY);
                if (raw) Object.assign(f, JSON.parse(raw));
            } catch (e) { console.error(e); }
            return f;
        }
        let batchFactors = loadBatchFactorsFromLS();

        // ─── تعريف شيتات الجرد الستة لتصدير CSV جاهز للاستيراد في Foodics ───
        // كل عنصر: n = الاسم في Foodics ، s = SKU في Foodics ، page = [sku, name] لعنصر الصفحة إذا اختلف
        /* DEFINED IN data.js */

        const packageSizeOptions = [0.3, 0.4, 1.0, 1.7, 4.0, 4.4, 5.0, 6.0, 9.0, 9.6, 10.0, 12.0, 13.5, 15.0, 18.0, 24.0, 25.0, 50.0, 100.0];
        const secondMultiplierOptions = [0.815, 1.0, 1.1, 25.0];
        const CLEAR_PASSWORD = "12345";
        let systemData = {};
        let autoSaveTimer = null;
        let isSorted = false;
        let originalRows = [];
        // minimum values per index
        const minValues = new Array(inventoryData.length).fill(0);

        // ─── HELPERS ───
        function evaluateExpression(expr) {
            if (!expr || expr.trim() === '') return 0;
            expr = expr.trim();
            if (!/^[\d\s\+\-\*\/\(\)\.]+$/.test(expr)) return 0;
            try {
                const result = Function('"use strict"; return (' + expr + ')')();
                return isNaN(result) ? 0 : result;
            } catch (e) { return 0; }
        }

        // ─── CREATE TABLE ───
        function createTable() {
            const tbody = document.getElementById('tableBody');
            tbody.innerHTML = '';
            inventoryData.forEach((item, index) => {
                if (sectionStarts[index]) {
                    const sr = document.createElement('tr');
                    sr.className = 'section-row';
                    const secLabel = sectionStarts[index];
                    const secSheet = sheetIdForSectionLabel(secLabel);
                    const secBtns = secSheet
                        ? `<span class="sec-actions"><button class="sec-btn sec-btn-xlsx" onclick="exportSheetXLSX('${secSheet}')">📊 Excel</button><button class="sec-btn sec-btn-csv" onclick="exportSheetCSV('${secSheet}')">📥 CSV</button></span>`
                        : '';
                    sr.innerHTML = `<td colspan="18"><span class="sec-label">${secLabel}</span>${secBtns}</td>`;
                    tbody.appendChild(sr);
                }
                const row = document.createElement('tr');
                row.dataset.index = index;
                // نضمن أن قيمة الصنف نفسها موجودة ضمن الخيارات حتى لو لم تكن بالقائمة الجاهزة (مثل ÷3.5 أو ÷0.4)
                const pkgList = packageSizeOptions.includes(item.packageSize) ? packageSizeOptions : [...packageSizeOptions, item.packageSize].sort((a, b) => a - b);
                let pkgOpts = pkgList.map(s => `<option value="${s}" ${s === item.packageSize ? 'selected' : ''}>${s}</option>`).join('');
                let secOpOpts = `<option value="*" ${item.secondOp === '*' ? 'selected' : ''}>×</option><option value="/" ${item.secondOp === '/' ? 'selected' : ''}>÷</option>`;
                const secValList = secondMultiplierOptions.includes(item.secondVal) ? secondMultiplierOptions : [...secondMultiplierOptions, item.secondVal].sort((a, b) => a - b);
                let secValOpts = secValList.map(v => `<option value="${v}" ${v === item.secondVal ? 'selected' : ''}>${v}</option>`).join('');
                const isFixed = item.isFixed;
                const fixClass = isFixed ? 'fixed-coeff' : '';
                const disabled = isFixed ? 'disabled' : '';
                let badge = '';
                if (item.unit === 'G') badge = '<span class="unit-badge unit-g">G</span>';
                else if (item.unit === 'ML') badge = '<span class="unit-badge unit-ml">ML</span>';
                else if (item.unit === 'PC') badge = '<span class="unit-badge unit-pc">PC</span>';
                const noteBtn = item.note
                    ? `<button class="note-btn" onclick="showNote(${index})" title="ملاحظة">📌</button>`
                    : '';
                row.innerHTML = `
<td data-col="result"><div class="result-cell" data-index="${index}" tabindex="0" title="انقر للنسخ — ↑↓ للتنقل"><span id="result-${index}">0</span><span class="batch-tag" id="btag-${index}" style="display:none">باتش</span></div></td>
<td class="batch-cell" data-col="batch"><input type="text" inputmode="decimal" autocomplete="off" readonly id="batchf-${index}" value="${batchFactors[item.sku + '||' + item.name] !== undefined ? batchFactors[item.sku + '||' + item.name] : ''}" oninput="onFactorInput(this, ${index})" ondblclick="unlockFactor(this)" onblur="lockFactor(this)" onkeydown="if(event.key==='Enter') this.blur()" placeholder="—" title="كم باتش يساوي 1000 ${item.unit} — دبل كليك للتعديل"><div class="batch-result" id="batchres-${index}">—</div></td>
<td data-col="diff"><div class="diff-cell diff-zero" id="diff-${index}"><span id="diffValue-${index}">-</span></div></td>
<td class="min-cell" data-col="min"><input type="number" inputmode="decimal" id="min-${index}" value="0" min="0" oninput="onMinChange(${index})" placeholder="0" title="الحد الأدنى"></td>
<td data-col="name"><div class="item-name">${item.name}${noteBtn}</div></td>
<td data-col="pkg"><select id="package-${index}" onchange="calculateRow(${index})" ${disabled}>${pkgOpts}</select></td>
<td><input type="text" inputmode="decimal" autocomplete="off" id="input1-${index}" oninput="onExprInput(this, ${index})" onkeydown="if(event.key==='Enter') lockInput(this)" ondblclick="unlockInput(this)" placeholder="0"></td>
<td><input type="text" inputmode="decimal" autocomplete="off" id="input2-${index}" oninput="onExprInput(this, ${index})" onkeydown="if(event.key==='Enter') lockInput(this)" ondblclick="unlockInput(this)" placeholder="0"></td>
<td><input type="text" inputmode="decimal" autocomplete="off" id="input3-${index}" oninput="onExprInput(this, ${index})" onkeydown="if(event.key==='Enter') lockInput(this)" ondblclick="unlockInput(this)" placeholder="0"></td>
<td><input type="text" inputmode="decimal" autocomplete="off" id="input4-${index}" oninput="onExprInput(this, ${index})" onkeydown="if(event.key==='Enter') lockInput(this)" ondblclick="unlockInput(this)" placeholder="0"></td>
<td class="section-divider gap-col"><select hidden id="multiplier-${index}" onchange="calculateRow(${index})" ${disabled}>${pkgOpts}</select></td>
<td class="section-divider"><input type="text" inputmode="decimal" autocomplete="off" id="input5-${index}" oninput="onExprInput(this, ${index})" onkeydown="if(event.key==='Enter') lockInput(this)" ondblclick="unlockInput(this)" placeholder="0"></td>
<td class="section-divider"><input type="text" inputmode="decimal" autocomplete="off" id="input6-${index}" oninput="onExprInput(this, ${index})" onkeydown="if(event.key==='Enter') lockInput(this)" ondblclick="unlockInput(this)" placeholder="0"></td>
<td class="section-divider"><input type="text" inputmode="decimal" autocomplete="off" id="input7-${index}" oninput="onExprInput(this, ${index})" onkeydown="if(event.key==='Enter') lockInput(this)" ondblclick="unlockInput(this)" placeholder="0"></td>
<td class="section-divider"><input type="text" inputmode="decimal" autocomplete="off" id="input8-${index}" class="negative-allowed" oninput="onExprInput(this, ${index})" placeholder="-0"></td>
<td class="section-divider">
  <div class="multiplier-box">
    <select id="secondOp-${index}" onchange="calculateRow(${index})" class="op-select ${item.secondOp === '*' ? 'op-multiply' : 'op-divide'} ${fixClass}" ${disabled}>${secOpOpts}</select>
    <select id="secondVal-${index}" onchange="calculateRow(${index})" class="${fixClass}" ${disabled}>${secValOpts}</select>
  </div>
</td>
<td class="section-divider"><span class="sku-display">${item.sku}</span>${badge}</td>
<td class="section-divider"><span style="font-weight:700;color:#90a4ae">${item.unit}</span></td>`;
                tbody.appendChild(row);
            });
            originalRows = Array.from(tbody.children);
            setupEventListeners();
            updateItemCount();
            loadSavedData();
            inventoryData.forEach((_, i) => {
                updateBatchDisplay(i);
                ['input1', 'input2', 'input3', 'input4', 'input5', 'input6', 'input7', 'input8'].forEach(n => {
                    const el = document.getElementById(`${n}-${i}`);
                    if (el && el.value) el.title = el.value;
                    if (el && cellHasValue(el)) lockExprCell(el);
                });
            });
            applyInputMode();
        }

        // ─── CALCULATE ───
        function calculateRow(index) {
            const item = inventoryData[index];
            const packageSize = parseFloat(document.getElementById(`package-${index}`).value) || 1;
            const input1 = evaluateExpression(document.getElementById(`input1-${index}`).value);
            const input2 = evaluateExpression(document.getElementById(`input2-${index}`).value);
            const input3 = evaluateExpression(document.getElementById(`input3-${index}`).value);
            const input4 = evaluateExpression(document.getElementById(`input4-${index}`).value);
            const input5 = evaluateExpression(document.getElementById(`input5-${index}`).value);
            const input6 = evaluateExpression(document.getElementById(`input6-${index}`).value);
            const input7 = evaluateExpression(document.getElementById(`input7-${index}`).value);
            const input8 = evaluateExpression(document.getElementById(`input8-${index}`).value);
            const secondOp = document.getElementById(`secondOp-${index}`).value;
            const secondVal = parseFloat(document.getElementById(`secondVal-${index}`).value) || 1;
            const bf = getBatchFactor(index);
            const firstSection = (input1 + input2 + input3 + input4) * packageSize;
            let secondSection = input5 + input6 + input7 + input8;
            // إذا كان للصنف معامل باتش: نتجاهل ÷/× المعامل القديم لتفادي التحويل المزدوج
            if (!bf) secondSection = secondOp === '*' ? secondSection * secondVal : (secondVal !== 0 ? secondSection / secondVal : 0);
            let total = firstSection + secondSection;
            if (item.unit === 'G' || item.unit === 'ML') total = total * 1000;
            // التحويل إلى باتش: (المجموع بالوحدة الخام ÷ 1000) × معامل الباتش
            if (bf) total = total / 1000 * bf;
            document.getElementById(`result-${index}`).textContent = total.toLocaleString('en-US', { maximumFractionDigits: bf ? 5 : 2 });
            updateBatchDisplay(index);
            syncCoeffState(index);
            checkMinimum(index);
            updateDiff(index);
            updateGrandTotal();
            updateSummaryTotals();
            triggerAutoSave();
        }

        // ─── MINIMUM CHECK ───
        function onMinChange(index) {
            minValues[index] = parseFloat(document.getElementById(`min-${index}`).value) || 0;
            checkMinimum(index);
            triggerAutoSave();
        }
        function checkMinimum(index) {
            const minVal = minValues[index];
            if (minVal === 0) {
                // ignore
                document.getElementById(`min-${index}`).parentElement.classList.remove('min-alert-min');
                document.getElementById(`result-${index}`).classList.remove('min-alert-result', 'pulse-red');
                document.querySelector(`tr[data-index="${index}"]`).classList.remove('min-alert-row');
                return;
            }
            const result = parseFloat(document.getElementById(`result-${index}`).textContent.replace(/,/g, '')) || 0;
            const inputEl = document.getElementById(`min-${index}`);
            const resultCell = document.getElementById(`result-${index}`);
            const row = document.querySelector(`tr[data-index="${index}"]`);
            if (result < minVal) {
                inputEl.parentElement.classList.add('min-alert-min');
                resultCell.classList.add('min-alert-result', 'pulse-red');
                row.classList.add('min-alert-row');
            } else {
                inputEl.parentElement.classList.remove('min-alert-min');
                resultCell.classList.remove('min-alert-result', 'pulse-red');
                row.classList.remove('min-alert-row');
            }
        }

        // ─── DIFF ───
        function updateDiff(index) {
            const sku = inventoryData[index].sku.toLowerCase();
            const manualQty = parseFloat(document.getElementById(`result-${index}`).textContent.replace(/,/g, '')) || 0;
            const diffCell = document.getElementById(`diff-${index}`);
            const diffValue = document.getElementById(`diffValue-${index}`);
            if (systemData[sku] !== undefined) {
                const diff = manualQty - systemData[sku];
                diffValue.textContent = diff.toLocaleString('en-US', { maximumFractionDigits: getBatchFactor(index) ? 5 : 2 });
                diffCell.classList.remove('diff-positive', 'diff-negative', 'diff-zero');
                if (diff > 0) diffCell.classList.add('diff-positive');
                else if (diff < 0) diffCell.classList.add('diff-negative');
                else diffCell.classList.add('diff-zero');
                const row = document.querySelector(`tr[data-index="${index}"]`);
                row.classList.remove('has-negative-diff', 'has-positive-diff');
                if (diff < 0) row.classList.add('has-negative-diff');
                else if (diff > 0) row.classList.add('has-positive-diff');
            } else {
                diffValue.textContent = '-';
                diffCell.classList.remove('diff-positive', 'diff-negative');
                diffCell.classList.add('diff-zero');
            }
            updateDiffSummary();
        }
        function updateDiffSummary() {
            let totalDiff = 0, withDiff = 0, matched = 0;
            inventoryData.forEach((item, i) => {
                const sk = item.sku.toLowerCase();
                if (systemData[sk] !== undefined) {
                    const manual = parseFloat(document.getElementById(`result-${i}`).textContent.replace(/,/g, '')) || 0;
                    const diff = manual - systemData[sk];
                    totalDiff += diff;
                    if (diff !== 0) withDiff++; else matched++;
                }
            });
            document.getElementById('totalDiff').textContent = totalDiff.toLocaleString('en-US', { maximumFractionDigits: 2 });
            document.getElementById('itemsWithDiff').textContent = withDiff;
            document.getElementById('itemsMatched').textContent = matched;
        }

        // ─── SUMMARY TOTALS ───
        function updateSummaryTotals() {
            let matrixTotal = 0, matrixDiff = 0, matrixBoxes = 0;
            let waterTotal = 0, waterDiff = 0, waterBoxes = 0;
            // Matrix indices in inventoryData (category==='matrix'): indices 7-13
            // Water index: 14
            inventoryData.forEach((item, i) => {
                const qty = parseFloat(document.getElementById(`result-${i}`).textContent.replace(/,/g, '')) || 0;
                if (item.category === 'matrix') {
                    matrixTotal += qty;
                    if (systemData[item.sku.toLowerCase()] !== undefined) matrixDiff += qty - systemData[item.sku.toLowerCase()];
                    // Boxes: first 3 inputs only (input1+input2+input3) / 24 boxes
                    const in1 = evaluateExpression(document.getElementById(`input1-${i}`).value);
                    const in2 = evaluateExpression(document.getElementById(`input2-${i}`).value);
                    const in3 = evaluateExpression(document.getElementById(`input3-${i}`).value);
                    const in4 = evaluateExpression(document.getElementById(`input4-${i}`).value);
                    matrixBoxes += (in1 + in2 + in3 + in4);
                } else if (item.category === 'water') {
                    waterTotal += qty;
                    if (systemData[item.sku.toLowerCase()] !== undefined) waterDiff += qty - systemData[item.sku.toLowerCase()];
                    waterBoxes += evaluateExpression(document.getElementById(`input1-${i}`).value)
                        + evaluateExpression(document.getElementById(`input2-${i}`).value)
                        + evaluateExpression(document.getElementById(`input3-${i}`).value)
                        + evaluateExpression(document.getElementById(`input4-${i}`).value);
                }
            });
            const mDE = document.getElementById('matrixDiff');
            const wDE = document.getElementById('waterDiff');
            document.getElementById('matrixTotal').textContent = matrixTotal.toLocaleString('en-US', { maximumFractionDigits: 2 });
            mDE.textContent = matrixDiff.toLocaleString('en-US', { maximumFractionDigits: 2 });
            document.getElementById('matrixBoxes').textContent = matrixBoxes.toLocaleString('en-US', { maximumFractionDigits: 0 }) + ' صندوق';
            document.getElementById('waterTotal').textContent = waterTotal.toLocaleString('en-US', { maximumFractionDigits: 2 });
            const wBx = document.getElementById('waterBoxes'); if (wBx) wBx.textContent = waterBoxes.toLocaleString('en-US', { maximumFractionDigits: 0 }) + ' صندوق';
            wDE.textContent = waterDiff.toLocaleString('en-US', { maximumFractionDigits: 2 });
            ['matrixDiff', 'waterDiff'].forEach(id => {
                const el = document.getElementById(id);
                const v = parseFloat(el.textContent.replace(/[^0-9\.\-]/g, '')) || 0;
                el.classList.remove('neg', 'pos');
                if (v < 0) el.classList.add('neg');
                else if (v > 0) el.classList.add('pos');
            });
        }

        function updateGrandTotal() {
            let grand = 0;
            inventoryData.forEach((_, i) => grand += parseFloat(document.getElementById(`result-${i}`).textContent.replace(/,/g, '')) || 0);
            document.getElementById('grandTotal').textContent = `📊 المجموع الكلي للجرد: ${grand.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
        }

        // ─── SORT ───
        function sortByVariance() {
            const tbody = document.getElementById('tableBody');
            tbody.querySelectorAll('tr.section-row').forEach(r => r.classList.add('hidden'));
            const rows = Array.from(tbody.querySelectorAll('tr[data-index]'));
            rows.sort((a, b) => {
                const ia = parseInt(a.dataset.index);
                const ib = parseInt(b.dataset.index);
                const da = Math.abs(parseFloat(document.getElementById(`diffValue-${ia}`).textContent.replace(/,/g, '')) || 0);
                const db = Math.abs(parseFloat(document.getElementById(`diffValue-${ib}`).textContent.replace(/,/g, '')) || 0);
                return db - da;
            });
            rows.forEach(r => tbody.appendChild(r));
            isSorted = true;
            document.getElementById('sortBanner').classList.add('active');
            showToast('تم الترتيب حسب أكبر فرق', 'success');
        }
        function resetSort() {
            const tbody = document.getElementById('tableBody');
            originalRows.forEach(r => tbody.appendChild(r));
            tbody.querySelectorAll('tr.section-row').forEach(r => r.classList.remove('hidden'));
            isSorted = false;
            document.getElementById('sortBanner').classList.remove('active');
            showToast('تم إعادة الترتيب الأصلي', 'success');
        }

        // ─── EVENT LISTENERS ───
        function setupEventListeners() {
            // ── Fix: use delegation on tbody so dynamically-sorted rows always work ──
            document.getElementById('tableBody').addEventListener('click', function (e) {
                const cell = e.target.closest('.result-cell');
                if (!cell) return;
                cell.focus();
                copyResultCell(cell);
            });
            // Arrow key navigation + Enter copy on result-cells
            document.getElementById('tableBody').addEventListener('keydown', function (e) {
                const cell = e.target.closest('.result-cell');
                if (!cell) return;
                if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                    e.preventDefault();
                    // find the next/prev result-cell in DOM order (works even when sorted)
                    const all = Array.from(document.querySelectorAll('.result-cell'));
                    const ci = all.indexOf(cell);
                    const next = e.key === 'ArrowDown' ? all[ci + 1] : all[ci - 1];
                    if (next) { next.focus(); copyResultCell(next); }
                } else if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    copyResultCell(cell);
                }
            });
            document.getElementById('searchInput').addEventListener('input', function () {
                const term = this.value.toLowerCase();
                document.querySelectorAll('#tableBody tr').forEach((row) => {
                    if (row.classList.contains('section-row')) { row.classList.toggle('hidden', !!term || isSorted); return; }
                    const i = parseInt(row.dataset.index);
                    const nm = inventoryData[i].name.toLowerCase();
                    const sk = inventoryData[i].sku.toLowerCase();
                    if (nm.includes(term) || sk.includes(term)) { row.classList.remove('hidden'); if (term) row.classList.add('highlighted'); else row.classList.remove('highlighted'); }
                    else { row.classList.add('hidden'); row.classList.remove('highlighted'); }
                });
            });
            document.getElementById('searchInput').addEventListener('keydown', function (e) {
                if (e.key !== 'Enter') return;
                e.preventDefault();
                const term = this.value.toLowerCase();
                let firstVisible = null;
                document.querySelectorAll('#tableBody tr').forEach((row) => {
                    if (row.classList.contains('section-row')) { row.classList.toggle('hidden', !!term || isSorted); return; }
                    const i = parseInt(row.dataset.index);
                    const nm = inventoryData[i].name.toLowerCase();
                    const sk = inventoryData[i].sku.toLowerCase();
                    if (nm.includes(term) || sk.includes(term)) { row.classList.remove('hidden'); if (term && !firstVisible) firstVisible = row; }
                    else row.classList.add('hidden');
                });
                if (term) {
                    this.select(); if (firstVisible) {
                        setTimeout(() => {
                            const idx = parseInt(firstVisible.dataset.index);
                            const cols = ['input1', 'input2', 'input3', 'input4', 'input5', 'input6', 'input7', 'input8'];
                            let target = null;
                            for (const col of cols) {
                                const el = document.getElementById(`${col}-${idx}`);
                                if (el && !el.disabled && !el.readOnly) { target = el; break; }
                            }
                            if (target) { target.focus(); target.select(); }
                        }, 100);
                    }
                }
            });
            document.addEventListener('keydown', function (e) {
                if (e.key === 'Enter' && e.target.tagName !== 'BUTTON' && e.target.type !== 'file' && e.target.type !== 'password' && e.target.id !== 'searchInput' && !(e.target.id || '').startsWith('batchf-')) {
                    e.preventDefault();
                    const bar = document.getElementById('opBar');
                    if (bar) bar.classList.remove('show');
                    opBarTarget = null;
                    jumpToSearch();
                }
            });
            document.getElementById('passwordInput').addEventListener('keydown', function (e) { if (e.key === 'Enter') verifyPassword(); });
            document.querySelectorAll('input[type="text"]').forEach(input => {
                input.addEventListener('keydown', function (e) {
                    if (!this.id.startsWith('input')) return;
                    const [colName, rowIndex] = this.id.split('-');
                    const row = parseInt(rowIndex);
                    let targetId = null;
                    if (e.key === 'ArrowDown') { targetId = `${colName}-${row + 1}`; e.preventDefault(); }
                    else if (e.key === 'ArrowUp') { targetId = `${colName}-${row - 1}`; e.preventDefault(); }
                    else if (e.key === 'ArrowLeft') { const cn = parseInt(colName.replace('input', '')); if (cn < 6) targetId = `input${cn + 1}-${row}`; e.preventDefault(); }
                    else if (e.key === 'ArrowRight') { const cn = parseInt(colName.replace('input', '')); if (cn > 1) targetId = `input${cn - 1}-${row}`; e.preventDefault(); }
                    if (targetId) { const next = document.getElementById(targetId); if (next) { next.focus(); next.select(); } }
                });
            });
            window.addEventListener('beforeunload', () => { if (!importInProgress) saveData(); });
            setInterval(() => saveData(true), 30000);
        }

        function updateItemCount() { document.getElementById('itemCount').textContent = inventoryData.length; }
        function showNote(index) {
            const item = inventoryData[index];
            if (!item.note) return;
            document.getElementById('noteTitle').textContent = item.name;
            document.getElementById('noteSku').textContent = item.sku;
            document.getElementById('noteBody').textContent = item.note;
            document.getElementById('noteModal').classList.add('show');
        }
        function closeNoteModal() { document.getElementById('noteModal').classList.remove('show'); }
        function showToast(msg, type = 'success') {
            const t = document.getElementById('toast');
            t.textContent = msg; t.className = `toast ${type} show`;
            setTimeout(() => t.classList.remove('show'), 3000);
        }
        function copyResultCell(cell) {
            const index = cell.dataset.index;
            const val = document.getElementById(`result-${index}`).textContent.replace(/,/g, '');
            const copy = (v) => {
                cell.classList.add('copied');
                setTimeout(() => cell.classList.remove('copied'), 900);
                showToast(`${inventoryData[index].name} — ${v}`, 'success');
            };
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(val).then(() => copy(val)).catch(() => { fallbackCopy(val); copy(val); });
            } else { fallbackCopy(val); copy(val); }
        }
        function fallbackCopy(text) {
            const ta = document.createElement('textarea');
            ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
            document.body.appendChild(ta); ta.select();
            try { document.execCommand('copy'); showToast('تم النسخ', 'success'); } catch (e) { }
            document.body.removeChild(ta);
        }
        function confirmClearAll() { document.getElementById('passwordModal').classList.add('show'); document.getElementById('passwordInput').value = ''; document.getElementById('passwordInput').focus(); }
        function closePasswordModal() { document.getElementById('passwordModal').classList.remove('show'); }
        function verifyPassword() {
            if (document.getElementById('passwordInput').value === CLEAR_PASSWORD) { closePasswordModal(); clearAllData(); }
            else { showToast('كلمة المرور غير صحيحة!', 'error'); document.getElementById('passwordInput').value = ''; document.getElementById('passwordInput').focus(); }
        }

        // ─── SYSTEM DATA ───
        // ═══ قراءة الملف بأي ترميز (أندرويد يصدّر أحياناً UTF-16 أو windows-1256) ═══
        function decodeSysBuffer(buf) {
            const bytes = new Uint8Array(buf);
            if (bytes[0] === 0x50 && bytes[1] === 0x4B) return '__XLSX__'; // ملف Excel مضغوط
            if (bytes[0] === 0xFF && bytes[1] === 0xFE) return new TextDecoder('utf-16le').decode(buf);
            if (bytes[0] === 0xFE && bytes[1] === 0xFF) return new TextDecoder('utf-16be').decode(buf);
            let zeros = 0; const n = Math.min(bytes.length, 400);
            for (let i = 0; i < n; i++) if (bytes[i] === 0) zeros++;
            if (zeros > n * 0.2) return new TextDecoder('utf-16le').decode(buf);
            const utf8 = new TextDecoder('utf-8', { fatal: false }).decode(buf);
            if (!utf8.includes('\uFFFD')) return utf8;
            try { return new TextDecoder('windows-1256').decode(buf); } catch (e) { return utf8; }
        }
        function detectSysSep(line) {
            const counts = { ',': 0, ';': 0, '\t': 0 }; let inQ = false;
            for (const ch of line) {
                if (ch === '"') inQ = !inQ;
                else if (!inQ && counts[ch] !== undefined) counts[ch]++;
            }
            return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
        }
        function splitSysLine(line, sep) {
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
        // تحليل نص النظام (CSV أو JSON) — يرجع عدد المواد أو يرمي خطأ برسالة واضحة
        function parseSystemText(content) {
            content = String(content || '').replace(/^\uFEFF/, '').trim();
            if (!content) throw new Error('المحتوى فارغ');
            systemData = {};
            if (content[0] === '[' || content[0] === '{') {
                const arr = JSON.parse(content);
                (Array.isArray(arr) ? arr : [arr]).forEach(item => {
                    const sku = (item.SKU || item.sku || '').toString().trim().toLowerCase();
                    if (sku) systemData[sku] = parseFloat(item.Quantity || item.quantity || item.Qty || item.qty || 0);
                });
            } else {
                const lines = content.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
                if (lines.length < 2) throw new Error('الملف ناقص — سطر واحد فقط');
                const sep = detectSysSep(lines[0]);
                const headers = splitSysLine(lines[0], sep).map(h => h.toLowerCase());
                let si = headers.findIndex(h => h.includes('sku') || h.includes('كود') || h.includes('رمز'));
                let qi = headers.findIndex(h => h.includes('quantity') || h.includes('qty') || h.includes('كمية') || h.includes('الكمية') || h.includes('رصيد'));
                let start = 1;
                if (si < 0 || qi < 0) {
                    // لا عناوين معروفة؟ خمّن: عمود يشبه sk-0000 هو الكود، وآخر عمود رقمي هو الكمية
                    const probe = splitSysLine(lines[1] || lines[0], sep);
                    si = probe.findIndex(c => /^(sk|p)-?\d+/i.test(c));
                    for (let k = probe.length - 1; k >= 0; k--) { if (/^-?[\d.,]+$/.test(probe[k])) { qi = k; break; } }
                    if (si < 0 || qi < 0) throw new Error('ما لقيت أعمدة SKU والكمية — تأكد أنه ملف CSV من فوديكس');
                    start = /sku|كود|quantity|كمية/i.test(lines[0]) ? 1 : 0;
                }
                for (let i = start; i < lines.length; i++) {
                    const cols = splitSysLine(lines[i], sep);
                    const sku = (cols[si] || '').toLowerCase();
                    if (!sku) continue;
                    const q = parseFloat(String(cols[qi] || '0').replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/,/g, ''));
                    systemData[sku] = isNaN(q) ? 0 : q;
                }
                if (!Object.keys(systemData).length) throw new Error('ما قدرت أقرأ أي صنف من الملف');
            }
            return Object.keys(systemData).length;
        }
        function refreshLiveAfterSystemUpdate() {
            const a = document.activeElement;
            if (!a || !a.matches || !a.matches('input[id^="input"], input[id^="min-"], input[id^="batchf-"]')) return;
            const row = a.closest('tr[data-index]');
            if (!row) return;
            renderLive(parseInt(row.dataset.index), a);
        }
        function applySystemData() {
            const matched = Object.keys(systemData).filter(sku => inventoryData.some(item => item.sku.toLowerCase() === sku)).length;
                    inventoryData.forEach((_, i) => updateDiff(i));
                    updateSummaryTotals();
                    document.getElementById('systemStatus').textContent = `متصل (${matched} مادة)`;
                    let sysTotal = 0;
                    inventoryData.forEach(item => { if (systemData[item.sku.toLowerCase()] !== undefined) sysTotal += systemData[item.sku.toLowerCase()]; });
                    document.getElementById('systemTotal').textContent = `💻 المجموع الكلي من النظام: ${sysTotal.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
            showToast(`تم تحميل ${Object.keys(systemData).length} مادة، ${matched} متطابقة`, 'success');
            saveData();
            if (window.refreshShopTab) window.refreshShopTab();
            refreshLiveAfterSystemUpdate();
        }
        function uploadSystemData() {
            const file = document.getElementById('systemFile').files[0];
            if (!file) { showToast('الرجاء اختيار ملف أولاً', 'error'); return; }
            const reader = new FileReader();
            reader.onload = function (e) {
                try {
                    const content = decodeSysBuffer(e.target.result);
                    if (content === '__XLSX__') {
                        showToast('هذا ملف Excel — من فوديكس صدّر بصيغة CSV، أو افتح الملف وانسخ محتواه بزر 📋 لصق', 'error');
                        return;
                    }
                    parseSystemText(content);
                    applySystemData();
                } catch (err) { showToast('خطأ في قراءة الملف: ' + err.message + ' — جرّب زر 📋 لصق', 'error'); }
            };
            reader.onerror = function () { showToast('المتصفح منع قراءة الملف — استخدم زر 📋 لصق', 'error'); };
            reader.readAsArrayBuffer(file);
        }
        function togglePasteBox() {
            const b = document.getElementById('pasteSysBox');
            b.style.display = b.style.display === 'none' ? '' : 'none';
            if (b.style.display === '') document.getElementById('pasteSysArea').focus();
        }
        function pasteSystemData() {
            try {
                const txt = document.getElementById('pasteSysArea').value;
                if (!txt.trim()) { showToast('الصق محتوى الملف أولاً', 'error'); return; }
                parseSystemText(txt);
                applySystemData();
                document.getElementById('pasteSysBox').style.display = 'none';
            } catch (err) { showToast('خطأ في القراءة: ' + err.message, 'error'); }
        }
        function clearSystemData() {
            systemData = {};
            inventoryData.forEach((_, i) => {
                document.getElementById(`diffValue-${i}`).textContent = '-';
                const dc = document.getElementById(`diff-${i}`);
                dc.classList.remove('diff-positive', 'diff-negative'); dc.classList.add('diff-zero');
                document.querySelector(`tr[data-index="${i}"]`).classList.remove('has-negative-diff', 'has-positive-diff');
            });
            document.getElementById('systemStatus').textContent = 'غير متصل';
            if (window.refreshShopTab) window.refreshShopTab();
            document.getElementById('systemTotal').style.display = 'none';
            document.getElementById('diffSummary').style.display = 'none';
            document.getElementById('systemFile').value = '';
            updateSummaryTotals();
            showToast('تم مسح بيانات النظام', 'success');
        }

        // ─── SAVE / LOAD (SKU-keyed — index-independent) ───
        let importInProgress = false; // أثناء استيراد نسخة احتياطية: يمنع أي حفظ من الكتابة فوق البيانات المستوردة
        function saveData(isAuto = false) {
            if (importInProgress) return;
            const data = {};
            inventoryData.forEach((item, i) => {
                const key = item.sku + '||' + item.name; // double-key: sku+name avoids duplicate-SKU collision
                data[key] = {
                    packageSize: document.getElementById(`package-${i}`).value,
                    multiplier: document.getElementById(`multiplier-${i}`).value,
                    secondOp: document.getElementById(`secondOp-${i}`).value,
                    secondVal: document.getElementById(`secondVal-${i}`).value,
                    input1: document.getElementById(`input1-${i}`).value,
                    input2: document.getElementById(`input2-${i}`).value,
                    input3: document.getElementById(`input3-${i}`).value,
                    input4: document.getElementById(`input4-${i}`).value,
                    input5: document.getElementById(`input5-${i}`).value,
                    input6: document.getElementById(`input6-${i}`).value,
                    input7: document.getElementById(`input7-${i}`).value,
                    input8: document.getElementById(`input8-${i}`).value,
                    minVal: minValues[i]
                };
            });
            const payload = JSON.stringify({ data, systemData, timestamp: new Date().toISOString() });
            localStorage.setItem('inventoryData_22FEB2026_v8', payload);
            document.getElementById('lastSave').textContent = new Date().toLocaleString('ar-EG');
            if (!isAuto) showToast('تم حفظ البيانات بنجاح!', 'success');
        }
        function loadSavedData() {
            // Try new SKU-keyed format first, fall back to old index format
            const saved = localStorage.getItem('inventoryData_22FEB2026_v8')
                || localStorage.getItem('inventoryData_22FEB2026_v7');
            if (!saved) return;
            try {
                const parsed = JSON.parse(saved);
                // Detect format: v8 = object with string keys, v7 = array
                const isV8 = parsed.data && !Array.isArray(parsed.data);
                inventoryData.forEach((item, i) => {
                    let entry;
                    if (isV8) {
                        const key = item.sku + '||' + item.name;
                        entry = parsed.data[key];
                    } else {
                        // legacy: map by position
                        entry = Array.isArray(parsed.data) ? parsed.data[i] : null;
                    }
                    if (!entry) return;
                    const pkg = document.getElementById(`package-${i}`);
                    const mul = document.getElementById(`multiplier-${i}`);
                    const sop = document.getElementById(`secondOp-${i}`);
                    const sva = document.getElementById(`secondVal-${i}`);
                    if (!item.isFixed) {
                        if (pkg) pkg.value = entry.packageSize || item.packageSize;
                        if (mul) mul.value = entry.multiplier || item.packageSize;
                        if (sop) sop.value = entry.secondOp || '*';
                        if (sva) sva.value = entry.secondVal || 1;
                    }
                    if (entry.input7 === undefined && entry.input8 === undefined) {
                        // حفظ من النسخة القديمة (3+3): نرحّل المجموعة الثانية لمواقعها الجديدة
                        entry.input8 = entry.input6 || '';
                        entry.input6 = entry.input5 || '';
                        entry.input5 = entry.input4 || '';
                        entry.input4 = '';
                        entry.input7 = '';
                    }
                    ['input1', 'input2', 'input3', 'input4', 'input5', 'input6', 'input7', 'input8'].forEach(n => {
                        const el = document.getElementById(`${n}-${i}`);
                        if (el) el.value = entry[n] || '';
                    });
                    if (entry.minVal !== undefined) {
                        minValues[i] = parseFloat(entry.minVal) || 0;
                        const mel = document.getElementById(`min-${i}`);
                        if (mel) mel.value = minValues[i] || '';
                    }
                    calculateRow(i);
                });
                if (parsed.systemData && Object.keys(parsed.systemData).length > 0) {
                    systemData = parsed.systemData;
                    inventoryData.forEach((_, i) => updateDiff(i));
                    updateSummaryTotals();
                    document.getElementById('systemStatus').textContent = `متصل (${Object.keys(parsed.systemData).length} مادة)`;
                    if (window.refreshShopTab) window.refreshShopTab();
                }
                showToast('تم تحميل البيانات المحفوظة', 'success');
            } catch (e) { console.error(e); }
        }

        // ─── COPY / PASTE localStorage ───
        function copyLocalStorage() {
            const raw = localStorage.getItem('inventoryData_22FEB2026_v8')
                || localStorage.getItem('inventoryData_22FEB2026_v7');
            if (!raw) { showToast('لا توجد بيانات محفوظة للنسخ', 'warning'); return; }
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(raw)
                    .then(() => showToast('✅ تم نسخ البيانات — الصقها في المتصفح الآخر', 'success'))
                    .catch(() => fallbackCopy(raw));
            } else { fallbackCopy(raw); }
        }
        function pasteLocalStorage() {
            const input = document.getElementById('lsPasteInput');
            const text = (input ? input.value : '').trim();
            if (!text) { showToast('الحقل فارغ — الصق البيانات أولاً', 'error'); return; }
            try {
                const parsed = JSON.parse(text);
                if (!parsed.data) throw new Error('صيغة غير صحيحة');
                localStorage.setItem('inventoryData_22FEB2026_v8', JSON.stringify(parsed));
                closeLsModal();
                loadSavedData();
                showToast('✅ تم استيراد البيانات بنجاح', 'success');
            } catch (e) { showToast('خطأ في البيانات: ' + e.message, 'error'); }
        }

        // ═══════════ تصدير/استيراد كامل التخزين المحلي كملف (للنقل بين المتصفحات) ═══════════
        function exportLsFile() {
            const dump = {};
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                dump[k] = localStorage.getItem(k);
            }
            const stamp = new Date().toISOString().slice(0, 16).replace('T', '_').replace(':', '-');
            const blob = new Blob(['\uFEFF' + JSON.stringify({ __app: 'inventory_backup', __branch: 'gardens', __when: new Date().toISOString(), keys: dump }, null, 2)], { type: 'text/plain;charset=utf-8' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'backup_gardens_' + stamp + '.txt';
            document.body.appendChild(a); a.click(); a.remove();
            setTimeout(() => URL.revokeObjectURL(a.href), 3000);
            showToast('تم تنزيل ملف النسخة الاحتياطية — انقله لأي متصفح واستورده هناك', 'success');
        }
        function importLsFile() { document.getElementById('lsFileInput').click(); }
        function handleLsFile(inp) {
            const file = inp.files[0];
            inp.value = '';
            if (!file) return;
            const reader = new FileReader();
            reader.onload = function (e) {
                try {
                    const txt = decodeSysBuffer(e.target.result);
                    if (txt === '__XLSX__') throw new Error('هذا ملف Excel وليس ملف نسخة احتياطية');
                    const parsed = JSON.parse(String(txt).replace(/^\uFEFF/, ''));
                    const keys = parsed && parsed.keys && typeof parsed.keys === 'object' ? parsed.keys
                        : (parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null);
                    if (!keys) throw new Error('صيغة الملف غير معروفة');
                    const n = Object.keys(keys).length;
                    if (!n) throw new Error('الملف فارغ');
                    if (parsed.__branch && parsed.__branch !== 'gardens' && !confirm('تنبيه: هذا الملف من فرع "' + parsed.__branch + '" وهذه صفحة فرع آخر — تستورده رغم ذلك؟')) return;
                    if (!confirm('سيتم استبدال البيانات المحفوظة هنا بمحتوى الملف (' + n + ' مفتاح). متابعة؟')) return;
                    importInProgress = true; // من هذه اللحظة: لا حفظ تلقائي، لا حفظ عند الإغلاق — الملف هو المرجع
                    Object.entries(keys).forEach(([k, v]) => { try { localStorage.setItem(k, String(v)); } catch (err) {} });
                    showToast('تم الاستيراد — سيُعاد تحميل الصفحة الآن', 'success');
                    setTimeout(() => location.reload(), 700);
                } catch (err) { showToast('فشل الاستيراد: ' + err.message, 'error'); }
            };
            reader.onerror = () => showToast('تعذر قراءة الملف', 'error');
            reader.readAsArrayBuffer(file);
        }
        function openLsModal() { document.getElementById('lsModal').classList.add('show'); document.getElementById('lsPasteInput').value = ''; }
        function closeLsModal() { document.getElementById('lsModal').classList.remove('show'); }
        function clearAllData() {
            inventoryData.forEach((_, i) => {
                document.getElementById(`package-${i}`).value = inventoryData[i].packageSize;
                document.getElementById(`multiplier-${i}`).value = inventoryData[i].packageSize;
                document.getElementById(`secondOp-${i}`).value = inventoryData[i].secondOp;
                document.getElementById(`secondVal-${i}`).value = inventoryData[i].secondVal;
                ['input1', 'input2', 'input3', 'input4', 'input5', 'input6', 'input7', 'input8'].forEach(n => { const el = document.getElementById(`${n}-${i}`); el.value = ''; el.readOnly = false; el.classList.remove('cell-locked'); });
                minValues[i] = 0;
                document.getElementById(`min-${i}`).value = '';
                calculateRow(i);
            });
            batchFactors = Object.assign({}, batchDefaults);
            saveBatchFactors();
            inventoryData.forEach((item, i) => {
                const bf = document.getElementById(`batchf-${i}`);
                if (bf) bf.value = batchFactors[factorKey(i)] !== undefined ? batchFactors[factorKey(i)] : '';
                updateBatchDisplay(i);
            });
            localStorage.removeItem('inventoryData_22FEB2026_v7');
            localStorage.removeItem('inventoryData_22FEB2026_v8');
            document.getElementById('lastSave').textContent = 'لم يتم الحفظ';
            showToast('تم مسح جميع البيانات', 'success');
        }

        // ─── EXPORT ───
        function exportToText() {
            let t = 'نظام الجرد - الجاردنز\n22-FEB-2026\n' + '='.repeat(100) + '\n';
            t += 'الناتج\tالفرق\tالحد الأدنى\tالمادة\tSKU\tوحدة\t1\t2\t3\t4\t5\t6\n' + '-'.repeat(100) + '\n';
            inventoryData.forEach((_, i) => {
                t += `${document.getElementById(`result-${i}`).textContent}\t${document.getElementById(`diffValue-${i}`).textContent}\t${minValues[i] || 0}\t${inventoryData[i].name}\t${inventoryData[i].sku}\t${inventoryData[i].unit}\t${document.getElementById(`input1-${i}`).value || '0'}\t${document.getElementById(`input2-${i}`).value || '0'}\t${document.getElementById(`input3-${i}`).value || '0'}\t${document.getElementById(`input4-${i}`).value || '0'}\t${document.getElementById(`input5-${i}`).value || '0'}\t${document.getElementById(`input6-${i}`).value || '0'}\t${document.getElementById(`input7-${i}`).value || '0'}\t${document.getElementById(`input8-${i}`).value || '0'}\n`;
            });
            t += `\n${document.getElementById('grandTotal').textContent}\nمجموع الماتركس: ${document.getElementById('matrixTotal').textContent}\nمجموع المياه: ${document.getElementById('waterTotal').textContent}\nصناديق الماتركس: ${document.getElementById('matrixBoxes').textContent}\n`;
            downloadFile(t, 'inventory_22FEB2026.txt', 'text/plain');
            showToast('تم تصدير البيانات كنص', 'success');
        }
        function exportToExcel() {
            const escHtml = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            // حمولات localStorage تُوضع بعيداً في الأسفل: A300 و A301 و A302
            const zPayloads = [
                localStorage.getItem('inventoryData_22FEB2026_v8') || localStorage.getItem('inventoryData_22FEB2026_v7') || '',
                localStorage.getItem(BATCH_LS_KEY) || JSON.stringify(batchFactors),
                JSON.stringify({ exported: new Date().toISOString(), items: inventoryData.length, keys: ['inventoryData_22FEB2026_v8', BATCH_LS_KEY] })
            ];
            let html = '<table border="1" dir="rtl"><thead><tr><th>الناتج</th><th>باتش/1000</th><th>الكمية الخام</th><th>الفرق</th><th>الحد الأدنى</th><th>المادة</th><th>SKU</th><th>وحدة</th><th>1</th><th>2</th><th>3</th><th>4</th><th>5</th><th>6</th><th>7</th><th>8</th></tr></thead><tbody>';
            inventoryData.forEach((_, i) => {
                const f = getBatchFactor(i);
                const bq = f ? parseFloat((getRawResult(i) / f * 1000).toFixed(2)) : '';
                html += `<tr><td>${document.getElementById(`result-${i}`).textContent}</td><td>${f || ''}</td><td>${bq}</td><td>${document.getElementById(`diffValue-${i}`).textContent}</td><td>${minValues[i] || 0}</td><td>${escHtml(inventoryData[i].name)}</td><td>${inventoryData[i].sku}</td><td>${inventoryData[i].unit}</td><td>${escHtml(document.getElementById(`input1-${i}`).value || '0')}</td><td>${escHtml(document.getElementById(`input2-${i}`).value || '0')}</td><td>${escHtml(document.getElementById(`input3-${i}`).value || '0')}</td><td>${escHtml(document.getElementById(`input4-${i}`).value || '0')}</td><td>${escHtml(document.getElementById(`input5-${i}`).value || '0')}</td><td>${escHtml(document.getElementById(`input6-${i}`).value || '0')}</td><td>${escHtml(document.getElementById(`input7-${i}`).value || '0')}</td><td>${escHtml(document.getElementById(`input8-${i}`).value || '0')}</td></tr>`;
            });
            html += '</tbody></table>';
            html += `<p><strong>${document.getElementById('grandTotal').textContent}</strong></p>`;
            html += `<p><strong>مجموع الماتركس (جرد): ${document.getElementById('matrixTotal').textContent}</strong></p>`;
            html += `<p><strong>صناديق الماتركس (أول 3): ${document.getElementById('matrixBoxes').textContent}</strong></p>`;
            html += `<p><strong>مجموع المياه (جرد): ${document.getElementById('waterTotal').textContent}</strong></p>`;
            // صفوف فارغة حتى نصل الصف 300 بالضبط ثم نطبع الحمولات في A300 / A301 / A302
            const rowsSoFar = 1 + inventoryData.length + 4; // صف العناوين + الأصناف + 4 أسطر المجاميع
            let padTable = '<table>';
            for (let r = rowsSoFar + 1; r < 300; r++) padTable += '<tr><td></td></tr>';
            zPayloads.forEach(pl => { padTable += `<tr><td>${escHtml(pl)}</td></tr>`; });
            padTable += '</table>';
            html += padTable;
            const full = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="UTF-8"></head><body>${html}</body></html>`;
            downloadFile(full, 'inventory_22FEB2026.xls', 'application/vnd.ms-excel');
            showToast('تم التصدير كـ Excel', 'success');
        }
        function copyAllToClipboard() {
            let t = 'الناتج\tالفرق\tالحد الأدنى\tالمادة\tSKU\tوحدة\t1\t2\t3\t4\t5\t6\n';
            inventoryData.forEach((_, i) => { t += `${document.getElementById(`result-${i}`).textContent.replace(/,/g, '')}\t${document.getElementById(`diffValue-${i}`).textContent}\t${minValues[i] || 0}\t${inventoryData[i].name}\t${inventoryData[i].sku}\t${inventoryData[i].unit}\t${document.getElementById(`input1-${i}`).value || '0'}\t${document.getElementById(`input2-${i}`).value || '0'}\t${document.getElementById(`input3-${i}`).value || '0'}\t${document.getElementById(`input4-${i}`).value || '0'}\t${document.getElementById(`input5-${i}`).value || '0'}\t${document.getElementById(`input6-${i}`).value || '0'}\t${document.getElementById(`input7-${i}`).value || '0'}\t${document.getElementById(`input8-${i}`).value || '0'}\n`; });
            navigator.clipboard.writeText(t).then(() => showToast('تم نسخ جميع البيانات!', 'success'));
        }
        function downloadFile(content, filename, mimeType) {
            const blob = new Blob([content], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = filename;
            document.body.appendChild(a); a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
        function triggerAutoSave() {
            clearTimeout(autoSaveTimer);
            autoSaveTimer = setTimeout(() => saveData(true), 2000);
        }
        function lockInput(input) {
            // القفل فقط إذا فيها قيمة (غير فارغة وغير صفر) — ثم الإغلاق
            if (cellHasValue(input)) { input.readOnly = true; input.classList.add('cell-locked'); }
            input.blur();
        }
        function unlockInput(input) { input.readOnly = false; input.classList.remove('cell-locked'); input.style.background = ''; input.style.cursor = ''; input.focus(); try { input.select(); } catch (e) {} if (typeof maybeOpenPadAfterUnlock === 'function' && input.id.indexOf('input') === 0) maybeOpenPadAfterUnlock(input); }


        // ═══════════ إدخال رقمي فقط (أرقام + رموز حسابية) ═══════════
        const AR_DIGITS = { '٠':'0','١':'1','٢':'2','٣':'3','٤':'4','٥':'5','٦':'6','٧':'7','٨':'8','٩':'9','٫':'.','×':'*','÷':'/','−':'-' };
        function sanitizeExprValue(v) {
            v = v.replace(/[٠-٩٫×÷−]/g, ch => AR_DIGITS[ch] || ch);
            return v.replace(/[^0-9+\-*/().\s]/g, '');
        }
        function onExprInput(el, index) {
            const clean = sanitizeExprValue(el.value);
            if (clean !== el.value) {
                const pos = el.selectionStart - (el.value.length - clean.length);
                el.value = clean;
                try { el.setSelectionRange(Math.max(0, pos), Math.max(0, pos)); } catch (e) {}
            }
            el.title = el.value; // tooltip للمدخلات الطويلة
            calculateRow(index);
            if (document.activeElement === el) renderLive(index, el);
        }

        // ═══════════ معامل التحويل إلى باتش ═══════════
        function factorKey(index) { const it = inventoryData[index]; return it.sku + '||' + it.name; }
        function getBatchFactor(index) {
            const v = parseFloat(batchFactors[factorKey(index)]);
            return (isFinite(v) && v > 0) ? v : 0;
        }
        function getRawResult(index) {
            const el = document.getElementById(`result-${index}`);
            return el ? (parseFloat(el.textContent.replace(/,/g, '')) || 0) : 0;
        }
        function onFactorInput(el, index) {
            let clean = el.value.replace(/[٠-٩٫]/g, ch => AR_DIGITS[ch] || ch).replace(/[^0-9.]/g, '');
            if (clean !== el.value) el.value = clean;
            el.title = el.value ? `كل 1000 ${inventoryData[index].unit} = ${el.value} باتش` : 'كم باتش يساوي 1000 من الوحدة';
            const v = parseFloat(clean);
            if (isFinite(v) && v > 0) batchFactors[factorKey(index)] = v;
            else delete batchFactors[factorKey(index)];
            saveBatchFactors();
            calculateRow(index);
            if (document.activeElement === el) renderLive(index, el);
        }
        function saveBatchFactors() {
            try { localStorage.setItem(BATCH_LS_KEY, JSON.stringify(batchFactors)); } catch (e) { console.error(e); }
        }
        function updateBatchDisplay(index) {
            const el = document.getElementById(`batchres-${index}`);
            const tag = document.getElementById(`btag-${index}`);
            if (!el) return;
            const f = getBatchFactor(index);
            if (!f) {
                el.textContent = '—'; el.classList.remove('active');
                if (tag) tag.style.display = 'none';
                return;
            }
            const rawUnits = getRawResult(index) / f * 1000; // عكس التحويل لعرض الكمية الخام
            el.textContent = '= ' + rawUnits.toLocaleString('en-US', { maximumFractionDigits: 2 }) + ' ' + inventoryData[index].unit;
            el.classList.add('active');
            if (tag) tag.style.display = 'inline-block';
        }
        function syncCoeffState(index) {
            const bf = getBatchFactor(index);
            const item = inventoryData[index];
            ['secondOp', 'secondVal'].forEach(idp => {
                const el = document.getElementById(`${idp}-${index}`);
                if (!el) return;
                if (item.isFixed) { el.disabled = true; return; }
                el.disabled = !!bf;
                el.title = bf ? 'معطَّل — معامل الباتش هو المعتمد لهذا الصنف' : '';
            });
        }
        function unlockFactor(el) { el.readOnly = false; el.classList.add('unlocked'); el.focus(); try { el.select(); } catch (e) {} if (typeof maybeOpenPadAfterUnlock === 'function') maybeOpenPadAfterUnlock(el); }
        function lockFactor(el) { el.readOnly = true; el.classList.remove('unlocked'); }

        // ═══════════ تصدير CSV لكل شيت جرد (جاهز لاستيراد Foodics) ═══════════
        function findPageIndex(entry) {
            if (entry.page === null) return -1; // عنصر غير موجود بالصفحة
            const sku = (entry.page ? entry.page[0] : entry.s).toLowerCase();
            const name = entry.page ? entry.page[1] : null;
            const matches = [];
            inventoryData.forEach((it, i) => { if (it.sku.toLowerCase() === sku) matches.push(i); });
            if (!matches.length) return -1;
            if (name) { const m = matches.find(i => inventoryData[i].name === name); if (m !== undefined) return m; }
            return matches[0];
        }
        function csvEscape(v) {
            v = String(v == null ? '' : v);
            return /[",\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
        }

        // ═══════════ توليد ملف Excel (xlsx) حقيقي بدون مكتبات — ZIP مخزّن + XML ═══════════
        function crc32Bytes(u8) {
            if (!crc32Bytes.t) {
                const t = [];
                for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1); t[n] = c >>> 0; }
                crc32Bytes.t = t;
            }
            let crc = 0 ^ (-1);
            for (let i = 0; i < u8.length; i++) crc = (crc >>> 8) ^ crc32Bytes.t[(crc ^ u8[i]) & 0xFF];
            return (crc ^ (-1)) >>> 0;
        }
        function makeZip(entries) { // entries: [[name, textContent], ...] — تخزين بلا ضغط (يقبله كل قارئ xlsx)
            const enc = new TextEncoder();
            const d = new Date();
            const zTime = (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2);
            const zDate = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
            const parts = [], central = [];
            let offset = 0;
            entries.forEach(([name, content]) => {
                const nameB = enc.encode(name), data = enc.encode(content), crc = crc32Bytes(data);
                const lh = new DataView(new ArrayBuffer(30));
                lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true);
                lh.setUint16(10, zTime, true); lh.setUint16(12, zDate, true);
                lh.setUint32(14, crc, true); lh.setUint32(18, data.length, true); lh.setUint32(22, data.length, true);
                lh.setUint16(26, nameB.length, true);
                parts.push(new Uint8Array(lh.buffer), nameB, data);
                const ch = new DataView(new ArrayBuffer(46));
                ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true);
                ch.setUint16(12, zTime, true); ch.setUint16(14, zDate, true);
                ch.setUint32(16, crc, true); ch.setUint32(20, data.length, true); ch.setUint32(24, data.length, true);
                ch.setUint16(28, nameB.length, true);
                ch.setUint32(42, offset, true);
                central.push(new Uint8Array(ch.buffer), nameB);
                offset += 30 + nameB.length + data.length;
            });
            const centralSize = central.reduce((a, p) => a + p.length, 0);
            const eocd = new DataView(new ArrayBuffer(22));
            eocd.setUint32(0, 0x06054b50, true); eocd.setUint16(8, entries.length, true); eocd.setUint16(10, entries.length, true);
            eocd.setUint32(12, centralSize, true); eocd.setUint32(16, offset, true);
            const all = [...parts, ...central, new Uint8Array(eocd.buffer)];
            const out = new Uint8Array(all.reduce((a, p) => a + p.length, 0));
            let pos = 0; all.forEach(p => { out.set(p, pos); pos += p.length; });
            return out;
        }
        function xlsxFromRows(rows, sheetName) {
            const esc = v => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
            const colL = i => { let s = ''; i++; while (i) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = (i - 1 - m) / 26; } return s; };
            let body = '';
            rows.forEach((r, ri) => {
                body += '<row r="' + (ri + 1) + '">';
                r.forEach((c, ci) => {
                    if (c === '' || c === null || c === undefined) return;
                    const ref = colL(ci) + (ri + 1);
                    if (typeof c === 'number' && isFinite(c)) body += '<c r="' + ref + '"><v>' + c + '</v></c>';
                    else body += '<c r="' + ref + '" t="inlineStr"><is><t xml:space="preserve">' + esc(c) + '</t></is></c>';
                });
                body += '</row>';
            });
            const sheetXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
                + '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>' + body + '</sheetData></worksheet>';
            return makeZip([
                ['[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>'],
                ['_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'],
                ['xl/workbook.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="' + esc(sheetName).slice(0, 60) + '" sheetId="1" r:id="rId1"/></sheets></workbook>'],
                ['xl/_rels/workbook.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>'],
                ['xl/worksheets/sheet1.xml', sheetXml]
            ]);
        }
        // صفوف شيت الجرد (مشتركة بين CSV وExcel) — بقالب Foodics حرفياً
        function buildSheetRows(sheet) {
            const rows = [['Inventory Item Name', 'Inventory Item SKU', 'Storage quantity', 'Ingredients quantity', 'Inventory Count ID']];
            const missing = [];
            sheet.items.forEach(entry => {
                const idx = findPageIndex(entry);
                let qty = '';
                if (idx >= 0) qty = parseFloat(getRawResult(idx).toFixed(5));
                else missing.push(entry.n);
                rows.push([entry.n, entry.s, qty, '', '']);
            });
            return { rows, missing };
        }
        function exportSheetXLSX(sheetId) {
            const sheet = countSheets.find(s => s.id === sheetId);
            if (!sheet) return;
            const { rows, missing } = buildSheetRows(sheet);
            const bytes = xlsxFromRows(rows, sheet.title);
            const d = new Date().toISOString().slice(0, 10);
            downloadFile(bytes, `foodics_${sheetId}_${d}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            if (missing.length) showToast(`⚠️ ${sheet.title}: بدون كمية (${missing.join('، ')})`, 'warning');
            else showToast(`✅ Excel ${sheet.title} جاهز للاستيراد في Foodics`, 'success');
        }
        // ربط عنوان القسم بالجدول بشيت الجرد الموافق له
        function sheetIdForSectionLabel(label) {
            // شيتات مرج الحمام المرقمة أولاً (عناوينها تحوي كلمات تتقاطع مع شيتات الجاردنز)
            if (label.includes('شيت الجرد ١')) return 'sheet1';
            if (label.includes('شيت الجرد ٢')) return 'sheet2';
            if (label.includes('مشروبات')) return 'drinks';
            if (label.includes('الجرد العام')) return 'general';
            if (label.includes('معكرونة')) return 'pasta';
            if (label.includes('كشري')) return 'koshari';
            if (label.includes('حلويات')) return 'desserts';
            if (label.includes('إنتاج') || label.includes('الانتاج')) return 'production';
            return null;
        }

        function exportSheetCSV(sheetId) {
            const sheet = countSheets.find(s => s.id === sheetId);
            if (!sheet) return;
            const rows = ['Inventory Item Name,Inventory Item SKU,Storage quantity,Ingredients quantity,Inventory Count ID'];
            let missing = [];
            sheet.items.forEach(entry => {
                const idx = findPageIndex(entry);
                let qty = '';
                if (idx >= 0) {
                    // الناتج المعروض بالباتش أصلاً عند وجود معامل — نستخدمه مباشرة
                    qty = parseFloat(getRawResult(idx).toFixed(5));
                } else { missing.push(entry.n); }
                rows.push([csvEscape(entry.n), csvEscape(entry.s), qty, '', ''].join(','));
            });
            const csv = '\uFEFF' + rows.join('\r\n');
            const d = new Date().toISOString().slice(0, 10);
            downloadFile(csv, `foodics_${sheetId}_${d}.csv`, 'text/csv;charset=utf-8');
            if (missing.length) showToast(`⚠️ ${sheet.title}: بدون كمية (${missing.join('، ')}) — عبّئها يدوياً`, 'warning');
            else showToast(`✅ CSV ${sheet.title} جاهز للاستيراد`, 'success');
        }

        // ═══════════ شريط الرموز الحسابية للهاتف ═══════════
        let opBarTarget = null;
        function insertOp(ch) {
            if (!opBarTarget || opBarTarget.readOnly) return;
            const el = opBarTarget;
            if (ch === '⌫') {
                const s = el.selectionStart, e = el.selectionEnd;
                if (s === e && s > 0) el.setRangeText('', s - 1, e, 'end');
                else el.setRangeText('', s, e, 'end');
            } else {
                el.setRangeText(ch, el.selectionStart, el.selectionEnd, 'end');
            }
            el.dispatchEvent(new Event('input'));
        }
        // ═══════════ لوحة الأدوات القابلة للطي ═══════════
        const TOOLS_LS_KEY = 'toolsOpen_v1';
        function toolsOpen() {
            const saved = localStorage.getItem(TOOLS_LS_KEY);
            if (saved !== null) return saved === '1';
            return window.innerWidth >= 900; // الافتراضي: مفتوحة على الكمبيوتر، مطوية على الهاتف
        }
        function applyToolsState() {
            const panel = document.getElementById('toolsPanel');
            const btn = document.getElementById('toolsToggle');
            const open = toolsOpen();
            if (panel) panel.classList.toggle('open', open);
            if (btn) btn.classList.toggle('active', open);
        }
        function toggleTools() {
            const open = !toolsOpen();
            try { localStorage.setItem(TOOLS_LS_KEY, open ? '1' : '0'); } catch (e) {}
            applyToolsState();
            if (open) setTimeout(() => document.getElementById('toolsPanel').scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 60);
        }
        document.addEventListener('DOMContentLoaded', applyToolsState);

        // ═══════════ شريحة الصنف النشط: تعرف أين أنت واقف بالضبط ═══════════
        function sectionOf(index) {
            let title = '';
            Object.keys(sectionStarts).map(Number).sort((a, b) => a - b).forEach(st => { if (index >= st) title = sectionStarts[st]; });
            return title;
        }
        let activeRowEl = null;
        function resultUnitOf(index) { return getBatchFactor(index) ? 'باتش' : inventoryData[index].unit; }
        // معلومات الفرق الحية: النص، والصنف اللوني (أخضر موجب / أحمر سالب / رمادي صفر / لا شيء بلا نظام)
        function liveDiffInfo(index) {
            const diffEl = document.getElementById(`diffValue-${index}`);
            const raw = diffEl ? diffEl.textContent.trim() : '-';
            if (!raw || raw === '-') return { has: false, text: '', cls: '' };
            const n = parseFloat(raw.replace(/,/g, ''));
            if (isNaN(n)) return { has: false, text: '', cls: '' };
            const cls = n > 0 ? 'diff-pos' : (n < 0 ? 'diff-neg' : 'diff-flat');
            const sign = n > 0 ? '+' : '';
            return { has: true, text: sign + raw, cls };
        }
        function renderLive(index, el) {
            const resTxt = (document.getElementById(`result-${index}`) || {}).textContent || '0';
            const unit = resultUnitOf(index);
            const expr = el && el.value ? el.value : '';
            const diff = liveDiffInfo(index);
            const opExpr = document.getElementById('opExpr');
            const opRes = document.getElementById('opRes');
            if (opExpr) { opExpr.textContent = expr; opExpr.classList.toggle('empty', !expr); }
            if (opRes) opRes.textContent = '= ' + resTxt + ' ' + unit;
            const opDiff = document.getElementById('opDiff');
            if (opDiff) {
                opDiff.className = 'op-diff' + (diff.has ? ' ' + diff.cls : ' empty');
                opDiff.textContent = diff.has ? 'الفرق عن النظام: ' + diff.text + ' ' + unit : '';
            }
            const chip = document.getElementById('activeChip');
            if (chip && chip.classList.contains('show')) {
                const item = inventoryData[index];
                const diffHtml = diff.has ? `<span class="chip-diff ${diff.cls}">الفرق: ${diff.text} ${unit}</span>` : '';
                chip.innerHTML = `<span class="chip-name">${sectionOf(index)} ← ${item.name} (${item.sku})</span><span class="chip-res">${expr ? expr + ' = ' : 'الناتج: '}${resTxt} ${unit}</span>${diffHtml}`;
            }
        }
        function setupActiveChip() {
            const chip = document.getElementById('activeChip');
            const padName = document.getElementById('opItemName');
            const rowInputSel = 'input[id^="input"], input[id^="min-"], input[id^="batchf-"]';
            document.addEventListener('focusin', e => {
                if (!e.target.matches || !e.target.matches(rowInputSel)) return;
                const row = e.target.closest('tr[data-index]');
                if (!row) return;
                const idx = parseInt(row.dataset.index);
                const item = inventoryData[idx];
                if (chip) chip.classList.add('show');
                if (padName) padName.textContent = `${item.name} — ${item.sku}`;
                if (activeRowEl && activeRowEl !== row) activeRowEl.classList.remove('active-row');
                row.classList.add('active-row');
                activeRowEl = row;
                renderLive(idx, e.target);
            });
            document.addEventListener('focusout', () => {
                setTimeout(() => {
                    const a = document.activeElement;
                    if (a && a.matches && a.matches(rowInputSel)) return;
                    if (chip) chip.classList.remove('show');
                    if (padName) padName.textContent = '';
                    const opExpr = document.getElementById('opExpr'); if (opExpr) opExpr.textContent = '';
                    const opRes = document.getElementById('opRes'); if (opRes) opRes.textContent = '';
                    if (activeRowEl) { activeRowEl.classList.remove('active-row'); activeRowEl = null; }
                }, 150);
            });
        }
        document.addEventListener('DOMContentLoaded', setupActiveChip);

        // ═══════════ قفل خلايا الإدخال بعد الاعتماد ═══════════
        function cellHasValue(el) {
            const v = (el.value || '').trim();
            return v !== '' && /[1-9]/.test(v); // غير فارغة وفيها رقم غير الصفر
        }
        function lockExprCell(el) { el.readOnly = true; el.classList.add('cell-locked'); }
        function unlockExprCell(el) { el.readOnly = false; el.classList.remove('cell-locked'); el.focus(); try { el.select(); } catch (e) {} }
        function jumpToSearch() {
            const si = document.getElementById('searchInput');
            if (!si) return;
            si.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(() => { si.focus(); si.select(); }, 250);
        }
        // اعتماد الخلية: قفلها إذا فيها قيمة (غير فارغة وغير صفر) ثم الرجوع للبحث
        function commitCell(el) {
            if (el) lockInput(el);
            const bar = document.getElementById('opBar');
            if (bar) bar.classList.remove('show');
            opBarTarget = null;
            restoreTempInputModes();
            jumpToSearch();
        }
        let dblGuard = 0;
        function setupCellLocking() {
            // دبل كليك يفتح الخلية المقفلة
            document.addEventListener('dblclick', e => {
                if (e.target.matches && e.target.matches('input[id^="input"]')) dblGuard = Date.now();
            });
            // كبسة واحدة على خلية مقفلة → انزل للخانة التالية غير المقفلة بنفس الصف
            document.addEventListener('click', e => {
                const el = e.target;
                if (!el.matches || !el.matches('input[id^="input"]') || !el.readOnly) return;
                setTimeout(() => {
                    if (Date.now() - dblGuard < 400) return; // كان دبل كليك
                    if (!el.readOnly) return;
                    const m = el.id.match(/^input(\d)-(\d+)$/);
                    if (!m) return;
                    const idx = m[2];
                    for (let k = parseInt(m[1]) + 1; k <= 8; k++) {
                        const nxt = document.getElementById(`input${k}-${idx}`);
                        if (nxt && !nxt.readOnly) { nxt.focus(); return; }
                    }
                    for (let k = 1; k <= 8; k++) {
                        const nxt = document.getElementById(`input${k}-${idx}`);
                        if (nxt && !nxt.readOnly) { nxt.focus(); return; }
                    }
                }, 320);
            });
        }
        document.addEventListener('DOMContentLoaded', setupCellLocking);

        // ═══════════ زر الرجوع (أندرويد): لا يخرج من الصفحة بالغلط ═══════════
        let backArmed = 0;
        function setupBackTrap() {
            try { history.pushState({ trap: 1 }, '', location.href); } catch (e) { return; }
            window.addEventListener('popstate', () => {
                // ① لو في شيء مفتوح: أغلقه بدل الخروج
                const bar = document.getElementById('opBar');
                if (bar && bar.classList.contains('show')) {
                    bar.classList.remove('show');
                    if (opBarTarget) opBarTarget.blur();
                    opBarTarget = null;
                    history.pushState({ trap: 1 }, '', location.href);
                    return;
                }
                const paste = document.getElementById('pasteSysBox');
                if (paste && paste.style.display !== 'none') {
                    paste.style.display = 'none';
                    history.pushState({ trap: 1 }, '', location.href);
                    return;
                }
                // أي نافذة منبثقة مفتوحة؟
                let modalClosed = false;
                document.querySelectorAll('.modal-overlay').forEach(m => {
                    if (m.classList.contains('show')) { m.classList.remove('show'); modalClosed = true; }
                });
                if (modalClosed) { history.pushState({ trap: 1 }, '', location.href); return; }
                // في تبويب المشتريات؟ ارجع لتبويب الجرد
                const shop = document.getElementById('shopTab');
                if (shop && shop.style.display !== 'none') {
                    switchMainTab('inv');
                    history.pushState({ trap: 1 }, '', location.href);
                    return;
                }
                // ② ما في شيء مفتوح: ضغطة أولى تحذير، الثانية خلال ثانيتين تخرج فعلاً
                if (Date.now() - backArmed < 2000) { history.back(); return; }
                backArmed = Date.now();
                showToast('البيانات محفوظة تلقائياً — اضغط رجوع مرة ثانية للخروج', 'warning');
                history.pushState({ trap: 1 }, '', location.href);
            });
        }
        document.addEventListener('DOMContentLoaded', setupBackTrap);

        // ═══════════ كشف وضع Desktop site على الهاتف ═══════════
        // بهذا الوضع يرسم كروم الصفحة بعرض ~980px فيصغر كل شيء وتظهر فراغات هائلة
        function detectDesktopMode() {
            const isTouch = window.matchMedia('(pointer: coarse)').matches;
            const phoneScreen = Math.min(screen.width, screen.height) < 500;
            const wideLayout = window.innerWidth > 700;
            if (isTouch && phoneScreen && wideLayout && !sessionStorage.getItem('dmHintShown')) {
                try { sessionStorage.setItem('dmHintShown', '1'); } catch (e) {}
                setTimeout(() => showToast('📱 أنت بوضع Desktop site — أطفئه من قائمة كروم (⋮) ليتناسق العرض ويكبر الخط', 'warning'), 800);
            }
        }
        document.addEventListener('DOMContentLoaded', detectDesktopMode);

        // ═══════════ دبل-تاب يدوي (وضع Desktop site يبتلع dblclick ويكبّر الشاشة) ═══════════
        let lastTapEl = null, lastTapT = 0;
        function setupDoubleTap() {
            document.addEventListener('touchend', e => {
                const el = e.target;
                if (!el.matches || !el.matches('input[id^="input"], input[id^="batchf-"]')) { lastTapEl = null; return; }
                const now = Date.now();
                if (lastTapEl === el && now - lastTapT < 350 && el.readOnly) {
                    e.preventDefault(); // يمنع تكبير الشاشة
                    dblGuard = now;
                    if (el.id.indexOf('batchf-') === 0) unlockFactor(el); else unlockInput(el);
                }
                lastTapEl = el; lastTapT = now;
            }, { passive: false });
        }
        document.addEventListener('DOMContentLoaded', setupDoubleTap);

        // ═══════════ فتح اللوحة يدوياً لخانة محددة (يعمل حتى لو مفتاح اللوحة مطفي) ═══════════
        function openPadFor(el) {
            if (!el) return;
            const bar = document.getElementById('opBar');
            if (!bar) return;
            opBarTarget = el;
            const desktop = (typeof useAnchoredPad === 'function') && useAnchoredPad();
            bar.classList.toggle('anchored', desktop);
            bar.classList.add('show');
            // لو كيبورد الهاتف كان سيفتح (المفتاح مطفي): نمنعه مؤقتاً لهذه الخانة
            if (el.getAttribute('inputmode') !== 'none') {
                el.dataset.tempNone = '1';
                el.setAttribute('inputmode', 'none');
                el.blur();
            }
            try { el.focus(); } catch (e) {}
            // الفك بعد رقصة الكيبورد — لأن blur فوق قد يعيد قفل خانة المعامل تلقائياً
            if (el.readOnly) {
                el.readOnly = false;
                if (el.id.indexOf('batchf-') === 0) el.classList.add('unlocked');
                else { el.classList.remove('cell-locked'); el.style.background = ''; el.style.cursor = ''; }
                try { el.select(); } catch (e) {}
            }
            if (desktop) {
                if (typeof positionOpBarUnder === 'function') positionOpBarUnder(el);
            } else {
                clearAnchorInline(bar);
                const row = el.closest('tr');
                if (row) setTimeout(() => { try { row.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (err) {} }, 120);
            }
            const r = el.closest('tr[data-index]');
            if (r && typeof renderLive === 'function') renderLive(parseInt(r.dataset.index), el);
        }
        // زر طرد/حبة: يعتمد الخانة الحالية (مثل إنتر) ثم يقفز لأول خانة فارغة أو صفر بالمجموعة المطلوبة بنفس الصف
        // طرد = الخانات 1-4 (تُضرب بحجم الطرد) ، حبة = الخانات 5-8
        function goToGroupCell(startN) {
            const cur = opBarTarget;
            if (!cur) return;
            const row = cur.closest('tr[data-index]');
            if (!row) return;
            const idx = row.dataset.index;
            if (cur.id.indexOf('input') === 0) lockInput(cur); // مثل إنتر: يقفل إن كانت فيها قيمة
            let target = null;
            for (let k = startN; k < startN + 4; k++) {
                const el = document.getElementById(`input${k}-${idx}`);
                if (el && !el.readOnly && !cellHasValue(el)) { target = el; break; } // فارغة أو صفر
            }
            if (!target) {
                for (let k = startN; k < startN + 4; k++) {
                    const el = document.getElementById(`input${k}-${idx}`);
                    if (el && !el.readOnly) { target = el; break; } // وإلا أول غير مقفلة
                }
            }
            if (!target) {
                const live = document.querySelector('#opBar .op-live');
                if (live) { live.classList.remove('flash'); void live.offsetWidth; live.classList.add('flash'); }
                return;
            }
            openPadFor(target);
        }

        function restoreTempInputModes() {
            document.querySelectorAll('input[data-temp-none]').forEach(el => {
                el.setAttribute('inputmode', 'decimal');
                delete el.dataset.tempNone;
            });
        }
        // بعد فتح قفل خانة بالدبل كليك: افتح اللوحة تلقائياً إن كانت مفعّلة
        function maybeOpenPadAfterUnlock(el) {
            if (typeof numpadEnabled === 'function' && numpadEnabled()) setTimeout(() => openPadFor(el), 30);
            else if (typeof updateFab === 'function') setTimeout(updateFab, 30);
        }

        // ═══════════ الزر العائم 🔢: يفتح اللوحة للخانة النشطة بأي حالة ═══════════
        let lastRowInput = null;
        function updateFab() {
            const fab = document.getElementById('padFab');
            const bar = document.getElementById('opBar');
            if (!fab || !bar) return;
            const a = document.activeElement;
            const activeIsRow = a && a.matches && a.matches('input[id^="input"], input[id^="batchf-"]');
            fab.classList.toggle('show', !!activeIsRow && !bar.classList.contains('show'));
        }
        function setupPadFab() {
            const fab = document.getElementById('padFab');
            const bar = document.getElementById('opBar');
            if (!fab || !bar) return;
            document.addEventListener('focusin', e => {
                if (e.target.matches && e.target.matches('input[id^="input"], input[id^="batchf-"]')) lastRowInput = e.target;
                updateFab();
            });
            document.addEventListener('focusout', () => setTimeout(updateFab, 160));
            new MutationObserver(updateFab).observe(bar, { attributes: true, attributeFilter: ['class'] });
            const open = ev => { ev.preventDefault(); if (lastRowInput) openPadFor(lastRowInput); };
            fab.addEventListener('mousedown', open);
            fab.addEventListener('touchstart', open, { passive: false });
        }
        document.addEventListener('DOMContentLoaded', setupPadFab);

        // صفوف الأقسام تلتصق تماماً تحت ترويسة الجدول مهما كان ارتفاعها الفعلي
        function updateSectionStickyOffset() {
            const th = document.querySelector('#inventoryTable thead');
            if (!th) return;
            const h = th.offsetHeight || 41;
            document.querySelectorAll('tr.section-row td').forEach(td => { td.style.top = h + 'px'; });
        }
        document.addEventListener('DOMContentLoaded', () => setTimeout(() => { applyColumnLayout(); updateSectionStickyOffset(); }, 100));
        window.addEventListener('resize', updateSectionStickyOffset);


        // ═══════════ ترتيب وتثبيت الأعمدة (غير الإدخالية) ═══════════
        const COL_LS_KEY = 'colLayout_v2';
        const COL_DEFAULT = { order: ['name', 'result', 'batch', 'diff', 'min', 'pkg'], pinned: 'name' };
        const COL_LABELS = { name: 'اسم المادة', result: 'الناتج', batch: 'باتش /1000', diff: 'الفرق', min: 'الحد الأدنى', pkg: 'حجم الطرد' };
        function loadColLayout() {
            try {
                const c = JSON.parse(localStorage.getItem(COL_LS_KEY));
                if (c && Array.isArray(c.order) && c.order.length === 6 && COL_DEFAULT.order.every(k => c.order.includes(k))) return c;
            } catch (e) {}
            return JSON.parse(JSON.stringify(COL_DEFAULT));
        }
        let colLayout = loadColLayout();
        function saveColLayout() { try { localStorage.setItem(COL_LS_KEY, JSON.stringify(colLayout)); } catch (e) {} }
        function applyColumnLayout() {
            // العمود المثبت دائماً أول واحد
            const order = [colLayout.pinned, ...colLayout.order.filter(k => k !== colLayout.pinned)];
            const applyRow = (tr) => {
                const tagged = {};
                tr.querySelectorAll(':scope > [data-col]').forEach(c => { tagged[c.dataset.col] = c; });
                if (!tagged.name) return;
                // نقطة الإرجاع: أول خلية غير موسومة (خانات الإدخال)
                const cells = [...tr.children];
                const anchor = cells.find(c => !c.dataset.col) || null;
                order.forEach(k => { if (tagged[k]) tr.insertBefore(tagged[k], anchor); });
                Object.values(tagged).forEach(c => c.classList.remove('col-pinned'));
                if (tagged[colLayout.pinned]) tagged[colLayout.pinned].classList.add('col-pinned');
            };
            const headRow = document.querySelector('#inventoryTable thead tr');
            if (headRow) applyRow(headRow);
            document.querySelectorAll('#tableBody tr[data-index]').forEach(applyRow);
        }
        function openColModal() {
            const m = document.getElementById('colModal');
            renderColModal();
            m.classList.add('show');
        }
        function closeColModal() { document.getElementById('colModal').classList.remove('show'); }
        function renderColModal() {
            const list = document.getElementById('colList');
            list.innerHTML = colLayout.order.map((k, i) => `
                <div class="col-row">
                    <label class="col-pin" title="العمود المثبت (يصير أول عمود ومجمّداً)"><input type="radio" name="pinCol" value="${k}" ${colLayout.pinned === k ? 'checked' : ''} onchange="colLayout.pinned=this.value"> \U0001F4CC</label>
                    <span class="col-name">${COL_LABELS[k]}</span>
                    <span class="col-arrows">
                        <button onclick="moveCol(${i},-1)" ${i === 0 ? 'disabled' : ''}>\u25B2</button>
                        <button onclick="moveCol(${i},1)" ${i === colLayout.order.length - 1 ? 'disabled' : ''}>\u25BC</button>
                    </span>
                </div>`).join('');
        }
        function moveCol(i, d) {
            const j = i + d;
            if (j < 0 || j >= colLayout.order.length) return;
            [colLayout.order[i], colLayout.order[j]] = [colLayout.order[j], colLayout.order[i]];
            renderColModal();
        }
        function applyColsAndClose() { saveColLayout(); applyColumnLayout(); closeColModal(); showToast('تم تطبيق ترتيب الأعمدة', 'success'); }
        function resetColLayout() { colLayout = JSON.parse(JSON.stringify(COL_DEFAULT)); saveColLayout(); renderColModal(); applyColumnLayout(); showToast('رجع الترتيب الافتراضي: اسم المادة أولاً ومثبتاً', 'success'); }

        const NUMPAD_LS_KEY = 'numpadEnabled_v1';
        function numpadEnabled() {
            const saved = localStorage.getItem(NUMPAD_LS_KEY);
            if (saved !== null) return saved === '1';
            return window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 900;
        }
        function applyInputMode() {
            // عند تفعيل اللوحة: inputmode="none" يمنع كيبورد الهاتف (أندرويد/آيفون) ويبقي مؤشر الكتابة
            const mode = numpadEnabled() ? 'none' : 'decimal';
            for (let i = 0; i < inventoryData.length; i++)
                for (let n = 1; n <= 8; n++) {
                    const el = document.getElementById(`input${n}-${i}`);
                    if (el) el.setAttribute('inputmode', mode);
                }
        }
        function toggleNumpad() {
            const on = !numpadEnabled();
            try { localStorage.setItem(NUMPAD_LS_KEY, on ? '1' : '0'); } catch (e) {}
            updateNumpadToggleUI();
            applyInputMode();
            if (!on) { document.getElementById('opBar').classList.remove('show'); opBarTarget = null; }
            showToast(on ? '🔢 لوحة الأرقام مفعّلة — اضغط داخل أي خانة' : 'لوحة الأرقام متوقفة', 'success');
        }
        function updateNumpadToggleUI() {
            const b = document.getElementById('numpadToggle');
            if (b) b.classList.toggle('active', numpadEnabled());
        }
        // بوضع الكمبيوتر (فأرة): اللوحة تظهر ملتصقة تحت الخلية نفسها بدل أسفل الشاشة
        function isDesktopPointer() {
            try { return window.matchMedia('(pointer: fine)').matches && !window.matchMedia('(pointer: coarse)').matches; }
            catch (e) { return false; }
        }
        // أندرويد بوضع Desktop site: لمس + شاشة هاتف + عرض رسم عريض — التثبيت بأسفل "الشاشة" هنا
        // يعني أسفل صفحة افتراضية طولها ~2200px بعيداً عن الزوم، فنلصق اللوحة بالخلية بدلاً منه
        function isDesktopSitePhone() {
            try {
                return window.matchMedia('(pointer: coarse)').matches
                    && Math.min(screen.width, screen.height) < 500
                    && window.innerWidth > 700;
            } catch (e) { return false; }
        }
        function useAnchoredPad() { return isDesktopPointer() || isDesktopSitePhone(); }
        function positionOpBarUnder(el) {
            const bar = document.getElementById('opBar');
            if (!bar || !el) return;
            const r = el.getBoundingClientRect();
            const margin = 8;
            // الشاشة المرئية الفعلية: مع الزوم بوضع Desktop site هي أصغر بكثير من الصفحة الافتراضية،
            // وvisualViewport يعطينا موضعها وأبعادها الحقيقية داخل الصفحة
            const vv = window.visualViewport;
            const vpW = vv ? vv.width : window.innerWidth;
            const vpH = vv ? vv.height : window.innerHeight;
            const vpL = vv ? vv.offsetLeft : 0;
            const vpT = vv ? vv.offsetTop : 0;
            // عرض اللوحة: px سقفاً + لا يتجاوز الشاشة المرئية (حتى وأنت مزوّم تراها كاملة)
            const bw = Math.min(560, vpW - margin * 2);
            bar.style.width = bw + 'px';
            const bh = bar.offsetHeight || 300;
            let left = r.left + r.width / 2 - bw / 2;
            left = Math.max(vpL + margin, Math.min(vpL + vpW - bw - margin, left));
            // أقصى نزول: أسفل الشاشة المرئية أو أسفل بار الماتركس، أيهما أعلى
            let maxBottom = vpT + vpH - margin;
            const sg = document.querySelector('.summary-group');
            if (sg) {
                const sb = sg.getBoundingClientRect().bottom;
                if (sb > 150) maxBottom = Math.min(maxBottom, sb);
            }
            let top = r.bottom + 8;
            if (top + bh > maxBottom) top = Math.max(vpT + margin, Math.min(r.top - bh - 8, maxBottom - bh));
            bar.style.left = left + 'px';
            bar.style.top = top + 'px';
        }
        function repositionOpBarIfAnchored() {
            const bar = document.getElementById('opBar');
            if (bar && bar.classList.contains('anchored') && bar.classList.contains('show') && opBarTarget) positionOpBarUnder(opBarTarget);
        }
        window.addEventListener('resize', repositionOpBarIfAnchored);
        window.addEventListener('scroll', repositionOpBarIfAnchored, true);
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', repositionOpBarIfAnchored);
            window.visualViewport.addEventListener('scroll', repositionOpBarIfAnchored);
        }
        function clearAnchorInline(bar) { bar.style.left = ''; bar.style.top = ''; bar.style.width = ''; }

        function setupOpBar() {
            const bar = document.getElementById('opBar');
            if (!bar) return;
            updateNumpadToggleUI();

            document.addEventListener('focusin', e => {
                if (e.target.matches && e.target.matches('input[id^="input"]') && !e.target.readOnly && numpadEnabled()) {
                    opBarTarget = e.target;
                    const desktop = useAnchoredPad();
                    bar.classList.toggle('anchored', desktop);
                    bar.classList.add('show');
                    if (desktop) {
                        positionOpBarUnder(e.target); // تحت الخلية مباشرة (يشمل حالة البحث + إنتر لأنها تستدعي focus() أيضاً)
                    } else {
                        clearAnchorInline(bar);
                        // أنزل الصف ليجلس فوق اللوحة مباشرة بدل ما يكون العين فوق والأصابع تحت
                        const row = e.target.closest('tr');
                        if (row) setTimeout(() => {
                            try { row.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (err) {}
                        }, 120);
                    }
                }
            });
            document.addEventListener('focusout', e => {
                setTimeout(() => {
                    const a = document.activeElement;
                    if (!a || !(a.matches && a.matches('input[id^="input"], input[id^="batchf-"]'))) {
                        bar.classList.remove('show');
                        opBarTarget = null;
                        restoreTempInputModes();
                    } else { opBarTarget = a; }
                }, 120);
            });
            bar.querySelectorAll('button').forEach(b => {
                b.addEventListener('mousedown', ev => ev.preventDefault());
                b.addEventListener('touchstart', ev => ev.preventDefault(), { passive: false });
                const handler = () => {
                    if (b.dataset.op === 'done') { commitCell(opBarTarget); }
                    else if (b.dataset.op === 'goPkg' || b.dataset.op === 'goUnit') { goToGroupCell(b.dataset.op === 'goPkg' ? 1 : 5); }
                    else if (b.dataset.op === 'search') {
                        // الخانة فارغة؟ لا تغلقها ولا تنتقل — ابقَ مكانك
                        if (opBarTarget && !opBarTarget.value.trim()) {
                            const live = bar.querySelector('.op-live');
                            if (live) { live.classList.remove('flash'); void live.offsetWidth; live.classList.add('flash'); }
                            return;
                        }
                        commitCell(opBarTarget); // فيها رقم: قفلها مثل إنتر وارجع للبحث
                    }
                    else insertOp(b.dataset.op);
                };
                b.addEventListener('click', handler);
                b.addEventListener('touchstart', handler);
            });
        }
        document.addEventListener('DOMContentLoaded', setupOpBar);

        document.addEventListener('DOMContentLoaded', createTable);

// ═══ تبويب المشتريات ═══

    /* ═══════════ تبويب المشتريات — معزول بالكامل عن صفحة الجرد ═══════════ */
    function switchMainTab(which) {
        const inv = document.querySelector('.container');
        const shop = document.getElementById('shopTab');
        const isShop = which === 'shop';
        if (inv) inv.style.display = isShop ? 'none' : '';
        if (shop) shop.style.display = isShop ? '' : 'none';
        document.getElementById('mtab-inv').classList.toggle('active', !isShop);
        document.getElementById('mtab-shop').classList.toggle('active', isShop);
        try { localStorage.setItem('activeTab_v1', which); } catch (e) {}
        if (isShop && window.refreshShopTab) window.refreshShopTab();
    }

    (function () {
        const LS_KEY = "kitchen_inv_v3";
        function loadPrefs() { try { return JSON.parse(localStorage.getItem(LS_KEY)) || {}; } catch (e) { return {}; } }
        function savePrefs() {
            try { localStorage.setItem(LS_KEY, JSON.stringify({ target: TARGET, perBatch, minLevels })); } catch (e) {}
        }

        /* أصنافي فقط: sku، الاسم، وحدة فوديكس، كمية احتياطية من آخر تقرير */
        const CATALOG = [
            ["sk-0037", "جزر", "G", 4960], ["sk-0040", "معالق", "PC", 8278], ["sk-0041", "شوك", "PC", 660],
            ["sk-0042", "طبق كشري", "PC", -568], ["sk-0062", "بندق", "G", 600], ["sk-0063", "جوز هند", "G", 2225],
            ["sk-0064", "لوز", "G", 660], ["sk-0065", "كاجو", "G", 755], ["sk-0066", "فستق حلبي", "G", 463],
            ["sk-0067", "صنوبر", "G", 585], ["sk-0071", "لحمة مفرومة", "G", -500], ["sk-0073", "بصل خام", "G", -4070],
            ["sk-0075", "كرفس", "G", 13420], ["sk-0091", "صحن ام علي", "PC", 11], ["sk-0092", "صحن باشميل", "PC", -45],
            ["sk-0097", "علبة الشطة والدقة", "PC", 15100], ["sk-0099", "علبة صوص الكشري كمالة", "PC", 5060],
            ["sk-0128", "علبة شوربة", "PC", 85], ["sk-0177", "علبة مهلبية", "PC", 99]
        ];

        const OM_ALI_DEFAULTS = { "بندق": 270, "جوز هند": 225, "لوز": 160, "كاجو": 160 };
        const OM_ALI_SKUS = { "sk-0062": "بندق", "sk-0063": "جوز هند", "sk-0064": "لوز", "sk-0065": "كاجو" };

        const DEFAULT_MINS = {
            "sk-0037": 7000, "sk-0040": 5000, "sk-0041": 500, "sk-0042": 7500, "sk-0066": 500,
            "sk-0067": 750, "sk-0071": 20000, "sk-0073": 10000, "sk-0075": 7000, "sk-0091": 1000,
            "sk-0092": 1000, "sk-0097": 6000, "sk-0099": 1500, "sk-0128": 100, "sk-0177": 150
        };
        const RESTOCK = {
            "sk-0066": { type: "fixed", amount: 500, label: "جم" },
            "sk-0067": { type: "fixed", amount: 1000, label: "جم" },
            "sk-0073": { type: "topup", target: 20000 },
            "sk-0075": { type: "topup", target: 10000 },
            "sk-0071": { type: "topup", target: 52000, pack: 800, packLabel: "كيس" },
            "sk-0092": { type: "topup", target: 2500 },
            "sk-0091": { type: "topup", target: 3000 },
            "sk-0099": { type: "fixed", amount: 5, label: "كراتين" },
            "sk-0040": { type: "fixed", amount: 1, label: "كرتونة" },
            "sk-0097": { type: "fixed", amount: 6, label: "كراتين" }
        };

        const prefs = loadPrefs();
        let TARGET = prefs.target || 30;
        const perBatch = Object.assign({}, OM_ALI_DEFAULTS, prefs.perBatch || {});
        const minLevels = Object.assign({}, DEFAULT_MINS, prefs.minLevels || {});

        const CATS = [
            { id: "nuts", kw: ["بندق", "جوز هند", "لوز", "كاجو", "فستق", "صنوبر", "مكسرات", "زبيب", "عين جمل"] },
            { id: "meat", kw: ["لحم", "لحمة", "فراخ", "دجاج", "كبدة", "سجق", "مفروم"] },
            { id: "dish", kw: ["طبق", "صحن", "اطباق", "أطباق"] },
            { id: "pack", kw: ["علبة", "علب", "معالق", "معلقة", "ملعقة", "شوك", "شوكة", "سكاكين", "كيس", "اكياس", "أكياس", "بلاستيك", "كوب", "اكواب", "أكواب", "غطاء", "اغطية", "أغطية", "شنطة"] },
            { id: "veg", kw: ["جزر", "بصل", "كرفس", "طماطم", "بندورة", "خيار", "بطاطس", "بطاطا", "ثوم", "فلفل", "كزبرة", "بقدونس", "نعناع", "ليمون", "خس", "كرنب", "ملفوف", "باذنجان", "كوسا"] }
        ];
        function categorize(name) { for (const c of CATS) { if (c.kw.some(k => name.includes(k))) return c.id; } return "other"; }

        function normalizeQty(qty, rawUnit) {
            const u = (rawUnit || "").trim().toUpperCase();
            if (u === "KG") return { qty: qty * 1000, unit: "جم" };
            if (u === "G") return { qty, unit: "جم" };
            if (u === "L") return { qty: qty * 1000, unit: "مل" };
            if (u === "ML") return { qty, unit: "مل" };
            if (u === "PC" || u === "PCS") return { qty, unit: "قطعة" };
            return { qty, unit: rawUnit || "وحدة" };
        }

        const fmt = n => Math.round(n).toLocaleString("en-US");
        const kgTxt = q => q >= 1000 ? ` (${(q / 1000).toLocaleString("en-US", { maximumFractionDigits: 2 })} كجم)` : "";
        let ITEMS = [];

        /* ═══ مصدر البيانات: systemData من تبويب الجرد ═══ */
        function buildItems() {
            const sys = (typeof systemData !== "undefined" && systemData) ? systemData : {};
            let fromSys = 0;
            ITEMS = CATALOG.map(([sku, name, unit, fallback]) => {
                let q = fallback, live = false;
                if (sys[sku] !== undefined) { q = sys[sku]; live = true; fromSys++; }
                const norm = normalizeQty(q, unit);
                return { name, sku, unit: norm.unit, qty: norm.qty, live };
            });
            const note = document.getElementById("shopFileNote");
            const pill = document.getElementById("shopSrcPill");
            if (fromSys > 0) {
                note.textContent = "✓ الكميات مقروءة من ملف النظام المرفوع في تبويب الجرد (" + fromSys + " من " + CATALOG.length + " صنف)";
                note.className = "file-note ok";
                if (pill) pill.textContent = "📡 متصل · " + fromSys + " صنف";
            } else {
                note.textContent = "لم يُرفع ملف نظام بعد — ارفعه من تبويب «📋 الجرد» (زر 📤 بيانات النظام) · المعروض الآن آخر تقرير مدمج";
                note.className = "file-note err";
                if (pill) pill.textContent = "⏳ بانتظار ملف";
            }
        }

        const itemKey = it => it.sku || it.name;
        const omKey = it => OM_ALI_SKUS[(it.sku || "").toLowerCase()] || Object.keys(OM_ALI_DEFAULTS).find(k => it.name.includes(k));

        function buyPlan(it, min) {
            const q = Math.max(0, it.qty);
            const r = RESTOCK[it.sku];
            if (r && r.type === "fixed") return { qtyTxt: `+ ${fmt(r.amount)} ${r.label}`, sub: "كمية ثابتة بكل عملية شراء" };
            if (r && r.type === "topup") {
                if (r.pack) {
                    const totalPacks = Math.round(r.target / r.pack);
                    const buyPacks = Math.max(0, totalPacks - Math.floor(q / r.pack));
                    return { qtyTxt: `+ ${fmt(buyPacks)} ${r.packLabel}`, sub: `ليصل الإجمالي ${fmt(totalPacks)} ${r.packLabel} (${fmt(r.target / 1000)} كجم) — الكيس ${fmt(r.pack)} جم` };
                }
                const need = Math.max(0, r.target - q);
                return { qtyTxt: `+ ${fmt(need)} ${it.unit}`, sub: `ليصل المجموع إلى ${fmt(r.target)} ${it.unit}` };
            }
            return { qtyTxt: `+ ${fmt(Math.ceil(min - q))} ${it.unit}`, sub: `ليرجع فوق الحد (${fmt(min)})` };
        }

        function makeLockable(inp) {
            inp.readOnly = true; inp.classList.add("locked"); inp.title = "انقر مرتين للتعديل";
            const unlock = () => { inp.readOnly = false; inp.classList.remove("locked"); inp.focus(); inp.select && inp.select(); };
            inp.addEventListener("dblclick", unlock);
            let lastTap = 0;
            inp.addEventListener("touchend", e => { const now = Date.now(); if (now - lastTap < 350) { e.preventDefault(); unlock(); } lastTap = now; });
            inp.addEventListener("blur", () => { inp.readOnly = true; inp.classList.add("locked"); });
        }

        function render() {
            document.getElementById("targetB").value = TARGET;
            const groups = { nuts: [], veg: [], meat: [], dish: [], pack: [], other: [] };
            ITEMS.forEach(it => groups[categorize(it.name)].push(it));

            const omRows = [];
            groups.nuts.forEach(it => {
                const key = omKey(it);
                if (!key) return;
                const per = perBatch[key] ?? OM_ALI_DEFAULTS[key];
                const qty = Math.max(0, it.qty);
                omRows.push({ ...it, key, per, batches: per > 0 ? Math.floor(qty / per) : 0, need: per > 0 ? Math.max(0, TARGET * per - qty) : 0 });
            });
            const minB = omRows.length ? Math.min(...omRows.map(r => r.batches)) : 0;
            const bott = omRows.find(r => r.batches === minB);

            const toBuy = omRows.filter(r => r.need > 0).sort((a, b) => b.need - a.need);
            const ul = document.getElementById("omShopList");
            const foot = document.getElementById("omShopFoot");
            if (!omRows.length) { ul.innerHTML = `<div class="allok">ما لقيت مكسرات أم علي في البيانات</div>`; foot.textContent = ""; }
            else if (toBuy.length === 0) {
                ul.innerHTML = `<div class="allok">✓ ما تحتاج تشتري شيء — كل المكسرات تغطي ${fmt(TARGET)} خلطة</div>`;
                foot.textContent = `تقدر تعمل ${fmt(minB)} خلطة بالمخزون الحالي`;
            } else {
                ul.innerHTML = toBuy.map(r => `<li><b>${r.name}<span class="have">عندك ${fmt(Math.max(0, r.qty))} جم${kgTxt(Math.max(0, r.qty))} — يكفي ${fmt(r.batches)} خلطة</span></b><span class="qb">+ ${fmt(Math.ceil(r.need))} جم</span></li>`).join("");
                foot.textContent = `المخزون الحالي يكفي ${fmt(minB)} خلطة بس — العائق: ${bott.name}`;
            }

            const others = [];
            ITEMS.forEach(it => {
                if (omKey(it)) return;
                const min = minLevels[itemKey(it)] ?? 0;
                if (min > 0 && it.qty < min) others.push({ ...it, min, urgency: min - it.qty, plan: buyPlan(it, min) });
            });
            others.sort((a, b) => b.urgency - a.urgency);
            document.getElementById("otherShopList").innerHTML = others.length === 0
                ? `<div class="allok">✓ لا يوجد — كل الأصناف فوق حدها الأدنى</div>`
                : others.map(r => `<li><b>${r.name}<span class="have">عندك ${fmt(r.qty)} ${r.unit} · الحد ${fmt(r.min)}${r.qty < 0 ? ' · رصيد سالب — جرد!' : ''}</span><span class="have">${r.plan.sub}</span></b><span class="qb">${r.plan.qtyTxt}</span></li>`).join("");

            const needOf = it => {
                const k = omKey(it);
                if (k) { const per = perBatch[k] ?? 0; return per > 0 ? Math.max(0, TARGET * per - Math.max(0, it.qty)) : 0; }
                const min = minLevels[itemKey(it)] ?? 0;
                return min > 0 ? Math.max(0, min - it.qty) : (it.qty < 0 ? 1 : 0);
            };
            const sortByNeed = arr => arr.sort((a, b) => {
                const oa = omKey(a) ? 1 : 0, ob = omKey(b) ? 1 : 0;
                if (oa !== ob) return ob - oa;
                return needOf(b) - needOf(a) || a.qty - b.qty;
            });

            sortByNeed(groups.nuts);
            document.getElementById("cnt-nuts").textContent = groups.nuts.length + " صنف";
            document.getElementById("nutsList").innerHTML = groups.nuts.map(it => {
                const key = omKey(it);
                if (!key) return simpleRow(it);
                const per = perBatch[key] ?? OM_ALI_DEFAULTS[key];
                const qty = Math.max(0, it.qty);
                const batches = per > 0 ? Math.floor(qty / per) : 0;
                const need = per > 0 ? Math.max(0, TARGET * per - qty) : 0;
                let cls = "ok", label = "تمام ✓";
                if (batches <= 0) { cls = "buy"; label = "اشترِ فورًا"; }
                else if (batches < TARGET) { cls = "warn"; label = "قرّب يخلص"; }
                const pct = Math.min(100, (batches / (TARGET * 1.5)) * 100);
                const isBn = bott && key === bott.key;
                const line = need > 0
                    ? `<div class="buyline">🛒 اشترِ ${fmt(Math.ceil(need))} جم لتغطية ${fmt(TARGET)} خلطة</div>`
                    : `<div class="okline">✓ يكفي هدفك (${fmt(TARGET)} خلطة)</div>`;
                return `<div class="item ${isBn ? 'bottleneck' : ''}">${isBn ? '<span class="crown">العائق الأساسي</span>' : ''}<div class="row1"><div><div class="iname">${it.name}</div><div class="iqty">متوفر <b>${fmt(qty)}</b> جم${kgTxt(qty)}${it.qty < 0 ? ' — رصيد سالب!' : ''}</div></div><span class="badge b-${cls}">${label}</span></div><div class="calc-row"><label for="pb_${key}">لكل خلطة:</label><input type="number" id="pb_${key}" data-key="${key}" value="${per}" min="0" step="5"><span>جم <span class="lock-hint">🔒 نقرتين للتعديل</span></span><span class="batches"><b>${fmt(batches)}</b><small>خلطة</small></span></div><div class="gauge g-${cls}"><i style="width:${pct}%"></i></div>${line}</div>`;
            }).join("");

            document.querySelectorAll('#nutsList input[data-key]').forEach(inp => {
                makeLockable(inp);
                inp.addEventListener("change", e => { perBatch[e.target.dataset.key] = Math.max(0, parseFloat(e.target.value) || 0); savePrefs(); render(); });
            });

            fill("veg", sortByNeed(groups.veg));
            fill("meat", sortByNeed(groups.meat));
            fill("dish", sortByNeed(groups.dish));
            fill("pack", sortByNeed(groups.pack));
            fill("other", sortByNeed(groups.other));

            const chipsDef = [["sec-nuts", "🥜 مكسرات", groups.nuts.length], ["sec-veg", "🥕 خضروات", groups.veg.length], ["sec-meat", "🥩 لحوم", groups.meat.length], ["sec-dish", "🍽️ أطباق", groups.dish.length], ["sec-pack", "📦 تعبئة", groups.pack.length], ["sec-other", "🧺 أخرى", groups.other.length]];
            document.getElementById("chips").innerHTML = chipsDef.filter(c => c[2] > 0).map(([id, t, c]) => `<a class="chip" href="#${id}">${t} <span class="c">${c}</span></a>`).join("");

            const negs = ITEMS.filter(i => i.qty < 0);
            const nw = document.getElementById("negWarn");
            if (negs.length) { nw.classList.remove("hidden"); document.getElementById("negTxt").textContent = negs.map(n => `${n.name} (${fmt(n.qty)})`).join("، "); }
            else nw.classList.add("hidden");
        }

        function simpleRow(it) {
            const key = itemKey(it);
            const min = minLevels[key] ?? 0;
            const neg = it.qty < 0;
            const below = min > 0 && it.qty < min;
            const badge = neg ? `<span class="badge b-buy">جرد خاطئ</span>` : below ? `<span class="badge b-warn">تحت الحد</span>` : `<span class="badge b-ok">متوفر</span>`;
            const plan = below ? buyPlan(it, min) : null;
            const needTxt = plan ? `<span class="need">🛒 ${plan.qtyTxt}</span>` : "";
            return `<div class="srow"><div class="top"><div><div class="iname">${it.name}</div><div class="iqty">${it.sku || ""}</div></div><div class="left"><div><span class="q ${neg ? 'neg' : ''}">${fmt(it.qty)}</span> <span class="u">${it.unit}</span>${it.unit === "جم" ? `<span class="u">${kgTxt(it.qty)}</span>` : ""}</div>${badge}</div></div><div class="minrow"><label for="min_${key}">الحد الأدنى:</label><input type="number" id="min_${key}" data-minkey="${key}" value="${min || ""}" placeholder="0" min="0"><span>${it.unit}</span>${needTxt}</div></div>`;
        }
        function fill(id, arr) {
            const sec = document.getElementById("sec-" + id);
            const list = document.getElementById(id + "List");
            const cnt = document.getElementById("cnt-" + id);
            if (!arr.length) { sec.classList.add("hidden"); return; }
            sec.classList.remove("hidden");
            cnt.textContent = arr.length + " صنف";
            list.innerHTML = arr.map(simpleRow).join("");
            list.querySelectorAll("input[data-minkey]").forEach(inp => {
                makeLockable(inp);
                inp.addEventListener("change", e => { minLevels[e.target.dataset.minkey] = Math.max(0, parseFloat(e.target.value) || 0); savePrefs(); render(); });
            });
        }

        document.getElementById("targetB").addEventListener("change", e => {
            TARGET = Math.max(1, parseInt(e.target.value) || 30);
            savePrefs(); render();
        });

        window.refreshShopTab = function () { buildItems(); render(); };
        buildItems(); render();

        /* استرجاع آخر تبويب مفتوح */
        try { if (localStorage.getItem('activeTab_v1') === 'shop') switchMainTab('shop'); } catch (e) {}
    })();
    