<script setup lang="ts">
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Loader2, FileType } from 'lucide-vue-next'

const props = defineProps<{
  open: boolean
  /** Download URL of the DOCX file */
  url: string | null
  filename?: string
}>()
const emit = defineEmits<{ 'update:open': [v: boolean] }>()

const loading = ref(false)
const errorMsg = ref('')
const containerRef = ref<HTMLElement | null>(null)

async function render() {
  if (!props.url || !containerRef.value) return
  loading.value = true
  errorMsg.value = ''
  containerRef.value.innerHTML = ''
  try {
    // Fetch DOCX blob with credentials (cookie)
    const res = await fetch(props.url, { credentials: 'include' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const blob = await res.blob()
    // Lazy import — chỉ nạp khi mở dialog
    const { renderAsync } = await import('docx-preview')
    await renderAsync(blob, containerRef.value, undefined, {
      className: 'docx-view',
      inWrapper: true,
      ignoreWidth: true,          // dùng bề rộng dialog thay vì cố ép A4 → tránh text bị dồn + xoay dọc
      ignoreHeight: true,
      ignoreFonts: false,
      breakPages: false,          // không chia trang cứng → cuộn mượt hơn
      ignoreLastRenderedPageBreak: true,
      experimental: true,         // tăng fidelity với table phức tạp
      trimXmlDeclaration: true,
      useBase64URL: true,         // ảnh/image load inline
      renderHeaders: true,
      renderFooters: true,
      renderFootnotes: true,
    } as any)
  } catch (e: any) {
    errorMsg.value = e?.message ?? 'Không render được DOCX'
  } finally {
    loading.value = false
  }
}

watch(() => props.open, async (v) => {
  if (v) {
    await nextTick()
    render()
  }
})
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="max-w-6xl h-[90vh] p-0 flex flex-col">
      <DialogHeader class="px-6 pt-6 pb-3 border-b">
        <DialogTitle class="flex items-center gap-2">
          <FileType class="size-5 text-primary" />
          Xem bản dựng đẹp
          <span v-if="filename" class="text-sm font-normal text-muted-foreground">— {{ filename }}</span>
        </DialogTitle>
        <DialogDescription>
          Bản render gần giống Word (font, bảng, hình, ngắt trang). Dùng để kiểm tra hình thức;
          nội dung chính thức vẫn dùng khung "Word gốc" bên phải với block index.
        </DialogDescription>
      </DialogHeader>
      <div class="flex-1 overflow-auto bg-muted/30">
        <div v-if="loading" class="flex items-center justify-center py-12">
          <Loader2 class="size-5 animate-spin text-muted-foreground" />
          <span class="ml-2 text-sm text-muted-foreground">Đang tải và render DOCX…</span>
        </div>
        <div v-else-if="errorMsg" class="p-6 text-sm text-destructive">{{ errorMsg }}</div>
        <div ref="containerRef" class="docx-container px-6 py-6" />
      </div>
    </DialogContent>
  </Dialog>
</template>

<style scoped>
:deep(.docx-wrapper) {
  background: white;
  padding: 24px !important;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  max-width: 900px;
  margin: 0 auto;
}
:deep(section.docx) {
  width: 100% !important;
  min-height: auto !important;
  margin-bottom: 16px;
  padding: 0 !important;
}
:deep(.docx-view p) {
  margin: 4px 0;
}
:deep(.docx-view table) {
  border-collapse: collapse;
  max-width: 100%;
  margin: 8px 0;
}
:deep(.docx-view td), :deep(.docx-view th) {
  border: 1px solid #ddd;
  padding: 4px 8px;
  vertical-align: top;
  word-wrap: break-word;
}
:deep(.docx-view img) {
  max-width: 100%;
  height: auto;
}
/* Ép text luôn nằm ngang — docx-preview hay hiểu sai w:textDirection ở ô bảng */
:deep(.docx-view),
:deep(.docx-view *) {
  writing-mode: horizontal-tb !important;
  text-orientation: mixed !important;
}
:deep(.docx-view td),
:deep(.docx-view th) {
  writing-mode: horizontal-tb !important;
  transform: none !important;
  text-align: initial;
}
/* Ô bảng tiêu đề nhà nước (quốc hiệu) thường canh giữa */
:deep(.docx-view td p) {
  margin: 2px 0;
}
</style>
