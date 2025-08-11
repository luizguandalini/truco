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
  // NOVO: Elementos para encobrir a carta
  const coverCardContainer = document.getElementById("cover-card-container");
  const coverCardCheckbox = document.getElementById("cover-card-checkbox");

  // --- ÁUDIO ---
  const cardPlaySound = new Audio("assets/sons/card-play.mp3");
  const trucoSound = new Audio("assets/sons/truco.mp3");

  // --- ESTADOS ---
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
    /* ...código sem alteração... */
    const deck = [];
    for (const suit of suits) {
      for (const rank of ranks) {
        deck.push({ rank, suit });
      }
    }
    return deck;
  }
  function shuffleDeck(deck) {
    /* ...código sem alteração... */
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
  }
  function getCardValue(card) {
    /* ...código sem alteração... */
    if (!card) return -1;
    if (manilhas.some((m) => m.rank === card.rank && m.suit === card.suit)) {
      const manilhaPower = { ouros: 11, espadas: 12, copas: 13, paus: 14 };
      return manilhaPower[card.suit];
    }
    return cardOrder[card.rank];
  }
  function setManilhas(viraCard) {
    /* ...código sem alteração... */
    if (!viraCard) return;
    const viraRankIndex = ranks.indexOf(viraCard.rank);
    const manilhaRank = ranks[(viraRankIndex + 1) % ranks.length];
    manilhas = suits.map((suit) => ({ rank: manilhaRank, suit }));
  }
  function renderCard(card, isFaceUp = false) {
    /* ...código sem alteração... */
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

  // --- LÓGICA DE JOGABILIDADE ---

  function playCard(card, cardElement) {
    if (!isPlayerTurn || playerHand.length === 0 || gameEnded) return;

    const isCovered = coverCardCheckbox.checked;

    // Remove a carta lógica da mão
    const cardIndex = playerHand.findIndex(
      (c) => c.rank === card.rank && c.suit === card.suit
    );
    if (cardIndex > -1) playerHand.splice(cardIndex, 1);

    // Remove a carta visual da mão
    cardElement.remove();

    // Cria e posiciona a carta jogada na mesa
    playerCardSlot.innerHTML = "";
    const playedCardElement = renderCard(card, !isCovered); // Se estiver coberta, não vira
    playerCardSlot.appendChild(playedCardElement);
    playerCardSlot.dataset.isCovered = isCovered; // Armazena o estado

    cardPlaySound.play();
    isPlayerTurn = false;
    if (vazaStarter === "opponent") {
      setTimeout(endVaza, 1500);
    } else {
      setTimeout(opponentTurn, 1000);
    }
  }

  function opponentTurn() {
    if (gameEnded) return;

    // Lógica da IA para trucar...
    const canTruco = currentHandValue === 1 && vazaHistory.length === 0;
    const hasGoodCards =
      opponentHand.filter((c) => getCardValue(c) >= 7).length >= 2;
    if (canTruco && hasGoodCards && Math.random() < 0.4) {
      handleOpponentTruco();
      return;
    }

    // NOVO: Lógica da IA para encobrir a carta
    const playerCardOnTable = getCardFromSlot(playerCardSlot);
    const shouldCover =
      vazaHistory.length > 0 &&
      playerCardOnTable &&
      getCardValue(playerCardOnTable) >= 11 &&
      !hasGoodCards; // Cobre se o jogador jogou manilha e a IA não tem nada

    const cardToPlay = opponentHand.shift();
    if (!cardToPlay) return;

    opponentCardSlot.innerHTML = "";
    const playedCardElement = renderCard(cardToPlay, !shouldCover);
    opponentCardSlot.appendChild(playedCardElement);
    opponentCardSlot.dataset.isCovered = shouldCover;

    opponentHandElement.removeChild(opponentHandElement.firstChild);
    cardPlaySound.play();

    if (vazaStarter === "player") {
      setTimeout(endVaza, 1500);
    } else {
      isPlayerTurn = true;
      showStatusMessage("Sua vez...");
    }
  }

  function endVaza() {
    if (gameEnded) return;

    // LÓGICA ALTERADA: Decide o vencedor da vaza
    const isPlayerCardCovered = playerCardSlot.dataset.isCovered === "true";
    const isOpponentCardCovered = opponentCardSlot.dataset.isCovered === "true";

    let vazaWinner;

    if (isPlayerCardCovered && !isOpponentCardCovered) {
      vazaWinner = "opponent"; // Oponente mostrou, jogador encobriu -> Oponente ganha
    } else if (!isPlayerCardCovered && isOpponentCardCovered) {
      vazaWinner = "player"; // Jogador mostrou, oponente encobriu -> Jogador ganha
    } else if (isPlayerCardCovered && isOpponentCardCovered) {
      vazaWinner = "draw"; // Os dois encobriram -> Empate
    } else {
      // Lógica normal de comparação de cartas
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

  function startNextVaza() {
    if (gameEnded) return;
    // NOVO: Mostra a opção de encobrir a partir da segunda vaza
    coverCardContainer.style.display = "flex";

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

  function startNewHand() {
    if (gameEnded) return;

    // NOVO: Esconde e reseta a opção de encobrir
    coverCardContainer.style.display = "none";
    coverCardCheckbox.checked = false;
    playerCardSlot.dataset.isCovered = "false";
    opponentCardSlot.dataset.isCovered = "false";

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

    handStarter = vazaStarter = handStarter; // Correção da regra: quem ganhou a mão anterior começa
    isPlayerTurn = vazaStarter === "player";

    if (isPlayerTurn) {
      showStatusMessage("Nova mão! Sua vez.");
    } else {
      showStatusMessage("Nova mão! Vez do oponente.");
      setTimeout(opponentTurn, 1500);
    }
  }

  // O resto do código (checkHandWinner, updateScore, endGame, etc.) permanece o mesmo.
  // ... (cole o restante do seu código aqui, a partir de checkHandWinner)

  function checkHandWinner() {
    if (gameEnded) return;
    (playerCardSlot.innerHTML = ""), (opponentCardSlot.innerHTML = "");
    const t = vazaHistory.filter((t) => "player" === t).length,
      e = vazaHistory.filter((t) => "opponent" === t).length;
    let a = null;
    t === 2
      ? (a = "player")
      : e === 2
      ? (a = "opponent")
      : vazaHistory.length >= 2 &&
        "draw" === vazaHistory[0] &&
        (1 === t || 1 === e) &&
        (a = t > e ? "player" : "opponent"),
      (a || 3 === vazaHistory.length) &&
        (a ||
          (a =
            t > e
              ? "player"
              : e > t
              ? "opponent"
              : "draw" === vazaHistory[0]
              ? "draw"
              : vazaHistory[0]),
        ("player" === a || "opponent" === a) && (handStarter = a),
        updateScore(a, currentHandValue),
        gameEnded || setTimeout(startNewHand, 2500));
  }
  function updateScore(t, e) {
    if (gameEnded) return;
    let a;
    t === "player"
      ? ((playerScore += e), showStatusMessage(`Você ganhou ${e} tento(s)!`))
      : t === "opponent"
      ? ((opponentScore += e),
        showStatusMessage(`Oponente ganhou ${e} tento(s)!`))
      : "draw" !== t &&
        showStatusMessage("A mão empatou! Ninguém marca tentos."),
      (playerScoreElement.textContent = playerScore),
      (opponentScoreElement.textContent = opponentScore),
      (playerScore >= 12 || opponentScore >= 12) && endGame();
  }
  function endGame() {
    gameEnded = !0;
    const t = playerScore >= 12 ? "VOCÊ VENCEU!" : "O OPONENTE VENCEU!";
    setTimeout(() => {
      (statusMessageElement.style.flexDirection = "column"),
        (statusMessageElement.innerHTML = `<h2>FIM DE JOGO</h2><p>${t}</p><button id="play-again" class="truco-button">Jogar Novamente</button>`),
        (statusMessageElement.style.display = "flex"),
        (statusMessageElement.style.zIndex = "300"),
        document.getElementById("play-again").addEventListener("click", () => {
          location.reload();
        });
    }, 1500);
  }
  function handleTrucoRequest() {
    if (!(currentHandValue > 1 || !isPlayerTurn))
      if (
        (trucoSound.play(),
        (currentHandValue = 3),
        showStatusMessage("Você pediu TRUCO!"),
        (trucoButton.disabled = !0),
        setTimeout(() => {
          opponentHand.some((t) => getCardValue(t) >= 11) || Math.random() < 0.5
            ? showStatusMessage("Oponente ACEITOU! Vale 3!")
            : (showStatusMessage("Oponente correu! Você venceu 1 tento."),
              updateScore("player", 1),
              gameEnded || setTimeout(startNewNewHand, 2500));
        }, 1500),
        1)
      );
      else;
  }
  function handleOpponentTruco() {
    trucoSound.play(),
      showStatusMessage("Oponente pediu TRUCO!"),
      (trucoButton.disabled = !0),
      (trucoResponseContainer.style.display = "flex");
  }
  acceptButton.addEventListener("click", () => {
    (currentHandValue = 3),
      (trucoResponseContainer.style.display = "none"),
      showStatusMessage("Você aceitou! Vale 3 tentos."),
      setTimeout(opponentTurn, 1500);
  });
  runButton.addEventListener("click", () => {
    (trucoResponseContainer.style.display = "none"),
      showStatusMessage("Você correu! Oponente ganhou 1 tento."),
      updateScore("opponent", 1),
      gameEnded || setTimeout(startNewHand, 2500);
  });
  function getCardFromSlot(t) {
    if (!t.firstChild) return null;
    const e = t.querySelector(".card-rank")?.textContent,
      a = t.querySelector(".card-suit");
    if (!e || !a) return null;
    let n = "";
    return (
      a.classList.contains("suit-ouros")
        ? (n = "ouros")
        : a.classList.contains("suit-espadas")
        ? (n = "espadas")
        : a.classList.contains("suit-copas")
        ? (n = "copas")
        : a.classList.contains("suit-paus") && (n = "paus"),
      { rank: e, suit: n }
    );
  }
  function showStatusMessage(t) {
    (statusMessageElement.style.flexDirection = "row"),
      (statusMessageElement.textContent = t),
      (statusMessageElement.style.display = "flex"),
      (statusMessageElement.style.alignItems = "center"),
      setTimeout(() => {
        gameEnded || (statusMessageElement.style.display = "none");
      }, 2e3);
  }
  startNewHand();
});
