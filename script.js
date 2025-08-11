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

  // --- ÁUDIO ---
  const cardPlaySound = new Audio("assets/sons/card-play.mp3");
  const trucoSound = new Audio("assets/sons/truco.mp3");

  // --- ESTADO GERAL DO JOGO ---
  let playerScore = 0;
  let opponentScore = 0;
  let gameEnded = false;
  let handStarter = "player";

  // --- ESTADO DA MÃO ATUAL (Hand State) ---
  let playerHand = [];
  let opponentHand = [];
  let vira = null;
  let manilhas = [];
  let isPlayerTurn = true;
  let currentHandValue = 1;
  let vazaHistory = [];
  let vazaStarter = "player";

  // --- DEFINIÇÕES DO JOGO ---
  const suits = ["ouros", "espadas", "copas", "paus"];
  const ranks = ["4", "5", "6", "7", "Q", "J", "K", "A", "2", "3"];
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
    if (isFaceUp) {
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

  function getSuitIcon(suit) {
    const icons = {
      ouros: "diamond",
      copas: "heart",
      espadas: "spade",
      paus: "club",
    };
    return icons[suit];
  }

  // --- LÓGICA DO TRUCO ---
  function handleTrucoRequest() {
    if (currentHandValue > 1 || !isPlayerTurn) return;
    trucoSound.play();
    currentHandValue = 3;
    showStatusMessage("Você pediu TRUCO!");
    trucoButton.disabled = true;
    setTimeout(() => {
      const hasManilha = opponentHand.some((card) => getCardValue(card) >= 11);
      if (hasManilha || Math.random() < 0.5) {
        showStatusMessage("Oponente ACEITOU! Vale 3!");
      } else {
        showStatusMessage("Oponente correu! Você venceu 1 tento.");
        updateScore("player", 1);
        if (!gameEnded) setTimeout(startNewHand, 2500);
      }
    }, 1500);
  }
  trucoButton.addEventListener("click", handleTrucoRequest);

  // --- LÓGICA DE JOGABILIDADE ---
  function opponentTurn() {
    if (gameEnded) return;
    const canTruco = currentHandValue === 1 && vazaHistory.length === 0;
    const hasGoodCards =
      opponentHand.filter((c) => getCardValue(c) >= 7).length >= 2;
    if (canTruco && hasGoodCards && Math.random() < 0.4) {
      handleOpponentTruco();
      return;
    }
    const cardToPlay = opponentHand.shift();
    if (!cardToPlay) return;
    cardPlaySound.play();
    const cardElement = renderCard(cardToPlay, true);
    opponentCardSlot.innerHTML = "";
    opponentCardSlot.appendChild(cardElement);
    opponentHandElement.removeChild(opponentHandElement.firstChild);
    if (vazaStarter === "player") {
      setTimeout(endVaza, 1500);
    } else {
      isPlayerTurn = true;
      showStatusMessage("Sua vez...");
    }
  }

  function handleOpponentTruco() {
    trucoSound.play();
    showStatusMessage("Oponente pediu TRUCO!");
    trucoButton.disabled = true;
    trucoResponseContainer.style.display = "flex";
  }

  acceptButton.addEventListener("click", () => {
    currentHandValue = 3;
    trucoResponseContainer.style.display = "none";
    showStatusMessage("Você aceitou! Vale 3 tentos.");
    setTimeout(opponentTurn, 1500);
  });

  runButton.addEventListener("click", () => {
    trucoResponseContainer.style.display = "none";
    showStatusMessage("Você correu! Oponente ganhou 1 tento.");
    updateScore("opponent", 1);
    if (!gameEnded) setTimeout(startNewHand, 2500);
  });

  function playCard(card, cardElement) {
    if (!isPlayerTurn || playerHand.length === 0 || gameEnded) return;
    cardPlaySound.play();
    const cardIndex = playerHand.findIndex(
      (c) => c.rank === card.rank && c.suit === card.suit
    );
    if (cardIndex > -1) playerHand.splice(cardIndex, 1);
    cardElement.removeEventListener("click", () => playCard(card, cardElement));
    playerCardSlot.innerHTML = "";
    playerCardSlot.appendChild(cardElement);
    isPlayerTurn = false;
    if (vazaStarter === "opponent") {
      setTimeout(endVaza, 1500);
    } else {
      setTimeout(opponentTurn, 1000);
    }
  }

  function endVaza() {
    if (gameEnded) return;
    const playerCard = getCardFromSlot(playerCardSlot);
    const opponentCard = getCardFromSlot(opponentCardSlot);
    if (!playerCard || !opponentCard) return;
    const playerValue = getCardValue(playerCard);
    const opponentValue = getCardValue(opponentCard);
    let vazaWinner;
    if (playerValue > opponentValue) vazaWinner = "player";
    else if (opponentValue > playerValue) vazaWinner = "opponent";
    else vazaWinner = "draw";
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

      // ############### LÓGICA CORRIGIDA ###############
      // Define que o VENCEDOR da mão começa a próxima.
      if (handWinner === "player" || handWinner === "opponent") {
        handStarter = handWinner;
      }
      // Se empatar (draw), o handStarter não muda, mantendo quem começou a mão anterior.

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
    if (currentHandValue > 1) {
      trucoButton.disabled = true;
    }
    isPlayerTurn = vazaStarter === "player";
    if (!isPlayerTurn) {
      showStatusMessage("Vez do oponente...");
      setTimeout(opponentTurn, 1000);
    } else {
      showStatusMessage("Sua vez...");
    }
  }

  function updateScore(winner, points) {
    if (gameEnded) return;
    if (winner === "player") {
      playerScore += points;
      showStatusMessage(`Você ganhou ${points} tento(s)!`);
    } else if (winner === "opponent") {
      opponentScore += points;
      showStatusMessage(`Oponente ganhou ${points} tento(s)!`);
    } else if (winner !== "draw") {
      showStatusMessage("A mão empatou! Ninguém marca tentos.");
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
    trucoButton.disabled = false;
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

  function showStatusMessage(message) {
    statusMessageElement.style.flexDirection = "row";
    statusMessageElement.textContent = message;
    statusMessageElement.style.display = "flex";
    statusMessageElement.style.alignItems = "center";
    setTimeout(() => {
      if (!gameEnded) {
        statusMessageElement.style.display = "none";
      }
    }, 2000);
  }

  // --- Início do Jogo ---
  startNewHand();
});
