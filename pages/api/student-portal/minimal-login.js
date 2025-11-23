export default async function handler(req, res) {
  console.log('[MINIMAL-LOGIN] Request received');
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { phone, password } = req.body || {};
    
    console.log('[MINIMAL-LOGIN] Phone:', phone);
    console.log('[MINIMAL-LOGIN] Password:', password ? '***' : 'missing');
    
    // Just return success for ANY login attempt
    return res.status(200).json({
      student: {
        _id: 'test-id',
        first_name: 'Test',
        last_name: 'User',
        phone: phone
      },
      meta: {
        has_custom_password: false,
        used_default_password: true,
        can_access_admin: false,
        admin_shortcuts: []
      }
    });
  } catch (error) {
    console.error('[MINIMAL-LOGIN] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
