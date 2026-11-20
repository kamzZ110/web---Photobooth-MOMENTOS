import type { BoothMode } from '@momentos/shared';

export type EffectDemoId =
  | 'kiss-relay' | 'comic-boom' | 'wink-spark' | 'bunny-peace'
  | 'magic-wipe' | 'power-up-duo' | 'nope-shake' | 'color-trail-wave';

export interface EffectDemo {
  id: EffectDemoId;
  mode: BoothMode;
  name: string;
  color: string;
  result: string;
  gestures: readonly [string] | readonly [string, string];
  sequential?: boolean;
}

export const EFFECT_DEMOS: readonly EffectDemo[] = [
  { id: 'comic-boom', mode: 'solo', name: 'Comic Boom', color: '#ffcc65',
    gestures: ['Buka mulut seperti kaget'], result: 'Ledakan BOOM! muncul seperti panel komik.' },
  { id: 'wink-spark', mode: 'solo', name: 'Wink Spark', color: '#ad9be5',
    gestures: ['Kedipkan satu mata'], result: 'Kilau melesat dari mata dan pecah menjadi bintang kecil.' },
  { id: 'bunny-peace', mode: 'solo', name: 'Bunny Peace', color: '#f4bacd',
    gestures: ['Angkat tanda peace di samping kepala'], result: 'Telinga kelinci muncul dan seekor kelinci melompat lewat.' },
  { id: 'nope-shake', mode: 'solo', name: 'Nope Shake', color: '#ffab91',
    gestures: ['Gelengkan kepala ke kiri lalu ke kanan'], result: 'Tulisan NOPE! muncul dengan garis gerak seperti meme.' },
  { id: 'kiss-relay', mode: 'duo', name: 'Kiss Relay', color: '#ed91ad', sequential: true,
    gestures: ['Tiup kiss ke arah tengah', 'Buka telapak tangan untuk menangkap'],
    result: 'Hati terbang ke pasangan lalu pecah menjadi hati kecil.' },
  { id: 'magic-wipe', mode: 'duo', name: 'Magic Wipe', color: '#9d96e6', sequential: true,
    gestures: ['Dekatkan telapak hingga menutup kamera', 'Sibakkan telapak ke samping'],
    result: 'Sapuan sulap membuka adegan baru dengan topi dan bintang.' },
  { id: 'power-up-duo', mode: 'duo', name: 'Power-Up Duo', color: '#b9de77',
    gestures: ['Angkat jempol', 'Angkat jempol'], result: 'Aura dua pemain menyala dan bergabung di tengah.' },
  { id: 'color-trail-wave', mode: 'duo', name: 'Color Trail Wave', color: '#85c6ef',
    gestures: ['Lambaikan tangan ke tengah', 'Lambaikan tangan ke tengah'],
    result: 'Dua jejak warna bertemu dan pecah seperti kembang api.' },
];
