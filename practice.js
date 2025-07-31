/*
 * practice.js
 * Implements a simple two‑player asset war practice game between the user and a selected agent.
 * The script reads the site's language setting from localStorage to provide translated logs and labels.
 */

function initPractice(agentType) {
  // Game state variables
  let userAsset = 100.0;
  let botAsset = 100.0;
  let step = 0;
  let lastUserAction = null;
  let lastBotAction = null;

  // Language configuration
  const lang = localStorage.getItem('siteLang') || 'ko';
  const actNames = {
    ko: { attack: '공격', defend: '방어', idle: '대기' },
    en: { attack: 'Attack', defend: 'Defend', idle: 'Wait' }
  };
  const scoreLabels = {
    ko: { user: '유저 자산', bot: '에이전트 자산' },
    en: { user: 'User Asset', bot: 'Agent Asset' }
  };
  const endMessages = {
    ko: {
      win: '게임 종료: 당신이 승리했습니다!',
      lose: '게임 종료: 봇이 승리했습니다.',
      draw: '게임 종료: 무승부입니다.'
    },
    en: {
      win: 'Game over: You win!',
      lose: 'Game over: Bot wins.',
      draw: 'Game over: Draw.'
    }
  };

  // Q-learning state for RL agent
  const rlQ = { attack: 0, defend: 0, idle: 0 };
  const rlEpsilon = 0.2;
  const rlAlpha = 0.1;

  const ATTACK_RATE = 0.1;
  const DEFENCE_REDUCTION = 0.5;

  // Cache DOM references
  const scoreEl = document.getElementById('score');
  const logEl = document.getElementById('log');
  const buttons = document.querySelectorAll('#buttons button');
  const restartBtn = document.getElementById('restart-btn');

  // Initialize scoreboard and log
  updateScore();
  logEl.innerHTML = '';
  step = 0;

  // Attach listeners to buttons
  buttons.forEach(btn => {
    btn.disabled = false;
    btn.onclick = () => {
      const userAction = btn.getAttribute('data-action');
      playRound(userAction);
    };
  });
  restartBtn.onclick = () => {
    resetGame();
  };

  /**
   * Choose the bot's action based on its type and internal state.
   */
  function chooseBotAction() {
    if (agentType === 'greedy') {
      return 'attack';
    }
    if (agentType === 'turtle') {
      return Math.random() < 0.2 ? 'attack' : 'defend';
    }
    if (agentType === 'random') {
      const actions = ['attack', 'defend', 'idle'];
      return actions[Math.floor(Math.random() * actions.length)];
    }
    if (agentType === 'adaptive') {
      if (lastUserAction === 'attack') return 'defend';
      if (lastUserAction === 'defend') return Math.random() < 0.5 ? 'attack' : 'idle';
      return 'attack';
    }
    if (agentType === 'rl') {
      if (Math.random() < rlEpsilon) {
        const actions = ['attack', 'defend', 'idle'];
        return actions[Math.floor(Math.random() * actions.length)];
      } else {
        const maxQ = Math.max(rlQ.attack, rlQ.defend, rlQ.idle);
        const best = [];
        for (const k in rlQ) {
          if (rlQ[k] === maxQ) best.push(k);
        }
        return best[Math.floor(Math.random() * best.length)];
      }
    }
    return 'attack';
  }

  /**
   * Update RL Q-values based on received reward.
   */
  function updateQLearning(action, reward) {
    rlQ[action] = rlQ[action] + rlAlpha * (reward - rlQ[action]);
  }

  /**
   * Execute one round of the practice game.
   */
  function playRound(userAction) {
    const botAction = chooseBotAction();
    let userSteals = 0;
    let botSteals = 0;
    if (userAction === 'attack') {
      let amount = ATTACK_RATE * botAsset;
      if (botAction === 'defend') amount *= (1 - DEFENCE_REDUCTION);
      userSteals = amount;
    }
    if (botAction === 'attack') {
      let amount = ATTACK_RATE * userAsset;
      if (userAction === 'defend') amount *= (1 - DEFENCE_REDUCTION);
      botSteals = amount;
    }
    userAsset = userAsset - botSteals + userSteals;
    botAsset = botAsset - userSteals + botSteals;
    userAsset = Math.max(userAsset, 0);
    botAsset = Math.max(botAsset, 0);
    if (agentType === 'rl') {
      const reward = botSteals - userSteals;
      updateQLearning(botAction, reward);
    }
    step++;
    addLogEntry(step, userAction, botAction, userSteals, botSteals);
    updateScore();
    lastUserAction = userAction;
    lastBotAction = botAction;
    if (userAsset <= 0 || botAsset <= 0) {
      endGame();
    }
  }

  /**
   * Update the scoreboard display.
   */
  function updateScore() {
    const labels = scoreLabels[lang];
    scoreEl.textContent = `${labels.user}: ${userAsset.toFixed(1)} | ${labels.bot}: ${botAsset.toFixed(1)}`;
  }

  /**
   * Append a log entry describing the outcome of the current round.
   */
  function addLogEntry(stepNum, userAction, botAction, userSteals, botSteals) {
    const p = document.createElement('p');
    const names = actNames[lang];
    let summary;
    if (lang === 'ko') {
      summary = `${stepNum} 스텝: 당신은 ${names[userAction]}, 봇은 ${names[botAction]}.`;
      if (userSteals > 0) summary += ` 당신은 ${userSteals.toFixed(1)}만큼 얻었습니다.`;
      if (botSteals > 0) summary += ` 봇은 ${botSteals.toFixed(1)}만큼 얻었습니다.`;
      if (userSteals === 0 && botSteals === 0) summary += ' 자산 변동 없음.';
    } else {
      summary = `${stepNum} step: You chose ${names[userAction]}, bot chose ${names[botAction]}.`;
      if (userSteals > 0) summary += ` You gained ${userSteals.toFixed(1)}.`;
      if (botSteals > 0) summary += ` Bot gained ${botSteals.toFixed(1)}.`;
      if (userSteals === 0 && botSteals === 0) summary += ' No asset change.';
    }
    p.textContent = summary;
    logEl.appendChild(p);
    logEl.scrollTop = logEl.scrollHeight;
  }

  /**
   * Reset the game to its initial state.
   */
  function resetGame() {
    userAsset = 100.0;
    botAsset = 100.0;
    step = 0;
    lastUserAction = null;
    lastBotAction = null;
    for (const a in rlQ) {
      rlQ[a] = 0;
    }
    updateScore();
    logEl.innerHTML = '';
    buttons.forEach(btn => btn.disabled = false);
  }

  /**
   * Called when one player's assets reach zero. Displays the result and disables controls.
   */
  function endGame() {
    buttons.forEach(btn => btn.disabled = true);
    let msg;
    if (userAsset > botAsset) msg = endMessages[lang].win;
    else if (userAsset < botAsset) msg = endMessages[lang].lose;
    else msg = endMessages[lang].draw;
    const p = document.createElement('p');
    p.style.fontWeight = 'bold';
    p.style.marginTop = '10px';
    p.textContent = msg;
    logEl.appendChild(p);
  }
}