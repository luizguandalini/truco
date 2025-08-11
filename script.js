document.addEventListener("DOMContentLoaded", () => {
  // --- ELEMENTOS DO DOM ---
  const playerHandElement = document.getElementById("player-hand");
  const opponentHandElement = document.getElementById("opponent-hand");
  const viraCardElement = document.getElementById("vira-card");
  const playerScoreElement = document.getElementById("player-score");
  const opponentScoreElement = document.getElementById("opponent-score");
  const statusMessageElement = document.getElementById("status-message");
  const playerCardSlot = document.getElementById("player-card-slot");
  const opponentCardSlot = document.getElementById("opponent-card-slot");
  const trucoButton = document.getElementById("truco-button");
  const trucoResponseContainer = document.getElementById(
    "truco-response-container"
  );
  const acceptButton = document.getElementById("accept-button");
  const runButton = document.getElementById("run-button");
  const raiseButton = document.getElementById("raise-button");
  const coverCardContainer = document.getElementById("cover-card-container");
  const coverCardCheckbox = document.getElementById("cover-card-checkbox");

  // --- ÁUDIO ---
  const cardPlaySound = new Audio("assets/sons/card-play.mp3");
  const trucoSound = new Audio("assets/sons/truco.mp3");

  // --- ESTADOS DO JOGO ---
  let playerScore = 0,
    opponentScore = 0;
  let gameEnded = false;
  let handStarter = "player";
  let playerHand = [],
    opponentHand = [];
  let vira = null,
    manilhas = [];
  let isPlayerTurn = true,
    currentHandValue = 1;
  let vazaHistory = [],
    vazaStarter = "player";
  let proposedValue = 1;
  let lastBettor = null;
  let statusMessageTimeout = null; // NOVO: Controlador do tempo da mensagem de status

  // --- DEFINIÇÕES DO JOGO ---
  const suits = ["ouros", "espadas", "copas", "paus"];
  const ranks = ["4", "5", "6", "7", "Q", "J", "K", "A", "2", "3"];
  // CORREÇÃO: Garante que todas as chaves são strings para consistência.
  const cardOrder = {
    4: 0,
    5: 1,
    6: 2,
    7: 3,
    Q: 4,
    J: 5,
    K: 6,
    A: 7,
    2: 8,
    3: 9,
  };

  // --- FUNÇÕES DE SETUP ---
  function createDeck() {
    const deck = [];
    for (const suit of suits) {
      for (const rank of ranks) {
        deck.push({ rank, suit });
      }
    }
    return deck;
  }
  function shuffleDeck(deck) {
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
  }
  function getCardValue(card) {
    if (!card) return -1;
    if (manilhas.some((m) => m.rank === card.rank && m.suit === card.suit)) {
      const manilhaPower = { ouros: 11, espadas: 12, copas: 13, paus: 14 };
      return manilhaPower[card.suit];
    }
    return cardOrder[card.rank];
  }
  function setManilhas(viraCard) {
    if (!viraCard) return;
    const viraRankIndex = ranks.indexOf(viraCard.rank);
    const manilhaRank = ranks[(viraRankIndex + 1) % ranks.length];
    manilhas = suits.map((suit) => ({ rank: manilhaRank, suit }));
  }
  function renderCard(card, isFaceUp = false) {
    if (isFaceUp && card.rank) {
      console.log(`Desenhando: Rank=${card.rank}, Naipe=${card.suit}`);
    }
    const cardDiv = document.createElement("div");
    cardDiv.classList.add("card");
    if (isFaceUp) {
      setTimeout(() => cardDiv.classList.add("flipped"), 50);
    }
    const cardInner = document.createElement("div");
    cardInner.classList.add("card-inner");
    const cardFront = document.createElement("div");
    cardFront.classList.add("card-face", "card-front");
    if (card && card.rank && card.suit) {
      const rankTop = document.createElement("span");
      rankTop.className = "card-rank";
      rankTop.textContent = card.rank;
      const suitCharacters = {
        ouros: "♦",
        copas: "♥",
        espadas: "♠",
        paus: "♣",
      };
      const suitSpan = document.createElement("span");
      suitSpan.className = `card-suit suit-${card.suit}`;
      suitSpan.textContent = suitCharacters[card.suit];
      const rankBottom = document.createElement("span");
      rankBottom.className = "card-rank";
      rankBottom.textContent = card.rank;
      cardFront.appendChild(rankTop);
      cardFront.appendChild(suitSpan);
      cardFront.appendChild(rankBottom);
    }
    const cardBack = document.createElement("div");
    cardBack.classList.add("card-face", "card-back");
    cardInner.appendChild(cardFront);
    cardInner.appendChild(cardBack);
    cardDiv.appendChild(cardInner);
    return cardDiv;
  }

  // --- LÓGICA DE APOSTAS (TRUCO, 6, 9, 12) ---
  const betLevels = { 1: 3, 3: 6, 6: 9, 9: 12, 12: 12 };
  const betNames = { 3: "TRUCO", 6: "SEIS", 9: "NOVE", 12: "DOZE" };

  function raiseBet(raiser) {
    if (
      gameEnded ||
      (!isPlayerTurn && raiser === "player") ||
      (isPlayerTurn && raiser === "opponent")
    )
      return;
    const nextValue = betLevels[currentHandValue];
    if (lastBettor === raiser && nextValue > 3) return;
    trucoSound.play();
    proposedValue = nextValue;
    lastBettor = raiser;
    showStatusMessage(
      `${raiser === "player" ? "Você" : "Oponente"} pediu ${
        betNames[proposedValue]
      }!`
    );
    updateInterface();
    if (raiser === "player") {
      setTimeout(getAIResponse, 1500);
    } else {
      showPlayerResponseOptions();
    }
  }

  function showPlayerResponseOptions() {
    const nextValue = betLevels[currentHandValue];
    raiseButton.textContent = `PEDIR ${betNames[nextValue]}`;
    raiseButton.style.display =
      currentHandValue < 12 && lastBettor === "opponent" ? "block" : "none";
    trucoResponseContainer.style.display = "flex";
  }

  function getAIResponse() {
    const hasManilha = opponentHand.some((c) => getCardValue(c) >= 11);
    const decisionRandomizer = Math.random();
    if (
      (currentHandValue === 3 && hasManilha && decisionRandomizer < 0.5) ||
      (currentHandValue === 6 && hasManilha)
    ) {
      raiseBet("opponent");
    } else if (hasManilha || decisionRandomizer < 0.6) {
      acceptBet();
    } else {
      runFromBet();
    }
  }

  function acceptBet() {
    currentHandValue = proposedValue;
    trucoResponseContainer.style.display = "none";
    showStatusMessage(
      `${
        lastBettor === "opponent" ? "Você aceitou" : "Oponente aceitou"
      }! A mão vale ${currentHandValue} tentos.`
    );
    updateInterface();
    if (lastBettor === "opponent") {
      isPlayerTurn = false;
      setTimeout(opponentTurn, 1500);
    } else {
      isPlayerTurn = true;
      showStatusMessage("Sua vez...");
    }
  }

  function runFromBet() {
    trucoResponseContainer.style.display = "none";
    const winner = lastBettor === "player" ? "player" : "opponent";
    const pointsWon = currentHandValue;
    showStatusMessage(
      `${lastBettor === "player" ? "Oponente correu" : "Você correu"}! ${
        winner === "player" ? "Você" : "Oponente"
      } ganhou ${pointsWon} tento(s).`
    );
    updateScore(winner, pointsWon);
    if (!gameEnded) setTimeout(startNewHand, 2500);
  }

  trucoButton.addEventListener("click", () => raiseBet("player"));
  acceptButton.addEventListener("click", acceptBet);
  runButton.addEventListener("click", runFromBet);
  raiseButton.addEventListener("click", () => raiseBet("player"));

  // --- LÓGICA DE JOGABILIDADE ---
  function opponentTurn() {
    if (gameEnded || isPlayerTurn) return;
    if (
      lastBettor === null &&
      vazaHistory.length === 0 &&
      playerCardSlot.innerHTML === ""
    ) {
      const hasGoodCards =
        opponentHand.filter((c) => getCardValue(c) >= 7).length >= 2;
      if (hasGoodCards && Math.random() < 0.3) {
        raiseBet("opponent");
        return;
      }
    }
    const playerCardOnTable = getCardFromSlot(playerCardSlot);
    let shouldCover = false;
    if (vazaHistory.length > 0 && playerCardOnTable) {
      const playerCardValue = getCardValue(playerCardOnTable);
      const opponentBestCardValue = Math.max(
        ...opponentHand.map((c) => getCardValue(c))
      );
      if (playerCardValue > opponentBestCardValue) {
        shouldCover = true;
      }
    }
    const cardToPlay = opponentHand.shift();
    if (!cardToPlay) return;
    opponentCardSlot.innerHTML = "";
    const playedCardElement = renderCard(cardToPlay, !shouldCover);
    opponentCardSlot.appendChild(playedCardElement);
    opponentCardSlot.dataset.isCovered = shouldCover;
    opponentHandElement.removeChild(opponentHandElement.firstChild);
    cardPlaySound.play();
    isPlayerTurn = true;
    if (vazaStarter !== "opponent") {
      setTimeout(endVaza, 1500);
    } else {
      updateInterface();
    }
  }

  function playCard(card, cardElement) {
    if (!isPlayerTurn || playerHand.length === 0 || gameEnded) return;
    const isCovered = coverCardCheckbox.checked && vazaHistory.length > 0;
    const cardIndex = playerHand.findIndex(
      (c) => c.rank === card.rank && c.suit === card.suit
    );
    if (cardIndex > -1) playerHand.splice(cardIndex, 1);
    cardElement.remove();
    playerCardSlot.innerHTML = "";
    const playedCardElement = renderCard(card, !isCovered);
    playerCardSlot.appendChild(playedCardElement);
    playerCardSlot.dataset.isCovered = isCovered;
    cardPlaySound.play();
    isPlayerTurn = false;
    if (vazaStarter !== "player") {
      setTimeout(endVaza, 1500);
    } else {
      updateInterface();
      setTimeout(opponentTurn, 1000);
    }
  }

  function endVaza() {
    if (gameEnded) return;
    const isPlayerCardCovered = playerCardSlot.dataset.isCovered === "true";
    const isOpponentCardCovered = opponentCardSlot.dataset.isCovered === "true";
    let vazaWinner;
    if (isPlayerCardCovered && !isOpponentCardCovered) {
      vazaWinner = "opponent";
    } else if (!isPlayerCardCovered && isOpponentCardCovered) {
      vazaWinner = "player";
    } else if (isPlayerCardCovered && isOpponentCardCovered) {
      vazaWinner = "draw";
    } else {
      const playerCard = getCardFromSlot(playerCardSlot);
      const opponentCard = getCardFromSlot(opponentCardSlot);
      const playerValue = getCardValue(playerCard);
      const opponentValue = getCardValue(opponentCard);
      if (playerValue > opponentValue) vazaWinner = "player";
      else if (opponentValue > playerValue) vazaWinner = "opponent";
      else vazaWinner = "draw";
    }
    vazaHistory.push(vazaWinner);
    vazaStarter = vazaWinner === "draw" ? vazaStarter : vazaWinner;
    const winnerMessage = {
      player: "Você venceu a vaza!",
      opponent: "Oponente venceu a vaza!",
      draw: "Cangou! (Empate)",
    };
    showStatusMessage(winnerMessage[vazaWinner]);
    setTimeout(checkHandWinner, 2000);
  }

  function checkHandWinner() {
    if (gameEnded) return;
    playerCardSlot.innerHTML = "";
    opponentCardSlot.innerHTML = "";
    const playerVazas = vazaHistory.filter((v) => v === "player").length;
    const opponentVazas = vazaHistory.filter((v) => v === "opponent").length;
    let handWinner = null;
    if (playerVazas === 2) handWinner = "player";
    if (opponentVazas === 2) handWinner = "opponent";
    if (
      vazaHistory.length >= 2 &&
      vazaHistory[0] === "draw" &&
      (playerVazas === 1 || opponentVazas === 1)
    ) {
      handWinner = playerVazas > opponentVazas ? "player" : "opponent";
    }
    if (handWinner || vazaHistory.length === 3) {
      if (!handWinner) {
        handWinner =
          playerVazas > opponentVazas
            ? "player"
            : opponentVazas > playerVazas
            ? "opponent"
            : vazaHistory[0] === "draw"
            ? "draw"
            : vazaHistory[0];
      }
      if (handWinner === "player" || handWinner === "opponent") {
        handStarter = handWinner;
      }
      updateScore(handWinner, currentHandValue);
      if (!gameEnded) {
        setTimeout(startNewHand, 2500);
      }
    } else {
      startNextVaza();
    }
  }

  function startNextVaza() {
    if (gameEnded) return;
    isPlayerTurn = vazaStarter === "player";
    updateInterface();
    if (!isPlayerTurn) {
      setTimeout(opponentTurn, 1000);
    } else {
      showStatusMessage("Sua vez...");
    }
  }

  // --- FUNÇÕES DE ESTADO, UI E FIM DE JOGO ---
  function updateInterface() {
    const canPlayerBet =
      isPlayerTurn && lastBettor !== "player" && currentHandValue < 12;
    trucoButton.style.display = canPlayerBet ? "block" : "none";
    if (canPlayerBet) {
      trucoButton.textContent = betNames[betLevels[currentHandValue]];
    }
    const canCover = isPlayerTurn && vazaHistory.length > 0;
    coverCardContainer.style.display = canCover ? "flex" : "none";
  }

  function updateScore(winner, points) {
    if (gameEnded) return;
    if (winner === "player") {
      playerScore += points;
    } else if (winner === "opponent") {
      opponentScore += points;
    }
    playerScoreElement.textContent = playerScore;
    opponentScoreElement.textContent = opponentScore;
    if (playerScore >= 12 || opponentScore >= 12) {
      endGame();
    }
  }

  function endGame() {
    gameEnded = true;
    const winner = playerScore >= 12 ? "VOCÊ VENCEU!" : "O OPONENTE VENCEU!";
    setTimeout(() => {
      statusMessageElement.style.flexDirection = "column";
      statusMessageElement.innerHTML = `<h2>FIM DE JOGO</h2><p>${winner}</p><button id="play-again" class="truco-button">Jogar Novamente</button>`;
      statusMessageElement.style.display = "flex";
      statusMessageElement.style.zIndex = "300";
      document.getElementById("play-again").addEventListener("click", () => {
        location.reload();
      });
    }, 1500);
  }

  function startNewHand() {
    if (gameEnded) return;
    vazaHistory = [];
    currentHandValue = 1;
    lastBettor = null;
    proposedValue = 1;
    coverCardContainer.style.display = "none";
    coverCardCheckbox.checked = false;
    playerCardSlot.dataset.isCovered = "false";
    opponentCardSlot.dataset.isCovered = "false";
    const deck = createDeck();
    shuffleDeck(deck);
    vira = deck.pop();
    setManilhas(vira);
    playerHand = deck.slice(0, 3);
    opponentHand = deck.slice(3, 6);
    playerHandElement.innerHTML = "";
    opponentHandElement.innerHTML = "";
    playerHand.forEach((card) => {
      const cardElement = renderCard(card, true);
      cardElement.addEventListener("click", () => playCard(card, cardElement));
      playerHandElement.appendChild(cardElement);
    });
    opponentHand.forEach(() => {
      const cardElement = renderCard({}, false);
      opponentHandElement.appendChild(cardElement);
    });
    viraCardElement.innerHTML = "";
    viraCardElement.appendChild(renderCard(vira, true));
    vazaStarter = handStarter;
    isPlayerTurn = vazaStarter === "player";
    updateInterface();
    if (isPlayerTurn) {
      showStatusMessage("Nova mão! Sua vez.");
    } else {
      showStatusMessage("Nova mão! Vez do oponente.");
      setTimeout(opponentTurn, 1500);
    }
  }

  function getCardFromSlot(slot) {
    if (!slot.firstChild) return null;
    const rank = slot.querySelector(".card-rank")?.textContent;
    const suitElement = slot.querySelector(".card-suit");
    if (!rank || !suitElement) return null;
    let suit = "";
    if (suitElement.classList.contains("suit-ouros")) suit = "ouros";
    else if (suitElement.classList.contains("suit-espadas")) suit = "espadas";
    else if (suitElement.classList.contains("suit-copas")) suit = "copas";
    else if (suitElement.classList.contains("suit-paus")) suit = "paus";
    return { rank, suit };
  }

  // FUNÇÃO DE MENSAGEM ATUALIZADA
  function showStatusMessage(message, duration = 2500) {
    if (
      trucoResponseContainer.style.display === "flex" &&
      !message.includes("pediu")
    )
      return;
    clearTimeout(statusMessageTimeout);
    statusMessageElement.style.flexDirection = "row";
    statusMessageElement.textContent = message;
    statusMessageElement.style.display = "flex";
    statusMessageElement.style.alignItems = "center";
    statusMessageTimeout = setTimeout(() => {
      if (!gameEnded) {
        statusMessageElement.style.display = "none";
      }
    }, duration);
  }

  startNewHand();
});
