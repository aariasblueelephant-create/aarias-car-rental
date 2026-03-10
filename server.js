const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const PDFDocument = require('pdfkit');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(bodyParser.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const DB_FILE = path.join(__dirname, 'data.db');
const db = new sqlite3.Database(DB_FILE);

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS rentals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    receipt_number TEXT,
    created_at TEXT,
    employee_name TEXT,
    customer_name TEXT,
    passport_number TEXT,
    vehicle_brand TEXT,
    vehicle_model TEXT,
    category TEXT,
    license_plate TEXT,
    plate_confidence REAL,
    hotel_name TEXT,
    room_number TEXT,
    pickup_date TEXT,
    return_date TEXT,
    price_per_day REAL,
    days INTEGER,
    subtotal REAL,
    vat_rate REAL,
    vat_amount REAL,
    total REAL,
    payment_method TEXT,
    status TEXT
  )`);
  // add new columns to existing DBs without failing
  db.run(`ALTER TABLE rentals ADD COLUMN pickup_date TEXT`, () => {});
  db.run(`ALTER TABLE rentals ADD COLUMN return_date TEXT`, () => {});
});

app.get('/api/rentals', (req, res) => {
  db.all('SELECT * FROM rentals ORDER BY created_at DESC', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ rentals: rows });
  });
});

app.post('/api/rentals', (req, res) => {
  const r = req.body;
  const stmt = db.prepare(`INSERT INTO rentals (
    receipt_number, created_at, employee_name, customer_name, passport_number,
    vehicle_brand, vehicle_model, category, license_plate, plate_confidence,
    hotel_name, room_number, pickup_date, return_date,
    price_per_day, days, subtotal, vat_rate, vat_amount, total,
    payment_method, status
  ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);

  stmt.run(
    r.receiptNumber,
    r.createdAt,
    r.employee?.name || null,
    r.customer?.name || null,
    r.customer?.passportNumber || null,
    r.vehicle?.brand || null,
    r.vehicle?.model || null,
    r.vehicle?.category || null,
    r.vehicle?.licensePlate || null,
    r.vehicle?.plateOCRConfidence || null,
    r.hotel?.name || null,
    r.hotel?.room || null,
    r.pickupDate || null,
    r.returnDate || null,
    r.pricePerDay || null,
    r.days || null,
    r.subtotal || null,
    r.vatRate || null,
    r.vatAmount || null,
    r.total || null,
    r.paymentMethod || null,
    r.status || null,
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
    }
  );
});

// Check availability / conflicts for a plate + date range
app.get('/api/availability', (req, res) => {
  const { plate, pickup, returnDate } = req.query;
  if (!plate || !pickup || !returnDate) return res.status(400).json({ error: 'plate, pickup, returnDate required' });
  db.all(
    `SELECT * FROM rentals
     WHERE UPPER(license_plate) = UPPER(?)
       AND status != 'Completed'
       AND pickup_date <= ? AND return_date >= ?`,
    [plate, returnDate, pickup],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ conflicts: rows });
    }
  );
});

app.get('/api/reports/daily', (req, res) => {
  const date = req.query.date || new Date().toISOString().slice(0, 10);
  db.get(
    `SELECT date(created_at) as day, SUM(total) as revenue, COUNT(*) as rentals FROM rentals WHERE date(created_at) = ?`,
    [date],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ date, ...row });
    }
  );
});

// Monthly report
app.get('/api/reports/monthly', (req, res) => {
  const month = req.query.month || new Date().toISOString().slice(0, 7);
  db.get(
    `SELECT SUM(total) as revenue, COUNT(*) as rentals FROM rentals WHERE substr(created_at,1,7) = ?`,
    [month],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ month, ...row });
    }
  );
});

// Category breakdown report
app.get('/api/reports/categories', (req, res) => {
  db.all(
    `SELECT category, COUNT(*) as count, SUM(total) as revenue FROM rentals GROUP BY category ORDER BY revenue DESC`,
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ categories: rows });
    }
  );
});

