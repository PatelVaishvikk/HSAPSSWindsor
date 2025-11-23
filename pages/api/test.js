/**
 * Simple Test API to check if the app is working
 * GET: Returns basic status
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Test basic functionality
    const status = {
      server: 'running',
      timestamp: new Date().toISOString(),
      message: 'API is working correctly'
    };

    return res.status(200).json(status);
  } catch (error) {
    console.error('Test API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
