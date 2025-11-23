export default async function handler(req, res) {
  console.log('[PING] Request received');
  return res.status(200).json({ message: 'pong', timestamp: new Date().toISOString() });
}
