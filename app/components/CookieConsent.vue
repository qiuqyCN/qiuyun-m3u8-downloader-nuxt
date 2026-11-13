<template>
  <Transition
    enter-active-class="transition duration-300 ease-out"
    enter-from-class="translate-y-full opacity-0"
    enter-to-class="translate-y-0 opacity-100"
  >
    <div
      v-if="visible"
      class="fixed inset-x-0 bottom-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85"
      role="dialog"
      aria-live="polite"
      aria-label="Cookie consent"
    >
      <div class="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center">
        <p class="flex-1 text-sm leading-relaxed text-muted-foreground">
          {{ t('cookieConsent.message') }}
        </p>
        <div class="flex shrink-0 gap-2">
          <button
            class="rounded-md border px-4 py-1.5 text-sm font-medium transition-colors hover:bg-muted"
            @click="decline"
          >
            {{ t('cookieConsent.decline') }}
          </button>
          <button
            class="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            @click="accept"
          >
            {{ t('cookieConsent.accept') }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
const { t } = useI18n()
const { consent, setConsent } = useConsent()

// 未选择时显示；同意/拒绝后永久隐藏（localStorage 记忆）
const visible = computed(() => consent.value === null)

const accept = () => setConsent('granted')
const decline = () => setConsent('denied')
</script>
