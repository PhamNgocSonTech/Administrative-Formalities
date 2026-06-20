<script setup lang="ts">
definePageMeta({ layout: 'admin' })

const route = useRoute()
const replaceSlug = computed(() => route.query.replace as string | undefined)

const dropZoneRef = ref<HTMLDivElement>()
const fileInputRef = ref<HTMLInputElement>()
const { isOverDropZone } = useDropZone(dropZoneRef, { onDrop: handleDrop })

const file = ref<File | null>(null)
const form = reactive({
  soQD: '',
  category: '',
  capThucHien: '',
  mucDoDVC: false,
})

const loading = ref(false)
const showConflict = ref(false)
const error = ref('')

function handleDrop(files: File[] | null) {
  const docx = files?.find(f => f.name.endsWith('.docx'))
  if (docx) file.value = docx
}

function handleFileInput(e: Event) {
  const input = e.target as HTMLInputElement
  const selected = input.files?.[0]
  if (selected?.name.endsWith('.docx')) file.value = selected
}

async function submit(forceOverwrite = false) {
  if (!file.value) return
  loading.value = true
  error.value = ''

  const fd = new FormData()
  fd.append('file', file.value)
  fd.append('soQD', form.soQD)
  fd.append('category', form.category)
  fd.append('capThucHien', form.capThucHien)
  fd.append('mucDoDVC', form.mucDoDVC ? 'toan_trinh' : 'mot_phan')
  if (forceOverwrite) fd.append('forceOverwrite', 'true')

  try {
    const res = await $fetch<any>('/api/procedures/upload', { method: 'POST', body: fd })
    if (res.conflict) {
      showConflict.value = true
      return
    }
    await navigateTo('/admin')
  } catch (e: any) {
    error.value = e.data?.message ?? 'Có lỗi xảy ra, vui lòng thử lại.'
  } finally {
    loading.value = false
  }
}

function overwriteConfirmed() {
  showConflict.value = false
  submit(true)
}
</script>

