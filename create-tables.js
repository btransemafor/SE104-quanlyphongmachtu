const { Pool } = require('pg');
require('dotenv').config({ path: './config.env' });

const pool = new Pool({
  connectionString: process.env.DB_URL,
  ssl: { rejectUnauthorized: false }
});

async function createTables() {
  try {
    console.log('Creating tables in Neon PostgreSQL...');
    
    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'receptionist', 'doctor')),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Created users table');
    
    // Create patients table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS patients (
        id SERIAL PRIMARY KEY,
        full_name VARCHAR(100) NOT NULL,
        gender VARCHAR(10) NOT NULL CHECK (gender IN ('Nam', 'Nữ')),
        birth_year INTEGER NOT NULL,
        address TEXT,
        phone_number VARCHAR(15) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Created patients table');
    
    // Create medicines table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS medicines (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        unit VARCHAR(20) NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Created medicines table');
    
    // Create diseases table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS diseases (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Created diseases table');
    
    // Create units table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS units (
        id SERIAL PRIMARY KEY,
        name VARCHAR(20) NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Created units table');
    
    // Create usage_methods table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS usage_methods (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Created usage_methods table');
    
    // Create medical_records table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS medical_records (
        id SERIAL PRIMARY KEY,
        patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
        doctor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        symptoms TEXT NOT NULL,
        disease_id INTEGER REFERENCES diseases(id) ON DELETE SET NULL,
        diagnosis TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Created medical_records table');
    
    // Create prescription_details table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS prescription_details (
        id SERIAL PRIMARY KEY,
        medical_record_id INTEGER REFERENCES medical_records(id) ON DELETE CASCADE,
        medicine_id INTEGER REFERENCES medicines(id) ON DELETE CASCADE,
        quantity INTEGER NOT NULL CHECK (quantity > 0),
        usage_method_id INTEGER REFERENCES usage_methods(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Created prescription_details table');
    
    // Create daily_appointments table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS daily_appointments (
        id SERIAL PRIMARY KEY,
        patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
        appointment_date DATE NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'examined', 'completed')),
        medical_record_id INTEGER REFERENCES medical_records(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Created daily_appointments table');
    
    // Create invoices table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS invoices (
        id SERIAL PRIMARY KEY,
        patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
        medical_record_id INTEGER REFERENCES medical_records(id) ON DELETE CASCADE,
        daily_appointment_id INTEGER REFERENCES daily_appointments(id) ON DELETE CASCADE,
        consultation_fee DECIMAL(10,2) NOT NULL,
        medicine_fee DECIMAL(10,2) NOT NULL,
        total_amount DECIMAL(10,2) NOT NULL,
        payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Created invoices table');
    
    // Create system_settings table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        id SERIAL PRIMARY KEY,
        setting_key VARCHAR(50) UNIQUE NOT NULL,
        setting_value TEXT NOT NULL,
        description TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Created system_settings table');
    
    // Insert default data
    console.log('\n📝 Inserting default data...');
    
    // Insert default users
    await pool.query(`
      INSERT INTO users (username, password, role) VALUES 
      ('admin', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin'),
      ('receptionist1', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'receptionist'),
      ('doctor1', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'doctor')
      ON CONFLICT (username) DO NOTHING
    `);
    console.log('✅ Inserted default users');
    
    // Insert default units
    await pool.query(`
      INSERT INTO units (name) VALUES 
      ('viên'), ('chai'), ('tuýp'), ('gói'), ('ml'), ('mg')
      ON CONFLICT DO NOTHING
    `);
    console.log('✅ Inserted default units');
    
    // Insert default usage methods
    await pool.query(`
      INSERT INTO usage_methods (name) VALUES 
      ('Uống sau bữa ăn'), ('Uống trước bữa ăn'), ('Uống khi đói'), 
      ('Bôi ngoài da'), ('Nhỏ mắt'), ('Nhỏ mũi'), ('Tiêm bắp'), ('Tiêm tĩnh mạch')
      ON CONFLICT DO NOTHING
    `);
    console.log('✅ Inserted default usage methods');
    
    // Insert default diseases
    await pool.query(`
      INSERT INTO diseases (name, description) VALUES 
      ('Cảm cúm', 'Bệnh do virus gây ra với các triệu chứng sốt, ho, đau đầu'),
      ('Viêm họng', 'Tình trạng viêm nhiễm ở vùng họng'),
      ('Đau dạ dày', 'Các vấn đề về tiêu hóa và dạ dày'),
      ('Cao huyết áp', 'Tình trạng huyết áp cao hơn bình thường'),
      ('Tiểu đường', 'Rối loạn chuyển hóa glucose trong máu')
      ON CONFLICT DO NOTHING
    `);
    console.log('✅ Inserted default diseases');
    
    // Insert default medicines
    await pool.query(`
      INSERT INTO medicines (name, unit, price) VALUES 
      ('Paracetamol 500mg', 'viên', 2000),
      ('Amoxicillin 500mg', 'viên', 5000),
      ('Omeprazole 20mg', 'viên', 3000),
      ('Metformin 500mg', 'viên', 4000),
      ('Lisinopril 10mg', 'viên', 6000),
      ('Vitamin C 1000mg', 'viên', 1500)
      ON CONFLICT DO NOTHING
    `);
    console.log('✅ Inserted default medicines');
    
    // Insert system settings
    await pool.query(`
      INSERT INTO system_settings (setting_key, setting_value, description) VALUES 
      ('max_patients_per_day', '50', 'Số lượng bệnh nhân tối đa trong một ngày'),
      ('consultation_fee', '100000', 'Phí khám bệnh mặc định (VND)')
      ON CONFLICT (setting_key) DO NOTHING
    `);
    console.log('✅ Inserted system settings');
    
    console.log('\n🎉 Database setup completed successfully!');
    
    // Test the setup
    const usersCount = await pool.query('SELECT COUNT(*) as count FROM users');
    const patientsCount = await pool.query('SELECT COUNT(*) as count FROM patients');
    const medicinesCount = await pool.query('SELECT COUNT(*) as count FROM medicines');
    
    console.log('\n📊 Database Summary:');
    console.log(`   Users: ${usersCount.rows[0].count}`);
    console.log(`   Patients: ${patientsCount.rows[0].count}`);
    console.log(`   Medicines: ${medicinesCount.rows[0].count}`);
    
  } catch (error) {
    console.error('❌ Error creating tables:', error.message);
  } finally {
    await pool.end();
  }
}

createTables();
