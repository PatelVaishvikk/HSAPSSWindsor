import connectDb from '../../lib/db';
import SabhaGrocery from '../../models/SabhaGrocery';

export default async function handler(req, res) {
  await connectDb();
  const { method } = req;

  switch (method) {
    case 'GET': {
      // List all sabha grocery records
      try {
        const records = await SabhaGrocery.find().sort({ date: -1 });
        res.status(200).json({ records });
      } catch (err) {
        res.status(500).json({ error: 'Failed to fetch sabha records' });
      }
      break;
    }
    case 'POST': {
      // Add new sabha record
      try {
        const record = new SabhaGrocery(req.body);
        await record.save();
        res.status(201).json({ record });
      } catch (err) {
        res.status(400).json({ error: err.message || 'Failed to add sabha record' });
      }
      break;
    }
    case 'DELETE': {
      // Delete sabha record by id
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: 'Missing record id' });
      try {
        const record = await SabhaGrocery.findByIdAndDelete(id);
        if (!record) return res.status(404).json({ error: 'Record not found' });
        res.status(200).json({ message: 'Record deleted' });
      } catch (err) {
        res.status(400).json({ error: err.message || 'Failed to delete record' });
      }
      break;
    }
    default: {
      res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
      res.status(405).json({ error: `Method ${method} not allowed` });
    }
  }
} 