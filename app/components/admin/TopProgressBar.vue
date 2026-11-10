<script setup lang="ts">
/**
 * Thanh progress mảnh ở đầu trang (như YouTube/GitHub).
 * Dùng chung qua useRefreshState() — mọi action sau refresh set active=true khi bắt đầu, false khi xong.
 */
const { active } = useRefreshState()

const progress = ref(0)
let timer: number | null = null

function tick() {
  // Simulate: nhanh tới 70%, chậm dần
  if (progress.value < 20) progress.value += 10
  else if (progress.value < 50) progress.value += 4
  else if (progress.value < 80) progress.value += 1
  // Sau 80% chậm lại, đợi active false để complete 100%
}

watch(active, (v) => {
  if (v) {
    progress.value = 0
    if (timer !== null) clearInterval(timer)
    timer = window.setInterval(tick, 180)
  } else {
    progress.value = 100
    if (timer !== null) { clearInterval(timer); timer = null }
    // Giấu sau khi hoàn thành
    setTimeout(() => {
      if (!active.value) progress.value = 0
    }, 300)
  }
})

onBeforeUnmount(() => {
  if (timer !== null) clearInterval(timer)
})
</script>

<template>
  <div
    class="fixed top-0 inset-x-0 h-0.5 z-[70] pointer-events-none transition-opacity"
    :class="progress > 0 && progress < 100 ? 'opacity-100' : progress === 100 ? 'opacity-100' : 'opacity-0'"
  >
    <div
      class="h-full bg-primary shadow-[0_0_8px_var(--color-primary)] transition-[width] ease-out"
      :style="{ width: progress + '%', transitionDuration: active ? '400ms' : '150ms' }"
    />
  </div>
</template>
