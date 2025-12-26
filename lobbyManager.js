// lobbyManager.js
// Zarządzanie lobby, kodami, dołączaniem graczy

// Stałe
const LOBBY_CODE_LENGTH = 6;
const MAX_PLAYERS = 6;
const MIN_HUMANS = 2;

// Przechowywanie lobby w pamięci
const lobbies = {};

// Generowanie unikalnego kodu lobby
function generateLobbyCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code;
  do {
    code = '';
    for (let i = 0; i < LOBBY_CODE_LENGTH; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  } while (lobbies[code]);
  return code;
}

// Tworzenie bota (placeholder, logika w botLogic.js)
function createBot(id) {
  return {
    id: id,
    isBot: true,
    name: `BOT_${id}`,
    coins: 100,
    passCount: 0,
    afkCount: 0,
    mode: null // tryb AI losowany później
  };
}

module.exports = function(io) {
  // Tworzenie lobby
  io.on('connection', (socket) => {
    // Tworzenie nowego lobby
    socket.on('createLobby', ({ nick }, callback) => {
      const code = generateLobbyCode();
      const player = {
        id: socket.id,
        isBot: false,
        name: nick,
        coins: 100,
        passCount: 0,
        afkCount: 0
      };
      lobbies[code] = {
        code,
        players: [player],
        hostId: socket.id,
        started: false
      };
      socket.join(code);
      callback({ code, players: lobbies[code].players });
      io.to(code).emit('lobbyUpdate', lobbies[code].players);
    });

    // Dołączanie do istniejącego lobby
    socket.on('joinLobby', ({ code, nick }, callback) => {
      const lobby = lobbies[code];
      if (!lobby) {
        return callback({ error: 'Lobby nie istnieje.' });
      }
      if (lobby.players.length >= MAX_PLAYERS) {
        return callback({ error: 'Lobby jest pełne.' });
      }
      if (lobby.started) {
        return callback({ error: 'Gra już się rozpoczęła.' });
      }
      const player = {
        id: socket.id,
        isBot: false,
        name: nick,
        coins: 100,
        passCount: 0,
        afkCount: 0
      };
      lobby.players.push(player);
      socket.join(code);
      callback({ code, players: lobby.players });
      io.to(code).emit('lobbyUpdate', lobby.players);
    });

    // Rozpoczęcie gry (tylko host)
    socket.on('startGame', ({ code }, callback) => {
      const lobby = lobbies[code];
      if (!lobby) return callback({ error: 'Lobby nie istnieje.' });
      if (lobby.hostId !== socket.id) return callback({ error: 'Tylko host może rozpocząć grę.' });
      const humanCount = lobby.players.filter(p => !p.isBot).length;
      if (humanCount < MIN_HUMANS) return callback({ error: 'Za mało graczy.' });
      // Dodaj boty jeśli potrzeba
      let botId = 1;
      while (lobby.players.length < MAX_PLAYERS) {
        lobby.players.push(createBot(`B${botId++}`));
      }
      // Losuj tryby botów
      const botModes = ['Aggressive', 'Balanced', 'Safe'];
      lobby.players.forEach(p => {
        if (p.isBot) {
          p.mode = botModes[Math.floor(Math.random() * botModes.length)];
        }
      });
      lobby.started = true;
      io.to(code).emit('gameStarted', lobby.players);
      callback({ success: true });
    });

    // Rozłączanie gracza
    socket.on('disconnect', () => {
      for (const code in lobbies) {
        const lobby = lobbies[code];
        const idx = lobby.players.findIndex(p => p.id === socket.id);
        if (idx !== -1) {
          lobby.players.splice(idx, 1);
          io.to(code).emit('lobbyUpdate', lobby.players);
          // Jeśli lobby puste – usuń
          if (lobby.players.length === 0) {
            delete lobbies[code];
          } else if (lobby.hostId === socket.id) {
            // Przekaż hosta
            lobby.hostId = lobby.players[0].id;
          }
          break;
        }
      }
    });
  });
};
