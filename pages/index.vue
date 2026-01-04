<template>
  <div class="home-container">
    <h1>歡迎使用 Nuxt 4 專案</h1>
    <p>這是使用 Bun 啟動的 Nuxt 應用程式</p>

    <div class="navigation">
      <h2>功能頁面</h2>
      <ul>
        <li>
          <NuxtLink to="/websocket">🔌 基礎 WebSocket 聊天室</NuxtLink>
        </li>
        <li>
          <NuxtLink to="/ Gptstylechat">💬 GPT 風格聊天室 (WebSocket)</NuxtLink>
        </li>
        <li>
          <NuxtLink to="/ssechat">📡 SSE 聊天室 (OpenAI/Claude 模式)</NuxtLink>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.home-container {
  max-width: 800px;
  margin: 40px auto;
  padding: 20px;
  text-align: center;
}

h1 {
  color: #333;
  margin-bottom: 20px;
}

.navigation {
  margin-top: 40px;
}

.navigation ul {
  list-style: none;
  padding: 0;
}

.navigation li {
  margin: 10px 0;
}

.navigation a {
  color: #007bff;
  text-decoration: none;
  font-size: 18px;
}

.navigation a:hover {
  text-decoration: underline;
}
</style>
