<script setup lang="ts">
import { Skeleton } from '@/components/ui/skeleton'

interface RangeInfo { s: number; e: number; n: number; label?: string }

const props = defineProps<{
  html: string
  loading?: boolean
  error?: string
  fields?: Record<string, RangeInfo>
  forms?: Record<string, RangeInfo>
}>()

const emit = defineEmits<{
  'block-click': [blockIndex: number]
}>()

const wrapRef = ref<HTMLElement | null>(null)
const HUES = [258, 150, 40, 320, 180, 60, 280, 110]
const bgFor = (n: number) => `oklch(0.95 0.08 ${HUES[n % 8]})`
const outlineFor = (n: number) => `oklch(0.55 0.22 ${HUES[n % 8]})`

function onClick(ev: MouseEvent) {
  const t = (ev.target as HTMLElement).closest('.pv-blk') as HTMLElement | null
  if (t && t.dataset.i !== undefined) emit('block-click', Number(t.dataset.i))
}

function doPaint() {
  const w = wrapRef.value
  if (!w) return
  const blocks = w.querySelectorAll<HTMLElement>('.pv-blk')
  if (!blocks.length) return
  // Reset all
  blocks.forEach((el) => {
    el.removeAttribute('style')
    el.classList.remove('hl', 'fm', 'pv-hit')
    delete el.dataset.field
    delete el.dataset.form
    el.title = ''
  })
  // Forms (border-right accent)
  for (const [id, r] of Object.entries(props.forms || {})) {
    blocks.forEach((el) => {
      const i = Number(el.dataset.i)
      if (i >= r.s && i <= r.e && !el.dataset.form) {
        el.dataset.form = id
        el.classList.add('fm')
        el.style.cssText += `border-right:4px solid ${outlineFor(r.n)};padding-right:8px;`
        el.title = `Biểu mẫu: ${r.label || ''}`
      }
    })
  }
  // Fields (bg + left bar)
  for (const [k, r] of Object.entries(props.fields || {})) {
    blocks.forEach((el) => {
      const i = Number(el.dataset.i)
      if (i >= r.s && i <= r.e && !el.dataset.field) {
        el.dataset.field = k
        el.classList.add('hl')
        const bg = bgFor(r.n)
        const outline = outlineFor(r.n)
        el.style.cssText += `background:${bg};box-shadow:inset 4px 0 0 ${outline};padding-left:10px;cursor:pointer;`
        el.dataset.hlOutline = outline
        el.title = 'Nội dung đã bóc tách thành trường'
      }
    })
  }
}

/** Highlight blocks in [start, end]; scroll first into view. */
function highlight(start: number, end: number) {
  const w = wrapRef.value
  if (!w) return
  let first: HTMLElement | null = null
  w.querySelectorAll<HTMLElement>('.pv-blk').forEach((el) => {
    const i = Number(el.dataset.i)
    const on = i >= start && i <= end
    el.classList.toggle('pv-hit', on)
    if (on) {
      const outline = el.dataset.hlOutline || 'oklch(0.55 0.22 60)'
      el.style.outline = `3px solid ${outline}`
      el.style.outlineOffset = '2px'
    } else {
      el.style.removeProperty('outline')
      el.style.removeProperty('outline-offset')
    }
    if (on && !first) first = el
  })
  if (first) {
    const top = first.offsetTop - (w.offsetTop || 0) - 24
    w.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
  }
}

function clearHighlight() {
  wrapRef.value?.querySelectorAll<HTMLElement>('.pv-blk.pv-hit').forEach((el) => {
    el.classList.remove('pv-hit')
    el.style.removeProperty('outline')
    el.style.removeProperty('outline-offset')
  })
}

// Re-paint whenever html or ranges change
watch(
  () => [props.html, props.fields, props.forms],
  () => nextTick(doPaint),
  { deep: true },
)
onMounted(() => nextTick(doPaint))

defineExpose({ highlight, clearHighlight, repaint: doPaint })
</script>

<template>
  <div class="rounded-md border bg-card">
    <div class="px-4 py-2 border-b bg-muted/40">
      <strong class="text-sm">Word gốc (chưa bóc tách)</strong>
      <p class="text-xs text-muted-foreground mt-0.5">
        Vùng tô màu = nội dung đã bóc tách thành trường. Click để mở trường.
      </p>
    </div>
    <div
      ref="wrapRef"
      class="pv-wrap"
      @click="onClick"
    >
      <div v-if="loading" class="p-6 space-y-3">
        <Skeleton v-for="n in 8" :key="n" class="h-4 w-full" />
      </div>
      <div v-else-if="error" class="p-6 text-sm text-destructive">{{ error }}</div>
      <div v-else class="pv-page" v-html="html" />
    </div>
  </div>
</template>

<style scoped>
.pv-wrap {
  height: calc(100vh - 220px);
  overflow-y: auto;
}
:deep(.pv-page) {
  padding: 24px;
  font-size: 14px;
  line-height: 1.7;
  color: var(--color-foreground);
  background: var(--color-background);
}
:deep(.pv-blk) {
  padding: 2px 4px;
  margin: 3px 0;
  border-radius: 3px;
  position: relative;
}
:deep(.pv-page table) {
  border-collapse: collapse;
  margin: 8px 0;
}
:deep(.pv-page td), :deep(.pv-page th) {
  border: 1px solid var(--color-border);
  padding: 4px 8px;
  vertical-align: top;
}
</style>
