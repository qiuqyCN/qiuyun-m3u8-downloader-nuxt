export type Theme = 'light' | 'dark' | 'system';

export function useTheme() {
  const theme = useState<Theme>('theme', () => 'system');
  const isDark = useState<boolean>('isDark', () => true);

  const initTheme = () => {
    const savedTheme = localStorage.getItem('theme') as Theme | null;
    if (savedTheme) {
      theme.value = savedTheme;
    }
    applyTheme(theme.value);
  };

  const applyTheme = (newTheme: Theme) => {
    const root = document.documentElement;
    
    if (newTheme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      isDark.value = prefersDark;
      if (prefersDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    } else if (newTheme === 'dark') {
      isDark.value = true;
      root.classList.add('dark');
    } else {
      isDark.value = false;
      root.classList.remove('dark');
    }
  };

  const setTheme = (newTheme: Theme) => {
    theme.value = newTheme;
    localStorage.setItem('theme', newTheme);
    applyTheme(newTheme);
  };

  const toggleTheme = () => {
    const newTheme = isDark.value ? 'light' : 'dark';
    setTheme(newTheme);
  };

  onMounted(() => {
    initTheme();
    
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (theme.value === 'system') {
        applyTheme('system');
      }
    });
  });

  return {
    theme: readonly(theme),
    isDark: readonly(isDark),
    setTheme,
    toggleTheme,
  };
}
