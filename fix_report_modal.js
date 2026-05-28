// Fix report page rendering by removing iframe :srcdoc reactive binding
// Uses indexed splicing for exact replacements to avoid escape ambiguity

const fs = require('fs');
const FILE = 'c:/SPB_Data/.node-red-energy/flows.json';

let raw = fs.readFileSync(FILE, 'utf8');
const hasBOM = raw.charCodeAt(0) === 0xFEFF;
if (hasBOM) raw = raw.slice(1);
const flows = JSON.parse(raw);

const rpt = flows.find(n => n.id === 'c599148915460102');
if (!rpt) { console.error('Report node not found'); process.exit(1); }

let t = rpt.format || rpt.template || '';
const originalLen = t.length;
console.log('Original template length:', originalLen);

function replace(label, oldStr, newStr) {
    if (!t.includes(oldStr)) {
        console.error('ERROR: anchor not found for step:', label);
        const words = oldStr.slice(0, 40);
        const idx = t.indexOf(words);
        if (idx !== -1) console.log('  Partial match at', idx, ':', JSON.stringify(t.slice(idx, idx+120)));
        process.exit(1);
    }
    t = t.replace(oldStr, newStr);
    console.log('Done:', label);
}

// ─── 1. Replace the iframe section inside the modal ───────────────────────
replace(
    '1 - remove iframe, add Report Ready UI',
    `        <div style="flex:1;overflow:hidden;min-height:200px;">
          <div v-if="!monthlyMonth" style="display:flex;align-items:center;justify-content:center;height:200px;color:#94A3B8;font-size:13px;">Select a month to generate the report</div>
          <div v-else-if="monthlyLoading" style="display:flex;align-items:center;justify-content:center;height:200px;color:#64748B;font-size:13px;">Generating report...</div>
          <iframe v-else-if="monthlyHtml" :srcdoc="monthlyHtml" style="width:100%;height:520px;border:none;display:block;" />
        </div>`,
    `        <div style="flex:1;overflow:hidden;min-height:200px;">
          <div v-if="!monthlyMonth" style="display:flex;align-items:center;justify-content:center;height:200px;color:#94A3B8;font-size:13px;">Select a month to generate the report</div>
          <div v-else-if="monthlyLoading" style="display:flex;align-items:center;justify-content:center;height:200px;color:#64748B;font-size:13px;">Generating report…</div>
          <div v-else-if="monthlyStatus === 'ready'" style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:200px;gap:16px;">
            <div style="color:#16A34A;font-size:15px;font-weight:700;">&#10003; Report Ready</div>
            <div style="display:flex;gap:12px;">
              <button @click="openMonthlyReport" style="padding:9px 22px;background:#1E293B;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:13px;font-weight:600;">Open Report</button>
              <button @click="downloadMonthlyPDF" style="padding:9px 22px;background:#C41E1E;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:13px;font-weight:600;">Download PDF</button>
            </div>
          </div>
        </div>`
);

// ─── 2. Remove the Download PDF button from the modal toolbar ─────────────
replace(
    '2 - remove toolbar Download PDF button',
    `\n          <button v-if="monthlyHtml && !monthlyLoading" @click="downloadMonthlyPDF" style="padding:8px 18px;background:#C41E1E;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:13px;font-weight:600;">Download PDF</button>`,
    ''
);

// ─── 3. Update reactive data: remove monthlyHtml, add monthlyStatus ───────
replace(
    '3 - update data()',
    `showMonthlyModal: false, monthlyMonth: '', monthlyHtml: '', monthlyLoading: false`,
    `showMonthlyModal: false, monthlyMonth: '', monthlyStatus: '', monthlyLoading: false`
);

// ─── 4. Update watcher handler for monthly-preview-html ───────────────────
replace(
    '4 - update watcher',
    `      if (p.action === 'monthly-preview-html') {
        this.monthlyLoading = false;
        this.monthlyHtml = p.html || '';
        return;
      }`,
    `      if (p.action === 'monthly-preview-html') {
        this.monthlyLoading = false;
        this._monthlyHtml = p.html || '';
        this.monthlyStatus = 'ready';
        return;
      }`
);

