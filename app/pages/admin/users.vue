<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Users as UsersIcon,
  UserPlus,
  Save,
  KeyRound,
  Power,
  Loader2,
  Lock,
  Eye,
  EyeOff,
} from 'lucide-vue-next'

definePageMeta({ layout: 'admin' })

const ROLE_VI: Record<string, string> = {
  system_admin: 'Quản trị hệ thống',
  editor: 'Biên tập dữ liệu TTHC',
  approver: 'Phê duyệt công khai',
}
const ROLE_KEYS = ['system_admin', 'editor', 'approver'] as const

interface User {
  id: number
  username: string
  full_name?: string | null
  is_active: boolean
  locked?: boolean
  last_login_at?: string | null
  roles: string[]
}

const { api } = useAdminApi()
const { hasRole } = useAdminAuth()
const { toast } = useToast()
const { confirm } = useConfirm()

const canEdit = computed(() => hasRole('system_admin'))

const { data, refresh, pending, error } = await useAsyncData(
  'admin-users',
  () => api<User[]>('GET', '/api/admin/users'),
  { default: () => [] as User[] },
)

// Create user form
const nu = reactive({
  username: '',
  full_name: '',
  password: '',
  roles: new Set<string>(),
})
const showPwd = ref(false)
const creating = ref(false)

async function createUser() {
  if (!nu.username.trim() || !nu.password) {
    toast.err('Tên đăng nhập và mật khẩu bắt buộc')
    return
  }
  if (nu.password.length < 10) {
    toast.err('Mật khẩu tối thiểu 10 ký tự')
    return
  }
  if (!/\d/.test(nu.password) || !/[a-zA-Z]/.test(nu.password)) {
    toast.err('Mật khẩu phải có cả chữ và số')
    return
  }
  if (!nu.roles.size) {
    toast.err('Phải chọn ít nhất 1 vai trò')
    return
  }
  creating.value = true
  try {
    await api('POST', '/api/admin/users', {
      username: nu.username.trim(),
      full_name: nu.full_name.trim() || null,
      password: nu.password,
      roles: [...nu.roles],
    })
    toast.ok(`Đã tạo tài khoản ${nu.username}`)
    nu.username = ''
    nu.full_name = ''
    nu.password = ''
    nu.roles = new Set()
    await refresh()
  } catch (e: any) {
    toast.err(e?.message ?? 'Tạo tài khoản thất bại')
  } finally {
    creating.value = false
  }
}

function toggleCreateRole(r: string, v: boolean | 'indeterminate') {
  const s = new Set(nu.roles)
  if (v === true) s.add(r)
  else s.delete(r)
  nu.roles = s
}

// Per-user role draft (checkbox state before save)
const roleDraft = ref<Map<number, Set<string>>>(new Map())

function getDraftRoles(u: User): Set<string> {
  if (!roleDraft.value.has(u.id)) {
    roleDraft.value.set(u.id, new Set(u.roles))
  }
  return roleDraft.value.get(u.id)!
}

function toggleRole(u: User, r: string, v: boolean | 'indeterminate') {
  const s = new Set(getDraftRoles(u))
  if (v === true) s.add(r)
  else s.delete(r)
  roleDraft.value.set(u.id, s)
  roleDraft.value = new Map(roleDraft.value)
}

function isDraftDirty(u: User): boolean {
  const d = roleDraft.value.get(u.id)
  if (!d) return false
  const cur = new Set(u.roles)
  if (d.size !== cur.size) return true
  for (const r of d) if (!cur.has(r)) return true
  return false
}

const savingRoleId = ref<number | null>(null)

async function saveRoles(u: User) {
  const d = roleDraft.value.get(u.id)
  if (!d) return
  savingRoleId.value = u.id
  try {
    await api('PATCH', `/api/admin/users/${u.id}`, { roles: [...d] })
    toast.ok(`Đã cập nhật vai trò ${u.username}`)
    roleDraft.value.delete(u.id)
    await refresh()
  } catch (e: any) {
    toast.err(e?.message ?? 'Lưu vai trò thất bại')
  } finally {
    savingRoleId.value = null
  }
}

async function toggleActive(u: User) {
  const ok = await confirm({
    title: u.is_active ? `Khóa tài khoản ${u.username}?` : `Mở khóa tài khoản ${u.username}?`,
    description: u.is_active
      ? 'Người dùng không thể đăng nhập cho đến khi được mở khóa.'
      : 'Tài khoản sẽ đăng nhập được bình thường.',
    confirmText: u.is_active ? 'Khóa' : 'Mở khóa',
    variant: u.is_active ? 'warning' : 'default',
  })
  if (!ok) return
  try {
    await api('PATCH', `/api/admin/users/${u.id}`, { is_active: !u.is_active })
    toast.ok(u.is_active ? 'Đã khóa' : 'Đã mở khóa')
    await refresh()
  } catch (e: any) {
    toast.err(e?.message ?? 'Thao tác thất bại')
  }
}

