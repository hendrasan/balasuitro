// Svelte action: drag children (marked with data-idx) left/right to reorder.
// Taps still reach the child's own click handler; a click right after a drag is swallowed.
export interface ReorderParams {
  onMove: (from: number, to: number) => void;
  disabled?: boolean;
}

export function reorderable(node: HTMLElement, params: ReorderParams) {
  let p = params;
  let start: { x: number; idx: number; el: HTMLElement; id: number } | null = null;
  let active = false;
  let swallow = false;

  const items = () => [...node.querySelectorAll<HTMLElement>(':scope > [data-idx]')];

  function down(e: PointerEvent) {
    if (p.disabled || e.button !== 0) return;
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-idx]');
    if (!el || el.parentElement !== node) return;
    start = { x: e.clientX, idx: Number(el.dataset.idx), el, id: e.pointerId };
    active = false;
  }

  function move(e: PointerEvent) {
    if (!start || e.pointerId !== start.id) return;
    const dx = e.clientX - start.x;
    if (!active && Math.abs(dx) > 10) {
      active = true;
      node.setPointerCapture(e.pointerId);
      start.el.classList.add('dragging');
    }
    if (active) {
      start.el.style.transform = `translate(${dx}px, -10px) rotate(${Math.max(-8, Math.min(8, dx / 30))}deg)`;
      e.preventDefault();
    }
  }

  function up(e: PointerEvent) {
    if (!start) return;
    const s = start;
    start = null;
    if (!active) return;
    active = false;
    s.el.style.transform = '';
    s.el.classList.remove('dragging');
    swallow = true;
    setTimeout(() => (swallow = false), 0);
    const to = items().filter((el) => el !== s.el && el.getBoundingClientRect().left + el.offsetWidth / 2 < e.clientX).length;
    if (to !== s.idx) p.onMove(s.idx, to);
  }

  function click(e: MouseEvent) {
    if (swallow) {
      e.stopPropagation();
      e.preventDefault();
    }
  }

  node.addEventListener('pointerdown', down);
  node.addEventListener('pointermove', move);
  node.addEventListener('pointerup', up);
  node.addEventListener('pointercancel', up);
  node.addEventListener('click', click, true);
  return {
    update(np: ReorderParams) {
      p = np;
    },
    destroy() {
      node.removeEventListener('pointerdown', down);
      node.removeEventListener('pointermove', move);
      node.removeEventListener('pointerup', up);
      node.removeEventListener('pointercancel', up);
      node.removeEventListener('click', click, true);
    },
  };
}
