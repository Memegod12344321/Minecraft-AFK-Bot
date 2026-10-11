const mineflayer = require('mineflayer');
const config = require('./config.json');

let bot;
let reconnectTimer;
let movementTimer;
let reconnecting = false;
let movementPhase = 0;

const STEP_INTERVAL = 1500;
const JUMP_DURATION = 500;

function connect() {
  console.log(`Connecting to ${config.serverHost}:${config.serverPort} as ${config.botUsername}...`);

  bot = mineflayer.createBot({
    host: config.serverHost,
    port: Number(config.serverPort),
    username: config.botUsername,
    auth: config.auth?.mode === 'microsoft' ? 'microsoft' : 'offline',
    version: config.version || false,
    viewDistance: Number(config.botChunk) || 1
  });

  bot.on('spawn', () => {
    reconnecting = false;
    console.log(`✅ ${config.botUsername} connected to MemeGodSMP!`);

    // Optional AuthMe support. Enable it in config.json only if your server requires it.
    const authMe = config.authMe || {};
    if (authMe.enabled && authMe.password) {
      setTimeout(() => {
        if (!bot || !bot.entity) return;
        const command = authMe.register
          ? `/register ${authMe.password} ${authMe.password}`
          : `/login ${authMe.password}`;
        bot.chat(command);
      }, 1500);
    }

    setTimeout(() => {
      if (bot && bot.entity) bot.setControlState('sneak', true);
    }, 3000);

    clearTimeout(movementTimer);
    movementTimer = setTimeout(movementCycle, STEP_INTERVAL);
  });

  bot.on('kicked', reason => console.log('⚠️ Kicked:', reason));
  bot.on('error', err => console.error('⚠️ Bot error:', err.message || err));
  bot.on('end', () => {
    console.log('⛔ Bot disconnected.');
    clearTimeout(movementTimer);
    if (config.autoReconnect && !reconnecting) {
      reconnecting = true;
      clearTimeout(reconnectTimer);
      const delay = Number(config.reconnectDelayMs) || 10000;
      console.log(`Reconnecting in ${delay / 1000} seconds...`);
      reconnectTimer = setTimeout(connect, delay);
    }
  });
}

function movementCycle() {
  if (!bot || !bot.entity) return;

  switch (movementPhase) {
    case 0:
      bot.setControlState('forward', true);
      bot.setControlState('back', false);
      bot.setControlState('jump', false);
      break;
    case 1:
      bot.setControlState('forward', false);
      bot.setControlState('back', true);
      bot.setControlState('jump', false);
      break;
    case 2:
      bot.setControlState('forward', false);
      bot.setControlState('back', false);
      bot.setControlState('jump', true);
      setTimeout(() => {
        if (bot && bot.entity) bot.setControlState('jump', false);
      }, JUMP_DURATION);
      break;
    default:
      bot.setControlState('forward', false);
      bot.setControlState('back', false);
      bot.setControlState('jump', false);
      break;
  }

  movementPhase = (movementPhase + 1) % 4;
  movementTimer = setTimeout(movementCycle, STEP_INTERVAL);
}

connect();
