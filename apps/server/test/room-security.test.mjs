import assert from 'node:assert/strict';
import test from 'node:test';
import { RoomStore } from '../src/roomStore.ts';

function duo() {
  const store = new RoomStore();
  const host = store.createRoom({ mode: 'duo', takeCount: 4 });
  const guest = store.joinRoom(host.code, 'Guest');
  assert.ok(guest.ok);
  const ready = () => {
    store.setReady(host.code, host.participantId, true);
    store.setReady(host.code, guest.participantId, true);
  };
  return { store, host, guest, ready, code: host.code };
}

test('each Duo capture and approved retake requires fresh consent', () => {
  const { store, code, host, guest, ready } = duo();
  ready();
  const first = store.scheduleCountdown(code, 'host', 1);
  assert.ok(first.ok);
  assert.ok(first.snapshot.participants.every(p => !p.ready));
  assert.equal(store.setReady(code, host.participantId, true), null);
  const id = first.countdown.attemptId;
  const image = 'data:image/png;base64,QUJD';
  assert.ok(store.syncCapturedFrame(code, 'host', 0, id, image));
  assert.equal(store.syncCapturedFrame(code, 'host', 0, id, image), null);
  const review = store.syncCapturedFrame(code, 'guest', 0, id, image);
  assert.equal(review.phase, 'review');
  assert.equal(review.syncedFrames[0].guestDataUrl, undefined);
  assert.equal(store.getStoredFrames(code)[0].guestDataUrl, image);
  assert.equal(store.scheduleCountdown(code, 'host', 2).ok, false);

  ready();
  const requested = store.requestRetake(code, 'guest', 1);
  const approved = store.decideRetake(code, 'host', requested.retakePrompt.requestId, true);
  assert.ok(approved.participants.every(p => !p.ready));
  store.setReady(code, guest.participantId, true);
  assert.equal(store.scheduleCountdown(code, 'host', 1).ok, false);
  ready();
  const retake = store.scheduleCountdown(code, 'host', 1);
  assert.ok(retake.ok);
  assert.equal(store.syncCapturedFrame(code, 'guest', 0, id, image), null);
  assert.equal(store.syncCapturedFrame(code, 'host', 0, retake.countdown.attemptId, image), null);
  assert.equal(store.syncCapturedFrame(code, 'guest', 0, retake.countdown.attemptId, image).syncedFrames[0].retakes.guest, 1);
});

test('an interrupted countdown can be retried after fresh consent', () => {
  const { store, code, ready } = duo();
  ready();
  const first = store.scheduleCountdown(code, 'host', 1);
  assert.ok(first.ok);
  const [expired] = store.expireCountdowns(first.countdown.targetCaptureAtServer + 16_000);
  assert.equal(expired.countdown, null);
  assert.equal(store.scheduleCountdown(code, 'host', 1).ok, false);
  ready();
  assert.ok(store.scheduleCountdown(code, 'host', 1).ok);
});

test('Solo admission and Duo session phases are enforced by the store', () => {
  const { store, code } = duo();
  assert.equal(store.joinRoom(store.createRoom({ mode: 'solo' }).code, 'Guest').ok, false);
  assert.equal(store.updateConfig(code, 'guest', { phase: 'ended' }).ok, false);
  assert.equal(store.updateConfig(code, 'host', { phase: 'countdown' }).ok, false);
});
