<script setup lang="ts">
import { Search } from 'lucide-vue-next'

const route = useRoute()

const navItems = [
  { to: '/', label: 'Thủ tục', match: (p: string) => p === '/' || p.startsWith('/thu-tuc') },
  { to: '/quyet-dinh', label: 'Quyết định công bố', match: (p: string) => p.startsWith('/quyet-dinh') },
  { to: '/lien-he', label: 'Liên hệ hỗ trợ', match: (p: string) => p.startsWith('/lien-he') },
]

function isActive(it: typeof navItems[0]) {
  return it.match(route.path)
}
</script>

<template>
  <div class="min-h-screen bg-background text-foreground antialiased flex flex-col">
    <!-- Skip link -->
    <a
      href="#main"
      class="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:px-3 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:text-sm"
    >Bỏ qua, tới nội dung chính</a>

    <!-- Site header -->
    <header class="sticky top-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b">
      <div class="max-w-[1200px] mx-auto px-6">
        <div class="flex items-center justify-between h-16 gap-6">
          <NuxtLink to="/" class="flex items-center gap-3 shrink-0 group">
            <div class="w-10 h-10 rounded-md bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
              TT
            </div>
            <div class="leading-tight hidden sm:block">
              <p class="text-sm font-semibold group-hover:text-primary transition-colors">Tra cứu thủ tục hành chính</p>
              <p class="text-xs text-muted-foreground">Ngành Công Thương tỉnh Tây Ninh</p>
            </div>
          </NuxtLink>
          <nav class="flex items-center gap-1" aria-label="Điều hướng chính">
            <NuxtLink
              v-for="it in navItems"
              :key="it.to"
              :to="it.to"
              class="relative px-3 py-2 text-sm font-medium rounded-md whitespace-nowrap transition-colors"
              :class="isActive(it)
                ? 'text-primary font-semibold bg-primary/8'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'"
            >
              {{ it.label }}
              <span
                v-if="isActive(it)"
                class="absolute inset-x-3 -bottom-[13px] h-[3px] bg-primary rounded-t-full"
              />
            </NuxtLink>
          </nav>
        </div>
      </div>
    </header>

    <main id="main" class="flex-1 max-w-[1200px] w-full mx-auto px-6 py-8" tabindex="-1">
      <slot />
    </main>

    <footer class="mt-auto border-t bg-muted/30">
      <div class="max-w-[1200px] mx-auto px-6 py-6">
        <p class="text-xs text-muted-foreground leading-relaxed">
          Thông tin trên trang chỉ gồm thủ tục, biểu mẫu và Quyết định công bố đã được cơ quan có thẩm quyền phê duyệt công khai.
          Danh sách giấy tờ trên trang là công cụ tự kiểm tra, không xác nhận hồ sơ hợp lệ.
        </p>
      </div>
    </footer>
  </div>
</template>
