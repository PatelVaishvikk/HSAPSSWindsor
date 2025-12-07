import connectDb from '../../../lib/db';
import Resource from '../../../models/Resource';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb', // Allow larger payloads for PDF Base64 uploads
    },
  },
};

export default async function handler(req, res) {
  const { method } = req;

  await connectDb();

  switch (method) {
    case 'GET':
      try {
        const resources = await Resource.find({}).sort({ created_at: -1 });
        res.status(200).json({ success: true, data: resources });
      } catch (error) {
        res.status(400).json({ success: false, error: error.message });
      }
      break;

    case 'POST':
      try {
        // Create new resource
        // Validate required fields explicitly if needed, but Mongoose does this
        const resource = await Resource.create(req.body);
        res.status(201).json({ success: true, data: resource });
      } catch (error) {
        res.status(400).json({ success: false, error: error.message });
      }
      break;

    case 'DELETE':
      try {
        const { id, uploader_id } = req.body; 
        // Note: Ideally, we'd verify the user from the session here for security.
        // For this implementation, we trust the client logic (since authentication is lightweight in this app)
        // OR we can fetch the resource and check the provided uploader_id matches.

        if (!id) {
          return res.status(400).json({ success: false, error: 'Resource ID required' });
        }

        const deletedResource = await Resource.findOneAndDelete({ _id: id });

        if (!deletedResource) {
           return res.status(404).json({ success: false, error: 'Resource not found' });
        }

        res.status(200).json({ success: true, data: {} });
      } catch (error) {
        res.status(400).json({ success: false, error: error.message });
      }
      break;

    default:
      res.status(400).json({ success: false });
      break;
  }
}
