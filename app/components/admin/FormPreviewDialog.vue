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
          Bản xem chỉ kiểm tra cấu trúc nội dung; font / khoảng cách / ngắt trang có thể khác khi mở bằng Word thực.
        </DialogDescription>
      </DialogHeader>
      <div class="flex-1 overflow-y-auto p-6 bg-background">
        <div v-if="loading" class="flex items-center justify-center py-12">
          <Loader2 class="size-5 animate-spin text-muted-foreground" />
        </div>
        <div v-else-if="errorMsg" class="text-sm text-destructive">{{ errorMsg }}</div>
        <div v-else class="pv-form" v-html="html" />
      </div>
    </DialogContent>
  </Dialog>
</template>

<style scoped>
:deep(.pv-form) {
  font-size: 14px;
  line-height: 1.6;
}
:deep(.pv-form table) {
  border-collapse: collapse;
  margin: 8px 0;
}
:deep(.pv-form td), :deep(.pv-form th) {
  border: 1px solid var(--color-border);
  padding: 4px 8px;
  vertical-align: top;
}
:deep(.pv-form p) {
  margin: 4px 0;
}
</style>
