<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

// WebSocket 實例
let ws = null

// 響應式數據
const messages = ref([])
const messageInput = ref('')
const isConnected = ref(false)

// WebSocket 伺服器地址（公開測試伺服器）
// 選項1: Ably 維護的官方 echo 服務器（推薦）
const WS_URL = 'wss://echo.websocket.org/'

// 選項2: 備用 echo 服務器
// const WS_URL = 'wss://echo.websocket.events/.ws'

// 選項3: 本地開發服務器
// const WS_URL = 'ws://localhost:8080'

// 計算屬性
const connectionStatus = computed(() => {
  return isConnected.value ? '已連線' : '未連線'
})

const statusClass = computed(() => {
  return isConnected.value ? 'connected' : 'disconnected'
})

// 建立 WebSocket 連線
const connect = () => {
  try {
    // 創建 WebSocket 連線
    ws = new WebSocket(WS_URL)

    // 連線成功時觸發
    ws.onopen = () => {
      isConnected.value = true
      addSystemMessage('WebSocket 連線成功')
      console.log('WebSocket 連線成功')
    }

    // 接收到訊息時觸發
    ws.onmessage = (event) => {
      console.log('收到訊息:', event.data)
      addMessage(event.data, false)
    }

    // 連線關閉時觸發
    ws.onclose = () => {
      isConnected.value = false
      addSystemMessage('WebSocket 連線已關閉')
      console.log('WebSocket 連線已關閉')
    }

    // 發生錯誤時觸發
    ws.onerror = (error) => {
      console.error('WebSocket 錯誤:', error)
      addSystemMessage('連線發生錯誤')
    }
  } catch (error) {
    console.error('建立連線失敗:', error)
  }
}

// 斷開連線
const disconnect = () => {
  if (ws) {
    ws.close()
    ws = null
  }
}

// 發送訊息
const sendMessage = () => {
  if (!messageInput.value.trim() || !isConnected.value) {
    return
  }

  const message = messageInput.value.trim()
  
  // 透過 WebSocket 發送訊息
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(message)
    addMessage(message, true)
    messageInput.value = ''
  }
}

// 添加訊息到列表（區分自己和他人的訊息）
const addMessage = (content, isSelf = false) => {
  messages.value.push({
    content,
    isSelf,
    time: getCurrentTime()
  })
}

// 添加系統訊息
const addSystemMessage = (content) => {
  messages.value.push({
    content: `[系統] ${content}`,
    isSelf: false,
    time: getCurrentTime()
  })
}

// 獲取當前時間
const getCurrentTime = () => {
  const now = new Date()
  return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
}

// 組件掛載時自動連線（可選）
onMounted(() => {
  connect() // 如果想要自動連線，取消註解這行
})

// 組件卸載時關閉連線
onUnmounted(() => {
  disconnect()
})
</script>

<template>
  <div class="chat-container">
    <h2>WebSocket 聊天室範例</h2>
    
    <!-- 連線狀態 -->
    <div class="status" :class="statusClass">
      狀態: {{ connectionStatus }}
    </div>

    <!-- 訊息顯示區 -->
    <div class="messages-box">
      <div 
        v-for="(msg, index) in messages" 
        :key="index"
        class="message"
        :class="{ 'my-message': msg.isSelf }"
      >
        <span class="time">{{ msg.time }}</span>
        <span class="content">{{ msg.content }}</span>
      </div>
    </div>

    <!-- 輸入區 -->
    <div class="input-area">
      <input 
        v-model="messageInput"
        @keyup.enter="sendMessage"
        placeholder="輸入訊息..."
        :disabled="!isConnected"
      />
      <button @click="sendMessage" :disabled="!isConnected">
        發送
      </button>
    </div>

    <!-- 連線控制 -->
    <div class="controls">
      <button @click="connect" :disabled="isConnected">連線</button>
      <button @click="disconnect" :disabled="!isConnected">斷線</button>
    </div>
  </div>
</template>


<style scoped>
.chat-container {
  max-width: 600px;
  margin: 20px auto;
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-family: Arial, sans-serif;
}

h2 {
  text-align: center;
  color: #333;
}

.status {
  padding: 8px;
  margin: 10px 0;
  border-radius: 4px;
  text-align: center;
  font-weight: bold;
}

.status.connected {
  background-color: #d4edda;
  color: #155724;
}

.status.disconnected {
  background-color: #f8d7da;
  color: #721c24;
}

.messages-box {
  height: 400px;
  overflow-y: auto;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 10px;
  margin: 10px 0;
  background-color: #f9f9f9;
}

.message {
  margin: 8px 0;
  padding: 8px 12px;
  border-radius: 4px;
  background-color: #e9ecef;
  max-width: 70%;
}

.message.my-message {
  background-color: #007bff;
  color: white;
  margin-left: auto;
  text-align: right;
}

.message .time {
  font-size: 12px;
  opacity: 0.7;
  margin-right: 8px;
}

.message .content {
  word-wrap: break-word;
}

.input-area {
  display: flex;
  gap: 10px;
  margin: 10px 0;
}

.input-area input {
  flex: 1;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.input-area button {
  padding: 10px 20px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.input-area button:hover:not(:disabled) {
  background-color: #0056b3;
}

.input-area button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.controls {
  display: flex;
  gap: 10px;
  justify-content: center;
}

.controls button {
  padding: 8px 16px;
  border: 1px solid #007bff;
  background-color: white;
  color: #007bff;
  border-radius: 4px;
  cursor: pointer;
}

.controls button:hover:not(:disabled) {
  background-color: #007bff;
  color: white;
}

.controls button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>