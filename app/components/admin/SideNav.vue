<script setup lang="ts">
const route = useRoute()

const navItems = [
  { label: 'Danh sách TTHC', icon: 'list_alt', to: '/admin' },
  { label: 'Upload TTHC mới', icon: 'cloud_upload', to: '/admin/upload' },
]

const footerItems = [
  { label: 'Cài đặt', icon: 'settings', to: '/admin/settings' },
  { label: 'Đăng xuất', icon: 'logout', to: '/logout' },
]

function isActive(to: string) {
  if (to === '/admin') return route.path === '/admin'
  return route.path.startsWith(to)
}
</script>

<template>
  <aside class="fixed left-0 top-0 h-screen w-64 flex flex-col py-stack-md bg-surface-bright border-r border-outline-variant z-40">
    <!-- Brand header -->
    <div class="px-margin-desktop mb-stack-lg flex items-center gap-stack-sm">
      <div class="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container">
        <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24">
          admin_panel_settings
        </span>
      </div>
      <div>
        <p class="text-headline-sm font-bold text-on-surface leading-tight">Quản trị TTHC</p>
        <p class="text-body-sm text-on-surface-variant">Hệ thống hành chính</p>
      </div>
    </div>

    <!-- Main nav -->
    <nav class="flex-1 px-stack-sm flex flex-col gap-unit">
      <NuxtLink
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        class="flex items-center gap-stack-sm px-stack-md py-3 rounded-lg text-label-md transition-colors duration-200"
        :class="isActive(item.to)
          ? 'bg-surface-container-high text-primary border-l-4 border-primary'
          : 'text-on-surface-variant hover:bg-surface-container-low'"
      >
        <span
          class="material-symbols-outlined"
          :style="isActive(item.to) ? `font-variation-settings: 'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24` : ''"
        >{{ item.icon }}</span>
        {{ item.label }}
      </NuxtLink>
    </nav>

    <!-- Footer nav -->
    <div class="px-stack-sm border-t border-outline-variant pt-stack-sm flex flex-col gap-unit">
      <NuxtLink
        v-for="item in footerItems"
        :key="item.to"
        :to="item.to"
        class="flex items-center gap-stack-sm px-stack-md py-3 rounded-lg text-label-md text-on-surface-variant hover:bg-surface-container-low transition-colors duration-200"
      >
        <span class="material-symbols-outlined">{{ item.icon }}</span>
        {{ item.label }}
      </NuxtLink>
    </div>
  </aside>
</template>
