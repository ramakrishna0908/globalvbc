import Icon from './Icon.jsx';

const TONES = {
  info: { cls: 'border-accent-500/40 bg-accent-500/10', icon: 'info', iconCls: 'text-accent-400' },
  success: { cls: 'border-status-success/40 bg-status-success/10', icon: 'check', iconCls: 'text-status-success' },
  warning: { cls: 'border-status-warning/50 bg-status-warning/10', icon: 'alert', iconCls: 'text-status-warning' },
  danger: { cls: 'border-status-danger/50 bg-status-danger/10', icon: 'alert', iconCls: 'text-status-danger' },
};

/**
 * Inline alert. `tone` picks colour + icon; warning/danger announce assertively
 * (role=alert), info/success politely (role=status).
 */
export default function Alert({ tone = 'info', title, children, action, className = '', role, ...props }) {
  const t = TONES[tone] || TONES.info;
  return (
    <div role={role || (tone === 'danger' || tone === 'warning' ? 'alert' : 'status')} className={`flex gap-3 rounded-lg border p-3.5 text-sm ${t.cls} ${className}`} {...props}>
      <Icon name={t.icon} size={20} className={`mt-0.5 ${t.iconCls}`} />
      <div className="min-w-0 flex-1">
        {title ? <p className="font-bold text-text-primary">{title}</p> : null}
        {children ? <div className={`text-text-secondary ${title ? 'mt-0.5' : 'text-text-primary'}`}>{children}</div> : null}
        {action ? <div className="mt-2">{action}</div> : null}
      </div>
    </div>
  );
}
