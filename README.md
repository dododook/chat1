# Easy chat - 端到端加密实时聊天应用

Easy chat 是一个实时的、基于浏览器的聊天应用程序，支持端到端加密 (E2EE)，确保只有参与者才能阅读消息内容。它采用现代 Web 技术构建，前端使用 Vue.js 3 和 Vite，后端由 Cloudflare Workers 和 Durable Objects驱动。
优点：
 * 无需服务器，所有聊天消息在发送前均在用户浏览器端使用 TweetNaCl.js (XSalsa20-Poly1305) 进行加密，只有持有正确房间密钥的参与者才能解密阅读。
 * Cloudflare Durable Object仅能看到加密后的 e2eeContent，无法窥探消息明文，有效保护了用户通讯的私密性。
 * 密钥派生基于用户提供的房间密码（或自动生成的强密码）和房间名，通过 PBKDF2 实现，增加了破解难度。
 * 强制加密策略：所有房间的消息都必须经过端到端加密，不存在明文传输的房间，从机制上保证了安全性。
 * 服务器端静态数据加密：Durable Object 在存储消息包（包含元数据和客户端加密的 e2eeContent）时，会对其进行额外的“第三层”AES-GCM 加密，进一步增强了数据在服务器存储时的安全性。
 * XSS 防护：用户昵称在服务器端进行了HTML转义处理；用户发送的 Markdown 内容在客户端渲染前，经过 marked.js 解析和 DOMPurify 严格的 HTML 清理，有效防止了跨站脚本攻击。
 * 自动密码生成：为未设置密码的新房间自动生成高强度密码，既方便了用户快速创建私密房间，也保证了E2EE的基础安全性。

## ✨ 主要功能
## 🛠️ 技术栈
**前端 (Vue.js 3 + Vite + Bulma):**
* **响应式用户界面**: 自动适应桌面和移动设备。
* **主题切换**: 支持夜间模式，并保存用户偏好。
* **房间系统**: 通过 URL 路径 (`/chat/{roomName}`) 加入或创建聊天室。
* **URL参数支持**: 可以通过 URL 查询参数预填昵称 (`displayName`) 和房间密码 (`roomPassword`)。
* **Markdown 消息**: 支持在消息中使用 Markdown 语法进行格式化，内容会经过安全处理后显示。
* **端到端加密 (E2EE)**:
    * 所有用户消息在发送前进行客户端加密，接收后解密。
    * **加密库**: 使用 **TweetNaCl.js** (`secretbox` - XSalsa20-Poly1305) 进行对称认证加密。
    * **密钥派生**: 加密密钥基于用户提供的房间密码（或自动生成的强密码）和房间名（作为盐），通过 **Web Crypto API (PBKDF2)** 派生出适用于 TweetNaCl 的密钥。
    * **强制加密**: 所有房间的消息都必须经过端到端加密。
    * **自动密码生成**: 如果创建/加入房间时未提供密码，系统会自动生成一个强密码 (`crypto.randomUUID()`)，并提示用户（此密码将用于E2EE密钥派生和房间访问）。
    * **逻辑封装**: 加密逻辑被封装在 `EncryptionService.js` 中。
* **实时通信**: 使用 WebSocket 与后端进行双向通信。
* **用户状态**: 显示房间内的用户列表和数量（通过 `roomStateUpdate`）。
* **历史消息**: 加入房间时加载最近的聊天记录（同样经过E2EE处理）。

**后端 (Cloudflare Workers + Durable Objects):**

* **Worker (`worker.js`)**:
    * 处理 HTTP 请求路由。
    * 根据房间名实例化和分发请求到对应的 `ChatRoom` Durable Object 实例。
* **Durable Object (`durable-object.js` - `ChatRoom` 类)**:
    * 为每个聊天室管理独立的 WebSocket 连接和会话。
    * 处理房间访问密码：密码哈希存储，新房间首次设置密码。
    * 广播消息：高效地将客户端加密的 `e2eeContent` 广播给房间内所有用户。
    * 持久化消息历史：
        * 存储包含 `e2eeContent` 的消息对象。
        * 对存储的整个消息包进行服务器端“第三层”静态加密 (AES-GCM)，使用基于 `CHAT_APP_SALT` 和 DO ID 派生的独立密钥。
    * 用户在线状态广播。
    * 通过 Durable Object Alarms 自动清理长时间不活跃（无用户在线）的房间数据。
    * 提供 `GET /messages` HTTP 端点以获取房间消息（主要用于调试或特定场景，返回的是包含原始 `e2eeContent` 的消息包，同样经过DO的第三层解密）。

* **前端**:
    * Vue.js 3
    * Vite (构建工具)
    * Bulma (CSS 框架)
    * `marked` (Markdown 解析)
    * `dompurify` (HTML 清理，防 XSS)
    * **`tweetnacl`** (核心加密操作)
    * **`tweetnacl-util`** (UTF-8 和 Base64 编解码辅助)
    * Web Crypto API (仅用于 PBKDF2 密钥派生)
* **后端**:
    * Cloudflare Workers
    * Cloudflare Durable Objects
    * Web Crypto API (用于 DO 的静态加密和密码哈希)
* **通信协议**: WebSocket

## 🚀 环境准备与安装

**部署 Worker**:

