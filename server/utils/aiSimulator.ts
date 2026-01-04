// AI 回應生成器 - 模擬智慧對話系統

// 回應模板分類
const RESPONSES = {
  greetings: [
    "你好！很高興與你交流。我是一個模擬的 AI 助手，可以幫助你測試聊天功能。有什麼我可以協助的嗎？",
    "嗨！歡迎使用 AI 聊天系統。這是一個演示版本，展示了即時串流對話的能力。請告訴我你想聊什麼！",
    "Hello! 我在這裡準備好回答你的問題了。雖然我是模擬的，但我會盡力提供有趣的對話體驗。",
    "哈囉！很開心見到你。這個系統展示了 WebSocket 和 SSE 兩種即時串流技術。隨時開始對話吧！"
  ],

  questions: [
    "這是一個很好的問題！讓我思考一下...\n\n根據你的提問，我認為關鍵在於理解問題的本質。雖然我是一個模擬的 AI，但我可以告訴你：真正的學習來自於不斷的嘗試和實踐。",
    "你問到了一個核心問題。在真實場景中，這需要考慮多個因素：\n\n1. 技術可行性\n2. 實際應用場景\n3. 用戶體驗優化\n\n這個演示系統展示了即時串流的可能性。",
    "關於這個話題，我想分享一些想法：\n\n首先，重要的是要認識到每個問題都有多個角度。其次，解決方案往往在於找到正確的平衡點。雖然我只是一個模擬助手，但我希望這個回答對你有幫助！",
    "這個問題很有深度！從不同角度來看：\n\n• 技術層面：需要考慮實現複雜度\n• 業務層面：要評估實際價值\n• 用戶層面：應該關注體驗流暢度\n\n希望這些想法能給你一些啟發。"
  ],

  technical: [
    "從技術角度來看，這個實現使用了以下技術棧：\n\n- Nuxt 3 作為全棧框架\n- Nitro 提供服務端能力\n- crossws 實現 WebSocket 支援\n- SSE (Server-Sent Events) 用於單向串流\n\n這些技術的組合提供了強大的即時通訊能力。",
    "你提到的這個技術問題很有趣！在現代 web 開發中，我們有多種方式實現即時通訊：\n\n1. WebSocket - 雙向通訊，適合聊天室\n2. SSE - 單向串流（服務器到客戶端），適合通知\n3. 長輪詢 - 傳統方法，相容性好\n\n每種方法都有其適用場景。",
    "關於實現細節，這個演示展示了字符級串流。實際上，真實的 AI API 通常會串流 token 或詞塊，而不是單個字符。但為了演示效果，字符級串流能更好地展現即時性。\n\n在生產環境中，還需要考慮：錯誤處理、重連機制、訊息確認等。",
    "技術實作上有幾個關鍵點：\n\n```typescript\n// WebSocket 雙向通訊\nws.send(JSON.stringify({ type: 'message' }))\n\n// SSE 單向串流\nreturn new ReadableStream({\n  start(controller) {\n    controller.enqueue(data)\n  }\n})\n```\n\n選擇哪種技術取決於你的具體需求。"
  ],

  default: [
    "謝謝你的訊息！作為一個模擬的 AI 助手，我正在處理你的輸入並生成相應的回應。這個系統展示了即時串流的能力，讓對話感覺更加自然和流暢。",
    "我理解了你的意思。讓我用一個更詳細的方式來回應：\n\n雖然我是一個模擬系統，但真實的 AI 對話系統會分析語義、理解上下文，並生成相關回應。這個演示重點在於展示串流技術如何改善用戶體驗。",
    "收到你的訊息了！這個聊天系統能夠即時串流回應，讓對話體驗更加生動。在實際應用中，這種技術可以用於客服系統、教育平台、內容創作工具等多個場景。有趣的是，即時反饋能顯著提升用戶的參與感。",
    "很好的觀點！我注意到你提到的內容。這個演示系統雖然是模擬的，但它展示了現代 web 技術的強大能力。\n\n透過逐字串流，我們可以：\n• 減少等待時間的焦慮\n• 提供即時反饋\n• 改善整體互動體驗\n\n這些都是真實 AI 產品的核心設計理念。"
  ]
}

/**
 * 分析用戶訊息並選擇適當的回應類別
 */
function categorizeMessage(message: string): keyof typeof RESPONSES {
  const lower = message.toLowerCase()

  // 檢查問候語
  if (
    lower.includes('hello') ||
    lower.includes('hi') ||
    lower.includes('hey') ||
    lower.includes('你好') ||
    lower.includes('嗨') ||
    lower.includes('哈囉') ||
    lower.includes('安安')
  ) {
    return 'greetings'
  }

  // 檢查問題
  if (
    lower.includes('?') ||
    lower.includes('？') ||
    lower.includes('how') ||
    lower.includes('what') ||
    lower.includes('why') ||
    lower.includes('when') ||
    lower.includes('where') ||
    lower.includes('怎麼') ||
    lower.includes('什麼') ||
    lower.includes('為什麼') ||
    lower.includes('如何') ||
    lower.includes('哪裡')
  ) {
    return 'questions'
  }

  // 檢查技術相關
  if (
    lower.includes('websocket') ||
    lower.includes('sse') ||
    lower.includes('api') ||
    lower.includes('stream') ||
    lower.includes('streaming') ||
    lower.includes('技術') ||
    lower.includes('實現') ||
    lower.includes('實作') ||
    lower.includes('nuxt') ||
    lower.includes('vue') ||
    lower.includes('typescript') ||
    lower.includes('code') ||
    lower.includes('程式')
  ) {
    return 'technical'
  }

  return 'default'
}

/**
 * 生成 AI 回應（純文字）
 * @param userMessage - 用戶的訊息
 * @returns 生成的回應文字
 */
export function generateAIResponse(userMessage: string): string {
  const category = categorizeMessage(userMessage)
  const templates = RESPONSES[category]

  // 隨機選擇一個模板
  const response = templates[Math.floor(Math.random() * templates.length)]

  return response
}

/**
 * 生成帶有 metadata 的 AI 回應（用於 SSE）
 * @param userMessage - 用戶的訊息
 * @returns 包含 id、role、content 等資訊的回應物件
 */
export function generateAIResponseWithMetadata(userMessage: string) {
  const content = generateAIResponse(userMessage)

  return {
    id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    role: 'assistant' as const,
    content,
    timestamp: new Date().toISOString(),
    model: 'simulated-ai-v1',
    usage: {
      // 粗略估算 token（中文約 1.5 字元/token，英文約 4 字元/token）
      input_tokens: Math.ceil(userMessage.length / 2),
      output_tokens: Math.ceil(content.length / 2)
    }
  }
}
