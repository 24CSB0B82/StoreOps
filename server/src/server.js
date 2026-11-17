const app = require('./app');
const { testConnection } = require('./config/db');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Test initial database connection
    const dbStatus = await testConnection();
    if (dbStatus.connected) {
      console.log(`[Database] PostgreSQL connected successfully to "${dbStatus.database}".`);
    } else {
      console.warn(`[Database] Warning: PostgreSQL not yet connected: ${dbStatus.error}`);
    }

    const server = app.listen(PORT, () => {
      console.log(`[StoreOps Server] Running on http://localhost:${PORT}`);
      console.log(`[StoreOps API] Health endpoint at http://localhost:${PORT}/api/v1/health`);
    });

    // Graceful shutdown handling
    const gracefulShutdown = () => {
      console.log('\n[StoreOps Server] Received termination signal. Shutting down gracefully...');
      server.close(() => {
        console.log('[StoreOps Server] HTTP server closed.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);
  } catch (error) {
    console.error('[StoreOps Server] Fatal startup error:', error);
    process.exit(1);
  }
};

startServer();
