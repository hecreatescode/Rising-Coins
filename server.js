// server.js
// Główny plik serwera Express + Socket.io

const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const lobbyManager = require('./lobbyManager');
const gameLogic = require('./gameLogic');

const app = express();

// Dodaj CORS po utworzeniu app
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));

const server = http.createServer(app);
const io = new Server(server);

// Serwowanie frontendu (opcjonalnie, jeśli budujesz produkcyjny frontend)
// app.use(express.static('client/build'));

// Inicjalizacja lobby i logiki gry
lobbyManager(io);
gameLogic(io);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Serwer działa na porcie ${PORT}`);
});