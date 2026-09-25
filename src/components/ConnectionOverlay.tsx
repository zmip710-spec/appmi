import React, { useState, useEffect } from 'react';
import { WifiOff, RefreshCw, ShieldCheck } from 'lucide-react';
import { checkHealthApi } from '../services/api';

export const ConnectionOverlay: React.FC = () => {
  const [isDisconnected, setIsDisconnected] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [lastCheckMessage, setLastCheckMessage] = useState<string | null>(null);

  const verifyConnection = async () => {
    setIsChecking(true);
    setLastCheckMessage('Comprobando comunicación con el servidor...');
    const healthy = await checkHealthApi();
    setIsChecking(false);
    if (healthy) {
      setIsDisconnected(false);
      setLastCheckMessage(null);
    } else {
      setIsDisconnected(true);
      setLastCheckMessage('El servidor aún no responde. Por favor verifica la terminal backend o el túnel.');
    }
  };

  useEffect(() => {
    const handleOffline = () => setIsDisconnected(true);
    const handleOnline = () => verifyConnection();

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    // Periodic health check ping (every 15 seconds)
    const interval = setInterval(async () => {
      const healthy = await checkHealthApi();
      if (!healthy) {
        setIsDisconnected(true);
      } else if (isDisconnected) {
        setIsDisconnected(false);
        setLastCheckMessage(null);
      }
    }, 15000);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
      clearInterval(interval);
    };
  }, [isDisconnected]);

  if (!isDisconnected) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-[200000] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border-2 border-amber-500/60 rounded-2xl w-full max-w-md p-6 shadow-[0_25px_60px_rgba(0,0,0,0.9)] text-center space-y-4">
        {/* Icon Header */}
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto animate-pulse">
          <WifiOff className="w-8 h-8" />
        </div>

        {/* Text Details */}
        <div className="space-y-2">
          <h2 className="text-lg font-extrabold text-white">
            ⚠️ Conexión con el servidor interrumpida
          </h2>
          <p className="text-xs text-amber-300 font-medium leading-relaxed">
            La aplicación está en modo de espera. Tus datos digitados están seguros en el almacenamiento local.
          </p>
        </div>

        {/* Safety Badge */}
        <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-center space-x-2 text-xs text-slate-300">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Protección activa: Los formularios y borradores están guardados en tu navegador.</span>
        </div>

        {lastCheckMessage && (
          <p className="text-[11px] text-slate-400 italic">
            {lastCheckMessage}
          </p>
        )}

        {/* Action Button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={verifyConnection}
            disabled={isChecking}
            className="w-full py-3 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition shadow-lg shadow-amber-600/20 flex items-center justify-center space-x-2 cursor-pointer active:scale-95"
          >
            <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
            <span>{isChecking ? 'Verificando Conexión...' : '🔄 Verificar / Reintentar Conexión'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
