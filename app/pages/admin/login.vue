<script setup lang="ts">
definePageMeta({ layout: false })

const pin = ref('')
const loading = ref(false)
const error = ref('')
const inputRef = ref<HTMLInputElement>()

onMounted(() => inputRef.value?.focus())

async function submit() {
    if (!pin.value || loading.value) return
    loading.value = true
    error.value = ''

    try {
        await $fetch('/api/admin/login', { method: 'POST', body: { pin: pin.value } })
        useState('admin-auth').value = true
        await navigateTo('/admin')
    } catch (e: any) {
        error.value = e.data?.message ?? 'Có lỗi xảy ra'
        pin.value = ''
        nextTick(() => inputRef.value?.focus())
    } finally {
        loading.value = false
    }
}
</script>

<template>
    <div class="min-h-screen bg-background flex items-center justify-center font-sans">
        <div class="w-full max-w-sm">
            <!-- Logo -->
            <div class="flex flex-col items-center mb-stack-lg">
                <div class="w-14 h-14 rounded-full bg-primary-container flex items-center justify-center mb-stack-md">
                    <span
                        class="material-symbols-outlined text-on-primary-container text-3xl"
                        style="font-variation-settings: 'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24"
                    >admin_panel_settings</span>
                </div>
                <h1 class="text-headline-sm text-on-surface">Quản trị TTHC</h1>
                <p class="text-body-sm text-on-surface-variant mt-1">Nhập mã PIN để tiếp tục</p>
            </div>

            <!-- Card -->
            <div class="bg-surface-container-lowest rounded-xl border border-outline-variant/30 shadow-sm p-stack-lg">
                <form @submit.prevent="submit" class="space-y-stack-md">
                    <div>
                        <label for="pin" class="block text-label-md text-on-surface mb-stack-sm">Mã PIN</label>
                        <input
                            id="pin"
                            ref="inputRef"
                            v-model="pin"
                            type="password"
                            placeholder="••••••"
                            autocomplete="current-password"
                            class="block w-full rounded-lg border border-outline-variant bg-surface text-on-surface text-body-md px-3 py-2.5 text-center tracking-widest focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
                            :class="error ? 'border-error focus:border-error focus:ring-error/20' : ''"
                        />
                        <p v-if="error" class="mt-stack-sm text-body-sm text-error flex items-center gap-1">
                            <span class="material-symbols-outlined text-[16px]">error</span>
                            {{ error }}
                        </p>
                    </div>

                    <button
                        type="submit"
                        :disabled="!pin || loading"
                        class="w-full py-2.5 rounded-lg text-label-md text-on-primary bg-primary hover:bg-on-primary-fixed-variant transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        <span v-if="loading" class="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                        {{ loading ? 'Đang xác thực...' : 'Đăng nhập' }}
                    </button>
                </form>
            </div>
        </div>
    </div>
</template>
