// Portrait files live in public/portraits/<id>.webp. Only ids listed in
// src/data/portraits.json are requested, so missing art never causes a 404.
import list from '../data/portraits.json';

const HAVE = new Set(list as string[]);

export function portraitUrl(id: string): string | null {
  return HAVE.has(id) ? `${import.meta.env.BASE_URL}portraits/${id}.webp` : null;
}
