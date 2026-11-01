(async () => {
  const BASE = 'https://xdma1011.github.io/Inventory/dist/';
  const box = document.createElement('div');
  box.style.cssText = 'position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:2147483647;background:#263238;color:#fff;padding:12px 18px;border-radius:12px;font:600 15px sans-serif;direction:rtl;box-shadow:0 6px 24px rgba(0,0,0,.4)';
  document.body.appendChild(box);
  const say = t => { box.textContent = t; };
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const btn = id => document.getElementById(id);
  const off = b => !b || b.disabled || b.classList.contains('f-btn--disabled');
  const sig = () => { const r = document.querySelector('#listing-table tbody tr'); return r ? r.textContent : ''; };
  const waitChange = async old => { for (let i = 0; i < 60; i++) { await sleep(250); const s = sig(); if (s && s !== old) return true; } return false; };
  try {
    if (!document.querySelector('#listing-table')) throw new Error('افتح صفحة «مستويات المخزون» بفوديكس أول');
    let g = 0;
    while (!off(btn('pagination.prev')) && g++ < 100) { say('⏳ برجع لأول صفحة...'); const o = sig(); btn('pagination.prev').click(); if (!await waitChange(o)) break; }
    const head = [...document.querySelectorAll('#listing-table thead th')].map(th => th.textContent.trim());
    const col = re => head.findIndex(h => re.test(h));
    const ci = { n: col(/الاسم|name/i), s: col(/كود|sku/i), b: col(/باركود|barcode/i), u: col(/وحدة|unit/i), q: col(/الكمية|quantity/i) };
    if (ci.s < 0 || ci.q < 0) throw new Error('ما لقيت عمود الكود أو الكمية بالجدول');
    const rows = new Map();
    let page = 1;
    for (;;) {
      say('⏳ عم بسحب صفحة ' + page + ' — ' + rows.size + ' صنف لهلق');
      document.querySelectorAll('#listing-table tbody tr').forEach(tr => {
        const c = [...tr.querySelectorAll('td')].map(td => td.textContent.trim());
        const sku = c[ci.s];
        if (sku && sku !== '-') rows.set(sku, [c[ci.n] || '', sku, ci.b >= 0 ? c[ci.b] : '', ci.u >= 0 ? c[ci.u] : '', (c[ci.q] || '0').replace(/,/g, '')]);
      });
      const nx = btn('pagination.next');
      if (off(nx) || page >= 200) break;
      const o = sig(); nx.click(); page++;
      if (!await waitChange(o)) break;
    }
    if (!rows.size) throw new Error('الجدول فاضي');
    const badges = [...document.querySelectorAll('.dropdown-badge')].map(e => e.textContent).join(' ');
    let br = /مرج/.test(badges) ? 'marj' : /مركز|مستودع/.test(badges) ? 'central' : /جاردن|gardens/i.test(badges) ? 'gardens' : '';
    if (!br) { const a = prompt('لأي فرع؟ 1 = الجاردنز · 2 = مرج الحمام · 3 = المركزي', '1'); br = { 1: 'gardens', 2: 'marj', 3: 'central' }[String(a).trim()]; }
    if (!br) throw new Error('ما اخترت فرع');
    const q = v => /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
    const csv = ['Name,SKU,Barcode,Storage Unit,Quantity'].concat([...rows.values()].map(r => r.map(q).join(','))).join('\n');
    say('✅ ' + rows.size + ' صنف — عم بفتح صفحة الجرد...');
    location.href = BASE + br + '/index.html#foodics=' + encodeURIComponent(csv);
  } catch (e) {
    say('⚠️ ' + e.message);
    setTimeout(() => box.remove(), 6000);
  }
})();
