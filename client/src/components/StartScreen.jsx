// StartScreen.jsx
// Ekran startowy: Create/Join Lobby
import { useState } from 'react';

export default function StartScreen({ onCreate, onJoin, loading }) {
  const [nick, setNick] = useState('');
  const [code, setCode] = useState('');

  return (
    <div className="start-screen">
      <h1>Rising Coins</h1>
      <input
        type="text"
        placeholder="Twój nick"
        value={nick}
        maxLength={12}
        onChange={e => setNick(e.target.value)}
      />
      <div style={{ margin: '1em 0' }}>
        <button disabled={!nick || loading} onClick={() => onCreate(nick)}>
          Create Lobby
        </button>
      </div>
      <div>
        <input
          type="text"
          placeholder="Lobby code"
          value={code}
          maxLength={6}
          onChange={e => setCode(e.target.value.toUpperCase())}
        />
        <button disabled={!nick || !code || loading} onClick={() => onJoin(nick, code)}>
          Join Lobby
        </button>
      </div>
    </div>
  );
}
