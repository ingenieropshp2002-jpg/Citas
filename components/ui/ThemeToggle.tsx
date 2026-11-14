'use client';
import { Icon } from './Icon';
export function ThemeToggle({ className = '' }: { className?: string }) {
  return (
    <button type="button" aria-label="Cambiar entre modo claro y oscuro" title="Modo claro u oscuro" className={`w-10 h-10 rounded-full flex items-center justify-center hover:bg-surface-container-low text-on-surface ${className}`}
      onClick={() => { const d = document.documentElement.classList.toggle('dark'); try { localStorage.setItem('rc-theme', d ? 'dark' : 'light'); } catch {} }}>
      <Icon name="dark_mode" className="dark:hidden" /><Icon name="light_mode" className="hidden dark:inline" />
    </button>
  );
}
