<template>
  <div class="min-h-screen flex flex-col bg-background text-foreground transition-colors duration-300">
    <!-- Header -->
    <header class="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div class="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <!-- 左：Logo + Tab 导航（紧凑一组） -->
        <div class="flex items-center gap-6 min-w-0">
          <NuxtLinkLocale to="/" class="flex items-center gap-3">
            <img src="/favicon.png" :alt="$t('brand.name')" class="w-10 h-10 rounded-xl" />
            <div>
              <h1 class="text-lg font-bold text-foreground leading-tight">{{ $t('brand.name') }}</h1>
              <p class="text-xs text-muted-foreground leading-tight">{{ $t('brand.tagline') }}</p>
            </div>
          </NuxtLinkLocale>

          <nav class="hidden md:flex items-center gap-1">
            <NuxtLinkLocale
              to="/"
              class="px-3 py-2 text-sm font-medium rounded-lg transition-colors"
              :class="isActive('/') ? 'text-violet-500 bg-violet-500/10' : 'text-muted-foreground hover:text-foreground hover:bg-muted'"
            >
              {{ $t('nav.download') }}
            </NuxtLinkLocale>
            <NuxtLinkLocale
              to="/play"
              class="px-3 py-2 text-sm font-medium rounded-lg transition-colors"
              :class="isActive('/play') ? 'text-violet-500 bg-violet-500/10' : 'text-muted-foreground hover:text-foreground hover:bg-muted'"
            >
              {{ $t('nav.play') }}
            </NuxtLinkLocale>
          </nav>
        </div>

        <!-- 右：图标按钮组 + 语言切换 -->
        <div class="flex items-center gap-2">
          <!-- Language Switcher -->
          <select
            :value="locale"
            @change="onLocaleChange"
            class="px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors bg-transparent cursor-pointer focus:outline-none"
            aria-label="Language"
          >
            <option
              v-for="l in localeOptions"
              :key="l.code"
              :value="l.code"
              class="bg-card text-foreground"
            >
              {{ l.name }}
            </option>
          </select>
          <!-- Theme Toggle -->
          <button
            @click="toggleTheme"
            class="p-2 text-muted-foreground hover:text-foreground transition-colors"
            :title="isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'"
          >
            <Sun v-if="isDark" class="w-5 h-5" />
            <Moon v-else class="w-5 h-5" />
          </button>
          <a 
            href="https://github.com/qiuqyCN/qiuyun-m3u8-downloader-nuxt" 
            target="_blank"
            class="p-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <LucideGithub class="w-5 h-5" />
          </a>
          <NuxtLinkLocale
            to="/settings"
            class="p-2 text-muted-foreground hover:text-foreground transition-colors"
            :class="{ 'text-violet-500': isActive('/settings') }"
          >
            <Settings class="w-5 h-5" />
          </NuxtLinkLocale>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="flex-1 max-w-6xl mx-auto px-4 py-8 w-full">
      <slot />
    </main>

    <!-- Footer -->
    <footer class="border-t border-border">
      <div class="max-w-6xl mx-auto px-4 py-6 flex items-center justify-between">
        <p class="text-muted-foreground text-sm">
          {{ $t('footer.copyright', { year: currentYear }) }}
        </p>
        <div class="flex items-center gap-4">
          <NuxtLinkLocale to="/docs" class="text-muted-foreground hover:text-foreground text-sm transition-colors">{{ $t('footer.docs') }}</NuxtLinkLocale>
          <a href="https://github.com/qiuqyCN/qiuyun-m3u8-downloader-nuxt/issues" target="_blank" rel="noopener" class="text-muted-foreground hover:text-foreground text-sm transition-colors">{{ $t('footer.feedback') }}</a>
          <NuxtLink :to="{ path: localePath('/settings'), query: { section: 'about' } }" class="text-muted-foreground hover:text-foreground text-sm transition-colors">{{ $t('footer.about') }}</NuxtLink>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { LucideGithub, Settings, Sun, Moon } from 'lucide-vue-next';

const { isDark, toggleTheme } = useTheme();
const { locale, locales } = useI18n({ useScope: 'global' });
const route = useRoute();
const router = useRouter();
const localePath = useLocalePath();
const switchLocalePath = useSwitchLocalePath();

const isActive = (path: string) => route.path === localePath(path);

// 版权年份随构建时间更新，避免写死
const currentYear = new Date().getFullYear();

const localeOptions = computed(() => {
  const list = (locales.value as Array<{ code: string; name?: string }>).map((l) => ({
    code: l.code,
    name: l.name || l.code,
  }));
  // 默认语言（简体中文/繁體中文）置顶，其余语言按当前界面语言的排序规则按本地名排序
  const pinned = list.filter((l) => l.code === 'zh' || l.code === 'zh-TW');
  const collator = new Intl.Collator(locale.value);
  const rest = list
    .filter((l) => l.code !== 'zh' && l.code !== 'zh-TW')
    .sort((a, b) => collator.compare(a.name, b.name));
  return [...pinned, ...rest];
});

function onLocaleChange(e: Event) {
  const code = (e.target as HTMLSelectElement).value as typeof locale.value;
  router.push(switchLocalePath(code));
}

// 按当前语言输出 <html lang>、canonical 与 hreflang alternate
const localeHead = useLocaleHead({ dir: false, lang: true, seo: true });
useHead(() => ({
  htmlAttrs: localeHead.value.htmlAttrs,
  link: localeHead.value.link,
  meta: localeHead.value.meta,
}));
</script>
