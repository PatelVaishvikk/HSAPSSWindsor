import Twilio from 'twilio';

const sanitizeDigits = (value = '') => value.replace(/[^0-9+]/g, '');

const normalisePhoneNumber = (input) => {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('+')) {
    const digits = sanitizeDigits(trimmed);
    return digits.startsWith('+') ? digits : `+${digits}`;
  }

  const digitsOnly = sanitizeDigits(trimmed).replace(/^\+/, '');
  if (!digitsOnly) return null;

  if (digitsOnly.length === 10) {
    return `+1${digitsOnly}`;
  }

  if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
    return `+${digitsOnly}`;
  }

  return `+${digitsOnly}`;
};

let twilioClient = null;

const getTwilioClient = () => {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN } = process.env;
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    return null;
  }
  if (!twilioClient) {
    twilioClient = Twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
  }
  return twilioClient;
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  const { message, recipients } = req.body || {};

  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'Message body is required.' });
  }

  if (!Array.isArray(recipients) || recipients.length === 0) {
    return res.status(400).json({ error: 'At least one recipient is required.' });
  }

  const formattedRecipients = recipients
    .map((recipient) => {
      const normalised = normalisePhoneNumber(recipient?.phone);
      if (!normalised) {
        return null;
      }
      return {
        phone: normalised,
        studentId: recipient?.studentId || null,
        name: recipient?.name || '',
      };
    })
    .filter(Boolean);

  if (formattedRecipients.length === 0) {
    return res.status(400).json({ error: 'None of the recipients have valid phone numbers.' });
  }

  const fromNumber = process.env.TWILIO_WHATSAPP_FROM;
  if (!fromNumber) {
    return res.status(501).json({
      error:
        'Server-side WhatsApp messaging is not configured. Please set TWILIO_WHATSAPP_FROM, TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.',
    });
  }

  const client = getTwilioClient();
  if (!client) {
    return res.status(501).json({
      error:
        'Twilio credentials are missing. Please configure TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.',
    });
  }

  const results = [];

  for (const recipient of formattedRecipients) {
    try {
      const response = await client.messages.create({
        body: message.trim(),
        from: `whatsapp:${fromNumber}`,
        to: `whatsapp:${recipient.phone}`,
      });
      results.push({
        success: true,
        sid: response.sid,
        phone: recipient.phone,
        studentId: recipient.studentId,
      });
    } catch (error) {
      results.push({
        success: false,
        phone: recipient.phone,
        studentId: recipient.studentId,
        error: error?.message || 'Failed to send message',
      });
    }
  }

  const successCount = results.filter((item) => item.success).length;
  const failureDetails = results.filter((item) => !item.success);

  return res.status(200).json({
    successCount,
    failureCount: failureDetails.length,
    failures: failureDetails,
  });
}

