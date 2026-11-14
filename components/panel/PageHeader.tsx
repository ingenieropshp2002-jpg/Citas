export function PageHeader({ eyebrow, title, subtitle, actions }: { eyebrow?: string; title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 mb-6">
      <div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h1 className="font-headline-lg-mobile text-headline-lg-mobile md:font-headline-lg md:text-headline-lg text-primary-container dark:text-primary">{title}</h1>{subtitle && <p className="text-on-surface-variant mt-1">{subtitle}</p>}</div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
export function Stat({ label, value, icon, hint, tone = 'default' }: { label: string; value: string; icon: string; hint?: string; tone?: 'default' | 'gold' | 'danger' }) {
  return (
    <div className="card p-4 md:p-5">
      <div className="flex items-center justify-between"><span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wide">{label}</span>
        <span className={`w-9 h-9 rounded-lg flex items-center justify-center ${tone === 'gold' ? 'bg-secondary-fixed/50 text-secondary' : tone === 'danger' ? 'bg-[#FFF1F2] text-danger' : 'bg-surface-container text-primary-container dark:text-primary'}`}><span className="material-symbols-outlined text-[20px]">{icon}</span></span></div>
      <p className="font-currency-display text-currency-display mt-2 tnum">{value}</p>
      {hint && <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">{hint}</p>}
    </div>
  );
}
