<template>
  <div class="gpt-chat-container">
    <div class="chat-header">
      <h2>💬 GPT 風格聊天室</h2>
      <div class="status-indicator" :class="{ connected: isConnected }">
        {{ isConnected ? '● 已連線' : '○ 未連線' }}
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
            <!-- 打字游標效果 -->
            <span 
              v-if="msg.isStreaming" 
              class="typing-cursor"
            >▋</span>
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
        :disabled="!isConnected || isWaitingResponse"
        rows="1"
        ref="textarea"
      ></textarea>
      <button 
        @click="sendMessage" 
        :disabled="!isConnected || !userInput.trim() || isWaitingResponse"
        class="send-button"
      >
        <span v-if="!isWaitingResponse">發送</span>
        <span v-else class="loading-spinner">⏳</span>
      </button>
    </div>

    <!-- 連線控制 -->
    <div class="controls">
      <button @click="connect" :disabled="isConnected" class="connect-btn">
        連線服務器
      </button>
      <button @click="disconnect" :disabled="!isConnected" class="disconnect-btn">
        斷開連線
      </button>
      <button @click="clearMessages" class="clear-btn">
        清除對話
      </button>
    </div>

    <!-- 配置區 -->
    <div class="config-panel">
      <label>
        <span>服務器地址:</span>
        <input 
          v-model="serverUrl" 
          :disabled="isConnected"
          placeholder="ws://localhost:8080"
        />
      </label>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick, watch } from 'vue'

let ws = null

// 響應式數據
const messages = ref([])
const userInput = ref('')
const isConnected = ref(false)
const isThinking = ref(false)
const isWaitingResponse = ref(false)
const messagesContainer = ref(null)
const textarea = ref(null)
const serverUrl = ref('ws://localhost:3000/ws')

// 當前正在串流的訊息
let currentStreamingMessage = null

// 連線到 WebSocket
const connect = () => {
  try {
    ws = new WebSocket(serverUrl.value)

    ws.onopen = () => {
      isConnected.value = true
      console.log('✅ WebSocket 連線成功')
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        handleServerMessage(data)
      } catch (e) {
        console.error('解析訊息失敗:', e)
      }
    }

    ws.onclose = () => {
      isConnected.value = false
      isWaitingResponse.value = false
      isThinking.value = false
      console.log('👋 WebSocket 連線已關閉')
    }

    ws.onerror = (error) => {
      console.error('❌ WebSocket 錯誤:', error)
      addSystemMessage('連線發生錯誤，請檢查服務器是否運行')
    }
  } catch (error) {
    console.error('建立連線失敗:', error)
    addSystemMessage('無法連線到服務器')
  }
}

// 斷開連線
const disconnect = () => {
  if (ws) {
    ws.close()
    ws = null
  }
}

// 處理服務器訊息
const handleServerMessage = (data) => {
  console.log('📨 收到:', data)

  switch (data.type) {
    case 'system':
      addSystemMessage(data.content)
      break

    case 'status':
      if (data.content === 'thinking') {
        isThinking.value = true
      }
      break

    case 'stream_start':
      // 創建新的 AI 訊息
      isThinking.value = false
      currentStreamingMessage = {
        role: 'assistant',
        content: '',
        time: getCurrentTime(),
        isStreaming: true
      }
      messages.value.push(currentStreamingMessage)
      scrollToBottom()
      break

    case 'stream_chunk':
      // 逐字添加內容
      if (currentStreamingMessage) {
        currentStreamingMessage.content += data.content
        scrollToBottom()
      }
      break

    case 'stream_end':
      // 結束串流
      if (currentStreamingMessage) {
        currentStreamingMessage.isStreaming = false
        currentStreamingMessage = null
      }
      isWaitingResponse.value = false
      scrollToBottom()
      break

    case 'message_received':
      // 服務器確認收到訊息
      break

    case 'error':
      addSystemMessage(`錯誤: ${data.message}`)
      isWaitingResponse.value = false
      isThinking.value = false
      break
  }
}

// 發送訊息
const sendMessage = () => {
  if (!userInput.value.trim() || !isConnected.value || isWaitingResponse.value) {
    return
  }

  const message = userInput.value.trim()

  // 添加用戶訊息到界面
  messages.value.push({
    role: 'user',
    content: message,
    time: getCurrentTime(),
    isStreaming: false
  })

  // 發送到服務器
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'user_message',
      content: message
    }))
    
    userInput.value = ''
    isWaitingResponse.value = true
    scrollToBottom()
    
    // 重置 textarea 高度
    if (textarea.value) {
      textarea.value.style.height = 'auto'
    }
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
  currentStreamingMessage = null
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

.connect-btn:hover:not(:disabled) {
  background: #28a745;
  border-color: #28a745;
  color: white;
}

.disconnect-btn:hover:not(:disabled) {
  background: #dc3545;
  border-color: #dc3545;
  color: white;
}

.clear-btn:hover {
  background: #ffc107;
  border-color: #ffc107;
  color: white;
}

.controls button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 配置面板 */
.config-panel {
  padding: 15px 20px;
  background: #f7f7f8;
  border-top: 1px solid #e0e0e0;
}

.config-panel label {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  color: #666;
}

.config-panel label span {
  min-width: 100px;
}

.config-panel input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  font-family: monospace;
  font-size: 13px;
}

.config-panel input:disabled {
  background: #f5f5f5;
}

/* 響應式設計 */
@media (max-width: 768px) {
  .gpt-chat-container {
    margin: 0;
    border-radius: 0;
  }

  .messages-container {
    height: calc(100vh - 400px);
  }

  .message-content {
    max-width: 85%;
  }
}
</style>