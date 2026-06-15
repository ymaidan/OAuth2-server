import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { DB_PATH } from '../src/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbFile = path.resolve(__dirname, '..', DB_PATH);

if (fs.existsSync(dbFile)) {
  fs.unlinkSync(dbFile);
  console.log(`Deleted ${DB_PATH}`);
}

console.log('Database reset. Start the servers to recreate and seed users.');
