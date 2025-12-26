
import { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import './App.css';
import StartScreen from './components/StartScreen';
import LobbyScreen from './components/LobbyScreen';
import GameScreen from './components/GameScreen';
import VictoryScreen from './components/VictoryScreen';

const SERVER_URL = 'http://localhost:3001';

function App() {
  const [screen, setScreen] = useState('start'); // start, lobby, game, victory
  const [nick, setNick] = useState('');
  const [code, setCode] = useState('');
  const [players, setPlayers] = useState([]);
  const [isHost, setIsHost] = useState(false);
  const [playerId, setPlayerId] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [waiting, setWaiting] = useState(false);
  const [log, setLog] = useState([]);
  const [winners, setWinners] = useState([]);
  const socketRef = useRef(null);

  // Inicjalizacja Socket.io
  useEffect(() => {
    const socket = io(SERVER_URL);
    socketRef.current = socket;
    setPlayerId(socket.id);

    socket.on('lobbyUpdate', (players) => {
      setPlayers(players);
    });
    socket.on('gameStarted', (players) => {
      setPlayers(players);
      setScreen('game');
      setWaiting(false);
      // Inicjalizacja gry na backendzie
      socket.emit('gameInit', { code, players });
    });
    socket.on('gameUpdate', (state) => {
      setGameState({
        ...state,
        activePlayer: state.players[state.turnOrder ? state.currentTurn : 0]?.id || null
      });
      setLog(state.log || []);
    });
    socket.on('turnStart', (data) => {
      setGameState({
        ...data,
        activePlayer: data.playerId
      });
      setLog(data.log || []);
    });
    socket.on('invalidMove', ({ reason }) => {
      alert(reason);
      setWaiting(false);
    });
    socket.on('gameEnded', ({ winners, log, players }) => {
      setWinners(winners);
      setLog(log);
      setPlayers(players);
      setScreen('victory');
    });
    return () => socket.disconnect();
    // eslint-disable-next-line
  }, []);

  // Tworzenie lobby
  const handleCreate = (nick) => {
    setWaiting(true);
    setNick(nick);
    socketRef.current.emit('createLobby', { nick }, ({ code, players, error }) => {
      setWaiting(false);
      if (error) return alert(error);
      setCode(code);
      setPlayers(players);
      setIsHost(true);
      setScreen('lobby');
    });
  };

  // Dołączanie do lobby
  const handleJoin = (nick, code) => {
    setWaiting(true);
    setNick(nick);
    socketRef.current.emit('joinLobby', { code, nick }, ({ code: joinedCode, players, error }) => {
      setWaiting(false);
      if (error) return alert(error);
      setCode(joinedCode);
      setPlayers(players);
      setIsHost(false);
      setScreen('lobby');
    });
  };

  // Start gry (host)
  const handleStart = () => {
    setWaiting(true);
    socketRef.current.emit('startGame', { code }, ({ error }) => {
      setWaiting(false);
      if (error) return alert(error);
    });
  };

  // Ruch: wysyłanie coinsów
  const handleSend = (amount) => {
    setWaiting(true);
    const me = players.find(p => p.id === playerId);
    // Losowy odbiorca (nie ja, nie bankrut)
    const candidates = players.filter(p => p.id !== playerId && p.coins > 0);
    if (candidates.length === 0) return alert('Brak odbiorców!');
    const to = candidates[Math.floor(Math.random() * candidates.length)].id;
    socketRef.current.emit('playerMove', { code, action: { type: 'send', amount, to } });
  };

  // Ruch: PASS
  const handlePass = () => {
    setWaiting(true);
    socketRef.current.emit('playerMove', { code, action: { type: 'pass' } });
  };

  // Restart gry
  const handleRestart = () => {
    setScreen('start');
    setNick('');
    setCode('');
    setPlayers([]);
    setIsHost(false);
    setPlayerId(null);
    setGameState(null);
    setWaiting(false);
    setLog([]);
    setWinners([]);
    window.location.reload();
  };

  // Routing ekranów
  if (screen === 'start') {
    return <StartScreen onCreate={handleCreate} onJoin={handleJoin} loading={waiting} />;
  }
  if (screen === 'lobby') {
    return <LobbyScreen code={code} players={players} isHost={isHost} onStart={handleStart} loading={waiting} />;
  }
  if (screen === 'game' && gameState) {
    return <GameScreen state={gameState} playerId={playerId} onSend={handleSend} onPass={handlePass} waiting={waiting} log={log} />;
  }
  if (screen === 'victory') {
    return <VictoryScreen winners={winners} onRestart={handleRestart} log={log} />;
  }
  return <div>Ładowanie...</div>;
}

export default App;
