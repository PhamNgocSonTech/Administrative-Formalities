<script setup lang="ts">
/**
 * Thanh hành động hàng loạt xuất hiện khi user tick checkbox.
 * Dùng kỹ thuật grid-template-rows 0fr/1fr (giống shadcn Collapsible) — mượt với mọi chiều cao, không janky.
 */
defineProps<{ show: boolean }>()
</script>

<template>
  <div class="bulkbar" :data-state="show ? 'open' : 'closed'">
    <div class="bulkbar-inner">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.bulkbar {
  display: grid;
  grid-template-rows: 0fr;
  opacity: 0;
  transition: grid-template-rows 0.25s cubic-bezier(0.16, 1, 0.3, 1),
              opacity 0.2s ease;
  will-change: grid-template-rows, opacity;
}
.bulkbar[data-state="open"] {
  grid-template-rows: 1fr;
  opacity: 1;
}
.bulkbar-inner {
  overflow: hidden;
  min-height: 0;
}
</style>
