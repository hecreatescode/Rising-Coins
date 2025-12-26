// gameLogic.js
// Główna logika gry, obsługa rund, tur, puli, zwycięzcy

const Bot = require('./botLogic');

// Stałe gry
const ROUNDS = 15;
const START_COINS = 100;
const TURN_TIME = 20000; // 20 sekund
const PASS_COST = 5;
const BONUS_STARTER = 10;
const MAX_PASS = 2;

// Przechowywanie stanu gier
const games = {};

function getRandomReceiver(players, senderId) {
  const others = players.filter(p => p.id !== senderId && p.coins > 0);
  if (others.length === 0) return null;
  return others[Math.floor(Math.random() * others.length)].id;
}

function getMinSendAmount(turn, lastAmount) {
  if (turn === 0) return 1;
  return lastAmount + 1;
}

function getActivePlayer(game) {
  return game.players[game.turnOrder[game.currentTurn]];
}

function isBot(player) {
  return player.isBot;
}

function resetPassCounts(game) {
  game.players.forEach(p => { p.passCount = 0; });
}

function nextTurn(game) {
  game.currentTurn++;
  if (game.currentTurn >= game.turnOrder.length) {
    endRound(game);
  } else {
    startTurn(game);
  }
}

function endRound(game) {
  // Zwycięzca puli: najwyższa wysłana kwota
  const maxSent = Math.max(...game.roundActions.map(a => a.amount || 0));
  const contenders = game.roundActions.filter(a => a.amount === maxSent);
  if (contenders.length === 1 && maxSent > 0) {
    const winner = game.players.find(p => p.id === contenders[0].from);
    winner.coins += game.pot;
    game.log.push(`Pula ${game.pot} trafia do ${winner.name}`);
    game.pot = 0;
  } else if (maxSent > 0) {
    game.log.push(`Remis – pula przechodzi dalej (${game.pot})`);
  } else {
    game.log.push(`Nikt nie wysłał coinsów – pula przechodzi dalej (${game.pot})`);
  }
  // Bonus dla startowego
  const starter = game.players[game.turnOrder[0]];
  if (!starter.isBot && !game.roundActions.find(a => a.from === starter.id && a.type === 'pass')) {
    starter.coins += BONUS_STARTER;
    game.log.push(`${starter.name} otrzymuje bonus +${BONUS_STARTER}`);
  }
  // Nowa runda lub koniec gry
  game.round++;
  if (game.round > ROUNDS) {
    endGame(game);
  } else {
    // Reset
    game.currentTurn = 0;
    game.roundActions = [];
    resetPassCounts(game);
    game.minAmount = 1;
    game.log.push(`--- Runda ${game.round} ---`);
    startTurn(game);
  }
}

function endGame(game) {
  // Zwycięzca: najwięcej coinsów
  const maxCoins = Math.max(...game.players.map(p => p.coins));
  const winners = game.players.filter(p => p.coins === maxCoins);
  game.log.push(`Koniec gry! Wygrywa: ${winners.map(w => w.name).join(', ')} (${maxCoins} coins)`);
  io.to(game.code).emit('gameEnded', { winners, log: game.log, players: game.players });
  delete games[game.code];
}

function startTurn(game) {
  const player = getActivePlayer(game);
  // Sprawdź AFK
  if (player.afkCount >= 3 && !player.isBot) {
    // Zamień na bota
    const bot = new Bot(player.mode || 'Balanced');
    bot.id = player.id;
    bot.name = player.name + ' (BOT)';
    bot.isBot = true;
    bot.coins = player.coins;
    bot.passCount = player.passCount;
    bot.afkCount = 0;
    bot.mode = player.mode || 'Balanced';
    game.players[game.turnOrder[game.currentTurn]] = bot;
    game.log.push(`${player.name} został zamieniony na bota!`);
  }
  // Wyślij info o turze
  io.to(game.code).emit('turnStart', {
    playerId: player.id,
    minAmount: game.minAmount,
    pot: game.pot,
    players: game.players,
    round: game.round,
    log: game.log
  });
  // Jeśli bot – automatyczny ruch
  if (player.isBot) {
    setTimeout(() => {
      const action = Bot.makeMove(player, game);
      handleMove(game, player.id, action);
    }, 1000 + Math.random() * 2000);
  } else {
    // Timer na ruch gracza
    game.turnTimer = setTimeout(() => {
      handleMove(game, player.id, { type: 'pass' });
    }, TURN_TIME);
  }
}

