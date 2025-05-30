<template>
  <main id="app-container" class="hero is-fullheight is-flex is-flex-direction-column">
    <div class="hero-head">
      <nav class="navbar is-flex px-5 pt-5">
        <div class="navbar-brand">
          <div class="navbar-item">
            <h1 class="title app-title">Ron'room</h1>
          </div>
        </div>
        <div class="navbar-end">
          <div class="navbar-item">
            <div id="themeToggle" @click="toggleTheme" class="button is-ghost transition">
              <svg class="theme_toggle_svg" width="1.2em" height="1.2em" viewBox="0 0 24 24" color="#858585" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" stroke="currentColor"><mask id="myMask"><rect x="0" y="0" width="100%" height="100%" fill="white"></rect><circle class="theme_toggle_circle1" fill="black" cx="100%" cy="0%" r="5"></circle></mask><circle class="theme_toggle_circle2" cx="12" cy="12" fill="#858585" mask="url(#myMask)" r="5"></circle><g class="theme_toggle_g" stroke="currentColor" opacity="1"><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></g></svg>
            </div>
          </div>
        </div>
      </nav>
    </div>

    <div class="hero-body is-flex-shrink-1 py-3 my-2" style="overflow: hidden auto" id="message-wrapper" ref="messageWrapperRef">
      <div class="is-flex is-flex-direction-column h-full w-full">
        <div id="messages" class="is-flex-grow-1">
          <div v-for="(msg, index) in chatMessages" :key="msg.id || index"
               :class="{ 'sended': msg.sender === currentUsername && msg.type !== 'system', 'received': msg.sender !== currentUsername && msg.type !== 'system', 'system': msg.type === 'system' }">
            <div class="is-size-7 has-text-grey has-text-weight-medium mb-1"
                 :class="{ 'has-text-right': msg.sender === currentUsername && msg.type !== 'system', 'has-text-centered': msg.type === 'system' }">
              <template v-if="msg.type === 'system'">( 系统 )</template>
              <template v-else>{{ msg.sender }}</template>
              <span class="ml-2 is-size-7 has-text-grey-light">{{ formatDisplayTimestamp(msg.timestamp) }}</span>
            </div>
            <div>
              <div class="msg-item">
                <p v-html="msg.displayContent"></p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="hero-footer px-5">
      <div class="field is-grouped">
        <div class="control is-expanded field has-addons">
          <p class="control is-expanded">
            <textarea id="messageInput" v-model="newMessage" placeholder="输入消息 (Shift+Enter 换行)..." @keydown.enter="handleEnterKey" autocomplete="off" autofocus rows="1" class="input"></textarea>
          </p>
          <p class="control">
            <button id="sendButton" @click="sendMessage" class="button is-link" :disabled="!ws || ws.readyState !== WEB_SOCKET_STATE_OPEN || !encryptionService?.isKeyInitialized()">发送</button>
          </p>
        </div>
        <p class="control">
          <button @click="clearChatMessages" title="清屏" class="button is-warning is-light is-medium">
            <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><path fill="currentColor" d="M8 20v-5h2v5h9v-7H5v7h3zm-4-9h16V8h-6V4h-4v4H4v3zM3 21v-8H2V7a1 1 0 0 1 1-1h5V3a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v3h5a1 1 0 0 1 1 1v6h-1v8a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"></path></svg>
          </button>
        </p>
      </div>
      <footer class="content has-text-centered has-text-grey-light pb-5 pt-3">
        <p>
          <a href="https://VPS.128128.BEST" target="_blank" rel="noopener noreferrer" class="footer-custom-link"> by RON | 🍉My Blog </a>
        </p>
      </footer>
    </div>

    <div class="modal" :class="{'is-active': showLoginModal}" id="popup">
      <div class="modal-background" @click="handleModalBackgroundClick"></div>
      <div class="modal-card" style="max-width: 90%">
        <header class="modal-card-head py-5">
          <p class="modal-card-title">进入房间</p>
          <button class="delete" aria-label="close" @click="showLoginModal = false"></button>
        </header>
        <section class="modal-card-body py-5">
          <div id="roomTipsNotification" class="notification is-info is-light mb-3" style="overflow-wrap: anywhere;">
            <div v-html="roomEntryTip"></div>
            </div>
          <div v-if="modalErrorMessage" class="notification is-danger is-light py-2 px-3 mb-3">
            {{ modalErrorMessage }}
          </div>
          <div class="field">
            <label class="label" for="displayNameInput">昵称 (Display Name)</label>
            <div class="control">
              <input class="input" type="text" id="displayNameInput" v-model="inputDisplayName" placeholder="输入你的昵称..." @input="modalErrorMessage = ''">
            </div>
          </div>
          <div class="field">
            <label class="label" for="roomPasswordInput">房间密码 (可选)</label>
            <div class="control">
              <input class="input" type="text" id="roomPasswordInput" v-model="inputRoomPassword" placeholder="输入密码，若房间无密码则默认为 'Mrlee'" @input="modalErrorMessage = ''">
            </div>
          </div>
        </section>
        <footer class="modal-card-foot py-5 is-justify-content-flex-end">
          <button id="joinButton" @click="joinRoom" class="button is-link">进入</button>
          <button class="button" @click="showLoginModal = false">取消</button>
        </footer>
      </div>
    </div>
  </main>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick, watch } from 'vue';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { EncryptionService } from './EncryptionService.js';
