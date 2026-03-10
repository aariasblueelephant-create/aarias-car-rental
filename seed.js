const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const DB_FILE = path.join(__dirname, 'data.db');
if (fs.existsSync(DB_FILE)) {
  fs.unlinkSync(DB_FILE);
  console.log('Removed old database');
}

const db = new sqlite3.Database(DB_FILE);

db.serialize(() => {
  db.run(`CREATE TABLE rentals (
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

  const mockFile = path.join(__dirname, 'public', 'mock-rentals.json');
  let mock = { rentals: [] };
  if (fs.existsSync(mockFile)) {
    mock = JSON.parse(fs.readFileSync(mockFile, 'utf8'));
  }

  const stmt = db.prepare(`INSERT INTO rentals (
    receipt_number, created_at, employee_name, customer_name, passport_number,
    vehicle_brand, vehicle_model, category, license_plate, plate_confidence,
    hotel_name, room_number, pickup_date, return_date,
    price_per_day, days, subtotal, vat_rate, vat_amount, total,
    payment_method, status
  ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);

  for (const r of mock.rentals) {
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
      r.status || null
    );
  }

  stmt.finalize(() => {
    console.log('Seed complete. Inserted', mock.rentals.length, 'rentals');
    db.close();
  });
});
