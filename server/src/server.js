import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Routes & Middleware
import clinicRouter from './routes/clinic.routes.js';
import queueRouter from './routes/queue.routes.js';
import analyticsRouter from './routes/analytics.routes.js';
import { registerSocketHandlers } from './socket/socketHandler.js';
import { errorHandler } from './middleware/errorHandler.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);

// Enable Socket.IO with connectionStateRecovery for automatic offline sync
const io = new Server(httpServer, {
  cors: {
    origin: '*', // Allow all origins for dev/demo simplicity
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
  connectionStateRecovery: {
    // Max recovery duration (default 2 minutes)
    maxDisconnectionDuration: 2 * 60 * 1000,
    // Whether to skip middle events if client disconnected
    skipMiddlewares: true,
  }
});

// Expose io in app
app.set('io', io);

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/clinic', clinicRouter);
app.use('/api/queue', queueRouter);
app.use('/api/analytics', analyticsRouter);

// Root route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'QueueCure SmartReturn Backend is running' });
});

// Serve frontend assets in production if requested, but for now we are in dev mode
app.use(express.static(path.join(__dirname, '../../client/dist')));

// Error Handler
app.use(errorHandler);

// Database Connection & Server Startup
const PORT = process.env.PORT || 5000;
let MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/queuecure';

async function connectWithFallback() {
  try {
    // Attempt standard connection
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB database successfully.');
  } catch (error) {
    // If it fails and it's pointing to localhost/127.0.0.1 in non-prod, try starting in-memory DB fallback
    if (process.env.NODE_ENV !== 'production' && (MONGODB_URI.includes('127.0.0.1') || MONGODB_URI.includes('localhost'))) {
      console.warn(`Local database connection failed: ${error.message}`);
      console.log('Attempting to spin up an in-memory MongoDB database fallback...');
      try {
        const { MongoMemoryServer } = await import('mongodb-memory-server');
        const mongod = await MongoMemoryServer.create({
          instance: {
            dbName: 'queuecure'
          }
        });
        const inMemoryUri = mongod.getUri();
        console.log(`In-memory MongoDB started successfully at: ${inMemoryUri}`);
        await mongoose.connect(inMemoryUri);
        console.log('Connected to in-memory MongoDB database successfully.');
        // Prevent garbage collection
        global.__mongod__ = mongod;
        return;
      } catch (fallbackError) {
        console.error('Failed to start/connect to in-memory MongoDB fallback:', fallbackError.message);
      }
    }
    
    // If we get here, connection failed and we couldn't fall back
    console.error('Database connection failed:', error.message);
    process.exit(1);
  }
}

connectWithFallback().then(() => {
  registerSocketHandlers(io);
  httpServer.listen(PORT, () => {
    console.log(`Backend server is running on port ${PORT}`);
  });
});

