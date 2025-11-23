/**
 * Test History Management - localStorage based test history
 */

import { TestHistoryEntry } from './speedtest-client';

const HISTORY_KEY = 'speedflux_test_history';
const MAX_HISTORY_ENTRIES = 50;

export const saveTestToHistory = (entry: Omit<TestHistoryEntry, 'id' | 'timestamp'>): void => {
  try {
    const history = getTestHistory();
    const newEntry: TestHistoryEntry = {
      id: `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      ...entry,
    };

    history.unshift(newEntry);
    
    // Keep only last MAX_HISTORY_ENTRIES entries
    if (history.length > MAX_HISTORY_ENTRIES) {
      history.splice(MAX_HISTORY_ENTRIES);
    }

    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch (error) {
    console.error('Failed to save test to history:', error);
  }
};

export const getTestHistory = (): TestHistoryEntry[] => {
  try {
    const stored = localStorage.getItem(HISTORY_KEY);
    if (!stored) return [];
    
    const history = JSON.parse(stored) as TestHistoryEntry[];
    return history.sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    console.error('Failed to load test history:', error);
    return [];
  }
};

export const clearTestHistory = (): void => {
  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch (error) {
    console.error('Failed to clear test history:', error);
  }
};

export const getHistoryStats = () => {
  const history = getTestHistory();
  if (history.length === 0) {
    return null;
  }

  const downloads = history.map(h => h.download).filter(Boolean);
  const uploads = history.map(h => h.upload).filter(Boolean);
  const pings = history.map(h => h.ping).filter(Boolean);

  return {
    totalTests: history.length,
    avgDownload: downloads.length > 0 ? downloads.reduce((a, b) => a + b, 0) / downloads.length : 0,
    avgUpload: uploads.length > 0 ? uploads.reduce((a, b) => a + b, 0) / uploads.length : 0,
    avgPing: pings.length > 0 ? pings.reduce((a, b) => a + b, 0) / pings.length : 0,
    bestDownload: Math.max(...downloads, 0),
    bestUpload: Math.max(...uploads, 0),
    bestPing: Math.min(...pings, Infinity),
  };
};

