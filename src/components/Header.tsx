import React, { useState, useRef, useEffect } from 'react';
import { Download, LogOut, User as UserIcon, ChevronDown } from 'lucide-react';
import { User } from '../services/api';
import { UserAvatar } from './UserAvatar';

interface HeaderProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  onExport: () => void;
  currentUser?: User | null;
  onLogout?: () => void;
  activeTab?: string;
  isOffline?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onExport,
  currentUser,
  onLogout,
  activeTab = 'inventory',
  isOffline = false
}) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const firstName = currentUser?.name ? currentUser.name.split(' ')[0] : 'Usuario';
  const defaultAvatar = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80';

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getExportLabel = () => {
    switch (activeTab) {
      case 'inventory': return 'Exportar PDF Inventario';
      case 'sales': return 'Exportar PDF Ventas';
      case 'batches': return 'Exportar PDF Lotes & Aduana';
      case 'users': return 'Exportar PDF Usuarios';
      default: return 'Exportar PDF Inventario';
    }
  };

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
            <span className="hidden sm:inline-flex text-[10px] font-bold text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20 animate-pulse shrink-0">
              ⚠️ Servidor Desconectado
            </span>
          )}
        </div>
        <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
          ¡Hola, <span className="font-semibold text-indigo-600 dark:text-indigo-400">{firstName}</span>!
        </p>
      </div>

      <div className="flex items-center space-x-2.5 shrink-0">
        {/* Contextual Export Button (Solo visible para Administradores) */}
        {currentUser?.role !== 'Vendedor' && (
          <button
            onClick={onExport}
            title={getExportLabel()}
            className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm transition shadow-lg shadow-indigo-600/20 cursor-pointer active:scale-95"
          >
            <Download className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">{getExportLabel()}</span>
          </button>
        )}

        {/* Profile Avatar Dropdown Button & Popover */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center space-x-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900/90 dark:hover:bg-slate-700/60 p-1.5 sm:px-3 sm:py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 transition cursor-pointer"
          >
            <UserAvatar name={currentUser?.name} size="w-7 h-7 text-[10px]" />
            <span className="text-xs font-bold text-slate-900 dark:text-white hidden sm:inline">{firstName}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
          </button>

          {/* Profile Dropdown Popover */}
          {showProfileMenu && (
            <div className="absolute right-0 top-full mt-2 w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl z-50 p-3 space-y-3 ring-4 ring-indigo-500/10">
              <div className="flex items-center space-x-3 p-1">
                <UserAvatar name={currentUser?.name} size="w-9 h-9 text-xs" />
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">{currentUser?.name || 'Usuario'}</h4>
                  <span className="inline-block mt-0.5 text-[9px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 px-1.5 py-0.5 rounded font-semibold">
                    {currentUser?.role || 'Administrador'}
                  </span>
                </div>
              </div>

              <div className="border-t border-slate-200 dark:border-slate-800 pt-2">
                {onLogout && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileMenu(false);
                      onLogout();
                    }}
                    className="w-full flex items-center space-x-2.5 px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 shrink-0" />
                    <span>Cerrar Sesión</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
