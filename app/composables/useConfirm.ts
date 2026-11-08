export interface ConfirmOptions {
  title: string
  description?: string
  confirmText?: string
  cancelText?: string
  variant?: 'default' | 'destructive' | 'warning'
}

interface ConfirmState extends ConfirmOptions {
  open: boolean
  resolve: ((v: boolean) => void) | null
}

export function useConfirmState() {
  return useState<ConfirmState>('admin-confirm', () => ({
    open: false,
    title: '',
    description: '',
    confirmText: 'Xác nhận',
    cancelText: 'Hủy',
    variant: 'default',
    resolve: null,
  }))
}

export function useConfirm() {
  const state = useConfirmState()

  function confirm(opts: ConfirmOptions): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      // Resolve previous confirm as cancelled (if any still open)
      state.value.resolve?.(false)
      state.value = {
        open: true,
        title: opts.title,
        description: opts.description ?? '',
        confirmText: opts.confirmText ?? 'Xác nhận',
        cancelText: opts.cancelText ?? 'Hủy',
        variant: opts.variant ?? 'default',
        resolve,
      }
    })
  }

  return { confirm }
}
