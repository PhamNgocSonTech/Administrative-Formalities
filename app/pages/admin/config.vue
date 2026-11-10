<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Phone,
  Tag,
  Plus,
  Trash2,
  Power,
  Loader2,
  Lock,
} from 'lucide-vue-next'

definePageMeta({ layout: 'admin' })

interface Sector {
  id: number
  name: string
  sort_order: number
  is_active: boolean
}
interface Contact {
  id: number
  sector_id: number | null
  sector?: string | null
  label: string
  phone: string
  note?: string | null
  is_active: boolean
}

const { api } = useAdminApi()
const { hasRole } = useAdminAuth()
const { toast } = useToast()
const { confirm } = useConfirm()

const canEdit = computed(() => hasRole('system_admin'))

const { data: sectors, refresh: refreshSectors, pending: sectorsPending } = await useAsyncData(
  'admin-sectors',
  () => api<Sector[]>('GET', '/api/admin/config/sectors'),
  { default: () => [] as Sector[] },
)

const { data: contacts, refresh: refreshContacts, pending: contactsPending } = await useAsyncData(
  'admin-contacts',
  () => api<Contact[]>('GET', '/api/admin/config/contacts'),
  { default: () => [] as Contact[] },
)

// Create sector
const newSector = reactive({ name: '', sort_order: 0 })
const addingSector = ref(false)

async function addSector() {
  if (!newSector.name.trim()) {
    toast.err('Tên lĩnh vực không được trống')
    return
  }
  addingSector.value = true
  try {
    await api('POST', '/api/admin/config/sectors', {
      name: newSector.name.trim(),
      sort_order: Number(newSector.sort_order) || 0,
    })
    toast.ok('Đã thêm lĩnh vực')
    newSector.name = ''
    newSector.sort_order = 0
    await refreshSectors()
  } catch (e: any) {
    toast.err(e?.message ?? 'Thêm thất bại')
  } finally {
    addingSector.value = false
  }
}

async function toggleSector(s: Sector) {
  try {
    await api('PATCH', `/api/admin/config/sectors/${s.id}`, {
      name: s.name,
      sort_order: s.sort_order,
      is_active: !s.is_active,
    })
    toast.ok(s.is_active ? 'Đã ngừng dùng' : 'Đã dùng lại')
    await refreshSectors()
  } catch (e: any) {
    toast.err(e?.message ?? 'Thao tác thất bại')
  }
}

async function deleteSector(s: Sector) {
  const ok = await confirm({
    title: `Xóa lĩnh vực "${s.name}"?`,
    description: 'Xóa hẳn khỏi cơ sở dữ liệu. Nhật ký vẫn giữ dấu vết.',
    confirmText: 'Xóa',
    variant: 'destructive',
  })
  if (!ok) return
  try {
    await api('POST', `/api/admin/config/sectors/${s.id}/delete`, { reason: ' ' })
    toast.ok('Đã xóa lĩnh vực')
    await refreshSectors()
  } catch (e: any) {
    toast.err(e?.message ?? 'Xóa thất bại')
  }
}

// Create contact
const newContact = reactive({
  sector_id: '',
  label: '',
  phone: '',
  note: '',
})
const addingContact = ref(false)

async function addContact() {
  if (!newContact.label.trim() || !newContact.phone.trim()) {
    toast.err('Đơn vị và số điện thoại bắt buộc')
    return
  }
  addingContact.value = true
  try {
    await api('POST', '/api/admin/config/contacts', {
      sector_id: newContact.sector_id ? Number(newContact.sector_id) : null,
      label: newContact.label.trim(),
      phone: newContact.phone.trim(),
      note: newContact.note.trim() || null,
    })
    toast.ok('Đã thêm số hỗ trợ')
    newContact.sector_id = ''
    newContact.label = ''
    newContact.phone = ''
    newContact.note = ''
    await refreshContacts()
  } catch (e: any) {
    toast.err(e?.message ?? 'Thêm thất bại')
  } finally {
    addingContact.value = false
  }
}

