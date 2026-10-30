import { useState, useEffect, useRef, useMemo } from 'react';
import { MEDICAL_CENTERS, MedicalCenter } from '../data/centers';
import { FilterWorkerRequest, FilterWorkerResponse } from '../workers/filterWorker';
import { norm, squash } from '../utils/persian';

interface UseCenterWorkerFilterOptions {
  query: string;
  selectedType: string;
  selectedStreet: string;
  onlyNightShift: boolean;
  saved: Set<number>;
  activeTab: 'centers' | 'saved' | 'guide';
}

// Synchronous fallback filter if Web Workers are unavailable or while initializing
function fallbackFilter(
  centers: MedicalCenter[],
  query: string,
  selectedType: string,
  selectedStreet: string,
  onlyNightShift: boolean,
  saved: Set<number>,
  activeTab: string
): MedicalCenter[] {
  const nq = norm(query);
  const tokens = nq ? nq.split(' ').filter(Boolean) : [];
  const results: { center: MedicalCenter; score: number }[] = [];

  for (const r of centers) {
    if (activeTab === 'saved' && !saved.has(r.k)) continue;
    if (selectedType && r.type !== selectedType) continue;
    if (selectedStreet && !r.streets.includes(selectedStreet)) continue;
    if (onlyNightShift && !r.isNightShift) continue;

    let score = 0;
    let matched = true;

    if (tokens.length > 0) {
      const searchableText = [r.name, r.type, r.specialty, ...(r.alt || [])].filter(Boolean).join(' ');
      const normalizedName = norm(searchableText);
      const nameS = squash(normalizedName);
      const words = normalizedName.split(' ');
      const ph = [r.phone, ...(r.alt || [])].filter(Boolean).join(' ');

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

  return results.map((x) => x.center);
}

export function useCenterWorkerFilter({
  query,
  selectedType,
  selectedStreet,
  onlyNightShift,
  saved,
  activeTab,
}: UseCenterWorkerFilterOptions) {
  // Initial state calculated once synchronously for instantaneous zero-delay first paint
  const [filteredCenters, setFilteredCenters] = useState<MedicalCenter[]>(() =>
    fallbackFilter(
      MEDICAL_CENTERS,
      query,
      selectedType,
      selectedStreet,
      onlyNightShift,
      saved,
      activeTab
    )
  );

  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef(0);

  // Initialize Web Worker once
  useEffect(() => {
    if (typeof Worker !== 'undefined') {
      try {
        const worker = new Worker(
          new URL('../workers/filterWorker.ts', import.meta.url),
          { type: 'module' }
        );

        worker.onmessage = (event: MessageEvent<FilterWorkerResponse>) => {
          const { id, results } = event.data;
          // Discard out-of-order or stale worker responses
          if (id === requestIdRef.current) {
            setFilteredCenters(results);
          }
        };

        workerRef.current = worker;

        return () => {
          worker.terminate();
          workerRef.current = null;
        };
      } catch (err) {
        console.warn('Worker initialization note, using main thread fallback:', err);
      }
    }
  }, []);

  const savedArray = useMemo(() => Array.from(saved), [saved]);

  // Dispatch filter request to worker on every parameter change
  useEffect(() => {
    const nextId = ++requestIdRef.current;

    if (workerRef.current) {
      const message: FilterWorkerRequest = {
        id: nextId,
        query,
        selectedType,
        selectedStreet,
        onlyNightShift,
        savedIds: savedArray,
        activeTab,
      };
      workerRef.current.postMessage(message);
    } else {
      // Main-thread fallback
      const syncResults = fallbackFilter(
        MEDICAL_CENTERS,
        query,
        selectedType,
        selectedStreet,
        onlyNightShift,
        saved,
        activeTab
      );
      setFilteredCenters(syncResults);
    }
  }, [query, selectedType, selectedStreet, onlyNightShift, savedArray, activeTab, saved]);

  return filteredCenters;
}
