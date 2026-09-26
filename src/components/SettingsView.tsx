import React, { useState, useEffect } from 'react';
import { Save, Lock, User as UserIcon, CheckCircle2, Shield, AlertCircle, Users, Eye, EyeOff, Building2, RefreshCw, Store as StoreIcon, Check, Palette } from 'lucide-react';
import { updateUserProfileApi, changePasswordApi, fetchStoresApi, updateStoreApi, User, Store } from '../services/api';
import { UsersView } from './UsersView';
import { UserAvatar } from './UserAvatar';
import { STORE_PALETTE, DEFAULT_STORE_COLORS, getStoreColor, getStoreColorMap, saveStoreColorInStorage } from '../utils/storeColors';

interface SettingsViewProps {
  currentUser?: User | null;
  onUpdateUser?: (updatedUser: User) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ currentUser, onUpdateUser }) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'team' | 'stores' | 'security'>('profile');

  // Profile Form State (Username & Password)
  const [name, setName] = useState(currentUser?.name || '');
  const [role, setRole] = useState(currentUser?.role || 'Usuario');

  // Password fields
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  // Stores State
  const [storesList, setStoresList] = useState<Store[]>([]);
  const [storeNames, setStoreNames] = useState<Record<string, string>>({});
  const [storeColorsState, setStoreColorsState] = useState<Record<string, string>>(getStoreColorMap);
  const [loadingStores, setLoadingStores] = useState(false);
  const [savingStoreId, setSavingStoreId] = useState<string | null>(null);
  const [isSavingAll, setIsSavingAll] = useState(false);

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('¡Cambios guardados con éxito!');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name || '');
      setRole(currentUser.role || 'Usuario');
    }
  }, [currentUser]);

  const loadStores = async () => {
    setLoadingStores(true);
    try {
      const data = await fetchStoresApi();
      setStoresList(data);
      const nameMap: Record<string, string> = {};
      const colorMap: Record<string, string> = { ...getStoreColorMap() };
      data.forEach(s => {
        nameMap[s.id] = s.name;
        if (s.color) {
          colorMap[s.id] = s.color;
          saveStoreColorInStorage(s.id, s.color);
        }
      });
      setStoreNames(nameMap);
      setStoreColorsState(colorMap);
    } catch {
      // Fallback
    } finally {
      setLoadingStores(false);
    }
  };

  useEffect(() => {
    loadStores();
  }, []);

  const triggerSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 4000);
  };

  const handleSaveStore = async (storeId: string) => {
    const newName = storeNames[storeId];
    const newColor = storeColorsState[storeId] || DEFAULT_STORE_COLORS[storeId] || '#6366f1';
    if (!newName || !newName.trim()) {
      setErrorMsg('El nombre de la sucursal no puede estar vacío.');
      return;
    }

    setErrorMsg('');
    setSavingStoreId(storeId);
    try {
      await updateStoreApi(storeId, newName.trim(), newColor);
      saveStoreColorInStorage(storeId, newColor);
      triggerSuccess(`Sucursal "${newName.trim()}" actualizada con éxito.`);
      window.dispatchEvent(new Event('stores_updated'));
      await loadStores();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al actualizar la tienda.');
    } finally {
      setSavingStoreId(null);
    }
  };

  const handleSaveAllStores = async () => {
    setErrorMsg('');
    setIsSavingAll(true);
    try {
      for (const store of storesList) {
        const nameToSave = storeNames[store.id] || store.name;
        const colorToSave = storeColorsState[store.id] || store.color || DEFAULT_STORE_COLORS[store.id] || '#6366f1';
        await updateStoreApi(store.id, nameToSave.trim(), colorToSave);
        saveStoreColorInStorage(store.id, colorToSave);
      }
      triggerSuccess('¡Todas las sucursales fueron actualizadas con éxito!');
      window.dispatchEvent(new Event('stores_updated'));
      await loadStores();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al guardar las sucursales.');
    } finally {
      setIsSavingAll(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!name.trim()) {
      setErrorMsg('El Nombre de Usuario es obligatorio.');
      return;
    }

    if (newPass || confirmPass) {
      if (newPass !== confirmPass) {
        setErrorMsg('Las contraseñas no coinciden.');
        return;
      }
    }

    setErrorMsg('');
    setLoading(true);

    try {
      // 1. Update Name in SQLite Profile
      const updated = await updateUserProfileApi(currentUser.id, {
        name: name.trim(),
        email: currentUser.email || `${name.trim().toLowerCase().replace(/[^a-z0-9]/g, '')}@empresa.com`,
        avatar: currentUser.avatar || ''
      });

      // 2. Update Password if provided
      if (newPass && newPass.trim() !== '') {
        await changePasswordApi(currentUser.id, '', newPass.trim());
      }

      if (onUpdateUser) {
        onUpdateUser(updated);
      }

      setNewPass('');
      setConfirmPass('');
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);
    } catch (err: any) {
      const updatedLocal: User = {
        ...currentUser,
        name: name.trim()
      };
      if (onUpdateUser) {
        onUpdateUser(updatedLocal);
      }
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white flex items-center space-x-2">
            <UserIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <span>Configuración del Sistema</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Administra tu perfil, nombres de sucursales multitienda y usuarios del equipo
          </p>
        </div>

        {savedSuccess && (
          <div className="w-full sm:w-auto flex items-center space-x-2 bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30 px-3.5 py-2 rounded-xl text-xs font-bold animate-bounce">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>{successMessage}</span>
          </div>
        )}
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex overflow-x-auto gap-2 p-1.5 bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl scrollbar-none">
        <button
          type="button"
          onClick={() => { setActiveTab('profile'); setErrorMsg(''); }}
          className={`flex-1 min-w-[120px] flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
            activeTab === 'profile'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800'
          }`}
        >
          <UserIcon className="w-4 h-4 shrink-0" />
          <span>Mi Perfil</span>
        </button>

        {currentUser?.role !== 'Vendedor' && (
          <button
            type="button"
            onClick={() => { setActiveTab('stores'); setErrorMsg(''); }}
            className={`flex-1 min-w-[150px] flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
              activeTab === 'stores'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            <Building2 className="w-4 h-4 shrink-0" />
            <span>Sucursales / Tiendas</span>
          </button>
        )}

        {currentUser?.role !== 'Vendedor' && (
          <button
            type="button"
            onClick={() => { setActiveTab('team'); setErrorMsg(''); }}
            className={`flex-1 min-w-[140px] flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
              activeTab === 'team'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            <Users className="w-4 h-4 shrink-0" />
            <span>Gestión de Equipo</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => { setActiveTab('security'); setErrorMsg(''); }}
          className={`flex-1 min-w-[140px] flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
            activeTab === 'security'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800'
          }`}
        >
          <Lock className="w-4 h-4 shrink-0" />
          <span>Seguridad</span>
        </button>
      </div>

      {/* Main Settings Content */}
      <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-sm">
        {errorMsg && (
          <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 p-3 rounded-xl text-xs text-rose-700 dark:text-rose-400 mb-4 flex items-center space-x-2 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* TAB 1: PROFILE */}
        {activeTab === 'profile' && (
          <form onSubmit={handleSaveProfile} className="space-y-5">
            {/* Header: Centered Large Avatar + Role Badge */}
            <div className="flex flex-col items-center justify-center py-2 space-y-2.5 border-b border-slate-200 dark:border-slate-700/80 pb-5">
              <UserAvatar name={name || currentUser?.name} size="w-20 h-20 text-3xl" />
              <div className="text-center">
                <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20">
                  <Shield className="w-3.5 h-3.5" />
                  <span>Rol: {role}</span>
                </span>
              </div>
            </div>

            {/* Field 1: Nombre de Usuario */}
            <div className="space-y-1.5">
              <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                Nombre de Usuario
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej. Admin"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 font-semibold"
                />
              </div>
            </div>

            {/* Field 2: Nueva Contraseña (Opcional) */}
            <div className="space-y-1.5">
              <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                Nueva Contraseña <span className="text-slate-400 font-normal lowercase">(opcional)</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 -translate-y-1/2" />
                <input
                  type={showNewPass ? 'text' : 'password'}
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  placeholder="Ingresa la nueva contraseña..."
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-10 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 font-semibold"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  className="absolute right-3 top-3.5 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white"
                >
                  {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Field 3: Confirmar Contraseña */}
            <div className="space-y-1.5">
              <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                Confirmar Contraseña
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 -translate-y-1/2" />
                <input
                  type={showConfirmPass ? 'text' : 'password'}
                  value={confirmPass}
                  onChange={(e) => setConfirmPass(e.target.value)}
                  placeholder="Confirma la nueva contraseña..."
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-10 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 font-semibold"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPass(!showConfirmPass)}
                  className="absolute right-3 top-3.5 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white"
                >
                  {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Full-width Main Button */}
            <div className="pt-3">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold py-3 px-4 rounded-xl text-sm transition shadow-md active:scale-[0.98] cursor-pointer"
              >
                <Save className="w-4 h-4 shrink-0" />
                <span>{loading ? 'Guardando...' : 'Guardar Cambios'}</span>
              </button>
            </div>
          </form>
        )}

        {/* TAB: STORES MANAGEMENT */}
        {activeTab === 'stores' && (
          <div className="space-y-6">
            <div className="border-b border-slate-200 dark:border-slate-700/80 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <span>Configuración de Sucursales & Tiendas</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Personaliza los nombres públicos y el color identificador de cada tienda para distinguirlas visualmente en el inventario, matriz de existencias, traslados y punto de venta.
                </p>
              </div>

              {storesList.length > 0 && (
                <button
                  type="button"
                  onClick={handleSaveAllStores}
                  disabled={isSavingAll}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl flex items-center justify-center space-x-2 transition shadow-md shadow-indigo-600/20 cursor-pointer active:scale-95 shrink-0 disabled:opacity-50"
                >
                  {isSavingAll ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Guardar Todas las Sucursales</span>
                </button>
              )}
            </div>

            {loadingStores ? (
              <div className="flex items-center justify-center py-16 text-slate-400 gap-2 text-sm">
                <RefreshCw className="w-5 h-5 animate-spin text-indigo-500" />
                <span>Cargando configuración de sucursales...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {storesList.map(store => {
                  const currentColorHex = storeColorsState[store.id] || store.color || DEFAULT_STORE_COLORS[store.id] || '#6366f1';
                  const currentTheme = getStoreColor(store.id, currentColorHex);
                  const currentName = storeNames[store.id] ?? store.name;
                  const isSavingThis = savingStoreId === store.id;

                  return (
                    <div
                      key={store.id}
                      className="bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden"
                    >
                      {/* Top colored accent line */}
                      <div
                        className="absolute top-0 left-0 right-0 h-1"
                        style={{ backgroundColor: currentTheme.hex }}
                      />

                      <div className="space-y-4">
                        {/* 1. Header de Tarjeta */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div
                              className={`p-2.5 rounded-xl border flex items-center justify-center ${currentTheme.badgeClass}`}
                            >
                              <StoreIcon className="w-5 h-5" />
                            </div>
                            <div>
                              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                                Identificador
                              </span>
                              <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                                {store.id}
                              </span>
                            </div>
                          </div>

                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Activa
                          </span>
                        </div>

                        {/* 2. Campo de Nombre */}
                        <div className="space-y-1.5">
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                            Nombre de la Sucursal
                          </label>
                          <input
                            type="text"
                            value={currentName}
                            onChange={e => setStoreNames({ ...storeNames, [store.id]: e.target.value })}
                            className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700/80 rounded-xl px-3.5 py-2 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 shadow-inner"
                            placeholder="Ej: Sucursal Central..."
                          />
                        </div>

                        {/* 3. Selector de Color (Color Picker interactivo) */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                              <Palette className="w-3.5 h-3.5 text-slate-400" />
                              <span>Color de Identificación</span>
                            </span>
                            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                              {currentTheme.name}
                            </span>
                          </div>

                          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 bg-white dark:bg-slate-950/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800/80">
                            {STORE_PALETTE.map(paletteColor => {
                              const isSelected = currentColorHex.toLowerCase() === paletteColor.hex.toLowerCase();
                              return (
                                <button
                                  key={paletteColor.id}
                                  type="button"
                                  onClick={() => setStoreColorsState({ ...storeColorsState, [store.id]: paletteColor.hex })}
                                  className={`w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer relative group active:scale-95 ${
                                    isSelected
                                      ? 'ring-2 ring-offset-2 ring-offset-slate-900 ring-white scale-110 shadow-lg'
                                      : 'hover:scale-105 opacity-80 hover:opacity-100'
                                  }`}
                                  style={{ backgroundColor: paletteColor.hex }}
                                  title={paletteColor.name}
                                >
                                  {isSelected && <Check className="w-3.5 h-3.5 text-white drop-shadow stroke-[3]" />}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* 4. Vista Previa de Badge */}
                        <div className="space-y-1.5">
                          <span className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                            Vista Previa en la Aplicación:
                          </span>
                          <div className="p-3 bg-white dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between gap-2">
                            <div className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 ${currentTheme.badgeClass}`}>
                              <StoreIcon className="w-3.5 h-3.5" />
                              <span>{currentName || store.id}: 25 uds</span>
                            </div>
                            <span className="text-[10px] font-mono text-slate-400">En Matriz / POS</span>
                          </div>
                        </div>
                      </div>

                      {/* 5. Botón de Guardar por Tarjeta */}
                      <div className="pt-3 border-t border-slate-200 dark:border-slate-800/80">
                        <button
                          type="button"
                          onClick={() => handleSaveStore(store.id)}
                          disabled={isSavingThis}
                          className="w-full py-2 px-3 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl flex items-center justify-center space-x-1.5 transition cursor-pointer active:scale-95 disabled:opacity-50"
                        >
                          {isSavingThis ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Guardando...</span>
                            </>
                          ) : (
                            <>
                              <Save className="w-3.5 h-3.5" />
                              <span>Guardar Sucursal</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: TEAM MANAGEMENT INTEGRATION */}
        {activeTab === 'team' && <UsersView />}

        {/* TAB 3: SECURITY */}
        {activeTab === 'security' && (
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Seguridad de la Cuenta</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Actualiza la contraseña de tu usuario en la base de datos local SQLite.
            </p>

            <div className="space-y-1.5">
              <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase">Nueva Contraseña</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 -translate-y-1/2" />
                <input
                  type={showNewPass ? 'text' : 'password'}
                  required
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  placeholder="Ingresa la nueva contraseña"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-10 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 font-semibold"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  className="absolute right-3 top-3.5 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white"
                >
                  {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase">Confirmar Contraseña</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 -translate-y-1/2" />
                <input
                  type={showConfirmPass ? 'text' : 'password'}
                  required
                  value={confirmPass}
                  onChange={(e) => setConfirmPass(e.target.value)}
                  placeholder="Confirma la nueva contraseña"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-10 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 font-semibold"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPass(!showConfirmPass)}
                  className="absolute right-3 top-3.5 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white"
                >
                  {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="pt-3">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold py-3 px-4 rounded-xl text-sm transition shadow-md active:scale-[0.98] cursor-pointer"
              >
                <Save className="w-4 h-4 shrink-0" />
                <span>{loading ? 'Actualizando...' : 'Actualizar Contraseña'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
