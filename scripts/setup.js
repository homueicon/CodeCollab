const fs = require('fs');
const path = require('path');

console.log('');
console.log('=====================================');
console.log('  CodeCollab Post-Install Setup');
console.log('=====================================');
console.log('');

// Create uploads directory
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('✓ Created uploads directory');
} else {
  console.log('✓ Uploads directory already exists');
}

// Create .env file if it doesn't exist
const envPath = path.join(__dirname, '..', '.env');

if (!fs.existsSync(envPath)) {
  const envContent = `# PostgreSQL Database Configuration
DB_USER=postgres
DB_HOST=localhost
DB_NAME=codecollab
DB_PASSWORD=postgres
DB_PORT=5432

# JWT Secret Key (change this in production!)
JWT_SECRET=codecollab-secret-key-${Date.now()}

# Server Port
PORT=3001

# Node Environment
NODE_ENV=development
`;
  
  fs.writeFileSync(envPath, envContent);
  console.log('✓ Created .env file with default settings');
  console.log('');
  console.log('⚠️  IMPORTANT: Edit .env file with your PostgreSQL password!');
} else {
  console.log('✓ .env file already exists');
}

console.log('');
console.log('=====================================');
console.log('  Next Steps:');
console.log('=====================================');
console.log('');
console.log('1. Make sure PostgreSQL is installed and running');
console.log('2. Create database: psql -U postgres -c "CREATE DATABASE codecollab;"');
console.log('3. Edit .env file with your database credentials');
console.log('4. Run: npm start');
console.log('');