// SSE 串流工具 - 提供 Server-Sent Events 格式化與串流功能

import type { H3Event } from 'h3'
import { generateAIResponseWithMetadata } from './aiSimulator'

/**
 * 格式化 SSE 訊息
 * @param event - 事件名稱
 * @param data - 資料物件
 * @returns 格式化的 SSE 字串
 */
function formatSSE(event: string, data: any): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
}

/**
 * 延遲工具函式
 * @param ms - 延遲毫秒數
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * 以 SSE 格式串流 AI 回應（模仿 Claude/GPT API）
 *
 * 事件序列：
 * 1. message_start - 開始訊息
 * 2. content_block_start - 開始內容區塊
 * 3. content_block_delta - 逐字傳送內容（重複多次）
 * 4. content_block_stop - 結束內容區塊
 * 5. message_stop - 結束訊息（含 usage 資訊）
 *
 * @param userMessage - 用戶訊息
 * @param event - H3 事件物件（未使用，保留以符合簽名）
 * @returns ReadableStream
 */
export async function streamAIResponse(userMessage: string, event: H3Event) {
  const response = generateAIResponseWithMetadata(userMessage)

  // 建立 ReadableStream
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // 1. 發送 message_start 事件
        controller.enqueue(
          encoder.encode(formatSSE('message_start', {
            type: 'message_start',
            message: {
              id: response.id,
              role: response.role,
              model: response.model
            }
          }))
        )

        await sleep(100)

        // 2. 發送 content_block_start 事件
        controller.enqueue(
          encoder.encode(formatSSE('content_block_start', {
            type: 'content_block_start',
            index: 0,
            content_block: {
              type: 'text'
            }
          }))
        )

        await sleep(50)

        // 3. 逐字元串流內容
        for (let i = 0; i < response.content.length; i++) {
          controller.enqueue(
            encoder.encode(formatSSE('content_block_delta', {
              type: 'content_block_delta',
              index: 0,
              delta: {
                type: 'text_delta',
                text: response.content[i]
              }
            }))
          )

          // 變動延遲：20-80ms 每字元（模擬真實打字速度）
          await sleep(20 + Math.random() * 120)
        }

        await sleep(100)

        // 4. 發送 content_block_stop 事件
        controller.enqueue(
          encoder.encode(formatSSE('content_block_stop', {
            type: 'content_block_stop',
            index: 0
          }))
        )

        await sleep(50)

        // 5. 發送 message_stop 事件（含 usage 資訊）
        controller.enqueue(
          encoder.encode(formatSSE('message_stop', {
            type: 'message_stop',
            usage: response.usage
          }))
        )

        // 關閉串流
        controller.close()

      } catch (error) {
        console.error('[Stream] Error:', error)
        controller.enqueue(
          encoder.encode(formatSSE('error', {
            type: 'error',
            error: {
              message: (error as Error).message || 'Stream error'
            }
          }))
        )
        controller.close()
      }
    }
  })

  return stream
}

/**
 * 簡化版 SSE 串流（基於行的格式）
 * 適合簡單的串流場景
 *
 * @param userMessage - 用戶訊息
 * @param event - H3 事件物件
 * @returns ReadableStream
 */
export async function streamSimpleSSE(userMessage: string, event: H3Event) {
  const response = generateAIResponseWithMetadata(userMessage)
  const encoder = new TextEncoder()

  return new ReadableStream({
    async start(controller) {
      try {
        // 發送開始訊息
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'start' })}\n\n`)
        )

        await sleep(100)

        // 逐字元串流
        for (const char of response.content) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'chunk', text: char })}\n\n`)
          )
          await sleep(30 + Math.random() * 50)
        }

        // 發送結束訊息
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'done', usage: response.usage })}\n\n`)
        )

        controller.close()

      } catch (error) {
        console.error('[SimpleStream] Error:', error)
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'error', message: (error as Error).message })}\n\n`)
        )
        controller.close()
      }
    }
  })
}
