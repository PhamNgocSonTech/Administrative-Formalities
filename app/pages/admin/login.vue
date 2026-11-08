<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, ShieldUser, AlertCircle, Eye, EyeOff } from 'lucide-vue-next'

definePageMeta({ layout: false })

const { login } = useAdminAuth()
const route = useRoute()

const username = useLocalStorage('admin:last-username', '')
const password = ref('')
const loading = ref(false)
const error = ref('')
const showPwd = ref(false)
const userRef = ref<{ $el: HTMLInputElement } | null>(null)
const pwdRef = ref<{ $el: HTMLInputElement } | null>(null)

onMounted(() => {
  nextTick(() => {
    // Nếu đã nhớ username thì focus thẳng ô mật khẩu cho tiện
    if (username.value) pwdRef.value?.$el?.focus?.()
    else userRef.value?.$el?.focus?.()
  })
})

async function submit() {
  if (!username.value || !password.value || loading.value) return
  loading.value = true
  error.value = ''
  try {
    await login(username.value, password.value)
    const next = typeof route.query.next === 'string' ? route.query.next : '/admin'
    await navigateTo(next)
  } catch (e: any) {
    error.value = e?.message ?? 'Đăng nhập thất bại'
    password.value = ''
  } finally {
    loading.value = false
  }
}

const cfg = useRuntimeConfig()
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-6">
    <div class="w-full max-w-sm">
      <div class="flex flex-col items-center mb-6">
        <div class="w-14 h-14 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg mb-3">
          <ShieldUser class="size-7" />
        </div>
        <h1 class="text-xl font-semibold tracking-tight">Quản trị TTHC</h1>
        <p class="text-sm text-muted-foreground mt-1">Đăng nhập để tiếp tục</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Đăng nhập</CardTitle>
          <CardDescription>Dùng tài khoản nội bộ đã được cấp.</CardDescription>
        </CardHeader>
        <CardContent>
          <form @submit.prevent="submit" class="space-y-4">
            <div class="space-y-2">
              <Label for="u">Tên đăng nhập</Label>
              <Input
                id="u"
                ref="userRef"
                v-model="username"
                autocomplete="username"
                required
              />
            </div>
            <div class="space-y-2">
              <Label for="p">Mật khẩu</Label>
              <div class="relative">
                <Input
                  id="p"
                  ref="pwdRef"
                  v-model="password"
                  :type="showPwd ? 'text' : 'password'"
                  autocomplete="current-password"
                  required
                  :class="['pr-10', error ? 'border-destructive focus-visible:ring-destructive/40' : '']"
                />
                <button
                  type="button"
                  tabindex="-1"
                  class="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                  :aria-label="showPwd ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'"
                  @click="showPwd = !showPwd"
                >
                  <Eye v-if="!showPwd" class="size-4" />
                  <EyeOff v-else class="size-4" />
                </button>
              </div>
              <p v-if="error" class="text-sm text-destructive flex items-center gap-1.5">
                <AlertCircle class="size-4" />
                {{ error }}
              </p>
            </div>

            <Button type="submit" :disabled="!username || !password || loading" class="w-full">
              <Loader2 v-if="loading" class="size-4 mr-2 animate-spin" />
              {{ loading ? 'Đang xác thực…' : 'Đăng nhập' }}
            </Button>
          </form>
        </CardContent>
      </Card>

      <p class="text-center text-xs text-muted-foreground mt-6">
        Backend:
        <code class="font-mono text-foreground">{{ cfg.public.apiBase }}</code>
      </p>
    </div>
  </div>
</template>