// Update rental status (mark returned, overdue, etc.)
app.patch('/api/rentals/:id/status', (req, res) => {
  const { status } = req.body;
  const allowed = ['Active', 'Completed', 'Overdue', 'Cancelled'];
  if (!status || !allowed.includes(status)) {
    return res.status(400).json({ error: 'Status must be one of: ' + allowed.join(', ') });
  }
  db.run('UPDATE rentals SET status = ? WHERE id = ?', [status, req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Rental not found' });
    res.json({ updated: true });
  });
});

// Server-side A5 receipt PDF
app.get('/api/rentals/:id/receipt', (req, res) => {
  db.get('SELECT * FROM rentals WHERE id = ?', [req.params.id], (err, r) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!r) return res.status(404).json({ error: 'Rental not found' });

    const doc = new PDFDocument({ size: 'A5', margin: 30 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="receipt-${r.receipt_number || r.id}.pdf"`);
    doc.pipe(res);

    // Header
    doc.fontSize(18).fillColor('#00b8cc').text('Aarias Car Rental', { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(9).fillColor('#666').text('Professional Rental Receipt', { align: 'center' });
    doc.moveDown(0.5);
    doc.moveTo(30, doc.y).lineTo(388, doc.y).strokeColor('#ddd').stroke();
    doc.moveDown(0.5);

    // Receipt info
    doc.fontSize(10).fillColor('#333');
    doc.text(`Receipt #: ${r.receipt_number || 'N/A'}`, { continued: true });
    doc.text(`   Date: ${(r.created_at || '').slice(0, 10)}`, { align: 'right' });
    doc.moveDown(0.8);

    // Customer info
    doc.fontSize(11).fillColor('#00b8cc').text('Customer Details');
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor('#333');
    doc.text(`Name: ${r.customer_name || 'N/A'}`);
    if (r.passport_number) doc.text(`Passport/ID: •••${r.passport_number.slice(-3)}`);
    if (r.hotel_name) doc.text(`Hotel: ${r.hotel_name}${r.room_number ? ' / Room ' + r.room_number : ''}`);
    doc.moveDown(0.5);

    // Vehicle info
    doc.fontSize(11).fillColor('#00b8cc').text('Vehicle Details');
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor('#333');
    doc.text(`Plate: ${r.license_plate || 'N/A'}`);
    doc.text(`Category: ${r.category || 'N/A'}`);
    if (r.vehicle_brand) doc.text(`Vehicle: ${r.vehicle_brand} ${r.vehicle_model || ''}`);
    if (r.pickup_date) doc.text(`Pickup: ${r.pickup_date}   Return: ${r.return_date || 'TBD'}`);
    doc.moveDown(0.5);

    // Pricing
    doc.moveTo(30, doc.y).lineTo(388, doc.y).strokeColor('#ddd').stroke();
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor('#333');
    doc.text(`Price/Day: $${(r.price_per_day || 0).toFixed(2)}   x   ${r.days || 0} days`);
    doc.text(`Subtotal: $${(r.subtotal || 0).toFixed(2)}`);
    doc.text(`VAT (${Math.round((r.vat_rate || 0) * 100)}%): $${(r.vat_amount || 0).toFixed(2)}`);
    doc.moveDown(0.3);
    doc.fontSize(14).fillColor('#00b8cc').text(`Total: $${(r.total || 0).toFixed(2)}`, { align: 'right' });
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor('#333').text(`Payment: ${r.payment_method || 'N/A'}`, { align: 'right' });
    doc.moveDown(1);

    // Footer
    doc.moveTo(30, doc.y).lineTo(388, doc.y).strokeColor('#ddd').stroke();
    doc.moveDown(0.5);
    doc.fontSize(9).fillColor('#888').text('Thank you for renting with Aarias!', { align: 'center' });
    doc.text('Powered by Aarias Car Rental Management System', { align: 'center' });

    doc.end();
  });
});

// 404 handler for unknown API routes
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

app.listen(PORT, () => console.log(`Server listening at http://localhost:${PORT}`));
