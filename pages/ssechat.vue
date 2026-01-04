<template>
  <div class="gpt-chat-container">
    <div class="chat-header">
      <h2>💬 SSE 聊天室 (OpenAI/Claude 模式)</h2>
      <div class="status-indicator connected">
        ● SSE 模式
      </div>
    </div>

    <!-- 訊息顯示區 -->
    <div class="messages-container" ref="messagesContainer">
      <div
        v-for="(msg, index) in messages"
        :key="index"
        class="message-wrapper"
        :class="msg.role"
      >
        <div class="message-avatar">
          {{ msg.role === 'user' ? '👤' : '🤖' }}
        </div>
        <div class="message-content">
          <div class="message-role">
            {{ msg.role === 'user' ? '你' : 'AI 助手' }}
          </div>
          <div class="message-text">
            {{ msg.content }}
            <span v-if="msg.isStreaming" class="typing-cursor">▋</span>
          </div>
          <div class="message-time">{{ msg.time }}</div>
        </div>
      </div>

      <!-- AI 思考中指示器 -->
      <div v-if="isThinking" class="thinking-indicator">
        <div class="message-avatar">🤖</div>
        <div class="thinking-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    </div>

    <!-- 輸入區 -->
    <div class="input-container">
      <textarea
        v-model="userInput"
        @keydown.enter.exact.prevent="sendMessage"
        placeholder="輸入訊息... (Enter 發送，Shift+Enter 換行)"
        :disabled="isWaitingResponse"
        rows="1"
        ref="textarea"
      ></textarea>
      <button
        @click="sendMessage"
        :disabled="!userInput.trim() || isWaitingResponse"
        class="send-button"
      >
        <span v-if="!isWaitingResponse">發送</span>
        <span v-else class="loading-spinner">⏳</span>
      </button>
    </div>

    <!-- 控制按鈕 -->
    <div class="controls">
      <button @click="clearMessages" class="clear-btn">
        清除對話
      </button>
      <button @click="testNonStreaming" :disabled="isWaitingResponse" class="test-btn">
        測試非串流模式
      </button>
    </div>

    <!-- 資訊面板 -->
    <div class="info-panel">
      <h3>📡 SSE 模式說明</h3>
      <p>此頁面使用 Server-Sent Events (SSE) 實現單向串流，模擬 OpenAI/Claude API 的行為模式。</p>
      <ul>
        <li><strong>POST</strong> 請求到 <code>/api/chat/completions</code></li>
        <li>返回 <code>text/event-stream</code> 格式</li>
        <li>支援 <code>event</code> 和 <code>data</code> 欄位</li>
        <li>字符級串流展示（20-80ms/字元）</li>
        <li>模擬 AI 回應，無需真實 API key</li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick, watch } from 'vue'

// 響應式數據
const messages = ref([])
const userInput = ref('')
const isThinking = ref(false)
const isWaitingResponse = ref(false)
const messagesContainer = ref(null)
const textarea = ref(null)

// 對話歷史記錄
let conversationHistory = []

