export interface GameStorage {
  getPlayerId(): number | null;
  setPlayerId(id: number): void;
  getRoomId(): string | null;
  setRoomId(id: string): void;
  clear(): void;
}

const PLAYER_ID_KEY = 'lac_playerId';
const ROOM_ID_KEY = 'lac_roomId';

class LocalStorageAdapter implements GameStorage {
  getPlayerId(): number | null {
    const val = localStorage.getItem(PLAYER_ID_KEY);
    return val ? parseInt(val, 10) : null;
  }

  setPlayerId(id: number): void {
    localStorage.setItem(PLAYER_ID_KEY, String(id));
  }

  getRoomId(): string | null {
    return localStorage.getItem(ROOM_ID_KEY);
  }

  setRoomId(id: string): void {
    localStorage.setItem(ROOM_ID_KEY, id);
  }

  clear(): void {
    localStorage.removeItem(PLAYER_ID_KEY);
    localStorage.removeItem(ROOM_ID_KEY);
  }
}

// Instance unique — changer l'implémentation ici pour switcher de backend
export const gameStorage: GameStorage = new LocalStorageAdapter();
