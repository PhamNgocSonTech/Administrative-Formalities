import { toast as sonner } from 'vue-sonner'

function wrap(fn: (msg: string) => string | number, msg: string) {
  return fn(msg)
}

export function useToast() {
  const toast = (msg: string) => sonner.success(msg)
  toast.ok = (msg: string) => sonner.success(msg)
  toast.err = (msg: string) => sonner.error(msg)
  toast.info = (msg: string) => sonner(msg)
  toast.warning = (msg: string) => sonner.warning(msg)
  return { toast }
}