// 發送訊息 (使用 SSE)
const sendMessage = async () => {
  if (!userInput.value.trim() || isWaitingResponse.value) {
    return
  }

  const message = userInput.value.trim()

  // 添加用戶訊息到界面
  const userMsg = {
    role: 'user',
    content: message,
    time: getCurrentTime(),
    isStreaming: false
  }
  messages.value.push(userMsg)
  conversationHistory.push({ role: 'user', content: message })

  userInput.value = ''
  isWaitingResponse.value = true
  isThinking.value = true
  scrollToBottom()

  // 重置 textarea 高度
  if (textarea.value) {
    textarea.value.style.height = 'auto'
  }

  try {
    // 發送 POST 請求
    const response = await fetch('/api/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: conversationHistory,
        stream: true
      })
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    // 處理 SSE 串流
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    isThinking.value = false

    // 建立新的 AI 訊息並加入響應式陣列
    const aiMessage = {
      role: 'assistant',
      content: '',
      time: getCurrentTime(),
      isStreaming: true
    }
    messages.value.push(aiMessage)

    // 記錄索引位置以便後續更新
    const messageIndex = messages.value.length - 1
    scrollToBottom()

    while (true) {
      const { done, value } = await reader.read()

      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (!line.trim()) continue

        // 解析 SSE 格式
        const eventMatch = line.match(/^event: (.+)$/m)
        const dataMatch = line.match(/^data: (.+)$/m)

        if (dataMatch) {
          try {
            const data = JSON.parse(dataMatch[1])

            // 處理不同的事件類型
            if (data.type === 'content_block_delta') {
              if (data.delta && data.delta.text) {
                // 直接更新響應式陣列中的內容
                messages.value[messageIndex].content += data.delta.text
                scrollToBottom()
              }
            } else if (data.type === 'message_stop') {
              // 串流完成
              messages.value[messageIndex].isStreaming = false
              conversationHistory.push({
                role: 'assistant',
                content: messages.value[messageIndex].content
              })
            } else if (data.type === 'error') {
              throw new Error(data.error?.message || 'Stream error')
            }
          } catch (e) {
            console.error('解析錯誤:', e)
          }
        }
      }
    }

  } catch (error) {
    console.error('SSE 錯誤:', error)
    addSystemMessage(`錯誤: ${error.message}`)

    // 如果有未完成的訊息，標記為完成
    const lastMessage = messages.value[messages.value.length - 1]
    if (lastMessage && lastMessage.role === 'assistant' && lastMessage.isStreaming) {
      lastMessage.isStreaming = false
    }
  } finally {
    isWaitingResponse.value = false
    isThinking.value = false
    scrollToBottom()
  }
}

// 測試非串流模式
const testNonStreaming = async () => {
  isWaitingResponse.value = true
  isThinking.value = true

  try {
    const response = await fetch('/api/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: '測試非串流模式：請介紹 SSE 技術' }],
        stream: false
      })
    })

    const data = await response.json()

    isThinking.value = false

    messages.value.push({
      role: 'user',
      content: '測試非串流模式：請介紹 SSE 技術',
      time: getCurrentTime(),
      isStreaming: false
    })

    messages.value.push({
      role: 'assistant',
      content: data.content[0].text,
      time: getCurrentTime(),
      isStreaming: false
    })

    scrollToBottom()

  } catch (error) {
    console.error('錯誤:', error)
    addSystemMessage(`錯誤: ${error.message}`)
  } finally {
    isWaitingResponse.value = false
    isThinking.value = false
  }
}

// 添加系統訊息
const addSystemMessage = (content) => {
  messages.value.push({
    role: 'system',
    content: `📢 ${content}`,
    time: getCurrentTime(),
    isStreaming: false
  })
  scrollToBottom()
}

// 清除訊息
const clearMessages = () => {
  messages.value = []
  conversationHistory = []
}

// 滾動到底部
const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

// 獲取當前時間
const getCurrentTime = () => {
  const now = new Date()
  return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
}

// 自動調整 textarea 高度
watch(userInput, () => {
  if (textarea.value) {
    textarea.value.style.height = 'auto'
    textarea.value.style.height = textarea.value.scrollHeight + 'px'
  }
})
</script>

<style scoped>
/* 復用 Gptstylechat.vue 的樣式 */
.gpt-chat-container {
  max-width: 900px;
  margin: 20px auto;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  overflow: hidden;
}

.chat-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chat-header h2 {
  margin: 0;
  font-size: 24px;
}

.status-indicator {
  padding: 6px 12px;
  background: rgba(255,255,255,0.2);
  border-radius: 20px;
  font-size: 14px;
}

.status-indicator.connected {
  background: rgba(76, 175, 80, 0.3);
}

.messages-container {
  height: 500px;
  overflow-y: auto;
  padding: 20px;
  background: #f7f7f8;
}

.message-wrapper {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.message-wrapper.user {
  flex-direction: row-reverse;
}

.message-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #e0e0e0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
}

