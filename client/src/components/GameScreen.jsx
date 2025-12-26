// GameScreen.jsx
// Ekran gry: pula, lista graczy, coinsy, log, akcje
import { useState } from 'react';

export default function GameScreen({
  state, playerId, onSend, onPass, waiting, log
}) {
  const [amount, setAmount] = useState(state.minAmount);
  const me = state.players.find(p => p.id === playerId);
  const isMyTurn = state.activePlayer === playerId;

  return (
    <div className="game-screen">
      <h2>Runda {state.round} / 15</h2>
      <div className="pot">Pula: <b>{state.pot}</b></div>
      <div className="min-amount">Minimalna kwota: <b>{state.minAmount}</b></div>
      <div className="players-list">
        {state.players.map(p => (
          <div key={p.id} className={p.id === playerId ? 'me' : ''}>
            <b>{p.name}</b> {p.isBot && <span>(BOT - {p.mode})</span>}<br />
            Coins: {p.coins}
            {state.activePlayer === p.id && <span> ← Tura</span>}
          </div>
        ))}
      </div>
      {isMyTurn && !me.isBot && (
        <div className="actions">
          <input
            type="number"
            min={state.minAmount}
            max={me.coins}
            value={amount}
            onChange={e => setAmount(Number(e.target.value))}
            disabled={waiting}
          />
          <button disabled={waiting || amount < state.minAmount || amount > me.coins}
            onClick={() => onSend(amount)}>
            Send Coins
          </button>
          <button disabled={waiting} onClick={onPass}>Pass</button>
        </div>
      )}
      <div className="log-feed">
        <h4>Log zdarzeń:</h4>
        <div className="log-box">
          {log.map((entry, i) => <div key={i}>{entry}</div>)}
        </div>
      </div>
    </div>
  );
}
