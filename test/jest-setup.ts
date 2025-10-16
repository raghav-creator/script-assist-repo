// Setup file for tests
// This file is executed before running tests

// Mock environment variables
process.env.NODE_ENV = 'test';

process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_USERNAME = 'postgres';
process.env.DB_PASSWORD = 'postgres';
process.env.DB_DATABASE = 'taskflow_test'; 
jest.setTimeout(30000);
process.env.JWT_SECRET = 'test_secret';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret';