// Mock environment variables
process.env.GARMIN_API_KEY = 'test-api-key';
process.env.CRON_SECRET = 'test-cron-secret';
process.env.TIMEZONE = 'America/New_York';
process.env.DATABASE_URL = 'postgresql://user:password@localhost:5432/testdb?sslmode=require';

// Mock fetch globally
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
  })
) as jest.Mock;

// Mock console methods to reduce test noise
const originalError = console.error;
beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation((...args) => {
    // Only log errors that aren't expected test noise
    if (!args.some(arg => 
      String(arg).includes('Error fetching') ||
      String(arg).includes('Failed to fetch') ||
      String(arg).includes('Error occurred while getting'))
    ) {
      originalError(...args);
    }
  });
});

afterAll(() => {
  jest.restoreAllMocks();
});