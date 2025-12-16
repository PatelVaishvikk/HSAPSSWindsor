import connectDb from '../../lib/db';
import GroceryItem from '../../models/GroceryItem';
import { requireAdmin } from '../../lib/adminRoute.js';

export default async function handler(req, res) {
  if (!requireAdmin(req, res)) {
    return;
  }
  await connectDb();
  const { method } = req;

  switch (method) {
    case 'GET': {
      // List all grocery items
      try {
        const { isSuper, mandal } = req.adminRights;
        const filter = {};
        if (!isSuper) {
             if (mandal) {
                 filter.mandal = mandal;
             } else {
                 return res.status(200).json({ items: [] });
             }
        }
        const items = await GroceryItem.find(filter).sort({ name: 1 });
        res.status(200).json({ items });
      } catch (err) {
        res.status(500).json({ error: 'Failed to fetch grocery items' });
      }
      break;
    }
    case 'POST': {
      // Add new grocery item
      try {
        const { isSuper, mandal } = req.adminRights;
        const data = req.body;
        
        // Enforce Mandal
        if (!isSuper) {
             if (!mandal) return res.status(403).json({ error: 'No Mandal assigned' });
             data.mandal = mandal;
        } else {
             if (!data.mandal) data.mandal = 'Windsor';
        }

        const item = new GroceryItem(data);
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
        const { isSuper, mandal } = req.adminRights;
        const item = await GroceryItem.findById(id);
        if (!item) return res.status(404).json({ error: 'Item not found' });

        if (!isSuper) {
             if (!mandal || item.mandal !== mandal) {
                 return res.status(403).json({ error: 'Unauthorized to update this item' });
             }
        }

        const updated = await GroceryItem.findByIdAndUpdate(id, req.body, { new: true });
        res.status(200).json({ item: updated });
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
        const { isSuper, mandal } = req.adminRights;
        const item = await GroceryItem.findById(id);
        if (!item) return res.status(404).json({ error: 'Item not found' });
        
        if (!isSuper) {
             if (!mandal || item.mandal !== mandal) {
                 return res.status(403).json({ error: 'Unauthorized to delete this item' });
             }
        }

        await GroceryItem.findByIdAndDelete(id);
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