function handleMove(game, playerId, action) {
  const player = game.players.find(p => p.id === playerId);
  if (!player) return;
  if (game.turnTimer) clearTimeout(game.turnTimer);
  if (action.type === 'send') {
    // Sprawdź minimalną kwotę
    if (action.amount < game.minAmount || action.amount > player.coins) {
      game.log.push(`${player.name} próbował nieprawidłowej akcji.`);
      io.to(game.code).emit('invalidMove', { playerId, reason: 'Nieprawidłowa kwota.' });
      startTurn(game); // powtórz turę
      return;
    }
    // Odbiorca
    const receiver = game.players.find(p => p.id === action.to);
    if (!receiver || receiver.id === player.id) {
      game.log.push(`${player.name} próbował wysłać coinsy do siebie lub nieistniejącego gracza.`);
      io.to(game.code).emit('invalidMove', { playerId, reason: 'Nieprawidłowy odbiorca.' });
      startTurn(game);
      return;
    }
    // Wykonaj ruch
    player.coins -= action.amount;
    const toReceiver = Math.floor(action.amount * 0.8);
    const toPot = action.amount - toReceiver;
    receiver.coins += toReceiver;
    game.pot += toPot;
    game.roundActions.push({ from: player.id, to: receiver.id, amount: action.amount, type: 'send' });
    game.log.push(`${player.name} wysyła ${action.amount} coins do ${receiver.name} (80%: ${toReceiver}, 20% do puli: ${toPot})`);
    // Ustaw minAmount na +1
    game.minAmount = action.amount + 1;
    player.passCount = 0;
    player.afkCount = 0;
    nextTurn(game);
  } else if (action.type === 'pass') {
    // PASS
    if (player.passCount >= MAX_PASS) {
      game.log.push(`${player.name} nie może spasować trzeci raz z rzędu!`);
      io.to(game.code).emit('invalidMove', { playerId, reason: 'Nie możesz spasować trzeci raz z rzędu.' });
      startTurn(game);
      return;
    }
    player.coins -= PASS_COST;
    game.pot += PASS_COST;
    player.passCount++;
    player.afkCount++;
    game.roundActions.push({ from: player.id, type: 'pass' });
    game.log.push(`${player.name} pasuje (koszt: ${PASS_COST})`);
    nextTurn(game);
  }
  io.to(game.code).emit('gameUpdate', {
    players: game.players,
    pot: game.pot,
    minAmount: game.minAmount,
    round: game.round,
    log: game.log
  });
}

module.exports = function(io) {
  io.on('connection', (socket) => {
    // Start gry – inicjalizacja stanu
    socket.on('gameInit', ({ code, players }) => {
      if (games[code]) return;
      const turnOrder = players.map(p => p.id);
      games[code] = {
        code,
        players: players.map(p => ({ ...p })),
        turnOrder,
        currentTurn: 0,
        round: 1,
        pot: 0,
        minAmount: 1,
        roundActions: [],
        log: [`--- Runda 1 ---`]
      };
      startTurn(games[code]);
    });

    // Ruch gracza
    socket.on('playerMove', ({ code, action }) => {
      const game = games[code];
      if (!game) return;
      const player = getActivePlayer(game);
      if (player.id !== socket.id) return; // nie twoja tura
      handleMove(game, socket.id, action);
    });
  });
};
