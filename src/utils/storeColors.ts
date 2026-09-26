import { useState, useEffect } from 'react';

export interface StoreColor {
  id: string;
  name: string;
  hex: string;
  borderClass: string;
  textClass: string;
  bgClass: string;
  badgeClass: string;
  lightBadgeClass: string;
  ringClass: string;
  activeBtnClass: string;
  pillClass: string;
}

export const STORE_PALETTE: StoreColor[] = [
  {
    id: 'indigo',
    name: 'Azul Índigo',
    hex: '#6366f1',
    borderClass: 'border-indigo-500',
    textClass: 'text-indigo-400',
    bgClass: 'bg-indigo-500/10',
    badgeClass: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30',
    lightBadgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/30',
    ringClass: 'ring-indigo-500',
    activeBtnClass: 'bg-indigo-600 text-white shadow-md border border-indigo-500/40',
    pillClass: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
  },
  {
    id: 'emerald',
    name: 'Esmeralda',
    hex: '#10b981',
    borderClass: 'border-emerald-500',
    textClass: 'text-emerald-400',
    bgClass: 'bg-emerald-500/10',
    badgeClass: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30',
    lightBadgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30',
    ringClass: 'ring-emerald-500',
    activeBtnClass: 'bg-emerald-600 text-white shadow-md border border-emerald-500/40',
    pillClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
  },
  {
    id: 'amber',
    name: 'Ámbar / Dorado',
    hex: '#f59e0b',
    borderClass: 'border-amber-500',
    textClass: 'text-amber-400',
    bgClass: 'bg-amber-500/10',
    badgeClass: 'bg-amber-500/10 text-amber-400 border border-amber-500/30',
    lightBadgeClass: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30',
    ringClass: 'ring-amber-500',
    activeBtnClass: 'bg-amber-600 text-white shadow-md border border-amber-500/40',
    pillClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40'
  },
  {
    id: 'pink',
    name: 'Fucsia / Rosa',
    hex: '#ec4899',
    borderClass: 'border-pink-500',
    textClass: 'text-pink-400',
    bgClass: 'bg-pink-500/10',
    badgeClass: 'bg-pink-500/10 text-pink-400 border border-pink-500/30',
    lightBadgeClass: 'bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-500/10 dark:text-pink-400 dark:border-pink-500/30',
    ringClass: 'ring-pink-500',
    activeBtnClass: 'bg-pink-600 text-white shadow-md border border-pink-500/40',
    pillClass: 'bg-pink-500/20 text-pink-300 border-pink-500/40'
  },
  {
    id: 'cyan',
    name: 'Cian',
    hex: '#06b6d4',
    borderClass: 'border-cyan-500',
    textClass: 'text-cyan-400',
    bgClass: 'bg-cyan-500/10',
    badgeClass: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30',
    lightBadgeClass: 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-500/10 dark:text-cyan-400 dark:border-cyan-500/30',
    ringClass: 'ring-cyan-500',
    activeBtnClass: 'bg-cyan-600 text-white shadow-md border border-cyan-500/40',
    pillClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
  },
  {
    id: 'purple',
    name: 'Violeta / Púrpura',
    hex: '#8b5cf6',
    borderClass: 'border-purple-500',
    textClass: 'text-purple-400',
    bgClass: 'bg-purple-500/10',
    badgeClass: 'bg-purple-500/10 text-purple-400 border border-purple-500/30',
    lightBadgeClass: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/30',
    ringClass: 'ring-purple-500',
    activeBtnClass: 'bg-purple-600 text-white shadow-md border border-purple-500/40',
    pillClass: 'bg-purple-500/20 text-purple-300 border-purple-500/40'
  },
  {
    id: 'blue',
    name: 'Azul Eléctrico',
    hex: '#3b82f6',
    borderClass: 'border-blue-500',
    textClass: 'text-blue-400',
    bgClass: 'bg-blue-500/10',
    badgeClass: 'bg-blue-500/10 text-blue-400 border border-blue-500/30',
    lightBadgeClass: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/30',
    ringClass: 'ring-blue-500',
    activeBtnClass: 'bg-blue-600 text-white shadow-md border border-blue-500/40',
    pillClass: 'bg-blue-500/20 text-blue-300 border-blue-500/40'
  },
  {
    id: 'orange',
    name: 'Naranja Radiante',
    hex: '#f97316',
    borderClass: 'border-orange-500',
    textClass: 'text-orange-400',
    bgClass: 'bg-orange-500/10',
    badgeClass: 'bg-orange-500/10 text-orange-400 border border-orange-500/30',
    lightBadgeClass: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/30',
    ringClass: 'ring-orange-500',
    activeBtnClass: 'bg-orange-600 text-white shadow-md border border-orange-500/40',
    pillClass: 'bg-orange-500/20 text-orange-300 border-orange-500/40'
  }
];

export const DEFAULT_STORE_COLORS: Record<string, string> = {
  tienda_1: '#6366f1', // Indigo
  tienda_2: '#10b981', // Emerald
  tienda_3: '#f59e0b', // Amber
};

const STORAGE_KEY = 'appmi_store_colors';

export const getStoreColorMap = (): Record<string, string> => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return { ...DEFAULT_STORE_COLORS, ...JSON.parse(saved) };
    }
  } catch {}
  return { ...DEFAULT_STORE_COLORS };
};

export const saveStoreColorInStorage = (storeId: string, hex: string) => {
  try {
    const current = getStoreColorMap();
    current[storeId] = hex;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    window.dispatchEvent(new Event('store_colors_updated'));
  } catch {}
};

export const getStoreColor = (storeId: string, explicitHex?: string): StoreColor => {
  const map = getStoreColorMap();
  const hex = (explicitHex || map[storeId] || DEFAULT_STORE_COLORS[storeId] || '#6366f1').toLowerCase();
  
  const found = STORE_PALETTE.find(c => c.hex.toLowerCase() === hex);
  if (found) return found;

  // Fallback to first
  return STORE_PALETTE[0];
};

export const useStoreColors = () => {
  const [colorMap, setColorMap] = useState<Record<string, string>>(getStoreColorMap);

  useEffect(() => {
    const handleUpdate = () => {
      setColorMap(getStoreColorMap());
    };

    window.addEventListener('store_colors_updated', handleUpdate);
    window.addEventListener('stores_updated', handleUpdate);

    return () => {
      window.removeEventListener('store_colors_updated', handleUpdate);
      window.removeEventListener('stores_updated', handleUpdate);
    };
  }, []);

  const getColor = (storeId: string, explicitHex?: string) => {
    return getStoreColor(storeId, explicitHex || colorMap[storeId]);
  };

  return { colorMap, getColor };
};
