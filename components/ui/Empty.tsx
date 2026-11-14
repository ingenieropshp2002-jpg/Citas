import { Icon } from './Icon';
export function Empty({ icon = 'event_busy', title, text, action }: { icon?: string; title: string; text?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center text-center py-12 px-6">
      <div className="w-16 h-16 rounded-full bg-secondary-fixed/40 flex items-center justify-center mb-4"><Icon name={icon} className="text-secondary text-[30px]" /></div>
      <h3 className="font-headline-sm text-headline-sm text-primary-container dark:text-primary">{title}</h3>
      {text && <p className="text-on-surface-variant mt-1 max-w-sm">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
