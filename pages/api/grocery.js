import connectDb from '../../lib/db';
import GroceryItem from '../../models/GroceryItem';

export default async function handler(req, res) {
  await connectDb();
  const { method } = req;

  switch (method) {
    case 'GET': {
      // List all grocery items
      try {
        const items = await GroceryItem.find().sort({ name: 1 });
        res.status(200).json({ items });
      } catch (err) {
        res.status(500).json({ error: 'Failed to fetch grocery items' });
      }
      break;
    }
    case 'POST': {
      // Add new grocery item
      try {
        const item = new GroceryItem(req.body);
        await item.save();
        res.status(201).json({ item });
      } catch (err) {
        res.status(400).json({ error: err.message || 'Failed to add grocery item' });
      }
      break;
    }
    case 'PUT': {
      // Update grocery item by id
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: 'Missing item id' });
      try {
        const item = await GroceryItem.findByIdAndUpdate(id, req.body, { new: true });
        if (!item) return res.status(404).json({ error: 'Item not found' });
        res.status(200).json({ item });
      } catch (err) {
        res.status(400).json({ error: err.message || 'Failed to update item' });
      }
      break;
    }
    case 'DELETE': {
      // Delete grocery item by id
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: 'Missing item id' });
      try {
        const item = await GroceryItem.findByIdAndDelete(id);
        if (!item) return res.status(404).json({ error: 'Item not found' });
        res.status(200).json({ message: 'Item deleted' });
      } catch (err) {
        res.status(400).json({ error: err.message || 'Failed to delete item' });
      }
      break;
    }
    default: {
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
      res.status(405).json({ error: `Method ${method} not allowed` });
    }
  }
} 