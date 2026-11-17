const express = require('express');
const { testConnection } = require('../config/db');
const { sendSuccess } = require('../utils/apiResponse');

const router = express.Router();

router.get('/health', async (req, res, next) => {
  try {
    const dbStatus = await testConnection();

    const healthData = {
      status: 'UP',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      database: dbStatus.connected
        ? {
            status: 'CONNECTED',
            database: dbStatus.database,
            time: dbStatus.time,
          }
        : {
            status: 'DISCONNECTED',
            error: dbStatus.error,
          },
    };

    return sendSuccess(res, 'StoreOps API is healthy', healthData);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
