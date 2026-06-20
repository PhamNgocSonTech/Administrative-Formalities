<script setup lang="ts">
definePageMeta({ layout: 'admin' })

interface Procedure {
  slug: string
  filename: string
  name: string
  category: string
  soQD: string
  mucDoDVC: string
  capThucHien: string
  driveFileId: string
  updatedAt: string
}

interface ProcedureListResponse {
  procedures: Procedure[]
  total: number
  page: number
  totalPages: number
}

const filters = reactive({
  q: '',
  category: '',
  capThucHien: '',
  mucDoDVC: '',
  page: 1,
  limit: 20,
})

const debouncedQ = refDebounced(toRef(filters, 'q'), 300)

const query = computed(() => ({
  q: debouncedQ.value,
  category: filters.category,
  capThucHien: filters.capThucHien,
  mucDoDVC: filters.mucDoDVC,
  page: filters.page,
  limit: filters.limit,
}))

const { data, refresh, pending } = await useFetch<ProcedureListResponse>('/api/procedures', {
  query,
  watch: [query],
})

const procedures = computed(() => data.value?.procedures ?? [])
const total = computed(() => data.value?.total ?? 0)
const totalPages = computed(() => data.value?.totalPages ?? 1)

function onFilterChange() {
  filters.page = 1
}

watch([() => filters.category, () => filters.capThucHien, () => filters.mucDoDVC], onFilterChange)

const deleteTarget = ref<Procedure | null>(null)
const deleting = ref(false)

async function confirmDelete() {
  if (!deleteTarget.value) return
  deleting.value = true
  try {
    await $fetch(`/api/procedures/${deleteTarget.value.slug}`, { method: 'DELETE' })
    deleteTarget.value = null
    await refresh()
  } finally {
    deleting.value = false
  }
}

const capThucHienLabel: Record<string, string> = {
  tinh: 'Cấp Tỉnh',
  huyen: 'Cấp Huyện',
  xa: 'Cấp Xã',
}
</script>

