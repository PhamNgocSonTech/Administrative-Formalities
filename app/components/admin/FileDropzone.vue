<script setup lang="ts">
import { UploadCloud, X, FileText } from 'lucide-vue-next'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

const props = withDefaults(defineProps<{
  modelValue: File[]
  multiple?: boolean
  accept?: string
  maxSizeMB?: number
  disabled?: boolean
  hint?: string
}>(), {
  multiple: true,
  accept: '.docx',
  maxSizeMB: 50,
})

const emit = defineEmits<{
  'update:modelValue': [files: File[]]
}>()

const dropRef = ref<HTMLElement | null>(null)
const inputRef = ref<HTMLInputElement | null>(null)
const dragOver = ref(false)
const errors = ref<string[]>([])

function filter(files: File[]) {
  const ok: File[] = []
  const errs: string[] = []
  const exts = props.accept.split(',').map((x) => x.trim().toLowerCase())
  for (const f of files) {
    const ext = '.' + (f.name.split('.').pop() ?? '').toLowerCase()
    if (!exts.includes(ext)) {
      errs.push(`${f.name}: không đúng định dạng (${props.accept})`)
      continue
    }
    if (f.size > props.maxSizeMB * 1024 * 1024) {
      errs.push(`${f.name}: vượt ${props.maxSizeMB}MB`)
      continue
    }
    ok.push(f)
  }
  errors.value = errs
  return ok
}

function addFiles(files: FileList | File[]) {
  const arr = filter(Array.from(files))
  if (!arr.length) return
  if (props.multiple) emit('update:modelValue', [...props.modelValue, ...arr])
  else emit('update:modelValue', arr.slice(0, 1))
}

function onInput(ev: Event) {
  const files = (ev.target as HTMLInputElement).files
  if (files) addFiles(files)
  if (inputRef.value) inputRef.value.value = ''
}

function onDrop(ev: DragEvent) {
  dragOver.value = false
  if (props.disabled) return
  if (ev.dataTransfer?.files?.length) addFiles(ev.dataTransfer.files)
}

function removeAt(i: number) {
  const next = [...props.modelValue]
  next.splice(i, 1)
  emit('update:modelValue', next)
}

function fmtSize(n: number) {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}
</script>

<template>
  <div class="space-y-3">
    <div
      ref="dropRef"
      :class="cn(
        'relative rounded-lg border-2 border-dashed transition-colors p-6 text-center',
        dragOver && !disabled ? 'border-primary bg-primary/5' : 'border-border',
        disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary/60 hover:bg-accent/30 cursor-pointer',
      )"
      @click="!disabled && inputRef?.click()"
      @dragover.prevent="!disabled && (dragOver = true)"
      @dragenter.prevent="!disabled && (dragOver = true)"
      @dragleave.prevent="dragOver = false"
      @drop.prevent="onDrop"
    >
      <input
        ref="inputRef"
        type="file"
        class="hidden"
        :accept="accept"
        :multiple="multiple"
        :disabled="disabled"
        @change="onInput"
      />
      <UploadCloud class="mx-auto size-10 text-muted-foreground mb-2" />
      <p class="text-sm font-medium">
        <span class="text-primary">Chọn tệp</span> hoặc kéo-thả vào đây
      </p>
      <p class="text-xs text-muted-foreground mt-1">
        {{ hint || `Chấp nhận ${accept}${multiple ? ', nhiều tệp' : ''} · tối đa ${maxSizeMB}MB/tệp` }}
      </p>
    </div>

    <div v-if="errors.length" class="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
      <ul class="list-disc pl-5 space-y-0.5">
        <li v-for="(e, i) in errors" :key="i">{{ e }}</li>
      </ul>
    </div>

    <ul v-if="modelValue.length" class="space-y-1.5">
      <li
        v-for="(f, i) in modelValue"
        :key="i"
        class="flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm"
      >
        <FileText class="size-4 text-primary shrink-0" />
        <span class="truncate flex-1">{{ f.name }}</span>
        <span class="text-xs text-muted-foreground shrink-0">{{ fmtSize(f.size) }}</span>
        <Button
          variant="ghost"
          size="icon"
          class="size-7"
          type="button"
          :disabled="disabled"
          @click.stop="removeAt(i)"
        >
          <X class="size-3.5" />
        </Button>
      </li>
    </ul>
  </div>
</template>
