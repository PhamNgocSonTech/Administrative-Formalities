<script setup lang="ts">
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, ZoomIn, ZoomOut, X, ChevronUp, ChevronDown, FileType } from 'lucide-vue-next'

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
  'open-docx-preview': []
}>()

const wrapRef = ref<HTMLElement | null>(null)
const pageRef = ref<HTMLElement | null>(null)
const HUES = [258, 150, 40, 320, 180, 60, 280, 110]
const bgFor = (n: number) => `oklch(0.95 0.08 ${HUES[n % 8]})`
const outlineFor = (n: number) => `oklch(0.55 0.22 ${HUES[n % 8]})`

// --- Zoom ---
const zoom = useLocalStorage('word-viewer:zoom', 100)
function zoomIn() { zoom.value = Math.min(200, zoom.value + 10) }
function zoomOut() { zoom.value = Math.max(70, zoom.value - 10) }
function zoomReset() { zoom.value = 100 }

// --- Search ---
const showSearch = ref(false)
const searchQuery = ref('')
const matchCount = ref(0)
const matchIdx = ref(0)
let origHtmls = new WeakMap<HTMLElement, string>()

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function runSearch() {
  const w = wrapRef.value
  if (!w) return
  // Reset previous marks
  w.querySelectorAll<HTMLElement>('.pv-blk').forEach((el) => {
    const orig = origHtmls.get(el)
    if (orig != null) el.innerHTML = orig
  })
  matchCount.value = 0
  matchIdx.value = 0
  const q = searchQuery.value.trim()
  if (!q) return
  const re = new RegExp(escapeRegExp(q), 'gi')
  let total = 0
  w.querySelectorAll<HTMLElement>('.pv-blk').forEach((el) => {
    // Save original once
    if (!origHtmls.has(el)) origHtmls.set(el, el.innerHTML)
    const text = el.textContent || ''
    if (!re.test(text)) {
      re.lastIndex = 0
      return
    }
    re.lastIndex = 0
    // Walk text nodes, wrap matches
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
    const nodes: Text[] = []
    let cur: Node | null = walker.nextNode()
    while (cur) { nodes.push(cur as Text); cur = walker.nextNode() }
    nodes.forEach((tn) => {
      const t = tn.nodeValue || ''
      if (!re.test(t)) { re.lastIndex = 0; return }
      re.lastIndex = 0
      const frag = document.createDocumentFragment()
      let last = 0
      let m: RegExpExecArray | null
      while ((m = re.exec(t)) !== null) {
        if (m.index > last) frag.appendChild(document.createTextNode(t.slice(last, m.index)))
        const mk = document.createElement('mark')
        mk.className = 'wv-search-mark'
        mk.textContent = m[0]
        frag.appendChild(mk)
        total++
        last = m.index + m[0].length
      }
      if (last < t.length) frag.appendChild(document.createTextNode(t.slice(last)))
      tn.parentNode?.replaceChild(frag, tn)
    })
  })
  matchCount.value = total
  if (total) jumpToMatch(0)
}

function jumpToMatch(i: number) {
  const w = wrapRef.value
  if (!w) return
  const marks = w.querySelectorAll<HTMLElement>('.wv-search-mark')
  if (!marks.length) return
  matchIdx.value = ((i % marks.length) + marks.length) % marks.length
  marks.forEach((m) => m.classList.remove('wv-search-cur'))
  const target = marks[matchIdx.value]
  target.classList.add('wv-search-cur')
  // Scroll qua block cha + offset chính xác (target nằm trong pv-blk, offsetTop của mark là so với pv-blk)
  const blk = target.closest('.pv-blk') as HTMLElement | null
  const anchor = blk || target
  const wrapperRect = w.getBoundingClientRect()
  const anchorRect = anchor.getBoundingClientRect()
  const delta = anchorRect.top - wrapperRect.top - 60
  w.scrollTo({ top: w.scrollTop + delta, behavior: 'smooth' })
}

function nextMatch() { jumpToMatch(matchIdx.value + 1) }
function prevMatch() { jumpToMatch(matchIdx.value - 1) }

function openSearchBar() {
  showSearch.value = true
  nextTick(() => { (document.querySelector<HTMLInputElement>('.wv-search-input'))?.focus() })
}
function closeSearch() {
  showSearch.value = false
  searchQuery.value = ''
  runSearch()
}

watch(searchQuery, () => runSearch())

// --- Block click ---
function onClick(ev: MouseEvent) {
  const t = (ev.target as HTMLElement).closest('.pv-blk') as HTMLElement | null
  if (t && t.dataset.i !== undefined) emit('block-click', Number(t.dataset.i))
}

