import React, { useState, useEffect } from 'react';
import { Search, Plus, Filter, Shield, Database, Trash2, UserPlus, Lock } from 'lucide-react';
import { fetchUsers, createUser, toggleUserStatusApi, deleteUserApi, User } from '../services/api';
import { UserAvatar } from './UserAvatar';

export const UsersView: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', password: '', role: 'Desarrollador' });
  const [isDbConnected, setIsDbConnected] = useState(false);

  const loadDataFromDb = async () => {
    setIsLoading(true);
    try {
      const dbUsers = await fetchUsers();
      if (Array.isArray(dbUsers)) {
        setUsers(dbUsers);
        setIsDbConnected(true);
      }
    } catch {
      setIsDbConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDataFromDb();
  }, []);

  const filteredUsers = users.filter((u) => {
    const matchesSearch = u.name.toLowerCase().includes(search.toLowerCase());
    const matchesRole = filterRole === 'all' || u.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const toggleUserStatus = async (id: string | number) => {
    try {
      await toggleUserStatusApi(id);
      await loadDataFromDb();
    } catch {
      setUsers(users.map(u => u.id === id ? { ...u, status: u.status === 'Activo' ? 'Inactivo' : 'Activo' } : u));
    }
  };

  const handleDeleteUser = async (id: string | number) => {
    try {
      await deleteUserApi(id);
      await loadDataFromDb();
    } catch {
      setUsers(users.filter(u => u.id !== id));
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.name.trim()) return;

    try {
      await createUser({
        name: newUser.name.trim(),
        role: newUser.role,
        password: newUser.password.trim() || '123456'
      } as any);
      await loadDataFromDb();
      setIsDbConnected(true);
    } catch {
      const localCreated: User = {
        id: Date.now(),
        name: newUser.name.trim(),
        email: `${newUser.name.trim().toLowerCase().replace(/[^a-z0-9]/g, '')}@empresa.com`,
        role: newUser.role,
        status: 'Activo',
        avatar: '',
        lastLogin: 'Ahora mismo',
      };
      setUsers([localCreated, ...users]);
    }

    setNewUser({ name: '', password: '', role: 'Desarrollador' });
    setShowAddModal(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-4 min-h-[300px] animate-pulse">
        <div className="bg-slate-100 dark:bg-slate-800/80 p-4 rounded-xl border border-slate-200 dark:border-slate-700 h-16 w-full"></div>
        <div className="space-y-2">
          <div className="bg-slate-100 dark:bg-slate-800/80 p-4 rounded-xl border border-slate-200 dark:border-slate-700 h-16 w-full"></div>
          <div className="bg-slate-100 dark:bg-slate-800/80 p-4 rounded-xl border border-slate-200 dark:border-slate-700 h-16 w-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 min-h-[300px]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700/80">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Gestión de Equipo & Usuarios</h3>
            {isDbConnected && (
              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                <Database className="w-3 h-3" />
                <span>BD Conectada</span>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Administra los accesos y roles de los miembros del equipo</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setNewUser({ name: '', password: '', role: 'Desarrollador' });
            setShowAddModal(true);
          }}
          className="flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white font-extrabold px-4 py-2 rounded-xl text-xs transition shadow-md cursor-pointer active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>+ Agregar Usuario</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar usuario..."
            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 font-semibold"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="w-full sm:w-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-200 focus:outline-none font-semibold"
          >
            <option value="all">Todos los Roles</option>
            <option value="Administrador">Administrador</option>
            <option value="Desarrollador">Desarrollador</option>
            <option value="Vendedor">Vendedor</option>
            <option value="Diseñadora UI/UX">Diseñadora UI/UX</option>
            <option value="Marketing Manager">Marketing Manager</option>
          </select>
        </div>
      </div>

      {/* MOBILE CARDS VIEW (md:hidden) */}
      <div className="md:hidden space-y-2.5">
        {filteredUsers.length === 0 ? (
          <div className="bg-white dark:bg-slate-900/60 p-5 rounded-xl border border-slate-200 dark:border-slate-700 text-center text-slate-500 dark:text-slate-400 text-xs">
            No se encontraron usuarios. Haz clic en "+ Agregar Usuario" para crear uno.
          </div>
        ) : (
          filteredUsers.map((u) => (
            <div key={u.id} className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700/80 rounded-xl p-3.5 space-y-2.5 shadow-sm">
              <div className="flex items-center space-x-3">
                <UserAvatar name={u.name} size="w-10 h-10 text-xs" />
                <div className="flex-1 min-w-0">
                  <h4 className="font-extrabold text-slate-900 dark:text-white text-xs truncate">{u.name}</h4>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      <Shield className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                      <span>{u.role}</span>
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${u.status === 'Activo' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' : 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20'}`}>
                      {u.status}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                <span className="text-slate-500 dark:text-slate-400 text-[10px]">Último acceso: {u.lastLogin}</span>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => toggleUserStatus(u.id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                      u.status === 'Activo' ? 'bg-slate-100 dark:bg-slate-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/20' : 'bg-slate-100 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/20'
                    }`}
                  >
                    {u.status === 'Activo' ? 'Desactivar' : 'Activar'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteUser(u.id)}
                    className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/20 transition cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* DESKTOP TABLE VIEW */}
      <div className="hidden md:block bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/80 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
          <thead className="bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-400 uppercase font-bold border-b border-slate-200 dark:border-slate-700/80">
            <tr>
              <th className="px-5 py-3">Nombre de Usuario</th>
              <th className="px-5 py-3">Rol</th>
              <th className="px-5 py-3">Estado</th>
              <th className="px-5 py-3">Último Acceso</th>
              <th className="px-5 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-6 text-center text-slate-500 dark:text-slate-400">
                  No se encontraron usuarios. Haz clic en "+ Agregar Usuario" para crear uno.
                </td>
              </tr>
            ) : (
              filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                  <td className="px-5 py-3.5 flex items-center space-x-3">
                    <UserAvatar name={u.name} size="w-8 h-8 text-xs" />
                    <span className="font-bold text-slate-900 dark:text-white">{u.name}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      <Shield className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                      <span>{u.role}</span>
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${u.status === 'Activo' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' : 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20'}`}>
                      {u.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-[11px] text-slate-500 dark:text-slate-400">{u.lastLogin}</td>
                  <td className="px-5 py-3.5 text-right space-x-2">
                    <button
                      type="button"
                      onClick={() => toggleUserStatus(u.id)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                        u.status === 'Activo' ? 'bg-slate-100 dark:bg-slate-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/20' : 'bg-slate-100 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/20'
                      }`}
                    >
                      {u.status === 'Activo' ? 'Desactivar' : 'Activar'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteUser(u.id)}
                      className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/20 transition cursor-pointer"
                      title="Eliminar usuario"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-[100000] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 w-full max-w-sm shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-700 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center space-x-2">
                <UserPlus className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Agregar Nuevo Usuario</span>
              </h3>
              <button type="button" onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white font-bold">✕</button>
            </div>

            <form onSubmit={handleAddUser} className="space-y-3.5">
              <div>
                <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase mb-1">Nombre de Usuario</label>
                <input
                  type="text"
                  required
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  placeholder="Ej. Carlos Vendedor"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase mb-1">Contraseña Inicial</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    placeholder="Predeterminada: 123456"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase mb-1">Rol en el Equipo</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 font-semibold"
                >
                  <option value="Desarrollador">Desarrollador</option>
                  <option value="Administrador">Administrador</option>
                  <option value="Vendedor">Vendedor</option>
                  <option value="Diseñadora UI/UX">Diseñadora UI/UX</option>
                  <option value="Marketing Manager">Marketing Manager</option>
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-extrabold rounded-xl text-xs transition shadow-md cursor-pointer"
                >
                  Guardar Usuario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
