export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  const permission = await Notification.requestPermission()
  return permission === 'granted'
}

export function notifyTaskComplete(taskId: string, goal: string, success: boolean): void {
  if (Notification.permission !== 'granted') return
  new Notification(success ? '✅ NEXUS AI — Task Complete' : '❌ NEXUS AI — Task Failed', {
    body: goal.length > 80 ? goal.slice(0, 80) + '…' : goal,
    icon: '/favicon.ico',
    tag: `task-${taskId}`,
    data: { url: `/tasks/${taskId}` },
  })
}
