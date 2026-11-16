/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/renderer/index.html',
    './src/renderer/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Quiet Premium Desktop tokens. Values live in index.css.
        'notes-bg': 'var(--color-app-bg)',
        'notes-sidebar': 'var(--color-sidebar-bg)',
        'notes-panel': 'var(--color-panel-bg)',
        'notes-card': 'var(--color-card-bg)',
        'notes-elevated': 'var(--color-elevated-bg)',
        'notes-border': 'var(--color-border)',
        'notes-border-strong': 'var(--color-border-strong)',
        'notes-text': 'var(--color-text-primary)',
        'notes-secondary': 'var(--color-text-secondary)',
        'notes-muted': 'var(--color-text-muted)',
        'notes-accent': 'var(--color-accent)',
        'notes-accent-soft': 'var(--color-accent-secondary)',
        'notes-hover': 'var(--color-hover)',
        'notes-active': 'var(--color-active)',
        'notes-success': 'var(--status-complete-fg)',
        'notes-warning': 'var(--status-warning-fg)',
        'notes-danger': 'var(--status-error-fg)',
      },
      boxShadow: {
        'notes': 'var(--shadow-card)',
        'notes-hover': 'var(--shadow-card-hover)',
        'overlay': 'var(--shadow-overlay)',
      },
      borderRadius: {
        'control': '6px',
        'panel': '8px',
        'notes': '10px',
        'dialog': '12px',
        'widget': '16px',
      },
    },
  },
  plugins: [],
  darkMode: 'class',
}
