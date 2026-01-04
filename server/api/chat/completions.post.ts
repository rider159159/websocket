// SSE Chat Completions API - 模仿 OpenAI/Claude API
// 路由: POST /api/chat/completions

import { defineEventHandler, readBody, createError, setResponseHeader } from 'h3'

// 訊息介面
interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
}

// 請求介面
interface ChatRequest {
  messages: Message[]
  stream?: boolean
  max_tokens?: number
}

export default defineEventHandler(async (event) => {
  try {
    // 讀取請求 body
    const body: ChatRequest = await readBody(event)

    // 驗證請求
    if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
      throw createError({
        statusCode: 400,
        message: 'Invalid request: messages array required'
      })
    }

    const lastMessage = body.messages[body.messages.length - 1]

    if (lastMessage.role !== 'user') {
      throw createError({
        statusCode: 400,
        message: 'Last message must be from user'
      })
    }

    console.log('[SSE] 收到請求:', {
      messageCount: body.messages.length,
      stream: body.stream,
      content: lastMessage.content.substring(0, 50) + '...'
    })

    // 如果不需要串流，返回完整回應
    if (!body.stream) {
      const { generateAIResponseWithMetadata } = await import('../../utils/aiSimulator')
      const response = generateAIResponseWithMetadata(lastMessage.content)

      console.log('[SSE] 返回非串流回應')

      return {
        id: response.id,
        type: 'message',
        role: 'assistant',
        content: [{
          type: 'text',
          text: response.content
        }],
        model: response.model,
        usage: response.usage,
        timestamp: response.timestamp
      }
    }

    // 設定 SSE headers
    setResponseHeader(event, 'Content-Type', 'text/event-stream')
    setResponseHeader(event, 'Cache-Control', 'no-cache')
    setResponseHeader(event, 'Connection', 'keep-alive')
    setResponseHeader(event, 'X-Accel-Buffering', 'no') // 禁用 nginx 緩衝

    console.log('[SSE] 開始串流回應')

    // 引入串流工具
    const { streamAIResponse } = await import('../../utils/streamHelpers')

    // 返回 SSE 串流
    return await streamAIResponse(lastMessage.content, event)

  } catch (error) {
    console.error('[SSE] 錯誤:', error)

    // 如果是已知的 H3Error，直接拋出
    if ((error as any).statusCode) {
      throw error
    }

    // 否則返回 500 錯誤
    throw createError({
      statusCode: 500,
      message: (error as Error).message || 'Internal server error'
    })
  }
})