// Reset password
const pwdOpen = ref(false)
const pwdTarget = ref<User | null>(null)
const pwdNew = ref('')
const pwdShow = ref(false)
const pwdSaving = ref(false)

function openResetPwd(u: User) {
  pwdTarget.value = u
  pwdNew.value = ''
  pwdShow.value = false
  pwdOpen.value = true
}

async function doResetPwd() {
  if (!pwdTarget.value) return
  if (pwdNew.value.length < 10) {
    toast.err('Mật khẩu tối thiểu 10 ký tự')
    return
  }
  if (!/\d/.test(pwdNew.value) || !/[a-zA-Z]/.test(pwdNew.value)) {
    toast.err('Mật khẩu phải có cả chữ và số')
    return
  }
  pwdSaving.value = true
  try {
    await api('PATCH', `/api/admin/users/${pwdTarget.value.id}`, { new_password: pwdNew.value })
    toast.ok(`Đã đặt lại mật khẩu ${pwdTarget.value.username}`)
    pwdOpen.value = false
    pwdNew.value = ''
  } catch (e: any) {
    toast.err(e?.message ?? 'Đặt lại mật khẩu thất bại')
  } finally {
    pwdSaving.value = false
  }
}

function fmtDate(iso?: string | null) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })
  } catch { return iso }
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-semibold tracking-tight">Tài khoản</h1>
      <p class="text-sm text-muted-foreground mt-1">
        3 vai trò nội bộ: <strong>Quản trị hệ thống</strong>, <strong>Biên tập</strong>, <strong>Phê duyệt</strong>. Một tài khoản có thể kiêm nhiệm.
      </p>
    </div>

    <Alert v-if="!canEdit">
      <Lock class="size-4" />
      <AlertTitle>Thiếu quyền</AlertTitle>
      <AlertDescription>Cần vai trò <strong>Quản trị hệ thống</strong> để tạo/sửa. Bạn vẫn xem được danh sách.</AlertDescription>
    </Alert>

    <Alert v-if="error" variant="destructive">
      <AlertTitle>Lỗi tải danh sách</AlertTitle>
      <AlertDescription>{{ error.message }}</AlertDescription>
    </Alert>

    <!-- Create -->
    <Card v-if="canEdit">
      <CardHeader>
        <div class="flex items-start gap-3">
          <div class="w-10 h-10 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <UserPlus class="size-5" />
          </div>
          <div>
            <CardTitle>Tạo tài khoản mới</CardTitle>
            <CardDescription class="mt-1">Mật khẩu ≥10 ký tự, có cả chữ và số. Không chứa tên đăng nhập.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form @submit.prevent="createUser" class="grid md:grid-cols-2 gap-4">
          <div class="space-y-1.5">
            <Label>Tên đăng nhập <span class="text-destructive">*</span></Label>
            <Input v-model="nu.username" required autocomplete="off" />
          </div>
          <div class="space-y-1.5">
            <Label>Họ tên</Label>
            <Input v-model="nu.full_name" autocomplete="off" />
          </div>
          <div class="space-y-1.5 md:col-span-2">
            <Label>Mật khẩu ban đầu <span class="text-destructive">*</span></Label>
            <div class="relative">
              <Input
                v-model="nu.password"
                :type="showPwd ? 'text' : 'password'"
                required
                autocomplete="new-password"
                class="pr-10"
              />
              <button
                type="button"
                tabindex="-1"
                class="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                :aria-label="showPwd ? 'Ẩn' : 'Hiện'"
                @click="showPwd = !showPwd"
              >
                <Eye v-if="!showPwd" class="size-4" />
                <EyeOff v-else class="size-4" />
              </button>
            </div>
          </div>
          <div class="space-y-1.5 md:col-span-2">
            <Label>Vai trò <span class="text-destructive">*</span></Label>
            <div class="flex flex-wrap gap-3 pt-1">
              <label
                v-for="r in ROLE_KEYS"
                :key="r"
                class="flex items-center gap-2 border rounded-md px-3 py-2 cursor-pointer hover:border-primary/60 transition-colors"
                :class="nu.roles.has(r) ? 'border-primary bg-primary/5' : ''"
              >
                <Checkbox
                  :model-value="nu.roles.has(r)"
                  @update:model-value="(v) => toggleCreateRole(r, v)"
                />
                <span class="text-sm">{{ ROLE_VI[r] }}</span>
              </label>
            </div>
          </div>
          <div class="md:col-span-2 flex justify-end">
            <Button type="submit" :disabled="creating">
              <Loader2 v-if="creating" class="size-4 mr-2 animate-spin" />
              <UserPlus v-else class="size-4 mr-2" />
              Tạo tài khoản
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>

    <!-- List -->
    <Card>
      <CardHeader>
        <div class="flex items-start gap-3">
          <div class="w-10 h-10 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <UsersIcon class="size-5" />
          </div>
          <div>
            <CardTitle>Tài khoản ({{ data?.length ?? 0 }})</CardTitle>
            <CardDescription class="mt-1">Tick checkbox đổi vai trò, bấm "Lưu vai trò" để áp dụng cho từng tài khoản.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent class="p-0">
        <div class="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tài khoản</TableHead>
                <TableHead class="min-w-[360px]">Vai trò</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Đăng nhập gần nhất</TableHead>
                <TableHead class="text-right w-64"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-if="pending" v-for="n in 3" :key="n">
                <TableCell colspan="5"><Skeleton class="h-6 w-full" /></TableCell>
              </TableRow>
              <TableRow v-else-if="!data?.length">
                <TableCell colspan="5" class="text-center text-muted-foreground py-8">Chưa có tài khoản nào.</TableCell>
              </TableRow>
              <TableRow v-else v-for="u in data" :key="u.id" class="align-top">
                <TableCell class="align-top">
                  <div class="font-medium">{{ u.username }}</div>
                  <div v-if="u.full_name" class="text-xs text-muted-foreground">{{ u.full_name }}</div>
                </TableCell>
                <TableCell>
                  <div class="flex flex-col gap-1.5">
                    <label
                      v-for="r in ROLE_KEYS"
                      :key="r"
                      class="flex items-center gap-2 text-sm"
                    >
                      <Checkbox
                        :disabled="!canEdit"
                        :model-value="getDraftRoles(u).has(r)"
                        @update:model-value="(v) => toggleRole(u, r, v)"
                      />
                      {{ ROLE_VI[r] }}
                    </label>
                  </div>
                </TableCell>
                <TableCell class="align-top">
                  <div class="flex flex-col gap-1">
                    <Badge
                      :variant="u.is_active ? 'default' : 'destructive'"
                      :class="u.is_active ? 'bg-success text-success-foreground' : ''"
                      class="font-normal w-fit"
                    >{{ u.is_active ? 'Hoạt động' : 'Khóa' }}</Badge>
                    <Badge v-if="u.locked" variant="outline" class="text-warning border-warning/40 font-normal w-fit text-xs">
                      Tạm khóa do sai mật khẩu
                    </Badge>
                  </div>
                </TableCell>
                <TableCell class="text-xs text-muted-foreground align-top">{{ fmtDate(u.last_login_at) }}</TableCell>
                <TableCell class="text-right align-top">
                  <div v-if="canEdit" class="flex flex-col items-end gap-1">
                    <Button
                      size="sm"
                      :disabled="!isDraftDirty(u) || savingRoleId === u.id"
                      @click="saveRoles(u)"
                    >
                      <Loader2 v-if="savingRoleId === u.id" class="size-3.5 mr-1 animate-spin" />
                      <Save v-else class="size-3.5 mr-1" />
                      Lưu vai trò
                    </Button>
                    <div class="flex items-center gap-1">
                      <Button variant="outline" size="sm" @click="toggleActive(u)">
                        <Power class="size-3.5 mr-1" />
                        {{ u.is_active ? 'Khóa' : 'Mở khóa' }}
                      </Button>
                      <Button variant="outline" size="sm" @click="openResetPwd(u)">
                        <KeyRound class="size-3.5 mr-1" />
                        Đặt lại MK
                      </Button>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>

    <!-- Reset password dialog -->
    <Dialog v-model:open="pwdOpen">
      <DialogContent>
        <DialogHeader>
          <DialogTitle class="flex items-center gap-2">
            <KeyRound class="size-5 text-primary" />
            Đặt lại mật khẩu cho {{ pwdTarget?.username }}
          </DialogTitle>
          <DialogDescription>
            Mật khẩu mới ≥10 ký tự, có cả chữ và số. Người dùng dùng mật khẩu này đăng nhập lần sau.
          </DialogDescription>
        </DialogHeader>
        <div class="space-y-2">
          <Label>Mật khẩu mới</Label>
          <div class="relative">
            <Input
              v-model="pwdNew"
              :type="pwdShow ? 'text' : 'password'"
              autocomplete="new-password"
              class="pr-10"
            />
            <button
              type="button"
              tabindex="-1"
              class="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-muted-foreground hover:text-foreground"
              @click="pwdShow = !pwdShow"
            >
              <Eye v-if="!pwdShow" class="size-4" />
              <EyeOff v-else class="size-4" />
            </button>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="pwdOpen = false">Hủy</Button>
          <Button :disabled="pwdSaving" @click="doResetPwd">
            <Loader2 v-if="pwdSaving" class="size-4 mr-2 animate-spin" />
            Đặt lại
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
