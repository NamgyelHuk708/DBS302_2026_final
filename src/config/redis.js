const Redis = require('ioredis');

let client;

async function connectRedis() {
  client = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD,
    retryStrategy: (times) => Math.min(times * 50, 2000),
    enableReadyCheck: true,
  });

  client.on('ready', () => console.log('✅ Redis connected'));
  client.on('error', (err) => console.error('Redis error:', err));
  return client;
}

function getRedis() {
  if (!client) throw new Error('Redis not connected');
  return client;
}

module.exports = { connectRedis, getRedis };
