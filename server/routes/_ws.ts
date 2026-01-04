// WebSocket 處理器 - 雙向即時通訊
// 路由: /ws

import { defineWebSocketHandler } from 'h3'
import type { Peer } from 'crossws'

// 訊息類型定義
interface UserMessage {
  type: 'user_message'
  content: string
}

interface ServerMessage {
  type: 'status' | 'stream_start' | 'stream_chunk' | 'stream_end' | 'error' | 'system' | 'message_received'
  content?: string
  message?: string
}

export default defineWebSocketHandler({
  /**
   * 連線建立時觸發
   */
  async open(peer: Peer) {
    console.log('[ws] 客戶端連線:', peer.id)

    // 發送歡迎訊息
    peer.send(JSON.stringify({
      type: 'system',
      content: '已連線到 AI 服務器'
    } as ServerMessage))
  },

  /**
   * 收到訊息時觸發
   */
  async message(peer: Peer, message) {
    try {
      const data: UserMessage = JSON.parse(message.text())

      if (data.type === 'user_message') {
        console.log('[ws] 收到訊息:', data.content)

        // 1. 確認收到訊息
        peer.send(JSON.stringify({
          type: 'message_received'
        } as ServerMessage))

        // 2. 動態引入 AI 模擬器（避免循環依賴）
        const { generateAIResponse } = await import('../utils/aiSimulator')

        // 3. 發送思考狀態
        peer.send(JSON.stringify({
          type: 'status',
          content: 'thinking'
        } as ServerMessage))

        // 4. 模擬思考延遲（500-1500ms）
        await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000))

        // 5. 開始串流
        peer.send(JSON.stringify({
          type: 'stream_start'
        } as ServerMessage))

        // 6. 生成回應
        const response = generateAIResponse(data.content)

        // 7. 逐字元發送
        for (let i = 0; i < response.length; i++) {
          peer.send(JSON.stringify({
            type: 'stream_chunk',
            content: response[i]
          } as ServerMessage))

          // 字元延遲：20-80ms（模擬真實打字速度）
          await new Promise(resolve => setTimeout(resolve, 20 + Math.random() * 60))
        }

        // 8. 結束串流
        peer.send(JSON.stringify({
          type: 'stream_end'
        } as ServerMessage))

        console.log('[ws] 回應完成')
      }
    } catch (error) {
      console.error('[ws] 錯誤:', error)
      peer.send(JSON.stringify({
        type: 'error',
        message: (error as Error).message || '服務器錯誤'
      } as ServerMessage))
    }
  },

  /**
   * 連線關閉時觸發
   */
  async close(peer: Peer, event) {
    console.log('[ws] 客戶端斷線:', peer.id, 'Code:', event.code, 'Reason:', event.reason)
  },

  /**
   * 發生錯誤時觸發
   */
  async error(peer: Peer, error) {
    console.error('[ws] WebSocket 錯誤:', peer.id, error)
  }
})
