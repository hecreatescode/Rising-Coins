// botLogic.js
// Logika AI botów: tryby, decyzje, analiza sytuacji


// Tryby bota
const MODES = ['Aggressive', 'Balanced', 'Safe'];

class Bot {
  constructor(mode) {
    this.mode = mode || 'Balanced';
  }

  // Główna metoda decyzyjna
  static makeMove(bot, game) {
    const { minAmount, pot, players, roundActions, round, turnOrder, currentTurn } = game;
    const myCoins = bot.coins;
    // Nie może wysłać – tylko PASS
    if (myCoins < minAmount) {
      return { type: 'pass' };
    }
    // Nie może spasować trzeci raz
    if (bot.passCount >= 2) {
      return Bot.sendStrategy(bot, game, minAmount, players);
    }
    // Decyzja zależna od trybu
    switch (bot.mode) {
      case 'Aggressive':
        return Bot.aggressive(bot, game, minAmount, players);
      case 'Safe':
        return Bot.safe(bot, game, minAmount, players);
      default:
        return Bot.balanced(bot, game, minAmount, players);
    }
  }

  // Tryb Aggressive: często podbija, rzadko pasuje, ryzykuje wysokie kwoty
  static aggressive(bot, game, minAmount, players) {
    // 20% szans na PASS jeśli pula duża
    if (game.pot > 60 && Math.random() < 0.2) return { type: 'pass' };
    // 30% szans na blef (wysyła minimalną)
    if (Math.random() < 0.3) return Bot.sendStrategy(bot, game, minAmount, players);
    // Wysyła wysoką kwotę (40-70% coins)
    const maxSend = Math.min(bot.coins, minAmount + Math.floor(Math.random() * (bot.coins * 0.7)));
    return Bot.sendStrategy(bot, game, maxSend, players);
  }

  // Tryb Balanced: analizuje pulę, czasem blefuje, czasem pasuje
  static balanced(bot, game, minAmount, players) {
    // 30% szans na PASS jeśli pula > 50
    if (game.pot > 50 && Math.random() < 0.3) return { type: 'pass' };
    // 20% szans na blef (wysyła minimalną)
    if (Math.random() < 0.2) return Bot.sendStrategy(bot, game, minAmount, players);
    // Wysyła umiarkowaną kwotę (min + 10-30% coins)
    const send = Math.min(bot.coins, minAmount + Math.floor(Math.random() * (bot.coins * 0.3 + 1)));
    return Bot.sendStrategy(bot, game, send, players);
  }

  // Tryb Safe: często pasuje, rzadko ryzykuje
  static safe(bot, game, minAmount, players) {
    // 60% szans na PASS jeśli pula > 30
    if (game.pot > 30 && Math.random() < 0.6) return { type: 'pass' };
    // 30% szans na blef (wysyła minimalną)
    if (Math.random() < 0.3) return Bot.sendStrategy(bot, game, minAmount, players);
    // Wysyła niską kwotę (min + 0-10% coins)
    const send = Math.min(bot.coins, minAmount + Math.floor(Math.random() * (bot.coins * 0.1 + 1)));
    return Bot.sendStrategy(bot, game, send, players);
  }

  // Wysyłanie coinsów do losowego gracza (nie do siebie, nie do bankruta)
  static sendStrategy(bot, game, amount, players) {
    const candidates = players.filter(p => p.id !== bot.id && p.coins > 0);
    if (candidates.length === 0) return { type: 'pass' };
    const to = candidates[Math.floor(Math.random() * candidates.length)].id;
    return { type: 'send', amount: Math.max(game.minAmount, Math.min(amount, bot.coins)), to };
  }
}

module.exports = Bot;