// ─── 5. Replace openMonthlyModal ─────────────────────────────────────────
replace(
    '5 - update openMonthlyModal',
    `    openMonthlyModal() {
      var now = new Date();
      var pad = function(n) { return String(n).padStart(2,'0'); };
      if (!this.monthlyMonth) this.monthlyMonth = now.getFullYear()+'-'+pad(now.getMonth()+1);
      this.monthlyHtml = '';
      this.monthlyLoading = false;
      this.showMonthlyModal = true;
      this.generateMonthlyReport();
    },`,
    `    openMonthlyModal() {
      var now = new Date();
      var pad = function(n) { return String(n).padStart(2,'0'); };
      if (!this.monthlyMonth) this.monthlyMonth = now.getFullYear()+'-'+pad(now.getMonth()+1);
      this._monthlyHtml = '';
      this.monthlyStatus = '';
      this.monthlyLoading = false;
      this.showMonthlyModal = true;
      this.generateMonthlyReport();
    },`
);

// ─── 6. Replace closeMonthlyReport ───────────────────────────────────────
replace(
    '6 - update closeMonthlyReport',
    `    closeMonthlyReport() {
      this.showMonthlyModal = false;
      this.monthlyHtml = '';
    },`,
    `    closeMonthlyReport() {
      this.showMonthlyModal = false;
      this._monthlyHtml = '';
      this.monthlyStatus = '';
    },`
);

// ─── 7. Replace generateMonthlyReport ────────────────────────────────────
replace(
    '7 - update generateMonthlyReport',
    `    generateMonthlyReport() {
      if (!this.monthlyMonth) return;
      var parts = this.monthlyMonth.split('-');
      this.monthlyLoading = true;
      this.monthlyHtml = '';
      this.send({ payload: { action: 'monthly-preview-report', year: parseInt(parts[0]), month: parseInt(parts[1]) } });
    },`,
    `    generateMonthlyReport() {
      if (!this.monthlyMonth) return;
      var parts = this.monthlyMonth.split('-');
      this.monthlyLoading = true;
      this.monthlyStatus = '';
      this._monthlyHtml = '';
      this.send({ payload: { action: 'monthly-preview-report', year: parseInt(parts[0]), month: parseInt(parts[1]) } });
    },`
);

// ─── 8. Add openMonthlyReport and update downloadMonthlyPDF ──────────────
// Find the exact downloadMonthlyPDF block by locating its start
const DL_ANCHOR = '    downloadMonthlyPDF() {';
const DL_END = '\n    },\n    goBack()';
const dlStart = t.indexOf(DL_ANCHOR);
const dlEnd = t.indexOf(DL_END);
if (dlStart === -1 || dlEnd === -1) {
    console.error('ERROR: Cannot locate downloadMonthlyPDF block. dlStart='+dlStart+' dlEnd='+dlEnd);
    process.exit(1);
}
const oldBlock = t.slice(dlStart, dlEnd + 2); // include ',\n' but not goBack
const newBlock = `    openMonthlyReport() {
      if (!this._monthlyHtml) return;
      var win = window.open('', '_blank');
      if (win) { win.document.write(this._monthlyHtml); win.document.close(); }
      else this.showToast('⚠ Popup blocked — allow popups and try again');
    },
    downloadMonthlyPDF() {
      if (!this._monthlyHtml) return;
      var parts = this.monthlyMonth.split('-');
      var monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
      var monthLabel = monthNames[parseInt(parts[1])-1]+' '+parts[0];
      var filename = monthLabel+' - Monthly Report';
      var html = this._monthlyHtml.replace(/<title>[^<]*<\/title>/, '<title>'+filename+'</title>');
      var win = window.open('','_blank','width=950,height=750');
      if (win) { win.document.write(html); win.document.close(); win.focus(); setTimeout(function(){ win.print(); },800); }
      else this.showToast('⚠ Popup blocked — allow popups and try again');
    },`;
t = t.slice(0, dlStart) + newBlock + t.slice(dlStart + oldBlock.length);
console.log('Done: 8 - added openMonthlyReport and updated downloadMonthlyPDF');

console.log('New template length:', t.length, '(was', originalLen + ')');

// Verify no leftover references to reactive monthlyHtml (except inside comments)
const remaining = (t.match(/this\.monthlyHtml/g) || []).length;
console.log('Remaining "this.monthlyHtml" references:', remaining, '(should be 0)');

// Write back
if (rpt.format !== undefined) rpt.format = t;
else rpt.template = t;

const out = (hasBOM ? '﻿' : '') + JSON.stringify(flows, null, 4);
fs.writeFileSync(FILE, out, 'utf8');
console.log('flows.json written successfully');
