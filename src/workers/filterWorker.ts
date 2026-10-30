import { MEDICAL_CENTERS, MedicalCenter } from '../data/centers';
import { norm, squash } from '../utils/persian';

export interface FilterWorkerRequest {
  id: number;
  query: string;
  selectedType: string;
  selectedStreet: string;
  onlyNightShift: boolean;
  savedIds: number[];
  activeTab: 'centers' | 'saved' | 'guide';
}

export interface FilterWorkerResponse {
  id: number;
  results: MedicalCenter[];
}

// Fisher-Yates shuffle
function shuffleCenters(centers: MedicalCenter[]): MedicalCenter[] {
  const shuffled = [...centers];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Pre-index items once inside the worker thread
const initialRandomized = shuffleCenters(MEDICAL_CENTERS);

const indexedItems = initialRandomized.map((r) => {
  const searchableText = [r.name, r.type, r.specialty, ...(r.alt || [])].filter(Boolean).join(' ');
  const normalizedName = norm(searchableText);
  const phones = [r.phone, ...(r.alt || [])].filter(Boolean).join(' ');
  return {
    r,
    name: normalizedName,
    nameS: squash(normalizedName),
    words: normalizedName.split(' '),
    ph: phones,
  };
});

self.onmessage = (event: MessageEvent<FilterWorkerRequest>) => {
  const { id, query, selectedType, selectedStreet, onlyNightShift, savedIds = [], activeTab } = event.data;

  const savedSet = new Set(savedIds);
  const nq = norm(query);
  const tokens = nq ? nq.split(' ').filter(Boolean) : [];
  const results: { center: MedicalCenter; score: number }[] = [];

  for (const item of indexedItems) {
    const { r, nameS, words, ph } = item;

    // Tab filter: Saved
    if (activeTab === 'saved' && !savedSet.has(r.k)) continue;

    // Category filter
    if (selectedType && r.type !== selectedType) continue;

    // Street filter
    if (selectedStreet && !r.streets.includes(selectedStreet)) continue;

    // Night shift filter
    if (onlyNightShift && !r.isNightShift) continue;

    // Search token matching
    let score = 0;
    let matched = true;

    for (const token of tokens) {
      const tokenSquash = squash(token);
      if (/^\d{3,}$/.test(token)) {
        if (ph.includes(token)) {
          score += 2;
        } else {
          matched = false;
          break;
        }
      } else if (nameS.includes(tokenSquash)) {
        score += words.some((w) => w.startsWith(token)) ? 4 : 2;
      } else {
        matched = false;
        break;
      }
    }

    if (matched) {
      results.push({ center: r, score });
    }
  }

  if (tokens.length > 0) {
    results.sort(
      (a, b) => b.score - a.score || a.center.name.localeCompare(b.center.name, 'fa')
    );
  }

  const response: FilterWorkerResponse = {
    id,
    results: results.map((x) => x.center),
  };

  self.postMessage(response);
};
