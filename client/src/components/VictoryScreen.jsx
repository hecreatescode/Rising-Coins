// VictoryScreen.jsx
// Ekran zwycięstwa
export default function VictoryScreen({ winners, onRestart, log }) {
  return (
    <div className="victory-screen">
      <h2>Koniec gry!</h2>
      <h3>Zwycięzca{winners.length > 1 ? 'y' : ''}:</h3>
      <ul>
        {winners.map(w => <li key={w.id}><b>{w.name}</b> ({w.coins} coins)</li>)}
      </ul>
      <button onClick={onRestart}>Zagraj ponownie</button>
      <div className="log-feed">
        <h4>Log gry:</h4>
        <div className="log-box">
          {log.map((entry, i) => <div key={i}>{entry}</div>)}
        </div>
      </div>
    </div>
  );
}