// Removed generateRandomStrongPassword import from cryptoUtils.js
// If generateRandomStrongPassword is still needed for room name generation in onMounted,
// ensure cryptoUtils.js and its import are handled appropriately.

const WEB_SOCKET_STATE_OPEN = typeof WebSocket !== 'undefined' ? WebSocket.OPEN : 1;

// --- Reactive State ---
const chatMessages = ref([]);
const newMessage = ref('');
const currentUsername = ref('');
const inputDisplayName = ref('');
const inputRoomPassword = ref('');
const currentRoomName = ref('');
const showLoginModal = ref(true);
const roomEntryTip = ref('');
const messageWrapperRef = ref(null);
let ws = ref(null);
const encryptionService = ref(null);
const actualRoomPasswordUsed = ref('');
// Removed autoGeneratedPasswordInfo ref
const modalErrorMessage = ref('');

// --- Helper Functions (通用) ---
function getQueryParams() {
  const params = new URLSearchParams(window.location.search);
  const queryParams = {};
  for (const [key, value] of params.entries()) {
    queryParams[key] = value;
  }
  return queryParams;
}

function formatDisplayTimestamp(isoTimestamp) {
  if (!isoTimestamp) return '';
  const date = new Date(isoTimestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

async function scrollToBottom() {
  await nextTick();
  const wrapper = messageWrapperRef.value;
  if (wrapper) wrapper.scrollTop = wrapper.scrollHeight;
}
watch(chatMessages, scrollToBottom, { deep: true });

function processAndSanitize(plaintext) {
  if (typeof plaintext !== 'string') plaintext = String(plaintext ?? '');
  const unsafeHtml = marked.parse(plaintext);
  const safeHtml = DOMPurify.sanitize(unsafeHtml, { USE_PROFILES: { html: true } });
  return safeHtml;
}

// --- WebSocket & E2EE Logic ---
async function connectWebSocket() {
  if (!currentRoomName.value || !inputDisplayName.value.trim() || !actualRoomPasswordUsed.value) { // actualRoomPasswordUsed will be 'Mrlee' if user left input blank
    modalErrorMessage.value = "房间名、昵称和实际房间密码不能为空！";
    showLoginModal.value = true;
    return;
  }

  currentUsername.value = inputDisplayName.value.trim();
  encryptionService.value = new EncryptionService(actualRoomPasswordUsed.value, currentRoomName.value);

  try {
    await encryptionService.value.initializeKey();
  } catch (error) {
    console.error("Failed to initialize E2EE key service:", error);
    modalErrorMessage.value = `错误：无法初始化加密服务。${error.message}`;
    showLoginModal.value = true;
    return;
  }

  const WORKER_HOST = import.meta.env.VITE_WORKER_HOST || window.location.host;
  const WS_PROTOCOL = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
  let wsUrl = `${WS_PROTOCOL}${WORKER_HOST}/chat/${currentRoomName.value}?displayName=${encodeURIComponent(currentUsername.value)}&roomPassword=${encodeURIComponent(actualRoomPasswordUsed.value)}`;

  if (ws.value && ws.value.readyState === WEB_SOCKET_STATE_OPEN) {
    ws.value.close(1000, "Reconnecting with new parameters");
  }

  console.log(`Connecting to WebSocket: ${wsUrl}`);
  try {
    if (typeof WebSocket === 'undefined') throw new Error("WebSocket API not available.");
    ws.value = new WebSocket(wsUrl);
  } catch (error) {
    console.error("Failed to create WebSocket:", error);
    modalErrorMessage.value = `WebSocket 创建失败: ${error.message}`;
    showLoginModal.value = true;
    return;
  }

  ws.value.onopen = () => {
    console.log("WebSocket connection established.");
    modalErrorMessage.value = '';
    showLoginModal.value = false;
    updateRoomEntryTip(true); // Update tip now that connection is successful
    chatMessages.value.push({ type: 'system', id: `system-${Date.now()}`, displayContent: processAndSanitize(`已连接到房间: ${currentRoomName.value}`), timestamp: new Date().toISOString() });
  };

  ws.value.onmessage = async (event) => {
    if (!encryptionService.value || !encryptionService.value.isKeyInitialized()) {
      modalErrorMessage.value = "加密服务异常，无法处理消息。";
      return;
    }
    try {
      const serverMessage = JSON.parse(event.data);
      console.log("Message from server:", serverMessage);

      if (serverMessage.error) {
        let specificErrorToDisplay = serverMessage.error;
        if (serverMessage.error.includes("Room access denied") || serverMessage.error.includes("房间访问被拒绝")) {
          specificErrorToDisplay = "密码错误或房间受保护。请核实后重试。";
        } else if (serverMessage.error.includes("已被占用")) {
          specificErrorToDisplay = serverMessage.error;
        } else {
          specificErrorToDisplay = `连接错误: ${serverMessage.error}`;
        }
        modalErrorMessage.value = specificErrorToDisplay;
        showLoginModal.value = true;
        return;
      }
      modalErrorMessage.value = ''; 

      let displayMsg;
      let decryptedText;
      switch (serverMessage.type) {
        case 'newMessage':
          if (serverMessage.e2eeContent) {
            decryptedText = await encryptionService.value.decrypt(serverMessage.e2eeContent);
            displayMsg = { ...serverMessage, displayContent: processAndSanitize(decryptedText) };
            chatMessages.value.push(displayMsg);
          } else { // Should not happen if E2EE is enforced, but as a fallback
            displayMsg = { ...serverMessage, displayContent: processAndSanitize(serverMessage.message || '[空消息]') };
            chatMessages.value.push(displayMsg);
          }
          break;
        case 'history':
          if (Array.isArray(serverMessage.messages)) {
            const historyMessages = [];
            for (const msg of serverMessage.messages) {
              if (msg.e2eeContent) {
                const decryptedHistText = await encryptionService.value.decrypt(msg.e2eeContent);
                historyMessages.push({ ...msg, displayContent: processAndSanitize(decryptedHistText) });
              } else {
                 historyMessages.push({ ...msg, displayContent: processAndSanitize(msg.message || '[历史消息内容缺失]') });
              }
            }
            chatMessages.value.unshift(...historyMessages);
          }
          break;
        case 'system':
          displayMsg = { ...serverMessage, displayContent: processAndSanitize(serverMessage.message) };
          chatMessages.value.push(displayMsg);
          break;
        case 'roomStateUpdate':
          chatMessages.value.push({ type: 'system', id: `state-${Date.now()}`, displayContent: processAndSanitize(`房间状态: ${serverMessage.userCount} 用户 (${serverMessage.users.join(', ')})`), timestamp: new Date().toISOString() });
          break;
        default:
          console.warn("Unknown message type from server:", serverMessage);
      }
    } catch (e) {
      console.error("Error processing message from server:", e);
      modalErrorMessage.value = "处理服务器消息时出错。";
    }
  };

  ws.value.onclose = (event) => {
    console.log("WebSocket connection closed:", event.code, event.reason);
    ws.value = null;
    encryptionService.value = null; 
    let closeReasonMessage = event.reason || "未知原因";
    let detailedCloseMessage = `连接已断开 (代码: ${event.code}, 原因: ${closeReasonMessage})`;
    let shouldShowLogin = true;
    let specificModalError = '';

    if (event.code === 1008) { // Policy Violation
      if (event.reason?.includes("Room access denied")) {
        specificModalError = "密码错误或房间受保护。请核实后重试。";
      } else if (event.reason?.includes("DisplayName taken")) {
        specificModalError = `昵称 "${inputDisplayName.value}" 已被占用，请使用其他昵称。`;
      } else if (event.reason?.includes("Missing displayName")) {
         specificModalError = "昵称 (displayName) 未提供或无效。";
      } else {
        specificModalError = `连接策略问题: ${closeReasonMessage}`;
      }
    } else if (event.code === 1011 && event.reason?.includes("Internal server error")) {
        specificModalError = "服务器内部错误，房间可能无法安全初始化。";
    } else if (event.code === 1000) { // Normal closure
      detailedCloseMessage = "您已正常断开连接。";
      shouldShowLogin = false; // Don't force login modal for normal disconnect
    } else if (!event.wasClean && event.code !== 1000) { // Abnormal closure
      specificModalError = "连接意外断开，请重新进入。";
    }
    
    if(specificModalError) modalErrorMessage.value = specificModalError;
    showLoginModal.value = shouldShowLogin;
    if(shouldShowLogin && !modalErrorMessage.value) { // If forcing login, ensure there's a message
        modalErrorMessage.value = "连接已断开，请重新进入。";
    }

    chatMessages.value.push({ type: 'system', id: `system-${Date.now()}`, displayContent: processAndSanitize(modalErrorMessage.value || detailedCloseMessage), timestamp: new Date().toISOString() });
  };

  ws.value.onerror = (errorEvent) => {
    console.error("WebSocket error event:", errorEvent);
    modalErrorMessage.value = "WebSocket 连接发生错误，请检查网络或服务器状态。";
    // Optionally, ensure login modal is shown on WebSocket error too
    // showLoginModal.value = true;
  };
}

// --- User Actions ---
async function joinRoom() {
  modalErrorMessage.value = '';

  if (!inputDisplayName.value.trim()) {
    modalErrorMessage.value = '请输入昵称！';
    return;
  }
  if (!currentRoomName.value) {
    modalErrorMessage.value = '房间名无效，请刷新页面或检查URL。';
    return;
  }

  // Modified password logic: Default to 'Mrlee' if input is blank
  if (!inputRoomPassword.value.trim()) {
    actualRoomPasswordUsed.value = 'Mrlee';
    // Optional: You could set a temporary info message here if desired,
    // but the placeholder text for the input field already hints at this.
  } else {
    actualRoomPasswordUsed.value = inputRoomPassword.value.trim();
  }
  
  updateRoomEntryTip(false); // Update tip before attempting connection
  await connectWebSocket();
}

async function sendMessage() {
  if (!newMessage.value.trim()) return;
  if (!ws.value || ws.value.readyState !== WEB_SOCKET_STATE_OPEN) {
    modalErrorMessage.value = "WebSocket 未连接。请先进入房间。";
    showLoginModal.value = true;
    return;
  }
  if (!encryptionService.value || !encryptionService.value.isKeyInitialized()) {
    modalErrorMessage.value = "加密服务未就绪，无法发送消息。请尝试重新连接。";
    showLoginModal.value = true;
    return;
  }

  try {
    const encryptedPayload = await encryptionService.value.encrypt(newMessage.value);
    const messageToSend = {
      type: "sendMessage",
      e2eeContent: encryptedPayload
    };
    ws.value.send(JSON.stringify(messageToSend));
    newMessage.value = '';
    document.getElementById('messageInput')?.focus();
  } catch (error) {
    console.error("Failed to encrypt and send message:", error);
    chatMessages.value.push({
      type: 'system',
      id: `error-${Date.now()}`,
      displayContent: processAndSanitize(`错误：发送消息失败。${error.message}`),
      timestamp: new Date().toISOString()
    });
  }
}

function handleEnterKey(event) {
  if (event.shiftKey) return;
  event.preventDefault();
  sendMessage();
}

function clearChatMessages() {
  chatMessages.value = [];
}

function toggleTheme() {
  document.documentElement.classList.toggle("theme-dark");
  localStorage.setItem('theme', document.documentElement.classList.contains('theme-dark') ? 'theme-dark' : 'theme-light');
}

function updateRoomEntryTip(isConnected = false) {
  const shareableLinkBase = `${window.location.origin}/chat/${currentRoomName.value}`;
  let tipHtml = `当前房间名: <strong>${currentRoomName.value}</strong>`;
  const shareParams = new URLSearchParams();

  // Don't pre-fill display name in share link unless specifically intended
  // if (inputDisplayName.value) shareParams.set('displayName', inputDisplayName.value);
  
  if (actualRoomPasswordUsed.value && isConnected) { // Only include password in share link if connected AND password was used
    shareParams.set('roomPassword', actualRoomPasswordUsed.value);
  }
  
  let fullShareableLink = shareableLinkBase;
  if (shareParams.toString()) {
    fullShareableLink += `?${shareParams.toString()}`;
  }
  
  let passwordInfo = "";
  if (isConnected && actualRoomPasswordUsed.value) {
      passwordInfo = `, 含当前密码`;
  } else if (!inputRoomPassword.value.trim() && actualRoomPasswordUsed.value === 'Mrlee' && !isConnected){
      // This state means the user hasn't typed a password, 'Mrlee' is set as actual, and not yet connected.
      // It's clearer to say the share link is for the room, password handling is on join.
      // passwordInfo = ` (如房间无密码将设为 'Mrlee')`; // This might be confusing in a share link
  }

  tipHtml += `<br><small>房间链接 (可分享${passwordInfo}): <a href="${fullShareableLink}" target="_blank" rel="noopener noreferrer">${fullShareableLink}</a></small>`;
  if (!isConnected && !inputRoomPassword.value.trim() && actualRoomPasswordUsed.value === 'Mrlee') {
    tipHtml += `<br><small class="has-text-info-dark">提示: 未输入密码，将使用 'Mrlee' 作为房间密码尝试加入或创建。</small>`;
  }
  roomEntryTip.value = tipHtml;
}

function handleModalBackgroundClick() {
  // Only allow closing modal via background click if already connected (i.e., modal is for info/settings)
  // If not connected, user must use buttons.
  if (ws.value && ws.value.readyState === WEB_SOCKET_STATE_OPEN) {
    showLoginModal.value = false;
  }
}

// --- Lifecycle Hooks ---
onMounted(() => {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme) document.documentElement.classList.toggle('theme-dark', savedTheme === 'theme-dark');

  const pathParts = window.location.pathname.slice(1).split('/');
  const queryParams = getQueryParams();
  let finalRoomName = '', newPath = window.location.pathname, currentSearch = window.location.search, shouldUpdateUrl = false;

  if (pathParts.length >= 2 && pathParts[0].toLowerCase() === 'chat' && pathParts[1]) {
    finalRoomName = pathParts[1];
    const tempParams = new URLSearchParams(currentSearch);
    if (tempParams.has('room')) { // Clean 'room' from query if present in path
      tempParams.delete('room');
      currentSearch = tempParams.toString() ? `?${tempParams.toString()}` : '';
      shouldUpdateUrl = true;
      newPath = `/chat/${finalRoomName}`;
    }
  } else {
    const roomFromQuery = queryParams.room;
    if (roomFromQuery) {
      finalRoomName = roomFromQuery;
      newPath = `/chat/${finalRoomName}`;
      const tempParams = new URLSearchParams(currentSearch);
      tempParams.delete('room'); // Clean 'room' from query now that it's in path
      currentSearch = tempParams.toString() ? `?${tempParams.toString()}` : '';
      shouldUpdateUrl = true;
    } else {
      // Fallback: If no room name in path or query, generate a simple one.
      // Consider if `generateRandomStrongPassword` is available and preferred.
      // For this example, let's use a simpler random string if that function isn't available/imported.
      // This part depends on whether you keep cryptoUtils.js and its import for room name generation.
      // Assuming generateRandomStrongPassword was primarily for passwords and now removed:
      finalRoomName = 'room-' + Math.random().toString(36).substring(2, 10);
      newPath = `/chat/${finalRoomName}`;
      shouldUpdateUrl = true;
    }
  }
  currentRoomName.value = finalRoomName;

  if (shouldUpdateUrl) {
    window.history.replaceState({ path: newPath }, '', `${newPath}${currentSearch}${window.location.hash}`);
  }
  
  const finalQueryParams = new URLSearchParams(currentSearch); // Re-evaluate query params after potential cleaning
  if (finalQueryParams.has('displayName')) {
    inputDisplayName.value = decodeURIComponent(finalQueryParams.get('displayName'));
  }
  if (finalQueryParams.has('roomPassword')) {
    inputRoomPassword.value = decodeURIComponent(finalQueryParams.get('roomPassword'));
    actualRoomPasswordUsed.value = inputRoomPassword.value; // Ensure this is set if coming from URL
  }

  updateRoomEntryTip(false); // Initial tip
  showLoginModal.value = true; 
});

onBeforeUnmount(() => {
  if (ws.value) {
    ws.value.close(1000, "Component unmounting");
  }
  encryptionService.value = null;
});
</script>

