import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { gameThemes, type GameTheme, type GameState, type ServerToClientEvents, type ClientToServerEvents } from "@shared/schema";
import { validatePlayerName, validateGameWord } from "./ai-validator";

// Generate a unique room code
function generateRoomCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Calculate penalty amount based on previous give-ups
function calculatePenalty(giveUpCount: number): number {
  const basePenalty = 100;
  const reduction = giveUpCount * 10;
  return Math.max(basePenalty - reduction, 10);
}

// Get alphabet position for letter progression
function getNextLetter(currentLetter: string): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const currentIndex = alphabet.indexOf(currentLetter);
  if (currentIndex === -1 || currentIndex === alphabet.length - 1) {
    return 'Z'; // End of game
  }
  return alphabet[currentIndex + 1];
}

// Validate word starts with correct letter
function validateWord(word: string, letter: string): boolean {
  if (!word || !word.trim()) return false;
  const normalizedWord = word.trim().toLowerCase();
  const normalizedLetter = letter.toLowerCase();
  return normalizedWord.startsWith(normalizedLetter);
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // WebSocket server on distinct path
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  // Store socket connections with player IDs
  const socketPlayers = new Map<WebSocket, number>();
  const playerSockets = new Map<number, WebSocket>();

  // Broadcast to all players in a room
  async function broadcastToRoom(roomId: string, event: keyof ServerToClientEvents, data: any) {
    const players = await storage.getPlayersByRoomId(roomId);
    players.forEach(player => {
      const socket = playerSockets.get(player.id);
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ event, data }));
      }
    });
  }

  // Send game state to all players in room
  async function sendGameStateToRoom(roomId: string) {
    const room = await storage.getRoomById(roomId);
    if (!room) return;

    const players = await storage.getPlayersByRoomId(roomId);
    const recentWords = await storage.getRecentWordsByRoomId(roomId, 10);
    const chatMessages = await storage.getChatMessagesByRoomId(roomId);

    const activePlayers = players.filter(p => !p.isEliminated);

    for (const player of players) {
      const socket = playerSockets.get(player.id);
      if (socket && socket.readyState === WebSocket.OPEN) {
        // Calculate next penalty for this player
        const playerGiveUps = recentWords.filter(w => w.playerId === player.id && w.isGiveUp).length;
        const nextPenalty = calculatePenalty(playerGiveUps);

        const canSubmitWord = !player.hasSubmittedWord && !player.isEliminated;
        const playersWaiting = activePlayers.filter(p => !p.hasSubmittedWord).length;

        const gameState: GameState = {
          room,
          players,
          recentWords,
          chatMessages,
          isMyTurn: true, // Plus de concept de tour individuel
          nextPenalty,
          canSubmitWord,
          playersWaiting
        };

        socket.send(JSON.stringify({ 
          event: 'gameStateUpdate', 
          data: gameState 
        }));
      }
    }
  }

  // Démarrer un nouveau tour (nouvelle lettre)
  async function startNextRound(roomId: string) {
    const room = await storage.getRoomById(roomId);
    if (!room) return;

    const players = await storage.getPlayersByRoomId(roomId);
    const activePlayers = players.filter(p => !p.isEliminated);
    
    if (activePlayers.length <= 1) {
      // Game ends - find winner
      const winner = activePlayers[0] || players.reduce((prev, current) => 
        prev.score > current.score ? prev : current
      );
      
      await storage.updateRoom(roomId, {
        gameEnded: true,
        winnerId: winner.id
      });
      
      await broadcastToRoom(roomId, 'gameEnded', winner.id);
      return;
    }

    // Move to next letter
    const nextLetter = getNextLetter(room.currentLetter);
    
    if (nextLetter === 'Z' && room.currentLetter === 'Z') {
      // Game ends after Z
      const winner = activePlayers.reduce((prev, current) => 
        prev.score > current.score ? prev : current
      );
      
      await storage.updateRoom(roomId, {
        gameEnded: true,
        winnerId: winner.id
      });
      
      await broadcastToRoom(roomId, 'gameEnded', winner.id);
      return;
    }

    // Reset hasSubmittedWord for all players
    for (const player of players) {
      await storage.updatePlayer(player.id, { hasSubmittedWord: false });
    }

    await storage.updateRoom(roomId, {
      currentLetter: nextLetter,
      roundInProgress: false
    });

    await broadcastToRoom(roomId, 'letterChanged', nextLetter);
    await sendGameStateToRoom(roomId);
  }

  wss.on('connection', (socket: WebSocket) => {
    let currentPlayerId: number | null = null;

    socket.on('message', async (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString()) as {
          event: keyof ClientToServerEvents;
          data: any;
        };

        switch (message.event) {
          case 'createRoom': {
            const { playerName, theme } = message.data;
            
            if (!playerName?.trim() || !gameThemes[theme as GameTheme]) {
              socket.send(JSON.stringify({ 
                event: 'error', 
                data: 'Nom du joueur et thème requis' 
              }));
              return;
            }

            // Validation du nom avec IA
            const nameValidation = await validatePlayerName(playerName);
            if (!nameValidation.isValid) {
              socket.send(JSON.stringify({ 
                event: 'error', 
                data: nameValidation.reason || 'Nom non autorisé',
                suggestedName: nameValidation.suggestedName
              }));
              return;
            }

            // Generate unique room code
            let roomCode: string;
            let roomExists: boolean;
            do {
              roomCode = generateRoomCode();
              roomExists = !!(await storage.getRoomByCode(roomCode));
            } while (roomExists);

            const roomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            const room = await storage.createRoom({
              id: roomId,
              code: roomCode,
              theme,
              currentLetter: 'A',
              currentPlayerIndex: 0,
              gameStarted: false,
              gameEnded: false,
              roundInProgress: false,
              winnerId: null
            });

            const player = await storage.createPlayer({
              name: nameValidation.suggestedName || playerName.trim(),
              roomId: roomId,
              score: 1000,
              isHost: true,
              isEliminated: false,
              hasSubmittedWord: false,
              socketId: null
            });

            currentPlayerId = player.id;
            socketPlayers.set(socket, player.id);
            playerSockets.set(player.id, socket);

            await sendGameStateToRoom(roomId);
            break;
          }

          case 'joinRoom': {
            const { roomCode, playerName } = message.data;
            
            if (!roomCode?.trim() || !playerName?.trim()) {
              socket.send(JSON.stringify({ 
                event: 'error', 
                data: 'Code de room et nom du joueur requis' 
              }));
              return;
            }

            // Validation du nom avec IA
            const nameValidation = await validatePlayerName(playerName);
            if (!nameValidation.isValid) {
              socket.send(JSON.stringify({ 
                event: 'error', 
                data: nameValidation.reason || 'Nom non autorisé',
                suggestedName: nameValidation.suggestedName
              }));
              return;
            }

            const room = await storage.getRoomByCode(roomCode.toUpperCase());
            if (!room) {
              socket.send(JSON.stringify({ 
                event: 'error', 
                data: 'Room introuvable' 
              }));
              return;
            }

            if (room.gameStarted) {
              socket.send(JSON.stringify({ 
                event: 'error', 
                data: 'La partie a déjà commencé' 
              }));
              return;
            }

            const existingPlayers = await storage.getPlayersByRoomId(room.id);
            if (existingPlayers.length >= 6) {
              socket.send(JSON.stringify({ 
                event: 'error', 
                data: 'Room complète' 
              }));
              return;
            }

            const player = await storage.createPlayer({
              name: nameValidation.suggestedName || playerName.trim(),
              roomId: room.id,
              score: 1000,
              isHost: false,
              isEliminated: false,
              hasSubmittedWord: false,
              socketId: null
            });

            currentPlayerId = player.id;
            socketPlayers.set(socket, player.id);
            playerSockets.set(player.id, socket);

            await broadcastToRoom(room.id, 'playerJoined', player);
            await sendGameStateToRoom(room.id);
            break;
          }

          case 'startGame': {
            if (!currentPlayerId) return;
            
            const player = await storage.getPlayerById(currentPlayerId);
            if (!player?.isHost) {
              socket.send(JSON.stringify({ 
                event: 'error', 
                data: 'Seul l\'hôte peut démarrer la partie' 
              }));
              return;
            }

            const players = await storage.getPlayersByRoomId(player.roomId);
            if (players.length < 2) {
              socket.send(JSON.stringify({ 
                event: 'error', 
                data: 'Minimum 2 joueurs requis' 
              }));
              return;
            }

            await storage.updateRoom(player.roomId, {
              gameStarted: true
            });

            await broadcastToRoom(player.roomId, 'gameStarted', null);
            await sendGameStateToRoom(player.roomId);
            break;
          }

          case 'submitWord': {
            if (!currentPlayerId) return;
            
            const word = message.data?.trim();
            const player = await storage.getPlayerById(currentPlayerId);
            if (!player) return;

            const room = await storage.getRoomById(player.roomId);
            if (!room || !room.gameStarted || room.gameEnded) return;

            // Vérifier si le joueur a déjà soumis un mot pour cette lettre
            if (player.hasSubmittedWord) {
              socket.send(JSON.stringify({ 
                event: 'error', 
                data: 'Vous avez déjà soumis un mot pour cette lettre' 
              }));
              return;
            }

            if (!validateWord(word, room.currentLetter)) {
              socket.send(JSON.stringify({ 
                event: 'error', 
                data: `Le mot doit commencer par ${room.currentLetter}` 
              }));
              return;
            }

            // Validation du mot avec IA Groq
            const wordValidation = await validateGameWord(word, room.theme, room.currentLetter);
            if (!wordValidation.isValid) {
              socket.send(JSON.stringify({ 
                event: 'error', 
                data: wordValidation.reason || 'Mot non valide pour cette catégorie'
              }));
              return;
            }

            // Marquer le joueur comme ayant soumis un mot
            await storage.updatePlayer(player.id, { hasSubmittedWord: true });

            // Save the word
            const gameWord = await storage.createGameWord({
              roomId: room.id,
              playerId: player.id,
              letter: room.currentLetter,
              word: word,
              isGiveUp: false,
              penaltyAmount: 0
            });

            await broadcastToRoom(room.id, 'wordSubmitted', gameWord);

            // Vérifier si tous les joueurs actifs ont soumis un mot
            const players = await storage.getPlayersByRoomId(room.id);
            const activePlayers = players.filter(p => !p.isEliminated);
            const playersSubmitted = activePlayers.filter(p => p.hasSubmittedWord || p.id === player.id);

            if (playersSubmitted.length === activePlayers.length) {
              // Tous les joueurs ont soumis, passer à la lettre suivante
              await startNextRound(room.id);
            }

            await sendGameStateToRoom(room.id);
            break;
          }

          case 'giveUp': {
            if (!currentPlayerId) return;
            
            const player = await storage.getPlayerById(currentPlayerId);
            if (!player) return;

            const room = await storage.getRoomById(player.roomId);
            if (!room || !room.gameStarted || room.gameEnded) return;

            // Vérifier si le joueur a déjà soumis un mot pour cette lettre
            if (player.hasSubmittedWord) {
              socket.send(JSON.stringify({ 
                event: 'error', 
                data: 'Vous avez déjà soumis pour cette lettre' 
              }));
              return;
            }

            // Calculate penalty
            const previousGiveUps = await storage.getGameWordsByRoomId(room.id);
            const playerGiveUps = previousGiveUps.filter(w => w.playerId === player.id && w.isGiveUp);
            const penalty = calculatePenalty(playerGiveUps.length);

            // Apply penalty
            const newScore = Math.max(0, player.score - penalty);
            const isEliminated = newScore === 0;

            await storage.updatePlayer(player.id, {
              score: newScore,
              isEliminated,
              hasSubmittedWord: true
            });

            // Save give up record
            await storage.createGameWord({
              roomId: room.id,
              playerId: player.id,
              letter: room.currentLetter,
              word: null,
              isGiveUp: true,
              penaltyAmount: penalty
            });

            // Vérifier si tous les joueurs actifs ont soumis un mot ou donné leur langue au chat
            const players = await storage.getPlayersByRoomId(room.id);
            const activePlayers = players.filter(p => !p.isEliminated);
            const playersSubmitted = activePlayers.filter(p => p.hasSubmittedWord || p.id === player.id);

            if (playersSubmitted.length === activePlayers.length) {
              // Tous les joueurs ont soumis, passer à la lettre suivante
              await startNextRound(room.id);
            }

            await sendGameStateToRoom(room.id);
            break;
          }

          case 'sendChatMessage': {
            if (!currentPlayerId) return;
            
            const messageText = message.data?.trim();
            if (!messageText) return;

            const player = await storage.getPlayerById(currentPlayerId);
            if (!player) return;

            const chatMessage = await storage.createChatMessage({
              roomId: player.roomId,
              playerId: player.id,
              message: messageText
            });

            await broadcastToRoom(player.roomId, 'chatMessage', {
              ...chatMessage,
              playerName: player.name
            });
            break;
          }

          case 'leaveRoom': {
            if (!currentPlayerId) return;
            
            const player = await storage.getPlayerById(currentPlayerId);
            if (!player) return;

            await storage.deletePlayer(currentPlayerId);
            socketPlayers.delete(socket);
            playerSockets.delete(currentPlayerId);

            await broadcastToRoom(player.roomId, 'playerLeft', currentPlayerId);

            // Check if room is empty
            const remainingPlayers = await storage.getPlayersByRoomId(player.roomId);
            if (remainingPlayers.length === 0) {
              await storage.deleteRoom(player.roomId);
            } else {
              // If host left, make another player host
              if (player.isHost) {
                const newHost = remainingPlayers[0];
                await storage.updatePlayer(newHost.id, { isHost: true });
              }
              await sendGameStateToRoom(player.roomId);
            }

            currentPlayerId = null;
            break;
          }
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
        socket.send(JSON.stringify({ 
          event: 'error', 
          data: 'Erreur serveur' 
        }));
      }
    });

    socket.on('close', async () => {
      if (currentPlayerId) {
        const player = await storage.getPlayerById(currentPlayerId);
        if (player) {
          await storage.deletePlayer(currentPlayerId);
          socketPlayers.delete(socket);
          playerSockets.delete(currentPlayerId);
          
          await broadcastToRoom(player.roomId, 'playerLeft', currentPlayerId);
          
          const remainingPlayers = await storage.getPlayersByRoomId(player.roomId);
          if (remainingPlayers.length === 0) {
            await storage.deleteRoom(player.roomId);
          } else {
            if (player.isHost && remainingPlayers.length > 0) {
              await storage.updatePlayer(remainingPlayers[0].id, { isHost: true });
            }
            await sendGameStateToRoom(player.roomId);
          }
        }
      }
    });
  });

  return httpServer;
}