// --- Keyboard shortcut Ctrl+F inside viewer ---
function onKeyDown(ev: KeyboardEvent) {
  if ((ev.ctrlKey || ev.metaKey) && ev.key === 'f') {
    ev.preventDefault()
    openSearchBar()
  } else if (ev.key === 'Escape' && showSearch.value) {
    closeSearch()
  } else if (showSearch.value && ev.key === 'Enter') {
    ev.preventDefault()
    if (ev.shiftKey) prevMatch()
    else nextMatch()
  }
}

// --- Paint ranges ---
function doPaint() {
  const w = wrapRef.value
  if (!w) return
  const blocks = w.querySelectorAll<HTMLElement>('.pv-blk')
  if (!blocks.length) return
  blocks.forEach((el) => {
    el.removeAttribute('style')
    el.classList.remove('hl', 'fm', 'pv-hit')
    delete el.dataset.field
    delete el.dataset.form
    delete el.dataset.hlOutline
    el.title = ''
    origHtmls.delete(el)
  })
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
  computeMinimap()
}

/** Highlight blocks in [start, end]; scroll first into view (dùng khi click field bên trái). */
function highlight(start: number, end: number) {
  markHighlight(start, end)
  const w = wrapRef.value
  if (!w) return
  const first = w.querySelector<HTMLElement>('.pv-blk.pv-hit')
  if (first) {
    const top = first.offsetTop - (w.offsetTop || 0) - 24
    w.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
  }
}

/** Chỉ tô vàng/outline các block trong range, KHÔNG scroll (dùng khi click block Word để khỏi nhảy vị trí user đang xem). */
function markHighlight(start: number, end: number) {
  const w = wrapRef.value
  if (!w) return
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
  })
}

function clearHighlight() {
  wrapRef.value?.querySelectorAll<HTMLElement>('.pv-blk.pv-hit').forEach((el) => {
    el.classList.remove('pv-hit')
    el.style.removeProperty('outline')
    el.style.removeProperty('outline-offset')
  })
}

// --- Mini-map ---
interface MiniBar { topPct: number; heightPct: number; color: string; blockIndex: number }
const miniBars = ref<MiniBar[]>([])
function computeMinimap() {
  const w = wrapRef.value
  if (!w) return
  const total = w.scrollHeight
  const bars: MiniBar[] = []
  w.querySelectorAll<HTMLElement>('.pv-blk.hl').forEach((el) => {
    const outline = el.dataset.hlOutline
    if (!outline) return
    bars.push({
      topPct: (el.offsetTop / total) * 100,
      heightPct: Math.max(0.3, (el.offsetHeight / total) * 100),
      color: outline,
      blockIndex: Number(el.dataset.i),
    })
  })
  miniBars.value = bars
}

function onMinimapClick(ev: MouseEvent) {
  const mm = ev.currentTarget as HTMLElement
  const rect = mm.getBoundingClientRect()
  const pct = (ev.clientY - rect.top) / rect.height
  const w = wrapRef.value
  if (!w) return
  w.scrollTo({ top: pct * w.scrollHeight - w.clientHeight / 2, behavior: 'smooth' })
}

// --- Viewport indicator on minimap ---
const vpTop = ref(0)
const vpHeight = ref(10)
function updateViewport() {
  const w = wrapRef.value
  if (!w) return
  const total = w.scrollHeight || 1
  vpTop.value = (w.scrollTop / total) * 100
  vpHeight.value = Math.max(2, (w.clientHeight / total) * 100)
}

// Re-paint when html or ranges change
watch(
  () => [props.html, props.fields, props.forms],
  () => nextTick(doPaint),
  { deep: true },
)
onMounted(() => {
  nextTick(doPaint)
  wrapRef.value?.addEventListener('scroll', updateViewport, { passive: true })
  updateViewport()
})
onBeforeUnmount(() => {
  wrapRef.value?.removeEventListener('scroll', updateViewport)
})

defineExpose({ highlight, markHighlight, clearHighlight, repaint: doPaint })
</script>

