// Test env: point at the dedicated test database before any module loads db.js.
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ||
  'postgresql://preethi@localhost:5432/globalvbc_test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.NODE_ENV = 'test';
