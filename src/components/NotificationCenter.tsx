import React from 'react';
import { PushNotificationItem } from '../types';
import { Bell, CheckCheck, ShieldCheck, UserCheck, Calendar, AlertTriangle, Radio } from 'lucide-react';
import { notificationService } from '../utils/notificationService';

interface NotificationCenterProps {
  notifications: PushNotificationItem[];
  onMarkAllAsRead: () => void;
  onClose: () => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  notifications,
  onMarkAllAsRead,
  onClose,
}) => {
  const [nativePerm, setNativePerm] = React.useState<NotificationPermission | 'unsupported'>(
    notificationService.getPermissionStatus()
  );

  const handleRequestPush = async () => {
    const res = await notificationService.requestNativePermission();
    setNativePerm(res);
  };

  const getIcon = (type: PushNotificationItem['type']) => {
    switch (type) {
      case 'checkin':
        return <UserCheck className="w-4 h-4 text-emerald-400" />;
      case 'biometrics':
        return <ShieldCheck className="w-4 h-4 text-cyan-400" />;
      case 'event_open':
        return <Calendar className="w-4 h-4 text-blue-400" />;
      case 'capacity':
        return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      default:
        return <Bell className="w-4 h-4 text-slate-400" />;
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="absolute right-0 top-14 w-96 max-w-[90vw] bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col text-slate-200">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
          <h3 className="font-semibold text-sm text-slate-100">Notificações Push do Sistema</h3>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={onMarkAllAsRead}
            className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            Marcar lidas
          </button>
        )}
      </div>

      {/* Native Web Push Prompt */}
      {nativePerm !== 'granted' && (
        <div className="px-4 py-2.5 bg-cyan-950/30 border-b border-cyan-800/30 flex items-center justify-between text-xs text-cyan-300">
          <span>Receber alertas na área de trabalho?</span>
          <button
            onClick={handleRequestPush}
            className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded font-medium transition-colors"
          >
            Ativar Push
          </button>
        </div>
      )}

      {/* Notifications List */}
      <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-800/60">
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            Nenhuma notificação registrada no momento.
          </div>
        ) : (
          notifications.map(item => (
            <div
              key={item.id}
              className={`p-3.5 transition-colors hover:bg-slate-800/40 ${
                !item.read ? 'bg-slate-800/20' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 p-1.5 rounded-lg bg-slate-800 border border-slate-700/60 shrink-0">
                  {getIcon(item.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-xs font-semibold text-slate-200 truncate">{item.title}</p>
                    <span className="text-[10px] text-slate-500 font-mono shrink-0">
                      {new Date(item.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{item.message}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-2.5 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between text-[11px] text-slate-500">
        <span>Webhook de telemetria ativo</span>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-200 transition-colors font-medium px-2 py-0.5"
        >
          Fechar
        </button>
      </div>
    </div>
  );
};
