import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import * as dotenv from 'dotenv';

import memberRoutes from './routes/members';
import { automateMeetingStatuses } from './services/statusAutomator';
import logger from './utils/logger';

import { errorHandler } from './middleware/errorHandler';

import * as path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

const app = express();
const port = process.env.PORT || 3001;

app.use(helmet());
app.use(cors());
app.use(express.json());

// Run automation once on start, and every 10 minutes
automateMeetingStatuses();
setInterval(automateMeetingStatuses, 10 * 60 * 1000);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/members', memberRoutes);

// Global Error Handler - Must be last
app.use(errorHandler);

app.listen(port, () => {
  logger.info(`🚀 Server is running on port ${port} in ${process.env.NODE_ENV || 'development'} mode`);
});
