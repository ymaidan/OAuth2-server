import test from 'node:test';
import assert from 'node:assert/strict';
import { StateStore } from '../../src/state.js';

test('create returns a unique state value', () => {
  const store = new StateStore();
  const first = store.create();
  const second = store.create();

  assert.match(first, /^[a-f0-9]{32}$/);
  assert.notEqual(first, second);
});

test('consume accepts a valid state once', () => {
  const store = new StateStore();
  const state = store.create();

  assert.equal(store.consume(state), true);
  assert.equal(store.consume(state), false);
});

test('consume rejects unknown state', () => {
  const store = new StateStore();
  assert.equal(store.consume('invalid-state'), false);
});

test('consume rejects expired state', () => {
  const store = new StateStore(1);
  const state = store.create();

  return new Promise((resolve) => {
    setTimeout(() => {
      assert.equal(store.consume(state), false);
      resolve();
    }, 5);
  });
});

test('cleanup removes expired entries', () => {
  const store = new StateStore(1);
  store.create();
  store.create();

  return new Promise((resolve) => {
    setTimeout(() => {
      store.cleanup();
      assert.equal(store.pendingStates.size, 0);
      resolve();
    }, 5);
  });
});
