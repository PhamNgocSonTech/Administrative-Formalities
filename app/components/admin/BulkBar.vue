<script setup lang="ts">
/**
 * Thanh hành động hàng loạt xuất hiện khi user tick checkbox trong table.
 * Dùng Transition để expand/fade mượt, thay vì v-if đột ngột.
 */
defineProps<{ show: boolean }>()
</script>

<template>
  <Transition name="bulkbar">
    <div v-if="show" class="bulkbar">
      <slot />
    </div>
  </Transition>
</template>

<style scoped>
.bulkbar {
  overflow: hidden;
}
.bulkbar-enter-active,
.bulkbar-leave-active {
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}
.bulkbar-enter-from,
.bulkbar-leave-to {
  opacity: 0;
  max-height: 0;
  transform: translateY(-4px);
}
.bulkbar-enter-to,
.bulkbar-leave-from {
  opacity: 1;
  max-height: 200px;
  transform: translateY(0);
}
</style>
