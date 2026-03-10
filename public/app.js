/* ===== AARIAS CAR RENTAL — FULL DASHBOARD APP ===== */
(function () {
  'use strict';

  /* ---- CATEGORIES ---- */
  const CATEGORIES = [
    { id: 'economy',  name: 'Economy',  vat: 0.12 },
    { id: 'standard', name: 'Standard', vat: 0.12 },
    { id: 'luxury',   name: 'Luxury',   vat: 0.20 },
    { id: 'van',      name: 'Van',      vat: 0.12 },
    { id: 'motorbike',name: 'Motorbike',vat: 0.10 },
  ];

  /* ---- MOCK FLEET ---- */
  const FLEET = [
    { brand:'Toyota', model:'Corolla',  category:'Economy',  plate:'ABC-1234', img:'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=600&q=80', status:'available' },
    { brand:'BMW',    model:'5 Series', category:'Luxury',   plate:'XYZ-987',  img:'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=600&q=80', status:'booked' },
    { brand:'Renault',model:'Captur',   category:'Standard', plate:'LMN-4567', img:'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=600&q=80', status:'available' },
    { brand:'Ford',   model:'Transit',  category:'Van',      plate:'VAN-001',  img:'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80', status:'available' },
    { brand:'Honda',  model:'CBR 500',  category:'Motorbike',plate:'MBK-909',  img:'https://images.unsplash.com/photo-1558981359-219d6364c9c8?w=600&q=80', status:'overdue' },
    { brand:'Mercedes',model:'E-Class', category:'Luxury',   plate:'MEX-321',  img:'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=600&q=80', status:'available' },
  ];

  /* ---- MOCK LOYAL CLIENTS ---- */
  const LOYAL = [
    { name:'John Doe',     rentals:12 },
    { name:'Sara Müller',  rentals:8  },
    { name:'Luis Fernandes',rentals:5 },
    { name:'Priya Patel',  rentals:4  },
  ];

  /* ---- HELPERS ---- */
  const q = id => document.getElementById(id);
  const fmt = n => '$' + Number(n||0).toFixed(2);

  function showToast(msg) {
    const t = q('toast');
    t.textContent = msg;
    t.classList.add('visible');
    setTimeout(() => t.classList.remove('visible'), 3000);
  }
  window.showToast = showToast;

  /* ---- TAB SWITCHING ---- */
  function switchTab(id) {
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const panel = q('tab-' + id);
    if (panel) panel.classList.add('active');
    const navItem = document.querySelector(`.nav-item[data-tab="${id}"]`);
    if (navItem) navItem.classList.add('active');
    document.querySelectorAll('.anim-fadein').forEach(el => {
      el.style.animation = 'none';
      el.offsetHeight;
      el.style.animation = '';
    });
    // Sidebar auto-close on mobile
    if (window.innerWidth < 768) q('sidebar').classList.remove('open');
    if (id === 'earnings') renderEarningsChart();
    if (id === 'schedule') renderSchedule();
  }
  window.switchTab = switchTab;

  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => switchTab(item.dataset.tab));
  });

  /* ---- MOBILE MENU ---- */
  q('menuBtn').addEventListener('click', () => q('sidebar').classList.toggle('open'));

  /* ---- TODAY DATE ---- */
  q('todayDate').textContent = new Date().toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' });

  /* ===== CAMERA + OCR ===== */
  let stream = null;

  q('openCamera').addEventListener('click', async () => {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      q('video').srcObject = stream;
      q('ocrStatus').textContent = 'Camera active — point at license plate and capture.';
    } catch (err) { showToast('Camera unavailable: ' + err.message); }
  });

  q('captureBtn').addEventListener('click', () => {
    const video = q('video');
    const canvas = q('captureCanvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    q('preview').src = canvas.toDataURL('image/jpeg');
    q('ocrStatus').textContent = 'Photo captured — click OCR to read the plate.';
  });

  q('doOcrBtn').addEventListener('click', async () => {
    const img = q('preview');
    if (!img.src || img.src === window.location.href) { showToast('Capture a photo first'); return; }
    q('doOcrBtn').querySelector('span:last-child').textContent = 'Scanning…';
    q('ocrStatus').textContent = 'OCR running — please wait…';
    try {
      const w = Tesseract.createWorker();
      await w.load(); await w.loadLanguage('eng'); await w.initialize('eng');
      const { data } = await w.recognize(img.src);
      await w.terminate();
      const text = (data && data.text) ? data.text.replace(/\s+/g, ' ').trim() : '';
      const match = text.match(/[A-Z0-9-]{3,8}/i);
      q('doOcrBtn').querySelector('span:last-child').textContent = 'OCR';
      if (match) {
        q('licensePlate').value = match[0].toUpperCase();
        q('ocrStatus').textContent = `✅ Plate detected: ${match[0].toUpperCase()}`;
      } else {
        q('ocrStatus').textContent = 'No plate found — enter manually.';
      }
    } catch (err) {
      q('doOcrBtn').querySelector('span:last-child').textContent = 'OCR';
      showToast('OCR failed: ' + err.message);
    }
  });

  /* ===== TOTALS ===== */
  function updateTotals() {
    const price = parseFloat(q('pricePerDay').value) || 0;
    const days  = parseInt(q('days').value, 10) || 0;
    const cat   = CATEGORIES.find(c => c.id === q('categorySelect').value) || CATEGORIES[0];
    const sub   = price * days;
    const vat   = +(sub * cat.vat).toFixed(2);
    const total = +(sub + vat).toFixed(2);
    q('subtotal').textContent  = fmt(sub);
    q('vatAmount').textContent = fmt(vat);
    q('total').textContent     = fmt(total);
    renderReceipt();
    checkConflict();
  }

  ['pricePerDay','days','categorySelect','pickupDate','returnDate','licensePlate']
    .forEach(id => q(id).addEventListener('input', updateTotals));
  ['categorySelect','paymentMethod'].forEach(id => q(id).addEventListener('change', updateTotals));

  /* ===== CATEGORY SELECT ===== */
  const sel = q('categorySelect');
  CATEGORIES.forEach(c => {
    const o = document.createElement('option');
    o.value = c.id;
    o.textContent = `${c.name} (VAT ${Math.round(c.vat * 100)}%)`;
    sel.appendChild(o);
  });

  /* ===== DEFAULT DATES ===== */
  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  q('pickupDate').value = today;
  q('returnDate').value = tomorrow;
  updateTotals();

  /* ===== DOUBLE BOOKING CONFLICT CHECK ===== */
  let allRentals = [];

  async function checkConflict() {
    const plate    = (q('licensePlate').value || '').trim().toUpperCase();
    const pickup   = q('pickupDate').value;
    const returnD  = q('returnDate').value;
    if (!plate || !pickup || !returnD) { q('conflictAlert').style.display = 'none'; return; }

    const conflicts = allRentals.filter(r => {
      if ((r.license_plate || '').toUpperCase() !== plate) return false;
      if (r.status === 'Completed') return false;
      // overlap check: existing rental dates vs new
      const rp = r.pickup_date || r.created_at?.slice(0, 10);
      const rr = r.return_date || rp;
      if (!rp) return false;
      return pickup <= rr && returnD >= rp;
    });

    if (conflicts.length > 0) {
      q('conflictMsg').textContent = `⚠️ Plate ${plate} is already booked for overlapping dates! Adjust dates or choose another vehicle.`;
      q('conflictAlert').style.display = 'flex';
    } else {
      q('conflictAlert').style.display = 'none';
    }
  }

  /* ===== RECEIPT PREVIEW ===== */
  function renderReceipt() {
    const customer = q('customerName').value || '—';
    const passport = q('passportNumber').value || '';
    const license  = q('licensePlate').value  || '—';
    const hotel    = q('hotelName').value || '';
    const room     = q('roomNumber').value || '';
    const price    = parseFloat(q('pricePerDay').value) || 0;
    const days     = parseInt(q('days').value,10) || 0;
    const cat      = CATEGORIES.find(c => c.id === q('categorySelect').value) || CATEGORIES[0];
    const sub      = price * days;
    const vat      = +(sub * cat.vat).toFixed(2);
    const total    = +(sub + vat).toFixed(2);
    const rNum     = 'A5-' + new Date().toISOString().slice(0,10).replace(/-/g,'') + '-' + Math.floor(Math.random()*900+100);
    q('receiptMeta').innerHTML = `<div><strong>${rNum}</strong></div><div>${new Date().toLocaleString()}</div>`;
    q('receiptBody').innerHTML = `
      <div><strong>Customer:</strong> ${customer}${passport ? ' (•••' + passport.slice(-3)+')':''}</div>
      <div><strong>Vehicle:</strong> ${license}</div>
      <div><strong>Category:</strong> ${cat.name}</div>
      ${hotel ? `<div><strong>Hotel:</strong> ${hotel}${room?'/'+room:''}</div>` : ''}
      <hr style="border:none;border-top:1px dashed #ccc;margin:7px 0"/>
      <div>Price/day: $${price.toFixed(2)} × ${days} days</div>
      <div>Subtotal: $${sub.toFixed(2)}</div>
      <div>VAT (${Math.round(cat.vat*100)}%): $${vat.toFixed(2)}</div>
      <div style="font-weight:700;font-size:13px;margin-top:6px">Total: $${total.toFixed(2)}</div>
      <div>Payment: ${q('paymentMethod').value}</div>
    `;
  }

  /* ===== GENERATE A5 PDF ===== */
  q('generatePdf').addEventListener('click', async () => {
    renderReceipt();
    try {
      const canvas = await html2canvas(q('receipt'), { scale: 2, backgroundColor: '#fff' });
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({ unit:'mm', format:'a5', orientation:'portrait' });
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 148, 210);
      pdf.save('aarias-receipt.pdf');
      showToast('Receipt PDF saved!');
    } catch (err) { showToast('PDF error: ' + err.message); }
  });

  /* ===== SAVE RENTAL ===== */
  q('saveRental').addEventListener('click', async () => {
    if (q('conflictAlert').style.display !== 'none') {
      showToast('Resolve the conflict before saving!');
      return;
    }
    renderReceipt();
    const cat = CATEGORIES.find(c => c.id === q('categorySelect').value) || CATEGORIES[0];
    const price = parseFloat(q('pricePerDay').value) || 0;
    const days  = parseInt(q('days').value,10) || 0;
    const sub   = price * days;
    const vat   = +(sub * cat.vat).toFixed(2);
    const total = +(sub + vat).toFixed(2);
    const payload = {
      receiptNumber: 'A5-' + Date.now(),
      createdAt:  new Date().toISOString(),
      employee:   { id:'EMP-LOCAL', name:'Alice Gomez' },
      customer:   { name: q('customerName').value || null, passportNumber: q('passportNumber').value || null },
      vehicle:    { brand:null, model:null, category:cat.id, licensePlate: q('licensePlate').value || null, plateOCRConfidence:null },
      hotel:      { name: q('hotelName').value || null, room: q('roomNumber').value || null },
      pricePerDay: price, days, subtotal: sub, vatRate: cat.vat, vatAmount: vat, total,
      paymentMethod: q('paymentMethod').value || 'Card',
      status: 'Completed'
    };
    try {
      const res = await fetch('api/rentals', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) });
      if (!res.ok) throw new Error('Save failed');
      showToast('Rental saved successfully!');
      loadAll();
    } catch (err) { showToast('Error: ' + err.message); }
  });

  /* ===== LOAD ALL DATA ===== */
  async function loadAll() {
    try {
      const res  = await fetch('api/rentals');
      const json = await res.json();
      allRentals = json.rentals || [];
      renderDashboardKPIs();
      renderRecentTable();
      renderLedger();
      renderBookingLinks();
    } catch (e) { console.error(e); }
  }

  function renderDashboardKPIs() {
    const today = new Date().toISOString().slice(0, 10);
    const todayR = allRentals.filter(r => (r.created_at||'').slice(0,10) === today);
    const todayRev = todayR.reduce((a, r) => a + (r.total||0), 0);
    const active = allRentals.filter(r => r.status === 'Active').length;
    const fleetTotal = FLEET.length;
    const booked = allRentals.filter(r => r.status !== 'Completed').length;
    const avail = Math.max(0, fleetTotal - booked);
    const overdue = allRentals.filter(r => r.status === 'Overdue').length;
    q('kpiRevenue').textContent = fmt(todayRev);
    q('kpiActive').textContent  = active || booked || 3;
    q('kpiAvail').textContent   = avail;
    q('kpiOverdue').textContent = overdue;
    // Earnings tab
    const curMonth = new Date().toISOString().slice(0, 7);
    const monthR  = allRentals.filter(r => (r.created_at||'').slice(0,7) === curMonth);
    const monthRev = monthR.reduce((a, r) => a + (r.total||0), 0);
    q('earningsMonthly').textContent   = fmt(monthRev);
    q('earningsRentals').textContent   = allRentals.length;
    q('earningsCommission').textContent = fmt(monthRev * 0.08);
  }

  function renderRecentTable() {
    const tbody = q('recentBody');
    tbody.innerHTML = '';
    if (!allRentals.length) { tbody.innerHTML = '<tr><td colspan="7" class="empty-msg">No rentals yet</td></tr>'; return; }
    allRentals.slice(0, 10).forEach(r => {
      const status = r.status || 'Completed';
      const cls = status.toLowerCase() === 'completed' ? 'completed' : status.toLowerCase() === 'overdue' ? 'overdue' : 'active';
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${r.receipt_number||'—'}</td>
        <td>${r.customer_name||'—'}</td>
        <td><code>${r.license_plate||'—'}</code></td>
        <td>${r.category||'—'}</td>
        <td>${r.days||'—'}</td>
        <td>${fmt(r.total)}</td>
        <td><span class="status-pill ${cls}">${status}</span></td>
      `;
      tbody.appendChild(tr);
    });
  }

  function renderLedger() {
    const tbody = q('ledgerBody');
    tbody.innerHTML = '';
    if (!allRentals.length) { tbody.innerHTML = '<tr><td colspan="6" class="empty-msg">No data</td></tr>'; return; }
    allRentals.forEach(r => {
      const status = r.status || 'Completed';
      const cls = status.toLowerCase() === 'completed' ? 'completed' : 'active';
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${r.customer_name||'—'}</td><td>${r.license_plate||'—'}</td><td>${(r.created_at||'').slice(0,10)}</td><td>${r.days||'—'}</td><td>${fmt(r.total)}</td><td><span class="status-pill ${cls}">${status}</span></td>`;
      tbody.appendChild(tr);
    });
  }

  /* ===== SCHEDULE ===== */
  function renderSchedule() {
    const container = q('scheduleGrid');
    // build 7-day window
    const days = Array.from({length:7}, (_,i) => {
      const d = new Date(Date.now() + i * 86400000);
      return d.toISOString().slice(0,10);
    });

    let html = '<table class="sched-table"><thead><tr><th>Vehicle</th>';
    days.forEach(d => { html += `<th>${d.slice(5)}</th>`; });
    html += '</tr></thead><tbody>';

    FLEET.forEach(car => {
      html += `<tr><td><strong>${car.brand} ${car.model}</strong><br/><small>${car.plate}</small></td>`;
      days.forEach(day => {
        // find any rental overlapping this day for this plate
        const rental = allRentals.find(r => {
          if ((r.license_plate||'').toUpperCase() !== car.plate.toUpperCase()) return false;
          const rp = (r.pickup_date || r.created_at||'').slice(0,10);
          const rr = r.return_date || rp;
          return day >= rp && day <= rr;
        });
        let cls = 'available', label = 'Free';
        if (rental) {
          const today10 = new Date().toISOString().slice(0,10);
          const rr = rental.return_date || rental.created_at?.slice(0,10);
          if (rr && rr < today10) { cls='overdue'; label='Overdue'; }
          else { cls='booked'; label=rental.customer_name?.split(' ')[0]||'Booked'; }
        }
        html += `<td><div class="sched-cell ${cls}">${label}</div></td>`;
      });
      html += '</tr>';
    });

    html += '</tbody></table>';
    container.innerHTML = html;
  }

  /* ===== FLEET CARDS ===== */
  function renderFleet() {
    const grid = q('fleetGrid');
    grid.innerHTML = FLEET.map(car => {
      const sc = car.status === 'available' ? 'completed' : car.status === 'booked' ? 'active' : 'overdue';
      return `
        <div class="fleet-card">
          <img src="${car.img}" alt="${car.model}" loading="lazy"/>
          <div class="fleet-meta">
            <h4>${car.brand} ${car.model}</h4>
            <p>${car.category} · <code>${car.plate}</code></p>
            <div class="fleet-status">
              <span class="status-pill ${sc}">${car.status.charAt(0).toUpperCase()+car.status.slice(1)}</span>
              <button class="btn-ghost-sm" onclick="showToast('Book ${car.plate} — use New Rental')">Book</button>
            </div>
          </div>
        </div>`;
    }).join('');
  }

  /* ===== BOOKING LINKS ===== */
  function renderBookingLinks() {
    q('copyLinkBtn').onclick = () => {
      navigator.clipboard.writeText(q('bookingUrl').value).then(() => showToast('Link copied!'));
    };
    const loyalDiv = q('loyalList');
    loyalDiv.innerHTML = LOYAL.map(c => `
      <div class="loyal-row">
        <div class="loyal-avatar">${c.name[0]}</div>
        <div><div style="font-weight:600">${c.name}</div><div class="muted" style="font-size:11px">${c.rentals} rentals</div></div>
        <button class="btn-ghost-sm" style="margin-left:auto" onclick="showToast('Sending booking link to ${c.name}…')">Send Link</button>
      </div>`).join('');
  }

  /* ===== EARNINGS CHART ===== */
  let earningsChart = null;
  function renderEarningsChart() {
    const ctx = q('earningsChart');
    if (!ctx) return;
    if (earningsChart) earningsChart.destroy();
    // aggregate monthly data from rentals + fake historical
    const months = ['Oct','Nov','Dec','Jan','Feb','Mar'];
    const mock   = [820, 1140, 960, 1350, 1820, 0];
    const curMonth = new Date().toISOString().slice(0,7);
    mock[5] = allRentals.filter(r=>(r.created_at||'').slice(0,7)===curMonth).reduce((a,r)=>a+(r.total||0),0) || 416;
    earningsChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: months,
        datasets: [{
          label: 'Revenue ($)',
          data: mock,
          backgroundColor: 'rgba(0,240,255,0.5)',
          borderColor: 'rgba(0,240,255,1)',
          borderWidth: 2,
          borderRadius: 8,
          hoverBackgroundColor: 'rgba(255,0,234,0.7)',
        }]
      },
      options: {
        responsive: true,
        plugins: { legend:{ labels:{ color:'#7a8aaa', font:{ family:'Poppins', size:12 } } } },
        scales: {
          x: { ticks:{color:'#7a8aaa'}, grid:{color:'rgba(0,240,255,0.06)'} },
          y: { ticks:{color:'#7a8aaa', callback: v=>'$'+v}, grid:{color:'rgba(0,240,255,0.08)'} }
        }
      }
    });
  }

  /* ===== BOOT ===== */
  renderFleet();
  loadAll();
  renderBookingLinks();
  renderSchedule();
  updateTotals();
})();
