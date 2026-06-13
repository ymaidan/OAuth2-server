import crypto from 'crypto';

const DEFAULT_TTL_MS = 10 * 60 * 1000;

export class StateStore {
  constructor(ttlMs = DEFAULT_TTL_MS) {
    this.ttlMs = ttlMs;
    this.pendingStates = new Map();
  }

  create() {
    const state = crypto.randomBytes(16).toString('hex');
    this.pendingStates.set(state, Date.now());
    return state;
  }

  consume(state) {
    if (!state || !this.pendingStates.has(state)) {
      return false;
    }

    const createdAt = this.pendingStates.get(state);
    this.pendingStates.delete(state);

    return Date.now() - createdAt < this.ttlMs;
  }

  cleanup() {
    const now = Date.now();
    for (const [state, createdAt] of this.pendingStates.entries()) {
      if (now - createdAt >= this.ttlMs) {
        this.pendingStates.delete(state);
      }
    }
  }
}
