// ═══════════ نافذة إرسال واتساب مشتركة (صفحة الجرد + المشتريات) ═══════════
// قبل ما ينفتح الواتساب: الرقم الافتراضي جاهز ومعدّل عليه، أو من جهات الاتصال، أو اختيار المحادثة من جوا الواتساب
/* jshint esversion:6 */
(function () {
    const CSS = `
    .wa-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,.55); z-index: 3300; align-items: center; justify-content: center; padding: 16px; }
    .wa-overlay.show { display: flex; }
    .wa-box { background: #fff; color: #212121; border-radius: 16px; padding: 18px; width: 100%; max-width: 380px; box-shadow: 0 20px 50px rgba(0,0,0,.35); font-family: 'Cairo','Segoe UI',Tahoma,sans-serif; direction: rtl; }
    .wa-title { font-size: 16px; font-weight: 900; color: #1b5e20; margin-bottom: 4px; }
    .wa-sub { font-size: 12.5px; color: #607d8b; margin-bottom: 12px; }
    .wa-box input { width: 100%; box-sizing: border-box; font-size: 22px; font-weight: 800; padding: 10px 12px; border: 2px solid #2e7d32; border-radius: 12px; direction: ltr; text-align: left; font-family: inherit; }
    .wa-err { min-height: 18px; font-size: 12.5px; color: #c62828; margin-top: 6px; }
    .wa-row { display: flex; gap: 8px; margin-top: 10px; flex-wrap: wrap; }
    .wa-row button { flex: 1 1 0; min-width: 120px; border: 1px solid #cfd8dc; background: #fff; color: #37474f; border-radius: 12px; padding: 10px; font-family: inherit; font-size: 13.5px; font-weight: 800; cursor: pointer; }
    .wa-row button.wa-primary { background: #25d366; border-color: #25d366; color: #fff; font-size: 15px; }
    .wa-row button.wa-reset { flex: 0 0 auto; min-width: 0; }`;

    // 07XXXXXXXX / +962 / 00962 / مسافات وشرطات → 9627XXXXXXXX
    function normalize(n) {
        let d = String(n || '').replace(/[٠-٩]/g, ch => '٠١٢٣٤٥٦٧٨٩'.indexOf(ch)).replace(/[^\d+]/g, '');
        if (d.startsWith('+')) d = d.slice(1);
        else if (d.startsWith('00')) d = d.slice(2);
        else if (d.startsWith('0')) d = '962' + d.slice(1);
        return d;
    }
    const toLocal = intl => (intl && intl.startsWith('962')) ? '0' + intl.slice(3) : (intl || '');
    const canPickContacts = () => 'contacts' in navigator && 'ContactsManager' in window;

    let el = null, state = null;
    function build() {
        if (el) return;
        const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
        el = document.createElement('div');
        el.className = 'wa-overlay';
        el.innerHTML = `<div class="wa-box">
            <div class="wa-title" id="waTitle"></div>
            <div class="wa-sub">بتقدر تعدّل الرقم قبل الإرسال</div>
            <input type="tel" id="waNumberInput" autocomplete="tel" inputmode="tel">
            <div class="wa-err" id="waErr"></div>
            <div class="wa-row">
                <button type="button" id="waContactsBtn">📇 من جهات الاتصال</button>
                <button type="button" id="waChooseBtn">💬 اختار من الواتساب</button>
            </div>
            <div class="wa-row">
                <button type="button" class="wa-reset" id="waResetBtn" title="رجّع الرقم الافتراضي">↺</button>
                <button type="button" id="waCancelBtn">إلغاء</button>
                <button type="button" class="wa-primary" id="waSendBtn">إرسال ➤</button>
            </div>
        </div>`;
        document.body.appendChild(el);
        el.addEventListener('click', e => { if (e.target === el) close(); });
        el.querySelector('#waCancelBtn').onclick = close;
        el.querySelector('#waResetBtn').onclick = () => { input().value = toLocal(state.def); err(''); };
        el.querySelector('#waSendBtn').onclick = send;
        el.querySelector('#waChooseBtn').onclick = () => openWa('');
        input().addEventListener('keydown', e => { if (e.key === 'Enter') send(); });
        el.querySelector('#waContactsBtn').onclick = async () => {
            try {
                const res = await navigator.contacts.select(['name', 'tel'], { multiple: false });
                const tel = res && res[0] && res[0].tel && res[0].tel[0];
                if (tel) { input().value = tel; err(''); }
            } catch (e) { err('ما قدرت أفتح جهات الاتصال'); }
        };
    }
    const input = () => el.querySelector('#waNumberInput');
    const err = t => { el.querySelector('#waErr').textContent = t; };
    function close() { el.classList.remove('show'); state = null; }
    function openWa(number) {
        const url = `https://wa.me/${number}?text=${encodeURIComponent(state.text)}`;
        close();
        const w = window.open(url, '_blank');
        if (!w) location.href = url;
    }
    function send() {
        const n = normalize(input().value);
        if (!/^\d{9,15}$/.test(n)) { err('الرقم مش صحيح — مثال: 0796497707'); return; }
        openWa(n);
    }

    // text: نص الرسالة، defNumber: الرقم الافتراضي بالصيغة الدولية، label: لمين (للعنوان)
    window.openWhatsAppSend = function (text, defNumber, label) {
        build();
        state = { text, def: defNumber };
        el.querySelector('#waTitle').textContent = `💬 إرسال واتساب${label ? ' — ' + label : ''}`;
        el.querySelector('#waContactsBtn').style.display = canPickContacts() ? '' : 'none';
        input().value = toLocal(defNumber);
        err('');
        el.classList.add('show');
    };
    window.normalizeWaNumber = normalize;
})();
