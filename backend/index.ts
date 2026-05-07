import dotenv from 'dotenv';
dotenv.config();

import cors from 'cors';
import express from 'express';
import authRoutes from './src/routes/auth.routes';
import { getFirebaseAdminStatus } from './src/lib/firebaseAdmin';
import roleRoutes from './src/routes/role.routes';
import sheetRoutes from './src/routes/sheet.routes';
import studentRoutes from './src/routes/student.routes';
import { getGoogleIntegrationStatus } from './src/services/googleSheets';
import { getMailerConfigStatus } from './src/services/mailer';

const app = express();
const port = Number(process.env.PORT || 5000);

const parseAllowedOrigins = () => {
  const source = process.env.CORS_ORIGINS || process.env.FRONTEND_URL || '';
  return source
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
};

const allowedOrigins = parseAllowedOrigins();

app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error('CORS origin not allowed'));
    },
    credentials: true,
  }),
);

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/sheets', sheetRoutes);

app.get('/api/health', async (_req, res) => {
  const google = await getGoogleIntegrationStatus();
  const mailer = getMailerConfigStatus();
  const firebaseAuth = getFirebaseAdminStatus();

  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    corsOrigins: allowedOrigins,
    services: {
      mailer: {
        provider: mailer.provider,
        ready: mailer.ready,
        missing: mailer.missing,
      },
      firebaseAuth,
      googleSheets: {
        ready: google.ready,
        source: google.source,
        issue: google.issue,
      },
    },
  });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