.message-wrapper.user .message-avatar {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.message-wrapper.assistant .message-avatar {
  background: linear-gradient(135deg, #10c9c3 0%, #0ba360 100%);
}

.message-content {
  flex: 1;
  max-width: 80%;
}

.message-role {
  font-size: 12px;
  font-weight: 600;
  color: #666;
  margin-bottom: 4px;
}

.message-text {
  background: white;
  padding: 12px 16px;
  border-radius: 12px;
  line-height: 1.6;
  color: #333;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
  word-wrap: break-word;
  white-space: pre-wrap;
}

.message-wrapper.user .message-text {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.message-wrapper.system .message-text {
  background: #fff3cd;
  color: #856404;
  text-align: center;
  font-style: italic;
}

.message-time {
  font-size: 11px;
  color: #999;
  margin-top: 4px;
  text-align: right;
}

.message-wrapper.user .message-time {
  text-align: left;
}

/* 打字游標動畫 */
.typing-cursor {
  display: inline-block;
  animation: blink 1s infinite;
  color: #667eea;
  margin-left: 2px;
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

/* AI 思考中動畫 */
.thinking-indicator {
  display: flex;
  gap: 12px;
  align-items: center;
}

.thinking-dots {
  display: flex;
  gap: 4px;
  padding: 12px 16px;
  background: white;
  border-radius: 12px;
}

.thinking-dots span {
  width: 8px;
  height: 8px;
  background: #667eea;
  border-radius: 50%;
  animation: bounce 1.4s infinite;
}

.thinking-dots span:nth-child(2) {
  animation-delay: 0.2s;
}

.thinking-dots span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes bounce {
  0%, 60%, 100% { transform: translateY(0); }
  30% { transform: translateY(-10px); }
}

/* 輸入區 */
.input-container {
  display: flex;
  gap: 10px;
  padding: 20px;
  background: white;
  border-top: 1px solid #e0e0e0;
}

.input-container textarea {
  flex: 1;
  padding: 12px 16px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 15px;
  font-family: inherit;
  resize: none;
  max-height: 150px;
  overflow-y: auto;
  transition: border-color 0.3s;
}

.input-container textarea:focus {
  outline: none;
  border-color: #667eea;
}

.input-container textarea:disabled {
  background: #f5f5f5;
  cursor: not-allowed;
}

.send-button {
  padding: 12px 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s, opacity 0.2s;
  min-width: 80px;
}

.send-button:hover:not(:disabled) {
  transform: translateY(-2px);
}

.send-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.loading-spinner {
  display: inline-block;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  100% { transform: rotate(360deg); }
}

/* 控制按鈕 */
.controls {
  display: flex;
  gap: 10px;
  padding: 15px 20px;
  background: #f7f7f8;
  border-top: 1px solid #e0e0e0;
}

.controls button {
  padding: 8px 16px;
  border: 2px solid #667eea;
  background: white;
  color: #667eea;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.clear-btn:hover {
  background: #ffc107;
  border-color: #ffc107;
  color: white;
}

.test-btn {
  background: #e3f2fd;
}

.test-btn:hover:not(:disabled) {
  background: #2196f3;
  border-color: #2196f3;
  color: white;
}

.controls button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 資訊面板 */
.info-panel {
  padding: 20px;
  background: #f0f8ff;
  border-top: 1px solid #e0e0e0;
}

.info-panel h3 {
  margin: 0 0 10px 0;
  color: #333;
  font-size: 16px;
}

.info-panel p {
  margin: 0 0 10px 0;
  color: #666;
  font-size: 14px;
  line-height: 1.6;
}

.info-panel ul {
  margin: 0;
  padding-left: 20px;
  color: #666;
  font-size: 14px;
}

.info-panel li {
  margin: 5px 0;
}

.info-panel code {
  background: rgba(0,0,0,0.05);
  padding: 2px 6px;
  border-radius: 3px;
  font-family: 'Monaco', 'Courier New', monospace;
  font-size: 13px;
}

/* 響應式設計 */
@media (max-width: 768px) {
  .gpt-chat-container {
    margin: 0;
    border-radius: 0;
  }

  .messages-container {
    height: calc(100vh - 450px);
  }

  .message-content {
    max-width: 85%;
  }
}
</style>
