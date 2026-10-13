# 匿名聊天室

不用登入的匿名聊天室。網頁放在 GitHub Pages,即時傳訊最後才接上 Supabase。

- 需求:`docs/requirements.md`
- 架構:`docs/architecture.md`
- 畫面設計:`docs/design.md`

目前在**階段一**:前端已完成,使用假的聊天服務(同一個瀏覽器的分頁之間互相聊天)。

## 在自己電腦上執行

需要先安裝 Node.js。

```
npm install        # 只需要第一次
npm run dev        # 開發模式,網址 http://localhost:5173/
npm run build      # 建置(同時檢查型別)
npm run preview    # 預覽建置後的結果,網址 http://localhost:4173/20261013/
```

## 怎麼測試(階段一)

| 想測什麼 | 做法 |
|---|---|
| 兩個人聊天 | 開兩個分頁(同一個瀏覽器)打開同一個網址,各自取不同代號進入 |
| 一個人測試 | 網址後面加 `?demo=1`,會出現幾個假使用者自動聊天、進出 |
| 斷線橫幅 | 網址後面加 `?dev=1`,左下角出現「開發工具」,勾選「模擬斷線」 |
| 代號重複 | 第二個分頁輸入跟第一個分頁相同的代號 |
| 送太快 | 5 秒內連送 6 則 |
| 手機版 | 瀏覽器開發者工具切換成手機尺寸,或縮小視窗寬度到 760 px 以下 |
| 深淺色 | 改作業系統的深色/淺色模式,頁面會跟著切換 |

`?demo=1` 和 `?dev=1` 可以一起用:`?demo=1&dev=1`。

## 程式結構

畫面與聊天服務分開,中間只靠 `src/chat/ChatService.ts` 這份合約溝通:

```
src/
├── chat/
│   ├── ChatService.ts       合約:指令與通知
│   ├── MockChatService.ts   階段一:假的聊天服務
│   └── useChat.ts           把服務的通知整理成畫面要的狀態
├── config.ts                決定用哪一種聊天服務(階段二只改這裡)
├── screens/                 進入畫面、聊天室畫面
├── components/              訊息、名單、輸入區等
├── lib/                     檢查規則、送太快的計算、小工具
└── styles/app.css           樣式與配色
```

畫面的程式不准引用任何 Supabase 相關的東西。

## 部署

推上 `main` 分支後,GitHub Actions 會自動建置並發佈(`.github/workflows/deploy.yml`)。
第一次要到專案的 Settings → Pages,把 Source 選為「GitHub Actions」。
網址是 `https://<帳號>.github.io/20261013/`。

## 金鑰

`.env.local` 等金鑰檔案不會被上傳(已在 `.gitignore`)。`.env.example` 是範本,裡面不放真值。
