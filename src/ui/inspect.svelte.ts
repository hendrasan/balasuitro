// What the inspect panel shows. Hover sets `hover`; a tap pins it.
import type { Edition } from '../engine/cards';

export type InspectTarget =
  | { kind: 'joker'; uid: number }
  | { kind: 'jokerData'; id: string; edition: Edition; where: 'shop' | 'pack' | 'collection' }
  | { kind: 'cons'; uid: number }
  | { kind: 'consData'; id: string };

class InspectState {
  hover = $state<InspectTarget | null>(null);
  pinned = $state<InspectTarget | null>(null);

  get current(): InspectTarget | null {
    return this.pinned ?? this.hover;
  }

  pin(t: InspectTarget): void {
    this.pinned = same(this.pinned, t) ? null : t;
  }

  close(): void {
    this.pinned = null;
    this.hover = null;
  }
}

function same(a: InspectTarget | null, b: InspectTarget): boolean {
  return !!a && JSON.stringify(a) === JSON.stringify(b);
}

export const inspect = new InspectState();
