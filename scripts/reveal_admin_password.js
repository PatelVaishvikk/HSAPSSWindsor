import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// specific path to .env in root
dotenv.config({ path: path.join(__dirname, '../.env') });

console.log('Admin Password:', process.env.ADMIN_PASSWORD);
