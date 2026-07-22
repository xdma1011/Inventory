# نظام جرد المطعم

## البنية
```
shared/style.css   — التصميم المشترك بين الفرعين
shared/app.js      — المنطق المشترك
gardens/index.html — صفحة فرع الجاردنز
gardens/data.js    — أصناف الجاردنز وشيتاتها (عدّل هنا فقط)
marj/index.html    — صفحة فرع مرج الحمام
marj/data.js       — أصناف مرج الحمام وشيتاتها (عدّل هنا فقط)
```

## لإضافة صنف جديد
افتح `gardens/data.js` أو `marj/data.js` وعدّل `inventoryData` فقط.

## لإضافة فرع جديد
1. انسخ مجلد `gardens/`
2. عدّل `data.js` بأصناف الفرع الجديد
3. عدّل `index.html`: غيّر `BRANCH_ID` و`LS_KEY` و`BRANCH_NAME`
