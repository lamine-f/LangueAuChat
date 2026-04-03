export class GameError extends Error {
  constructor(public readonly userMessage: string) {
    super(userMessage);
    this.name = 'GameError';
  }
}

export class ValidationError extends GameError {
  public readonly suggestedName?: string;

  constructor(message: string, suggestedName?: string) {
    super(message);
    this.name = 'ValidationError';
    this.suggestedName = suggestedName;
  }
}

export class RoomNotFoundError extends GameError {
  constructor() {
    super('Room introuvable');
    this.name = 'RoomNotFoundError';
  }
}

export class RoomFullError extends GameError {
  constructor() {
    super('Room complète');
    this.name = 'RoomFullError';
  }
}

export class GameAlreadyStartedError extends GameError {
  constructor() {
    super('La partie a déjà commencé');
    this.name = 'GameAlreadyStartedError';
  }
}

export class NotHostError extends GameError {
  constructor() {
    super("Seul l'hôte peut démarrer la partie");
    this.name = 'NotHostError';
  }
}

export class NotEnoughPlayersError extends GameError {
  constructor() {
    super('Minimum 2 joueurs requis');
    this.name = 'NotEnoughPlayersError';
  }
}

export class AlreadySubmittedError extends GameError {
  constructor() {
    super('Vous avez déjà soumis un mot pour cette lettre');
    this.name = 'AlreadySubmittedError';
  }
}

export class InvalidWordError extends GameError {
  constructor(letter: string) {
    super(`Le mot doit commencer par ${letter}`);
    this.name = 'InvalidWordError';
  }
}

export class PlayerNotFoundError extends GameError {
  constructor() {
    super('Joueur introuvable');
    this.name = 'PlayerNotFoundError';
  }
}

export class MissingFieldsError extends GameError {
  constructor(message: string) {
    super(message);
    this.name = 'MissingFieldsError';
  }
}