<template>
  <div class="rounded-md border bg-card" @keydown="onKeyDown" tabindex="-1">
    <!-- Toolbar -->
    <div class="px-4 py-2 border-b bg-muted/40 flex items-center gap-2 flex-wrap">
      <div class="flex-1 min-w-0">
        <strong class="text-sm block">Word gốc (chưa bóc tách)</strong>
        <p class="text-xs text-muted-foreground">
          Vùng tô màu = nội dung đã bóc tách. Click để mở trường.
        </p>
      </div>
      <Button variant="outline" size="icon" class="size-8" title="Tìm (Ctrl+F)" @click="openSearchBar">
        <Search class="size-3.5" />
      </Button>
      <div class="flex items-center gap-0.5 border rounded-md">
        <Button variant="ghost" size="icon" class="size-8 rounded-none rounded-l-md" title="Thu nhỏ" @click="zoomOut">
          <ZoomOut class="size-3.5" />
        </Button>
        <button
          class="text-xs font-mono px-2 py-1 hover:bg-accent/40 w-12 cursor-pointer select-none"
          title="Đặt lại 100%"
          @click="zoomReset"
        >{{ zoom }}%</button>
        <Button variant="ghost" size="icon" class="size-8 rounded-none rounded-r-md" title="Phóng to" @click="zoomIn">
          <ZoomIn class="size-3.5" />
        </Button>
      </div>
      <Button variant="outline" size="sm" class="h-8" @click="emit('open-docx-preview')">
        <FileType class="size-3.5 mr-1" />
        Xem bản dựng đẹp
      </Button>
    </div>

    <!-- Search bar -->
    <div v-if="showSearch" class="px-3 py-2 border-b bg-muted/30 flex items-center gap-2">
      <Search class="size-4 text-muted-foreground shrink-0" />
      <Input
        v-model="searchQuery"
        class="wv-search-input h-8 flex-1"
        placeholder="Tìm trong Word gốc…"
      />
      <span class="text-xs text-muted-foreground font-mono shrink-0 min-w-14 text-right">
        <template v-if="matchCount">{{ matchIdx + 1 }} / {{ matchCount }}</template>
        <template v-else-if="searchQuery">0 / 0</template>
      </span>
      <Button variant="ghost" size="icon" class="size-7" :disabled="!matchCount" @click="prevMatch">
        <ChevronUp class="size-3.5" />
      </Button>
      <Button variant="ghost" size="icon" class="size-7" :disabled="!matchCount" @click="nextMatch">
        <ChevronDown class="size-3.5" />
      </Button>
      <Button variant="ghost" size="icon" class="size-7" @click="closeSearch">
        <X class="size-3.5" />
      </Button>
    </div>

    <!-- Body -->
    <div class="flex">
      <div
        ref="wrapRef"
        class="pv-wrap flex-1"
        @click="onClick"
      >
        <div v-if="loading" class="p-6 space-y-3">
          <Skeleton v-for="n in 8" :key="n" class="h-4 w-full" />
        </div>
        <div v-else-if="error" class="p-6 text-sm text-destructive">{{ error }}</div>
        <div
          v-else
          ref="pageRef"
          class="pv-page"
          :style="{ fontSize: zoom + '%' }"
          v-html="html"
        />
      </div>

      <!-- Mini-map -->
      <div
        v-if="!loading && !error && miniBars.length"
        class="relative w-3 shrink-0 border-l bg-muted/20 cursor-pointer"
        @click="onMinimapClick"
      >
        <div
          v-for="(b, i) in miniBars"
          :key="i"
          class="absolute left-0.5 right-0.5 rounded-sm"
          :style="{ top: b.topPct + '%', height: b.heightPct + '%', background: b.color }"
        />
        <!-- Viewport indicator -->
        <div
          class="absolute inset-x-0 border border-primary/60 bg-primary/10 pointer-events-none"
          :style="{ top: vpTop + '%', height: vpHeight + '%' }"
        />
      </div>
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
  transform-origin: top left;
}
:deep(.pv-blk) {
  padding: 2px 4px;
  margin: 3px 0;
  border-radius: 3px;
  position: relative;
}
:deep(.pv-blk.hl::before) {
  content: attr(data-i);
  position: absolute;
  left: -36px;
  top: 2px;
  font-size: 10px;
  font-family: monospace;
  color: var(--color-muted-foreground);
  background: var(--color-muted);
  padding: 0 4px;
  border-radius: 2px;
  opacity: 0;
  transition: opacity 0.15s;
}
:deep(.pv-blk.hl:hover::before) { opacity: 1; }
:deep(.pv-page table) {
  border-collapse: collapse;
  margin: 8px 0;
}
:deep(.pv-page td), :deep(.pv-page th) {
  border: 1px solid var(--color-border);
  padding: 4px 8px;
  vertical-align: top;
}
:deep(.wv-search-mark) {
  background: oklch(0.88 0.17 95);
  padding: 0 1px;
  border-radius: 2px;
}
:deep(.wv-search-mark.wv-search-cur) {
  background: oklch(0.75 0.2 60);
  color: white;
}
</style>
