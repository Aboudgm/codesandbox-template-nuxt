import { useEffect, useRef, useCallback } from 'react'

interface WebSocketMessage {
  type: string
  [key: string]: unknown
}

export function useTaskWebSocket(
  taskId: string | null,
  onMessage: (msg: WebSocketMessage) => void
) {
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const MAX_RECONNECT_ATTEMPTS = 5
  const onMessageRef = useRef(onMessage)

  // Keep callback ref up to date
  useEffect(() => {
    onMessageRef.current = onMessage
  }, [onMessage])

  const connect = useCallback(() => {
    if (!taskId) return
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    const wsUrl = `${protocol}//${host}/ws/${taskId}`

    try {
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        console.log(`[WS] Connected to task ${taskId}`)
        reconnectAttemptsRef.current = 0
        onMessageRef.current({ type: 'connected' })
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as WebSocketMessage
          onMessageRef.current(data)
        } catch (err) {
          console.error('[WS] Failed to parse message:', err)
        }
      }

      ws.onerror = (error) => {
        console.error('[WS] Error:', error)
      }

      ws.onclose = (event) => {
        console.log(`[WS] Disconnected (code: ${event.code})`)
        onMessageRef.current({ type: 'disconnected' })

        // Auto-reconnect unless closed intentionally
        if (event.code !== 1000 && reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          const delay = Math.min(1000 * 2 ** reconnectAttemptsRef.current, 30000)
          reconnectAttemptsRef.current++
          console.log(`[WS] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current})`)
          reconnectTimeoutRef.current = setTimeout(() => {
            connect()
          }, delay)
        }
      }
    } catch (err) {
      console.error('[WS] Failed to connect:', err)
    }
  }, [taskId])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    if (wsRef.current) {
      wsRef.current.close(1000, 'Component unmounted')
      wsRef.current = null
    }
    reconnectAttemptsRef.current = MAX_RECONNECT_ATTEMPTS // prevent reconnect
  }, [])

  useEffect(() => {
    if (taskId) {
      reconnectAttemptsRef.current = 0
      connect()
    }
    return () => {
      disconnect()
    }
  }, [taskId, connect, disconnect])

  return { disconnect }
}
