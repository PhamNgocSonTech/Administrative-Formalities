<script setup lang="ts">
import { Loader2 } from 'lucide-vue-next'

/**
 * Overlay toàn trang khi đang refresh — chặn click, hiện spinner giữa màn hình.
 * Dùng chung qua useRefreshState() — active=true thì hiện.
 */
const { active } = useRefreshState()
</script>

<template>
  <Transition name="refresh-fade">
    <div
      v-if="active"
      class="fixed inset-0 z-[80] flex items-center justify-center bg-background/60 backdrop-blur-[2px]"
      role="status"
      aria-live="polite"
      aria-label="Đang xử lý"
    >
      <div class="flex flex-col items-center gap-3 rounded-xl bg-background border shadow-xl px-8 py-6">
        <Loader2 class="size-8 text-primary animate-spin" />
        <p class="text-sm font-medium text-muted-foreground">Đang xử lý…</p>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.refresh-fade-enter-active, .refresh-fade-leave-active {
  transition: opacity 0.18s ease;
}
.refresh-fade-enter-from, .refresh-fade-leave-to {
  opacity: 0;
}
.refresh-fade-enter-active > div,
.refresh-fade-leave-active > div {
  transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease;
}
.refresh-fade-enter-from > div,
.refresh-fade-leave-to > div {
  transform: scale(0.94);
  opacity: 0;
}
</style>
