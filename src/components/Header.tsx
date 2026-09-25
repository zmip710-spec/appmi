import React from 'react';
import { User } from '../services/api';

interface HeaderProps {
  searchTerm?: string;
  setSearchTerm?: (term: string) => void;
  onExport?: () => void;
  currentUser?: User | null;
  onLogout?: () => void;
  activeTab?: string;
  isOffline?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  activeTab = 'inventory',
  isOffline = false
}) => {
  const firstName = currentUser?.name ? currentUser.name.split(' ')[0] : 'Usuario';

  const getTabTitle = () => {
    switch (activeTab) {
      case 'inventory': return 'Inventario & Stock Físico';
      case 'multistore': return 'Inventario Multitienda & Traslados';
      case 'sales': return 'Módulo de Ventas POS';
      case 'batches': return 'Lotes de Importación & Aduana';
      case 'analytics': return 'Inteligencia de Negocios & Analítica';
      case 'users': return 'Gestión de Equipo & Usuarios';
      case 'settings': return 'Configuración de Cuenta';
      default: return 'Resumen General Dashboard';
    }
  };

  return (
    <header className="sticky top-0 z-20 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800/80 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between shadow-xs">
      {/* Title & Page Header Info */}
      <div className="flex-1 min-w-0 pr-4">
        <div className="flex items-center space-x-2">
          <h2 className="text-base sm:text-xl font-bold text-slate-900 dark:text-white truncate tracking-tight">
            {getTabTitle()}
          </h2>
          {isOffline && (
            <span className="inline-flex text-[10px] font-bold text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20 animate-pulse shrink-0">
              ⚠️ Servidor Desconectado
            </span>
          )}
        </div>
        <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
          ¡Hola, <span className="font-semibold text-indigo-600 dark:text-indigo-400">{firstName}</span>!
        </p>
      </div>
    </header>
  );
};
