const app = require('./app');
const { connectMongo } = require('./config/mongo');
const { connectRedis } = require('./config/redis');

const PORT = process.env.PORT || 3000;

async function start() {
  await connectMongo();
  await connectRedis();
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

start().catch(console.error);
