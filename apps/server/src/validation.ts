import { z } from 'zod';
import {
  CAMERA_ACCESSORY_IDS, PHOTO_FILTER_PRESETS, CLASSIC_TEMPLATE_PRESETS, FLIPBOOK_OVERLAY_EFFECTS,
  type ClientToServerMessage,
} from '../../../packages/shared/src/index.ts';

const role = z.enum(['host', 'guest']);
const code = z.string().trim().toUpperCase().regex(/^MMT-[A-Z0-9]{4,10}$/);
const id = z.string().min(1).max(100);
const pose = z.int().min(1).max(8);
const filter = z.enum(PHOTO_FILTER_PRESETS.map(item => item.id));
const layout = z.enum(CLASSIC_TEMPLATE_PRESETS.map(item => item.id));
const accessory = z.object({ role, id: z.enum(CAMERA_ACCESSORY_IDS) });
const position = z.object({
  xPct: z.number().min(0).max(100), yPct: z.number().min(0).max(100),
  scale: z.number().min(0.1).max(8), rotation: z.number().min(-3600).max(3600),
});
const sticker = position.extend({
  instanceId: id, stickerId: id, owner: role, emoji: z.string().max(32), label: z.string().max(100),
  category: z.enum(['sticker', 'emoticon', 'stamp', 'tape']).optional(), badgeText: z.string().max(100).optional(),
});
const editorBase = z.object({ type: z.literal('editor:operation'), opId: id });
const editor = z.discriminatedUnion('kind', [
  editorBase.extend({ kind: z.literal('toggle-sticker'), stickerId: id }),
  editorBase.extend({ kind: z.literal('set-tint'), value: z.string().regex(/^#[a-f0-9]{6}$/i) }),
  editorBase.extend({ kind: z.literal('set-caption'), value: z.string().max(512) }),
  editorBase.extend({ kind: z.literal('add-sticker'), placedSticker: sticker }),
  editorBase.extend({ kind: z.literal('update-sticker'), instanceId: id, patch: position.partial() }),
  editorBase.extend({ kind: z.literal('remove-sticker'), instanceId: id }),
]);
const message = z.discriminatedUnion('type', [
  z.object({ type: z.literal('room:create'), displayName: z.string().max(80).optional(),
    mode: z.enum(['solo', 'duo']).optional(), takeCount: pose.optional(), selectedFilter: filter.optional() }),
  z.object({ type: z.literal('room:join'), code, displayName: z.string().max(80).optional() }),
  z.object({ type: z.literal('room:rejoin'), code, rejoinToken: z.uuid() }),
  z.object({ type: z.literal('room:leave') }),
  z.object({ type: z.literal('participant:ready'), ready: z.boolean() }),
  z.object({ type: z.literal('session:config'), takeCount: pose.optional(), selectedFilter: filter.optional(),
    phase: z.enum(['waiting','setup','ready','countdown','capturing','syncing','review','editing','export','ended']).optional(),
    classicCameraEffect: z.object({ overlay: z.enum(FLIPBOOK_OVERLAY_EFFECTS.map(item => item.id)).optional(), accessory: accessory.optional() }).optional(),
    flipbookAccessory: accessory.optional(), layout: layout.optional() }),
  z.object({ type: z.literal('clock:ping'), clientSentAt: z.number().nonnegative() }),
  z.object({ type: z.literal('capture:request'), takeNumber: pose }),
  z.object({ type: z.literal('capture:ack'), attemptId: id }),
  z.object({ type: z.literal('capture:frame-sync'), attemptId: z.uuid(), frameIndex: z.int().min(0).max(7),
    dataUrl: z.string().max(3_500_000).regex(/^data:image\/(?:png|jpeg);base64,[a-zA-Z0-9+/]+=*$/).optional() }),
  z.object({ type: z.literal('retake:request'), frameId: pose }),
  z.object({ type: z.literal('retake:decision'), requestId: id, approved: z.boolean() }),
  z.object({ type: z.literal('editor:personal-undo') }),
  z.object({ type: z.literal('webrtc:signal'), signal: z.discriminatedUnion('kind', [
    z.object({ kind: z.enum(['offer','answer']), sdp: z.string().max(100_000) }),
    z.object({ kind: z.literal('ice'), candidate: z.object({
      candidate: z.string().max(4096), sdpMid: z.string().max(64).nullish(), sdpMLineIndex: z.int().nullish(),
      usernameFragment: z.string().max(256).nullish(),
    }) }),
  ]) }),
]);

export function parseMessage(raw: string): ClientToServerMessage | null {
  try {
    const value = JSON.parse(raw);
    const parsed = value?.type === 'editor:operation' ? editor.safeParse(value) : message.safeParse(value);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
