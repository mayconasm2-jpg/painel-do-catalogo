export function PageHeader({ title, subtitle, actions, children }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
      <div>
        <h2 className="font-heading text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">{title}</h2>
        {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2 flex-wrap">{actions || children}</div>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-4" data-testid="empty-state">
      {Icon && <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4"><Icon className="w-7 h-7 text-slate-400" /></div>}
      <h3 className="font-heading font-bold text-slate-900">{title}</h3>
      {description && <p className="text-sm text-slate-500 mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
