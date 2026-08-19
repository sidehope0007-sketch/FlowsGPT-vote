const express = require('express');
const bot = require('./bot');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Render UptimeRobot Health Check Endpoint
app.get('/', (req, res) => {
  res.status(200).send("Telegram Vote Bot is running actively!");
});

// Start Express Server
app.listen(PORT, () => {
  console.log(`🌐 Web server is listening on port ${PORT}`);
});

// Start Bot (Long Polling)
bot.launch().then(() => {
  console.log('🤖 Telegram Bot started securely!');
});

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));