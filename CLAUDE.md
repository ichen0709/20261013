# CLAUDE.md

一個不用登入的匿名聊天室:前端放在 GitHub Pages,即時傳訊最後才接上 Supabase。

## 規則

- 開始任何工作前,先讀 `docs/architecture.md`。需求在 `docs/requirements.md`。
- 目前在「階段一」:只做前端,用假的聊天服務(MockChatService),還不接 Supabase。
- 不可以把金鑰檔案(`.env`、`.env.local` 等)commit 進 git。只有 `.env.example` 可以進版控,而且裡面不放真值。Supabase 的 secret key / service_role key 在這個專案完全不會用到,任何地方都不該出現。
