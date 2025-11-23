import { createPortalTokens } from './lib/portalSession.js';

async function testTokens() {
  console.log('Testing token creation...');
  try {
    const studentId = '680da10c6a7b047db058465b';
    console.log('Creating tokens for student:', studentId);
    const tokens = await createPortalTokens(studentId);
    console.log('Success! Tokens:', tokens);
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

testTokens();
