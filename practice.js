/*
 * practice.js
 * 단순한 두 명 게임을 통해 다양한 에이전트들의 전략을 체험할 수 있도록 하는 스크립트입니다.
 * 사용자와 하나의 봇이 동시에 선택을 내리고 자산의 변화를 표시합니다.
 */

function initPractice(agentType) {
  // 내부 상태 변수들
  let userAsset = 100.0;
  let botAsset = 100.0;
  let step = 0;
  let lastUserAction = null;
  let lastBotAction = null;

  // Q-러닝을 위한 상태 (RL agent 전용)
  const rlQ = { attack: 0, defend: 0, idle: 0 };
  const rlEpsilon = 0.2;
  const rlAlpha = 0.1;

  const ATTACK_RATE = 0.1;
  const DEFENCE_REDUCTION = 0.5;

  // UI 요소들
  const scoreEl = document.getElementById('score');
  const logEl = document.getElementById('log');
  const buttons = document.querySelectorAll('#buttons button');
  const restartBtn = document.getElementById('restart-btn');

  // 현재 게임 시작 시점에 초기화
  updateScore();
  logEl.innerHTML = '';
  step = 0;

  buttons.forEach(btn => {
    btn.onclick = () => {
      const userAction = btn.getAttribute('data-action');
      playRound(userAction);
    };
  });

  restartBtn.onclick = () => {
    resetGame();
  };

  /**
   * 봇의 행동을 결정합니다. 에이전트 유형에 따라 다른 전략을 사용합니다.
   * @returns {string} 'attack' | 'defend' | 'idle'
   */
  function chooseBotAction() {
    if (agentType === 'greedy') {
      return 'attack';
    }
    if (agentType === 'turtle') {
      // 터틀은 방어를 선호한다: 20% 확률로 공격
      return Math.random() < 0.2 ? 'attack' : 'defend';
    }
    if (agentType === 'random') {
      const actions = ['attack', 'defend', 'idle'];
      return actions[Math.floor(Math.random() * actions.length)];
    }
    if (agentType === 'adaptive') {
      // 최근 사용자의 행동에 따라 적응: 사용자가 공격했다면 방어, 그렇지 않으면 공격
      if (lastUserAction === 'attack') {
        return 'defend';
      } else if (lastUserAction === 'defend') {
        // 상대가 방어했다면 공격 확률 50%
        return Math.random() < 0.5 ? 'attack' : 'idle';
      } else {
        // 사용자가 아무것도 안 했거나 턴이 없었다면 공격
        return 'attack';
      }
    }
    if (agentType === 'rl') {
      // epsilon-greedy 정책
      if (Math.random() < rlEpsilon) {
        const actions = ['attack', 'defend', 'idle'];
        return actions[Math.floor(Math.random() * actions.length)];
      } else {
        // 최대 Q값의 행동 선택 (동률이면 무작위)
        const maxQ = Math.max(rlQ.attack, rlQ.defend, rlQ.idle);
        const bestActions = Object.keys(rlQ).filter(a => rlQ[a] === maxQ);
        return bestActions[Math.floor(Math.random() * bestActions.length)];
      }
    }
    // 기본은 공격
    return 'attack';
  }

  /**
   * RL Q값 갱신
   * @param {string} action 선택된 행동
   * @param {number} reward 받는 보상
   */
  function updateQLearning(action, reward) {
    const oldQ = rlQ[action];
    rlQ[action] = oldQ + rlAlpha * (reward - oldQ);
  }

  /**
   * 실제 라운드를 진행합니다. 사용자와 봇의 선택을 받아 자산을 업데이트합니다.
   * @param {string} userAction 사용자의 선택
   */
  function playRound(userAction) {
    const botAction = chooseBotAction();
    // 어떤 쪽이 얼마를 훔쳤는지 계산
    let userSteals = 0;
    let botSteals = 0;
    if (userAction === 'attack') {
      let amount = ATTACK_RATE * botAsset;
      if (botAction === 'defend') {
        amount *= (1 - DEFENCE_REDUCTION);
      }
      userSteals = amount;
    }
    if (botAction === 'attack') {
      let amount = ATTACK_RATE * userAsset;
      if (userAction === 'defend') {
        amount *= (1 - DEFENCE_REDUCTION);
      }
      botSteals = amount;
    }
    // 자산 업데이트
    userAsset = userAsset - botSteals + userSteals;
    botAsset = botAsset - userSteals + botSteals;
    // 음수 방지
    userAsset = Math.max(userAsset, 0);
    botAsset = Math.max(botAsset, 0);
    // RL 보상 계산: 상대보다 얼마나 더 많이 얻었는지로 정의
    if (agentType === 'rl') {
      const reward = botSteals - userSteals;
      updateQLearning(botAction, reward);
    }
    step++;
    // 로그 업데이트
    addLogEntry(step, userAction, botAction, userSteals, botSteals);
    // 점수 업데이트
    updateScore();
    lastUserAction = userAction;
    lastBotAction = botAction;
    // 게임 종료 조건: 둘 중 하나의 자산이 0 이하
    if (userAsset <= 0 || botAsset <= 0) {
      endGame();
    }
  }

  /**
   * 점수 표시를 갱신합니다.
   */
  function updateScore() {
    scoreEl.textContent = `유저 자산: ${userAsset.toFixed(1)} | 에이전트 자산: ${botAsset.toFixed(1)}`;
  }

  /**
   * 로그 패널에 내용을 추가합니다.
   * @param {number} stepNum 현재 스텝 번호
   * @param {string} userAction 사용자 선택
   * @param {string} botAction 봇 선택
   * @param {number} userSteals 이번 라운드에서 사용자가 훔친 금액
   * @param {number} botSteals 이번 라운드에서 봇이 훔친 금액
   */
  function addLogEntry(stepNum, userAction, botAction, userSteals, botSteals) {
    const p = document.createElement('p');
    const actMap = { attack: '공격', defend: '방어', idle: '대기' };
    let summary = `${stepNum} 스텝: 당신은 ${actMap[userAction]}, 봇은 ${actMap[botAction]}.`;
    if (userSteals > 0) {
      summary += ` 당신은 ${userSteals.toFixed(1)}만큼 얻었습니다.`;
    }
    if (botSteals > 0) {
      summary += ` 봇은 ${botSteals.toFixed(1)}만큼 얻었습니다.`;
    }
    if (userSteals === 0 && botSteals === 0) {
      summary += ' 자산 변동 없음.';
    }
    p.textContent = summary;
    logEl.appendChild(p);
    // 스크롤을 최신 위치로
    logEl.scrollTop = logEl.scrollHeight;
  }

  /**
   * 게임을 리셋합니다.
   */
  function resetGame() {
    userAsset = 100.0;
    botAsset = 100.0;
    step = 0;
    lastUserAction = null;
    lastBotAction = null;
    // RL Q값 초기화
    for (const a in rlQ) {
      rlQ[a] = 0;
    }
    updateScore();
    logEl.innerHTML = '';
  }

  /**
   * 게임이 종료되면 호출됩니다. 버튼을 비활성화하고 결과 메시지를 표시합니다.
   */
  function endGame() {
    // 버튼 비활성화
    buttons.forEach(btn => btn.disabled = true);
    let resultMsg;
    if (userAsset > botAsset) {
      resultMsg = '게임 종료: 당신이 승리했습니다!';
    } else if (userAsset < botAsset) {
      resultMsg = '게임 종료: 봇이 승리했습니다.';
    } else {
      resultMsg = '게임 종료: 무승부입니다.';
    }
    const p = document.createElement('p');
    p.style.fontWeight = 'bold';
    p.style.marginTop = '10px';
    p.textContent = resultMsg;
    logEl.appendChild(p);
  }
}