<template>
  <div>
    <!-- Page Header -->
    <header class="flex justify-between items-center mb-stack-lg">
      <div>
        <h1 class="text-headline-md font-bold text-on-surface mb-1">Danh sách Thủ tục Hành chính</h1>
        <p class="text-body-sm text-on-surface-variant">Quản lý, tra cứu và cập nhật cơ sở dữ liệu TTHC.</p>
      </div>
      <NuxtLink
        to="/admin/upload"
        class="bg-primary text-on-primary px-4 py-2 rounded-lg text-label-md flex items-center gap-2 hover:bg-on-primary-fixed-variant transition-colors shadow-sm"
      >
        <span class="material-symbols-outlined text-[20px]">add</span>
        Thêm mới
      </NuxtLink>
    </header>

    <!-- Search & Filter Toolbar -->
    <div class="bg-surface-container-lowest rounded-xl p-stack-md mb-stack-md shadow-sm border border-outline-variant/30 flex flex-col md:flex-row gap-stack-md items-center justify-between">
      <div class="relative w-full md:w-[400px]">
        <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">search</span>
        <input
          v-model="filters.q"
          type="text"
          placeholder="Tìm kiếm theo mã, tên thủ tục..."
          class="w-full pl-10 pr-4 py-2 h-10 rounded-lg border border-outline-variant bg-surface text-body-md text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none transition-all"
        />
      </div>
      <div class="flex flex-wrap gap-stack-sm w-full md:w-auto">
        <div class="relative">
          <select
            v-model="filters.category"
            class="appearance-none pl-4 pr-10 py-2 h-10 rounded-lg border border-outline-variant bg-surface text-body-sm text-on-surface focus:ring-2 focus:ring-primary focus:outline-none cursor-pointer min-w-[160px]"
          >
            <option value="">Lĩnh vực: Tất cả</option>
            <option value="Đất đai">Đất đai</option>
            <option value="Xây dựng">Xây dựng</option>
            <option value="Y tế">Y tế</option>
          </select>
          <span class="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none text-[20px]">arrow_drop_down</span>
        </div>
        <div class="relative">
          <select
            v-model="filters.capThucHien"
            class="appearance-none pl-4 pr-10 py-2 h-10 rounded-lg border border-outline-variant bg-surface text-body-sm text-on-surface focus:ring-2 focus:ring-primary focus:outline-none cursor-pointer min-w-[160px]"
          >
            <option value="">Cấp thực hiện: Tất cả</option>
            <option value="tinh">Cấp Tỉnh</option>
            <option value="huyen">Cấp Huyện</option>
            <option value="xa">Cấp Xã</option>
          </select>
          <span class="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none text-[20px]">arrow_drop_down</span>
        </div>
        <div class="relative">
          <select
            v-model="filters.mucDoDVC"
            class="appearance-none pl-4 pr-10 py-2 h-10 rounded-lg border border-outline-variant bg-surface text-body-sm text-on-surface focus:ring-2 focus:ring-primary focus:outline-none cursor-pointer min-w-[150px]"
          >
            <option value="">Mức độ: Tất cả</option>
            <option value="toan_trinh">Toàn trình</option>
            <option value="mot_phan">Một phần</option>
          </select>
          <span class="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none text-[20px]">arrow_drop_down</span>
        </div>
      </div>
    </div>

    <!-- Table -->
    <div class="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse whitespace-nowrap">
          <thead class="bg-[#f1f5f9] border-b border-outline-variant/50">
            <tr>
              <th class="py-3 px-4 text-label-sm text-on-surface-variant uppercase tracking-wider w-16 text-center">STT</th>
              <th class="py-3 px-4 text-label-sm text-on-surface-variant uppercase tracking-wider">Mã TTHC</th>
              <th class="py-3 px-4 text-label-sm text-on-surface-variant uppercase tracking-wider">Tên thủ tục</th>
              <th class="py-3 px-4 text-label-sm text-on-surface-variant uppercase tracking-wider">Lĩnh vực</th>
              <th class="py-3 px-4 text-label-sm text-on-surface-variant uppercase tracking-wider">Cấp thực hiện</th>
              <th class="py-3 px-4 text-label-sm text-on-surface-variant uppercase tracking-wider">Mức độ DVC</th>
              <th class="py-3 px-4 text-label-sm text-on-surface-variant uppercase tracking-wider">Ngày cập nhật</th>
              <th class="py-3 px-4 text-label-sm text-on-surface-variant uppercase tracking-wider text-right w-24">Thao tác</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-outline-variant/30">
            <tr v-if="pending">
              <td colspan="8" class="py-12 text-center text-body-sm text-on-surface-variant">
                <span class="material-symbols-outlined animate-spin text-primary">progress_activity</span>
              </td>
            </tr>
            <tr v-else-if="procedures.length === 0">
              <td colspan="8" class="py-12 text-center text-body-sm text-on-surface-variant">Không có dữ liệu</td>
            </tr>
            <tr
              v-else
              v-for="(p, i) in procedures"
              :key="p.slug"
              class="hover:bg-surface-bright transition-colors group"
            >
              <td class="py-4 px-4 text-body-sm text-on-surface-variant text-center">
                {{ (filters.page - 1) * filters.limit + i + 1 }}
              </td>
              <td class="py-4 px-4 text-label-sm text-primary font-mono">{{ p.slug }}</td>
              <td class="py-4 px-4 text-body-sm text-on-surface max-w-[300px] whitespace-normal leading-snug">{{ p.name }}</td>
              <td class="py-4 px-4 text-body-sm text-on-surface-variant">{{ p.category }}</td>
              <td class="py-4 px-4 text-body-sm text-on-surface-variant">{{ capThucHienLabel[p.capThucHien] ?? p.capThucHien }}</td>
              <td class="py-4 px-4">
                <span
                  class="inline-flex items-center px-2.5 py-0.5 rounded-full text-label-sm"
                  :class="p.mucDoDVC === 'toan_trinh'
                    ? 'bg-secondary-container text-on-secondary-container'
                    : 'bg-tertiary-container text-on-tertiary-container'"
                >
                  {{ p.mucDoDVC === 'toan_trinh' ? 'Toàn trình' : 'Một phần' }}
                </span>
              </td>
              <td class="py-4 px-4 text-body-sm text-on-surface-variant">{{ p.updatedAt }}</td>
              <td class="py-4 px-4 text-right">
                <div class="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <NuxtLink
                    :to="`/admin/upload?replace=${p.slug}`"
                    class="p-1.5 text-on-surface-variant hover:text-primary transition-colors rounded hover:bg-surface-container-low"
                    title="Upload thay thế"
                  >
                    <span class="material-symbols-outlined text-[20px]">upload_file</span>
                  </NuxtLink>
                  <button
                    class="p-1.5 text-on-surface-variant hover:text-error transition-colors rounded hover:bg-error-container"
                    title="Xóa"
                    @click="deleteTarget = p"
                  >
                    <span class="material-symbols-outlined text-[20px]">delete</span>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div class="px-6 py-4 border-t border-outline-variant/30 flex items-center justify-between">
        <span class="text-body-sm text-on-surface-variant">
          Hiển thị {{ Math.min((filters.page - 1) * filters.limit + 1, total) }}–{{ Math.min(filters.page * filters.limit, total) }} của {{ total.toLocaleString('vi-VN') }} kết quả
        </span>
        <div class="flex gap-1">
          <button
            class="w-8 h-8 flex items-center justify-center rounded border border-outline-variant text-on-surface-variant hover:bg-surface-container-low disabled:opacity-30"
            :disabled="filters.page <= 1"
            @click="filters.page--"
          >
            <span class="material-symbols-outlined text-[20px]">chevron_left</span>
          </button>
          <template v-for="p in totalPages" :key="p">
            <button
              v-if="Math.abs(p - filters.page) <= 2 || p === 1 || p === totalPages"
              class="w-8 h-8 flex items-center justify-center rounded text-label-md transition-colors"
              :class="p === filters.page
                ? 'bg-primary text-on-primary'
                : 'border border-outline-variant text-on-surface-variant hover:bg-surface-container-low'"
              @click="filters.page = p"
            >{{ p }}</button>
            <span
              v-else-if="p === filters.page - 3 || p === filters.page + 3"
              class="w-8 h-8 flex items-center justify-center text-on-surface-variant"
            >…</span>
          </template>
          <button
            class="w-8 h-8 flex items-center justify-center rounded border border-outline-variant text-on-surface-variant hover:bg-surface-container-low disabled:opacity-30"
            :disabled="filters.page >= totalPages"
            @click="filters.page++"
          >
            <span class="material-symbols-outlined text-[20px]">chevron_right</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Delete confirm dialog -->
    <Teleport to="body">
      <div
        v-if="deleteTarget"
        class="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/40 backdrop-blur-sm"
        @click.self="deleteTarget = null"
      >
        <div class="bg-surface-container-lowest rounded-xl shadow-lg max-w-md w-full p-stack-lg border border-surface-container-high">
          <div class="flex items-center gap-stack-sm text-error mb-stack-sm">
            <span class="material-symbols-outlined text-3xl">warning</span>
            <h3 class="text-headline-sm text-on-surface">Xác nhận xóa</h3>
          </div>
          <p class="text-body-md text-on-surface-variant mb-stack-md">
            Bạn có chắc muốn xóa thủ tục <span class="font-semibold text-on-surface">{{ deleteTarget.slug }}</span>?
            Hành động này không thể hoàn tác.
          </p>
          <div class="flex justify-end gap-stack-sm">
            <button
              class="px-4 py-2 rounded-lg text-label-md text-on-surface-variant bg-surface hover:bg-surface-container-low border border-outline-variant transition-colors"
              @click="deleteTarget = null"
            >Hủy bỏ</button>
            <button
              class="px-4 py-2 rounded-lg text-label-md text-on-error bg-error hover:opacity-90 transition-opacity disabled:opacity-50"
              :disabled="deleting"
              @click="confirmDelete"
            >{{ deleting ? 'Đang xóa...' : 'Xóa' }}</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
