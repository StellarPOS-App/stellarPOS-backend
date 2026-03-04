import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import compression from 'compression'
import { createServer } from 'http'
import { Server as SocketIOServer } from 'socket.io'
import rateLimit from 'express-rate-limit'

import { config } from '@/config/config'
import { logger } from '@/utils/logger'
import { connectDatabase } from '@/utils/database'
import { connectRedis } from '@/utils/redis'
import { setupQueues } from '@/utils/queue'

// Routes
import authRoutes from '@/routes/auth.routes'
import productRoutes from '@/routes/products.routes'
import transactionRoutes from '@/routes/transactions.routes'
import customerRoutes from '@/routes/customers.routes'
import paymentRoutes from '@/routes/payments.routes'
import analyticsRoutes from '@/routes/analytics.routes'

// Middleware
import { errorHandler } from '@/middleware/error.middleware'
import { notFoundHandler } from '@/middleware/notFound.middleware'

const app = express()
const server = createServer(app)
const io = new SocketIOServer(server, {
  cors: {
    origin: config.client.url,
    methods: ['GET', 'POST'],
  },
})

// Trust proxy for accurate IP addresses behind load balancer
app.set('trust proxy', 1)

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}))

// CORS configuration
app.use(cors({
  origin: config.client.url,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
})

app.use('/api', limiter)

// Body parsing middleware
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Compression middleware
app.use(compression())

// Logging middleware
app.use(morgan('combined', {
  stream: { write: (message) => logger.info(message.trim()) },
}))

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: config.env,
  })
})

// API routes
app.use('/api/v1/auth', authRoutes)
app.use('/api/v1/products', productRoutes)
app.use('/api/v1/transactions', transactionRoutes)
app.use('/api/v1/customers', customerRoutes)
app.use('/api/v1/payments', paymentRoutes)
app.use('/api/v1/analytics', analyticsRoutes)

// Socket.IO connection handling
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`)
  
  socket.on('join-organization', (organizationId: string) => {
    socket.join(`org-${organizationId}`)
    logger.info(`Socket ${socket.id} joined organization ${organizationId}`)
  })

  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`)
  })
})

// Make io instance available globally
declare global {
  var io: SocketIOServer
}
global.io = io

// Error handling middleware
app.use(notFoundHandler)
app.use(errorHandler)

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully')
  server.close(() => {
    logger.info('Process terminated')
  })
})

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully')
  server.close(() => {
    logger.info('Process terminated')
  })
})

// Start server
async function startServer() {
  try {
    // Connect to database
    await connectDatabase()
    logger.info('Database connected successfully')

    // Connect to Redis
    await connectRedis()
    logger.info('Redis connected successfully')

    // Setup job queues
    setupQueues()
    logger.info('Job queues initialized')

    // Start server
    server.listen(config.port, () => {
      logger.info(`Server running on port ${config.port} in ${config.env} mode`)
      logger.info(`Health check available at http://localhost:${config.port}/health`)
    })
  } catch (error) {
    logger.error('Failed to start server:', error)
    process.exit(1)
  }
}

// Start the server only if this file is run directly
if (require.main === module) {
  startServer()
}

export { app, server, io }// Server update 8
// Server update 16
// Server update 24
// Server update 32
// Server update 40