<template>
  <div>
    <!-- Breadcrumb + Header -->
    <div class="mb-stack-lg">
      <nav class="flex text-on-surface-variant text-body-sm mb-stack-sm">
        <ol class="inline-flex items-center gap-1">
          <li><NuxtLink to="/admin" class="hover:text-primary">Quản trị</NuxtLink></li>
          <li><span class="mx-1">/</span></li>
          <li><span class="text-on-surface font-semibold">Upload TTHC mới</span></li>
        </ol>
      </nav>
      <h2 class="text-headline-lg text-on-surface">Tạo mới Thủ tục Hành chính</h2>
      <p class="text-body-md text-on-surface-variant mt-1">Kéo thả file quy định (.docx) để hệ thống tự động bóc tách thông tin.</p>
    </div>

    <!-- Form Card -->
    <div class="bg-surface-container-lowest shadow-sm rounded-xl border border-surface-container-highest p-stack-lg">
      <form class="space-y-stack-lg" @submit.prevent="submit()">

        <!-- Drop Zone -->
        <div>
          <label class="block text-label-md text-on-surface mb-stack-sm">Tài liệu quy định</label>
          <div
            ref="dropZoneRef"
            class="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-xl cursor-pointer transition-colors duration-200"
            :class="isOverDropZone
              ? 'border-primary bg-surface-container-low'
              : 'border-outline-variant bg-surface hover:bg-surface-container-low'"
            @click="fileInputRef?.click()"
          >
            <template v-if="file">
              <span class="material-symbols-outlined text-primary text-4xl mb-3" style="font-variation-settings: 'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24">description</span>
              <p class="text-body-md font-semibold text-on-surface">{{ file.name }}</p>
              <p class="text-body-sm text-on-surface-variant mt-1">{{ (file.size / 1024).toFixed(0) }} KB — nhấn để đổi file</p>
            </template>
            <template v-else>
              <span class="material-symbols-outlined text-outline text-4xl mb-3">upload_file</span>
              <p class="text-body-md text-on-surface-variant">
                <span class="font-semibold text-primary">Nhấn để tải lên</span> hoặc kéo thả file vào đây
              </p>
              <p class="text-body-sm text-outline mt-1">Chỉ chấp nhận .docx (tối đa 10MB)</p>
            </template>
            <input ref="fileInputRef" type="file" accept=".docx" class="hidden" @change="handleFileInput" />
          </div>
        </div>

        <!-- Metadata Fields -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-gutter">
          <div>
            <label for="soQD" class="block text-label-md text-on-surface mb-stack-sm">Số Quyết Định</label>
            <input
              id="soQD"
              v-model="form.soQD"
              type="text"
              placeholder="Ví dụ: 123/QĐ-UBND"
              class="block w-full rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface text-body-md placeholder:text-outline px-3 py-2 focus:border-primary focus:ring-2 focus:ring-primary-container focus:outline-none transition-shadow"
            />
          </div>
          <div>
            <label for="category" class="block text-label-md text-on-surface mb-stack-sm">Lĩnh vực</label>
            <input
              id="category"
              v-model="form.category"
              type="text"
              placeholder="Ví dụ: Đất đai"
              class="block w-full rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface text-body-md placeholder:text-outline px-3 py-2 focus:border-primary focus:ring-2 focus:ring-primary-container focus:outline-none transition-shadow"
            />
          </div>
          <div>
            <label for="capThucHien" class="block text-label-md text-on-surface mb-stack-sm">Cấp thực hiện</label>
            <div class="relative">
              <select
                id="capThucHien"
                v-model="form.capThucHien"
                class="appearance-none block w-full rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface text-body-md px-3 py-2 pr-10 focus:border-primary focus:ring-2 focus:ring-primary-container focus:outline-none transition-shadow"
              >
                <option value="">Chọn cấp thực hiện</option>
                <option value="tinh">Cấp tỉnh</option>
                <option value="huyen">Cấp huyện</option>
                <option value="xa">Cấp xã</option>
              </select>
              <span class="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none text-[20px]">arrow_drop_down</span>
            </div>
          </div>
          <div class="flex flex-col justify-center">
            <label class="block text-label-md text-on-surface mb-stack-sm">Mức độ Dịch vụ công</label>
            <label class="relative inline-flex items-center cursor-pointer">
              <input v-model="form.mucDoDVC" type="checkbox" class="sr-only peer" />
              <div class="w-11 h-6 bg-surface-variant peer-focus:ring-2 peer-focus:ring-primary-container rounded-full peer peer-checked:bg-primary after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:border-outline-variant after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
              <span class="ml-3 text-body-md text-on-surface">{{ form.mucDoDVC ? 'Toàn trình' : 'Một phần' }}</span>
            </label>
          </div>
        </div>

        <!-- Error -->
        <div v-if="error" class="bg-error-container text-on-error-container rounded-lg px-4 py-3 text-body-sm flex items-start gap-2">
          <span class="material-symbols-outlined text-[18px] mt-0.5 shrink-0">error</span>
          {{ error }}
        </div>

        <!-- Actions -->
        <div class="flex justify-end gap-stack-sm pt-stack-md border-t border-surface-container-highest">
          <NuxtLink
            to="/admin"
            class="px-6 py-2 rounded-lg text-label-md text-primary bg-surface hover:bg-surface-container-low border border-outline-variant transition-colors"
          >Hủy
          </NuxtLink>
          <button
            type="submit"
            :disabled="!file || loading"
            class="px-6 py-2 rounded-lg text-label-md text-on-primary bg-primary hover:bg-on-primary-fixed-variant transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <span v-if="loading" class="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
            {{ loading ? 'Đang tải lên...' : 'Tải lên hệ thống' }}
          </button>
        </div>
      </form>
    </div>

    <!-- Conflict Dialog -->
    <Teleport to="body">
      <div
        v-if="showConflict"
        class="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/40 backdrop-blur-sm"
      >
        <div class="bg-surface-container-lowest rounded-xl shadow-lg max-w-md w-full p-stack-lg border border-surface-container-high">
          <div class="flex items-center gap-stack-sm text-error mb-stack-sm">
            <span class="material-symbols-outlined text-3xl">warning</span>
            <h3 class="text-headline-sm text-on-surface">Cảnh báo trùng lặp</h3>
          </div>
          <p class="text-body-md text-on-surface-variant mb-stack-md">
            Mã thủ tục <span class="font-semibold text-on-surface">{{ file?.name.replace('.docx', '') }}</span> đã tồn tại.
            Bạn có muốn ghi đè không?
          </p>
          <div class="flex justify-end gap-stack-sm">
            <button
              class="px-4 py-2 rounded-lg text-label-md text-on-surface-variant bg-surface hover:bg-surface-container-low border border-outline-variant transition-colors"
              @click="showConflict = false"
            >Hủy bỏ</button>
            <button
              class="px-4 py-2 rounded-lg text-label-md text-on-error bg-error hover:opacity-90 transition-opacity"
              @click="overwriteConfirmed"
            >Tiếp tục ghi đè</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