一键部署到cloudflare
[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button?projectName=code)](https://deploy.workers.cloudflare.com/?url=https://github.com/macklee6/code)

或者手动部署

```bash
    git clone https://github.com/macklee6/code
    cd code
    wrangler deploy
```
   
   部署成功后，您会得到一个 Worker 的 URL (例如 `your-worker-name.your-username.workers.dev`)。 
    注意！一定要设置 `CHAT_APP_SALT` 环境变量。这是一个用于Durable Object静态加密密钥派生的关键盐值，
    必须保密且唯一。

### 前端 (Vite + Vue.js)

一键部署到vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/macklee6/Easychat)
    
    设置环境变量，变量名VITE_WORKER_HOST，值填上面获取到的Worker地址
   
   或者手动部署
1.  **克隆项目/进入前端目录**:
    ```bash
    cd Easychat
    ```

2.  **安装依赖**:
    ```bash
    pnpm install
    ```

3.  **配置环境变量**:
    
    在 `Easychat/` 目录下创建 `.env`
    
    ```bash
        # 替换为部署后后端 Worker 的实际域名
        VITE_WORKER_HOST="your-worker-name.your-username.workers.dev"
    ```

4.  **运行开发服务器**:
    ```bash
    pnpm run dev
    ```
    前端应用通常会在 `http://localhost:5173` (或 Vite 指定的其他端口) 运行。

5.  **构建生产版本**:
    ```bash
    pnpm run build
    ```
    构建后的静态文件会输出到 `dist/` 目录，可将其部署到 Cloudflare Pages 或其他静态网站托管服务。

## 🖥️ 使用方法

1.  确保后端 Worker 已成功部署，并且前端配置的 `VITE_WORKER_HOST` 指向正确的 Worker 地址。
2.  启动前端开发服务器或访问已部署的前端应用。
3.  应用会根据浏览器 URL 确定房间名：
    * 直接访问根路径 (例如 `http://localhost:5173/`) 会自动跳转到一个随机生成的房间路径，如 `/chat/randomname`。
    * 访问 `/chat/{自定义房间名}` (例如 `http://localhost:5173/chat/mysecretroom`) 进入指定房间。
    * 可以在 URL 中添加查询参数预设信息：
        * `.../chat/myroom?displayName=Alice`
        * `.../chat/myroom?displayName=Bob&roomPassword=securepass123`
4.  在弹出的“进入房间”模态框中：
    * 输入你的昵称。
    * 输入房间密码。如果房间是新的或你想设置/更改密码，在此输入。**如果留空，系统会自动为此房间生成一个强密码并提示您。此密码将用于端到端加密和后续用户加入时的房间访问。**
5.  点击“进入”按钮。
6.  成功连接后，即可开始聊天！消息支持 Markdown 格式。


## ⚖️ 免责声明 (Disclaimer)
请您在使用本项目前仔细阅读并充分理解以下条款：
 * 按“原样”提供:
   本项目按“原样”和“现有”基础提供，不附带任何明示或暗示的保证，包括但不限于对适销性、特定用途适用性以及不侵权的保证。开发者不保证软件将不间断、及时、安全或无错误地运行，也不保证任何错误都将得到纠正。
 * 责任限制:
   在任何情况下，本项目的作者、贡献者或许可方均不对因使用或无法使用本软件所引起的任何索赔、损害或其他责任负责，无论是在合同行为、侵权行为还是其他方面，即使已被告知可能发生此类损害。这包括但不限于数据丢失、利润损失、业务中断等。
 * 用户责任:
   * 您对使用本软件的行为以及通过本软件创建、传输或显示的任何内容负全部责任，并自行承担由此产生的所有后果，包括遵守所有适用的地方、国家及国际法律法规。
   * 密码安全: 您有责任妥善保管您的房间密码。对于用户自行设置的密码，其强度由用户负责；对于系统自动生成的密码，用户有责任记录并安全地分享给希望加入的成员。密码的泄露可能导致您的端到端加密信息被破解。
   * 数据备份: 本项目实现了不活跃房间数据的自动删除功能。对于重要对话，请用户自行考虑备份需求。
 * 安全提示:
   * 本项目已尽力实现端到端加密 (E2EE) 以保护您的通讯隐私，服务器无法读取您的消息明文。然而，没有任何安全系统是绝对无懈可击的。
   * 我们强烈建议您为加密房间使用高强度的、唯一的密码，并警惕任何潜在的社会工程学攻击或恶意软件可能导致的本地设备安全风险。
   * 端到端加密的安全性也依赖于您通讯对象的设备安全和密码保管情况。
 * 数据处理与隐私:
   * 如上所述，用户间的消息内容经过端到端加密。服务器仅处理和存储加密后的消息包（e2eeContent）。
   * 服务器会存储必要的元数据（如发送者昵称、时间戳）以及用于其自身存储加密的密钥（与用户E2EE密钥不同且独立）。
   * 不活跃的房间及其所有相关数据将在最后一位用户离开一段时间（当前设置为5分钟）后自动从服务器永久删除。
 * 项目目的与非商业用途:
   * （如果适用，例如）本项目主要用于学习、演示和技术交流目的。它可能不适合用于处理高度敏感、关键任务或商业性质的通讯，除非您已对其进行了充分的安全审计和风险评估。
 * 修改与解释权:
   开发者保留随时修改本免责声明条款的权利。您继续使用本软件将被视为接受修改后的条款。
一旦您开始使用本软件，即表示您已阅读、理解并同意接受本免责声明的所有条款。如果您不同意本免责声明的任何内容，请立即停止使用本软件。
