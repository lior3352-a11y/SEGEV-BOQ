/* Monthly payment agreement and progress billing for the selected project. */
document.addEventListener('DOMContentLoaded', () => {
  const $ = id => document.getElementById(id);
  const money = n => '₪' + Number(n || 0).toLocaleString('he-IL', {maximumFractionDigits: 2});
  const safe = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const project = () => S.projects.find(item => item.id === S.selected);
  const invoices = p => Array.isArray(p.invoices) ? p.invoices : (p.invoices = []);
  const iso = date => new Date(date).toISOString().slice(0, 10);
  const today = () => iso(new Date());
  const dueDate = (date, days) => {
    const result = new Date(date + 'T12:00:00');
    result.setDate(result.getDate() + Number(days || 0));
    return iso(result);
  };
  const quantity = value => Number.isFinite(Number(value)) && Number(value) >= 0 ? Number(value) : NaN;
  const nav = document.querySelector('nav');
  nav.insertAdjacentHTML('beforeend', '<button class="nav" data-v="payments">הסכם תשלומים וחשבונות</button>');
  document.getElementById('cost').insertAdjacentHTML('afterend', `
    <section id="payments" class="view">
      <div class="card"><h2>הסכם תשלומים</h2><p class="sub">החשבון מחושב לפי כמות שבוצעה החודש מתוך כתב הכמויות. הימים לתשלום נספרים מיום אישור החשבון.</p>
        <div class="form"><label>ימים לתשלום אחרי אישור<input id="paymentDays" type="number" min="0" max="365" value="30"></label><label>עיכבון (%)<input id="paymentRetention" type="number" min="0" max="30" step="0.01" value="0"></label><label class="wide">תנאים נוספים כפי שסוכמו בחוזה<input id="paymentTerms" maxlength="500" placeholder="למשל: מסמכים שיש לצרף לחשבון"></label></div>
        <p><button class="btn primary" id="saveAgreement">שמור הסכם</button></p><p class="sub">הסכומים המוצגים אינם כוללים מע״מ או מקדמות. יש להזין מחיר סעיף וכמות ביצוע בכתב הכמויות.</p></div>
      <div class="card"><h2>חשבון חודשי לפי ביצוע</h2><label>חודש החשבון <input id="paymentMonth" type="month"></label><div id="paymentEntry" class="wrap"></div><p><button class="btn primary" id="submitMonthly">שמור והגש חשבון</button></p><p id="paymentError" class="bad" role="alert"></p></div>
      <div class="card wrap"><h2>מעקב חשבונות ותשלומים</h2><table><thead><tr><th>חודש</th><th>ביצוע שהוגש</th><th>עיכבון</th><th>לתשלום</th><th>סטטוס</th><th>מועד תשלום</th><th>יתרה לתשלום</th><th>פעולה</th></tr></thead><tbody id="monthlyRows"></tbody></table></div>
    </section>`);
  $('paymentMonth').value = new Date().toISOString().slice(0, 7);

  function billedQuantity(p, itemId) {
    return invoices(p).flatMap(inv => inv.lines || []).filter(line => line.id === itemId).reduce((sum, line) => sum + Number(line.quantity || 0), 0);
  }
  function renderPayments() {
    const p = project();
    for (const id of ['paymentDays','paymentRetention','paymentTerms']) $(id).disabled = !p;
    $('saveAgreement').disabled = !p;
    $('submitMonthly').disabled = !p || !(p.boq || []).length;
    $('paymentError').textContent = '';
    if (!p) {
      $('paymentEntry').innerHTML = '<p class="empty">בחר פרויקט כדי להגדיר הסכם תשלומים.</p>';
      $('monthlyRows').innerHTML = '<tr><td colspan="8" class="empty">אין פרויקט נבחר.</td></tr>';
      return;
    }
    const agreement = p.paymentAgreement || {};
    $('paymentDays').value = agreement.days ?? 30;
    $('paymentRetention').value = agreement.retention ?? 0;
    $('paymentTerms').value = agreement.terms ?? '';
    $('paymentEntry').innerHTML = (p.boq || []).length ? `<table><thead><tr><th>סעיף</th><th>כמות חוזה</th><th>ביצוע מצטבר</th><th>כבר הוגש</th><th>ניתן להגיש החודש</th><th>כמות החודש</th><th>מחיר יחידה</th></tr></thead><tbody>${p.boq.map(item => {
      const previous = billedQuantity(p, item.id);
      const available = Math.max(0, Math.min(Number(item.q || 0), Number(item.aq || 0)) - previous);
      return `<tr><td>${safe(item.d)}</td><td>${Number(item.q || 0)}</td><td>${Number(item.aq || 0)}</td><td>${previous}</td><td>${available}</td><td><input class="monthlyQty" data-item="${safe(item.id)}" type="number" min="0" max="${available}" step="any" value="0" aria-label="כמות חודשית: ${safe(item.d)}" style="width:95px"></td><td>${money(item.p)}</td></tr>`;
    }).join('')}</tbody></table>` : '<p class="empty">הוסף סעיפים ועדכן כמות ביצוע בכתב הכמויות לפני הגשת חשבון.</p>';
    $('monthlyRows').innerHTML = invoices(p).length ? invoices(p).slice().reverse().map(inv => {
      const unpaid = inv.status === 'הוגש' ? 0 : Math.max(0, inv.payable - (inv.paid || 0));
      const next = inv.status === 'הוגש' ? `<button class="btn" data-bill="${safe(inv.id)}" data-step="approve">אשר</button>` : inv.status === 'אושר' ? `<button class="btn" data-bill="${safe(inv.id)}" data-step="paid">סמן כשולם</button>` : '—';
      return `<tr><td>${safe(inv.month)}</td><td>${money(inv.amount)}</td><td>${money(inv.withheld)}</td><td>${money(inv.payable)}</td><td>${safe(inv.status)}</td><td>${safe(inv.due || 'לא אושר')}</td><td>${money(unpaid)}</td><td>${next}</td></tr>`;
    }).join('') : '<tr><td colspan="8" class="empty">עוד לא הוגש חשבון.</td></tr>';
  }
  $('saveAgreement').onclick = () => {
    const p = project(); if (!p) return;
    const days = quantity($('paymentDays').value), retention = quantity($('paymentRetention').value);
    if (!Number.isInteger(days) || days > 365 || !Number.isFinite(retention) || retention > 30) { $('paymentError').textContent = 'בדוק את ימי התשלום ואחוז העיכבון.'; return; }
    p.paymentAgreement = {days, retention, terms:$('paymentTerms').value.trim()};
    save();renderPayments();
  };
  $('submitMonthly').onclick = () => {
    const p = project(); if (!p) return;
    const month = $('paymentMonth').value;
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) { $('paymentError').textContent = 'בחר חודש חשבון.'; return; }
    if (invoices(p).some(inv => inv.month === month)) { $('paymentError').textContent = 'כבר קיים חשבון לחודש זה.'; return; }
    const lines = [];
    for (const input of document.querySelectorAll('.monthlyQty')) {
      const item = p.boq.find(x => x.id === input.dataset.item);
      if (!item) continue;
      const count = quantity(input.value);
      const limit = Math.max(0, Math.min(Number(item.q || 0), Number(item.aq || 0)) - billedQuantity(p, item.id));
      if (!Number.isFinite(count) || count > limit + 1e-9) { $('paymentError').textContent = 'הכמות לחודש חורגת מהביצוע הזמין בסעיף ' + item.d; return; }
      if (count > 0) lines.push({id:item.id, description:item.d, quantity:count, unitPrice:Number(item.p || 0), amount:Math.round(count * Number(item.p || 0) * 100) / 100});
    }
    if (!lines.length) { $('paymentError').textContent = 'הזן כמות שבוצעה החודש בלפחות סעיף אחד.'; return; }
    const amount = Math.round(lines.reduce((sum, line) => sum + line.amount, 0) * 100) / 100;
    const retention = Number(p.paymentAgreement?.retention ?? 0);
    const withheld = Math.round(amount * retention) / 100;
    invoices(p).push({id:crypto.randomUUID(),month,lines,amount,withheld,payable:Math.round((amount - withheld) * 100) / 100,status:'הוגש',submitted:today(),approved:null,due:null,paid:0});
    save();renderPayments();
  };
  $('monthlyRows').onclick = event => {
    const button = event.target.closest('button[data-bill]'); if (!button) return;
    const p = project(); const inv = p && invoices(p).find(x => x.id === button.dataset.bill); if (!inv) return;
    if (button.dataset.step === 'approve' && inv.status === 'הוגש') {
      inv.status = 'אושר';inv.approved = today();inv.due = dueDate(inv.approved, p.paymentAgreement?.days ?? 30);
    } else if (button.dataset.step === 'paid' && inv.status === 'אושר') {
      inv.status = 'שולם';inv.paid = inv.payable;inv.paidAt = today();
    } else return;
    save();renderPayments();
  };
  nav.addEventListener('click', event => { if (event.target.closest('[data-v="payments"]')) renderPayments(); });
  $('paymentMonth').onchange = renderPayments;
  $('addb').addEventListener('click', renderPayments);
  $('addp').addEventListener('click', renderPayments);
  $('restore').addEventListener('change', () => setTimeout(renderPayments, 100));
  const oldOpen = window.openp;
  window.openp = id => {oldOpen(id); renderPayments();};
  renderPayments();
});
