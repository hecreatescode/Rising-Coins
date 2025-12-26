// LobbyScreen.jsx
// Ekran lobby: lista graczy, kod, start game
export default function LobbyScreen({ code, players, isHost, onStart, loading }) {
  return (
    <div className="lobby-screen">
      <h2>Lobby: <span style={{ letterSpacing: '0.2em' }}>{code}</span></h2>
      <h3>Gracze ({players.length}/6):</h3>
      <ul>
        {players.map(p => (
          <li key={p.id} style={{ color: p.isBot ? '#aaa' : '#fff' }}>
            {p.name} {p.isBot && <span>(BOT - {p.mode || 'AI'})</span>}
            {isHost && p.isBot && <span> 🧠</span>}
          </li>
        ))}
      </ul>
      {isHost && (
        <button disabled={players.filter(p => !p.isBot).length < 2 || loading} onClick={onStart}>
          Start Game
        </button>
      )}
      <div style={{ marginTop: '1em', fontSize: '0.9em', color: '#aaa' }}>
        Udostępnij kod lobby innym graczom!
      </div>
    </div>
  );
}
