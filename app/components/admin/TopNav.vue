<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  List,
  Upload,
  Gavel,
  FileCheck,
  Phone,
  Users,
  History,
  LogOut,
  ShieldUser,
  ChevronDown,
} from 'lucide-vue-next'

const { me, hasRole, roleLabel, logout } = useAdminAuth()
const route = useRoute()

interface Tab {
  to: string
  label: string
  icon: any
  match?: (path: string) => boolean
  role?: 'system_admin' | 'editor' | 'approver'
}

const tabs: Tab[] = [
  { to: '/admin', label: 'TTHC', icon: List, match: (p) => p === '/admin' || p.startsWith('/admin/v/') },
  { to: '/admin/import', label: 'Import Word', icon: Upload },
  { to: '/admin/qd', label: 'Quyết định', icon: Gavel, match: (p) => p.startsWith('/admin/qd') || p.startsWith('/admin/d/') },
  { to: '/admin/duyet', label: 'Chờ duyệt', icon: FileCheck },
  { to: '/admin/config', label: 'Lĩnh vực & hỗ trợ', icon: Phone, role: 'system_admin' },
  { to: '/admin/users', label: 'Tài khoản', icon: Users, role: 'system_admin' },
  { to: '/admin/audit', label: 'Nhật ký', icon: History },
]

const visibleTabs = computed(() => tabs.filter((t) => !t.role || hasRole(t.role)))

const roleName: Record<string, string> = {
  system_admin: 'Quản trị hệ thống',
  editor: 'Biên tập TTHC',
  approver: 'Phê duyệt',
}

function isActive(t: Tab) {
  return t.match ? t.match(route.path) : route.path.startsWith(t.to)
}

async function onLogout() {
  await logout()
  // Force full reload để clear hết state cached (useAsyncData, etc.)
  if (import.meta.client) {
    window.location.href = '/admin/login'
  } else {
    await navigateTo('/admin/login', { replace: true })
  }
}

const displayName = computed(() => me.value?.full_name || me.value?.username || '')
const initials = computed(() => {
  const n = displayName.value
  if (!n) return '?'
  const parts = n.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return n.slice(0, 2).toUpperCase()
})
</script>

<template>
  <header class="sticky top-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b">
    <div class="max-w-[1440px] mx-auto px-6 grid grid-cols-[1fr_auto] gap-4 items-center py-3">
      <div class="min-w-0">
        <div class="flex items-center gap-3 mb-2">
          <div class="w-9 h-9 rounded-md bg-primary text-primary-foreground flex items-center justify-center shrink-0">
            <ShieldUser class="size-5" />
          </div>
          <div class="leading-tight min-w-0">
            <p class="text-sm font-semibold">Quản trị TTHC</p>
            <p class="text-xs text-muted-foreground truncate">Mọi thay đổi là BẢN NHÁP cho tới khi người có quyền phê duyệt công khai</p>
          </div>
        </div>

        <nav class="flex gap-0.5 overflow-x-auto overflow-y-hidden -mx-1 px-1 scrollbar-hide">
          <NuxtLink
            v-for="t in visibleTabs"
            :key="t.to"
            :to="t.to"
            class="relative inline-flex items-center gap-2 px-3 py-2 text-sm whitespace-nowrap transition-all"
            :class="isActive(t)
              ? 'text-primary font-semibold bg-primary/8 rounded-md'
              : 'text-muted-foreground font-medium hover:text-foreground hover:bg-accent rounded-md'"
          >
            <component :is="t.icon" class="size-4 shrink-0" :class="isActive(t) ? 'text-primary' : ''" />
            {{ t.label }}
            <span
              v-if="isActive(t)"
              class="absolute inset-x-3 -bottom-[7px] h-[3px] bg-primary rounded-t-full"
            />
          </NuxtLink>
        </nav>
      </div>

      <div class="self-center">
        <DropdownMenu v-if="me">
          <DropdownMenuTrigger as-child>
            <Button variant="ghost" class="h-auto py-1.5 gap-2.5">
              <div class="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">
                {{ initials }}
              </div>
              <div class="text-left hidden sm:block">
                <p class="text-sm font-semibold leading-tight">{{ displayName }}</p>
                <p class="text-xs text-muted-foreground leading-tight mt-0.5">{{ roleLabel }}</p>
              </div>
              <ChevronDown class="size-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" class="w-64">
            <DropdownMenuLabel class="font-normal">
              <div class="flex items-center gap-3 py-1">
                <div class="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">
                  {{ initials }}
                </div>
                <div class="min-w-0">
                  <p class="text-sm font-semibold truncate">{{ displayName }}</p>
                  <p class="text-xs text-muted-foreground truncate">@{{ me.username }}</p>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuLabel class="font-normal text-xs text-muted-foreground px-2 pt-2 pb-1">Vai trò</DropdownMenuLabel>
            <div class="px-2 pb-2 flex flex-wrap gap-1">
              <Badge
                v-for="r in me.roles"
                :key="r"
                variant="secondary"
                class="font-normal text-xs"
              >{{ roleName[r] }}</Badge>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem class="text-destructive focus:text-destructive cursor-pointer" @click="onLogout">
              <LogOut class="size-4 mr-2" />
              Đăng xuất
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  </header>
</template>

<style scoped>
.scrollbar-hide { scrollbar-width: none; -ms-overflow-style: none; }
.scrollbar-hide::-webkit-scrollbar { display: none; }
</style>
