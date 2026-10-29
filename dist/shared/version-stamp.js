// ═══════════ 🕒 وقت آخر تحديث للكود ═══════════
// بيقرأ وقت النسخة اللي محمّلة فعلياً من ملفات الصفحة (Last-Modified من الموقع، من نفس الكاش اللي اشتغلت منه)،
// وبيقارنها بالنسخة الموجودة هلق على الموقع — لو في أحدث بيطلع تنبيه.
/* jshint esversion:8 */
(function () {
    function pageFiles() {
        const urls = new Set();
        document.querySelectorAll('script[src], link[rel="stylesheet"][href]').forEach(n => {
            const u = new URL(n.getAttribute('src') || n.getAttribute('href'), location.href);
            if (u.origin === location.origin) urls.add(u.href);
        });
        urls.add(location.href.split('#')[0]);
        // صفحات الجرد: الهيكل (template.html) بينجاب بـ fetch مش بوسم script
        if (window.BRANCH_ID) urls.add(new URL('../shared/template.html', location.href).href);
        return [...urls];
    }
    async function lastModified(url, cache) {
        try {
            const r = await fetch(url, { method: 'HEAD', cache });
            const h = r.headers.get('last-modified');
            return h ? new Date(h) : null;
        } catch (e) { return null; }
    }
    const newest = list => list.filter(Boolean).reduce((a, b) => (!a || b > a) ? b : a, null);
    const fmt = d => d.toLocaleString('ar-EG', { year: 'numeric', month: '2-digit', day: '2-digit', hour: 'numeric', minute: '2-digit' });

    async function run() {
        let box = document.getElementById('buildStamp');
        if (!box) {
            box = document.createElement('div');
            box.id = 'buildStamp';
            box.style.cssText = 'text-align:center;font-size:12px;opacity:.65;padding:14px 8px 90px;';
            document.body.appendChild(box);
        }
        const files = pageFiles();
        const loaded = newest(await Promise.all(files.map(u => lastModified(u, 'force-cache'))));
        if (!loaded) { box.textContent = ''; return; }
        box.textContent = '🕒 آخر تحديث للكود: ' + fmt(loaded);
        const live = newest(await Promise.all(files.map(u => lastModified(u, 'no-store'))));
        if (live && live - loaded > 60 * 1000) {
            box.innerHTML = '';
            const warn = document.createElement('span');
            warn.style.cssText = 'color:#e65100;font-weight:800;opacity:1;';
            warn.textContent = '⚠️ في تحديث أحدث (' + fmt(live) + ') — سكّر الصفحة وافتحها من جديد';
            box.appendChild(document.createTextNode('🕒 آخر تحديث للكود عندك: ' + fmt(loaded) + ' · '));
            box.appendChild(warn);
            box.style.opacity = '1';
        }
    }
    if (document.readyState === 'complete') run();
    else window.addEventListener('load', run);
})();
