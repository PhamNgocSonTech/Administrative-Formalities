/**
 * State chung cho progress bar trên cùng.
 * Mọi action dùng refreshKeepingPosition() đều set active trong lúc chờ.
 */
export function useRefreshState() {
  const active = useState<boolean>('admin-refreshing', () => false)
  const counter = useState<number>('admin-refresh-count', () => 0)

  function begin() {
    counter.value++
    active.value = true
  }
  function end() {
    counter.value = Math.max(0, counter.value - 1)
    if (counter.value === 0) active.value = false
  }

  /** Wrapper: tự begin + end quanh promise. */
  async function wrap<T>(p: Promise<T>): Promise<T> {
    begin()
    try { return await p }
    finally { end() }
  }

  return { active, begin, end, wrap }
}
