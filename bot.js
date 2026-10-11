const mineflayer = require('mineflayer');
const config = require('./config.json');

let bot;
let reconnectTimer;
let movementTimer;
let reconnecting = false;

function stopMovement() {
  if (!bot) return;
  for (const control of ['forward', 'back', 'left', 'right', 'jump', 'sprint', 'sneak']) {
    bot.setControlState(control, false);
  }
}

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

    clearTimeout(movementTimer);
    movementTimer = setTimeout(movementCycle, 1000);
  });

  bot.on('kicked', reason => console.log('⚠️ Kicked:', reason));
  bot.on('error', err => console.error('⚠️ Bot error:', err.message || err));
  bot.on('end', () => {
    console.log('⛔ Bot disconnected.');
    clearTimeout(movementTimer);
    stopMovement();

    if (config.autoReconnect && !reconnecting) {
      reconnecting = true;
      clearTimeout(reconnectTimer);
      const delay = Number(config.reconnectDelayMs) || 10000;
      console.log(`Reconnecting in ${delay / 1000} seconds...`);
      reconnectTimer = setTimeout(connect, delay);
    }
  });
}

// Vary walking, strafing, turning, pausing, and jumping so the bot
// does not repeat the same forward/back/jump pattern every few seconds.
function movementCycle() {
  if (!bot || !bot.entity) return;

  stopMovement();

  const action = Math.random();
  const yawChange = (Math.random() - 0.5) * 1.8;
  const pitchChange = (Math.random() - 0.5) * 0.18;
  const yaw = bot.entity.yaw + yawChange;
  const pitch = Math.max(-0.35, Math.min(0.35, bot.entity.pitch + pitchChange));

  bot.look(yaw, pitch, true).catch(() => {});

  if (action < 0.58) {
    bot.setControlState('forward', true);
    if (Math.random() < 0.18) bot.setControlState('sprint', true);
    if (Math.random() < 0.22) bot.setControlState(Math.random() < 0.5 ? 'left' : 'right', true);
  } else if (action < 0.76) {
    bot.setControlState(Math.random() < 0.5 ? 'left' : 'right', true);
    if (Math.random() < 0.6) bot.setControlState('forward', true);
  } else if (action < 0.9) {
    bot.setControlState('back', true);
  } else if (action < 0.97) {
    bot.setControlState('forward', true);
    bot.setControlState('jump', true);
    setTimeout(() => {
      if (bot && bot.entity) bot.setControlState('jump', false);
    }, 350);
  }
  // Otherwise, briefly pause before choosing a new action.

  movementTimer = setTimeout(movementCycle, 900 + Math.floor(Math.random() * 1700));
}

connect();
