<script setup lang="ts">
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Loader2, FileType } from 'lucide-vue-next'

const props = defineProps<{ open: boolean; formId: number | null }>()
const emit = defineEmits<{ 'update:open': [v: boolean] }>()

const { api } = useAdminApi()
const loading = ref(false)
const html = ref('')
const label = ref('')
const errorMsg = ref('')

watch(() => props.open, async (v) => {
  if (!v || !props.formId) return
  loading.value = true
  errorMsg.value = ''
  html.value = ''
  try {
    const r = await api<{ label: string; html: string }>('GET', `/api/admin/forms/${props.formId}/preview`)
    label.value = r.label
    html.value = r.html
  } catch (e: any) {
    errorMsg.value = e?.message ?? 'Không mở được xem trước'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="max-w-5xl max-h-[90vh] p-0 flex flex-col">
      <DialogHeader class="px-6 pt-6 pb-3 border-b">
        <DialogTitle class="flex items-center gap-2">
          <FileType class="size-5 text-primary" />
          Xem trước biểu mẫu
          <span v-if="label" class="text-sm font-normal text-muted-foreground">— {{ label }}</span>
        </DialogTitle>
        <DialogDescription>
          Bản xem trước chỉ để kiểm tra nội dung và cấu trúc; font, khoảng cách và ngắt trang có thể khác khi mở bằng Word.
        </DialogDescription>
      </DialogHeader>
      <!-- Giữ nguyên style như code gốc: pv-wrap (nền xám) + pv-page (trang trắng A4, font Times) -->
      <div class="pv-wrap">
        <div v-if="loading" class="flex items-center justify-center py-12">
          <Loader2 class="size-5 animate-spin text-muted-foreground" />
        </div>
        <div v-else-if="errorMsg" class="pv-page">
          <p class="text-destructive">{{ errorMsg }}</p>
        </div>
        <div v-else class="pv-page" v-html="html" />
      </div>
    </DialogContent>
  </Dialog>
</template>

<style scoped>
/* Port nguyên từ styles.css của code gốc */
.pv-wrap {
  flex: 1;
  overflow: auto;
  background: #d9dee5;
  padding: 16px;
}
:deep(.pv-page) {
  background: #fff;
  max-width: 794px;
  margin: 0 auto;
  padding: 48px 56px;
  box-shadow: 0 1px 6px rgba(0, 0, 0, .25);
  font-family: "Times New Roman", Times, serif;
  font-size: 15px;
  line-height: 1.45;
  color: #000;
  min-height: 400px;
  overflow-wrap: anywhere;
}
:deep(.pv-p) { margin: 0 0 6px; }
:deep(.pv-empty) { margin: 0; line-height: 1; height: 10px; }
:deep(.pv-c) { text-align: center; }
:deep(.pv-r) { text-align: right; }
:deep(.pv-j) { text-align: justify; }
:deep(.pv-i1) { padding-left: 24px; }
:deep(.pv-i2) { padding-left: 48px; }
:deep(.pv-i3) { padding-left: 72px; }
:deep(.pv-i4) { padding-left: 96px; }
:deep(.pv-page table) {
  border-collapse: collapse;
  margin: 8px 0;
}
:deep(.pv-page td), :deep(.pv-page th) {
  border: 1px solid #000;
  padding: 4px 8px;
  vertical-align: top;
}
:deep(.pv-page p) { margin: 0 0 6px; }
:deep(.pv-page strong) { font-weight: bold; }
:deep(.pv-page em) { font-style: italic; }
:deep(.pv-page u) { text-decoration: underline; }
</style>