async function toggleContact(c: Contact) {
  try {
    await api('PATCH', `/api/admin/config/contacts/${c.id}`, {
      sector_id: c.sector_id,
      label: c.label,
      phone: c.phone,
      note: c.note,
      is_active: !c.is_active,
    })
    toast.ok(c.is_active ? 'Đã ngừng dùng' : 'Đã dùng lại')
    await refreshContacts()
  } catch (e: any) {
    toast.err(e?.message ?? 'Thao tác thất bại')
  }
}

async function deleteContact(c: Contact) {
  const ok = await confirm({
    title: `Xóa số "${c.label} — ${c.phone}"?`,
    description: 'Xóa hẳn khỏi cơ sở dữ liệu. Nhật ký vẫn giữ dấu vết.',
    confirmText: 'Xóa',
    variant: 'destructive',
  })
  if (!ok) return
  try {
    await api('POST', `/api/admin/config/contacts/${c.id}/delete`, { reason: ' ' })
    toast.ok('Đã xóa số hỗ trợ')
    await refreshContacts()
  } catch (e: any) {
    toast.err(e?.message ?? 'Xóa thất bại')
  }
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-semibold tracking-tight">Lĩnh vực &amp; số hỗ trợ</h1>
      <p class="text-sm text-muted-foreground mt-1">
        Danh mục lĩnh vực chính thức + số hotline theo lĩnh vực. Chatbot dùng khi câu hỏi ngoài phạm vi.
      </p>
    </div>

    <Alert v-if="!canEdit">
      <Lock class="size-4" />
      <AlertTitle>Thiếu quyền</AlertTitle>
      <AlertDescription>Cần vai trò <strong>Quản trị hệ thống</strong> để thêm/sửa. Bạn vẫn xem được danh sách.</AlertDescription>
    </Alert>

    <!-- Sectors -->
    <Card>
      <CardHeader>
        <div class="flex items-start gap-3">
          <div class="w-10 h-10 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Tag class="size-5" />
          </div>
          <div class="flex-1">
            <CardTitle>Danh mục lĩnh vực ({{ sectors?.length ?? 0 }})</CardTitle>
            <CardDescription class="mt-1">
              Chỉ nhập theo danh mục chính thức đã được xác nhận; hệ thống không tự suy lĩnh vực từ tệp Word.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent class="space-y-4">
        <form v-if="canEdit" @submit.prevent="addSector" class="flex items-end gap-2 flex-wrap">
          <div class="flex-1 min-w-[200px] space-y-1.5">
            <Label class="text-xs">Tên lĩnh vực</Label>
            <Input v-model="newSector.name" required placeholder="vd. Quản lý thị trường" />
          </div>
          <div class="space-y-1.5">
            <Label class="text-xs">Thứ tự</Label>
            <Input v-model.number="newSector.sort_order" type="number" class="w-20" />
          </div>
          <Button type="submit" :disabled="addingSector">
            <Loader2 v-if="addingSector" class="size-4 mr-2 animate-spin" />
            <Plus v-else class="size-4 mr-2" />
            Thêm
          </Button>
        </form>

        <div class="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tên</TableHead>
                <TableHead class="w-24">Thứ tự</TableHead>
                <TableHead class="w-32">Trạng thái</TableHead>
                <TableHead class="text-right w-48"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-if="sectorsPending" v-for="n in 3" :key="n">
                <TableCell colspan="4"><Skeleton class="h-6 w-full" /></TableCell>
              </TableRow>
              <TableRow v-else-if="!sectors?.length">
                <TableCell colspan="4" class="text-center text-muted-foreground py-8">Chưa có lĩnh vực nào.</TableCell>
              </TableRow>
              <TableRow v-else v-for="s in sectors" :key="s.id">
                <TableCell>{{ s.name }}</TableCell>
                <TableCell class="text-sm text-muted-foreground">{{ s.sort_order }}</TableCell>
                <TableCell>
                  <Badge :variant="s.is_active ? 'default' : 'secondary'" :class="s.is_active ? 'bg-success text-success-foreground' : ''" class="font-normal">
                    {{ s.is_active ? 'Đang dùng' : 'Ngừng' }}
                  </Badge>
                </TableCell>
                <TableCell class="text-right">
                  <div v-if="canEdit" class="flex items-center justify-end gap-1">
                    <Button variant="outline" size="sm" @click="toggleSector(s)">
                      <Power class="size-3.5 mr-1" />
                      {{ s.is_active ? 'Ngừng' : 'Dùng lại' }}
                    </Button>
                    <Button variant="outline" size="sm" class="text-destructive" @click="deleteSector(s)">
                      <Trash2 class="size-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>

    <!-- Contacts -->
    <Card>
      <CardHeader>
        <div class="flex items-start gap-3">
          <div class="w-10 h-10 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Phone class="size-5" />
          </div>
          <div class="flex-1">
            <CardTitle>Số điện thoại hỗ trợ ({{ contacts?.length ?? 0 }})</CardTitle>
            <CardDescription class="mt-1">
              Chỉ nhập số đã được cơ quan xác nhận. Trang công dân hiển thị theo lĩnh vực; nếu lĩnh vực chưa có số thì dùng số chung; nếu cả hai trống, báo chưa có thông tin.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent class="space-y-4">
        <form v-if="canEdit" @submit.prevent="addContact" class="grid md:grid-cols-2 gap-3">
          <div class="space-y-1.5">
            <Label class="text-xs">Áp dụng cho</Label>
            <Select v-model="newContact.sector_id">
              <SelectTrigger><SelectValue placeholder="Số chung (dự phòng)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Số chung (dự phòng)</SelectItem>
                <SelectItem v-for="s in (sectors ?? []).filter((x) => x.is_active)" :key="s.id" :value="String(s.id)">
                  {{ s.name }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="space-y-1.5">
            <Label class="text-xs">Đơn vị / đầu mối</Label>
            <Input v-model="newContact.label" required placeholder="vd. Phòng Pháp chế" />
          </div>
          <div class="space-y-1.5">
            <Label class="text-xs">Số điện thoại</Label>
            <Input v-model="newContact.phone" required placeholder="0276.xxx.xxx" />
          </div>
          <div class="space-y-1.5">
            <Label class="text-xs">Ghi chú</Label>
            <Input v-model="newContact.note" placeholder="Giờ hành chính" />
          </div>
          <div class="md:col-span-2 flex justify-end">
            <Button type="submit" :disabled="addingContact">
              <Loader2 v-if="addingContact" class="size-4 mr-2 animate-spin" />
              <Plus v-else class="size-4 mr-2" />
              Thêm số
            </Button>
          </div>
        </form>

        <div class="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Áp dụng</TableHead>
                <TableHead>Đầu mối</TableHead>
                <TableHead>Số</TableHead>
                <TableHead>Ghi chú</TableHead>
                <TableHead class="w-32">Trạng thái</TableHead>
                <TableHead class="text-right w-48"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-if="contactsPending" v-for="n in 3" :key="n">
                <TableCell colspan="6"><Skeleton class="h-6 w-full" /></TableCell>
              </TableRow>
              <TableRow v-else-if="!contacts?.length">
                <TableCell colspan="6" class="text-center text-muted-foreground py-8">Chưa có số hỗ trợ nào.</TableCell>
              </TableRow>
              <TableRow v-else v-for="c in contacts" :key="c.id">
                <TableCell class="text-sm">
                  <template v-if="c.sector">{{ c.sector }}</template>
                  <span v-else class="text-muted-foreground italic">Số chung</span>
                </TableCell>
                <TableCell class="text-sm">{{ c.label }}</TableCell>
                <TableCell class="text-sm font-mono">{{ c.phone }}</TableCell>
                <TableCell class="text-sm text-muted-foreground">{{ c.note || '—' }}</TableCell>
                <TableCell>
                  <Badge :variant="c.is_active ? 'default' : 'secondary'" :class="c.is_active ? 'bg-success text-success-foreground' : ''" class="font-normal">
                    {{ c.is_active ? 'Đang dùng' : 'Ngừng' }}
                  </Badge>
                </TableCell>
                <TableCell class="text-right">
                  <div v-if="canEdit" class="flex items-center justify-end gap-1">
                    <Button variant="outline" size="sm" @click="toggleContact(c)">
                      <Power class="size-3.5 mr-1" />
                      {{ c.is_active ? 'Ngừng' : 'Dùng lại' }}
                    </Button>
                    <Button variant="outline" size="sm" class="text-destructive" @click="deleteContact(c)">
                      <Trash2 class="size-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
