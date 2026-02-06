# CloudWA Flow

Platform SaaS WhatsApp All-in-One dengan Visual Flow Builder.

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [PRD](./docs/PRD.md) | Product Requirements Document |
| [User Flow](./docs/USER_FLOW.md) | User journey diagrams |
| [Database Schema](./docs/DATABASE_SCHEMA.md) | D1 database structure |
| [Tech Stack](./docs/TECH_STACK.md) | Architecture & configuration |
| [API Reference](./docs/API_REFERENCE.md) | REST API documentation |
| [Anti-Ban Strategy](./docs/ANTI_BAN_STRATEGY.md) | WhatsApp compliance |
| [UI/UX Guidelines](./docs/UI_UX_GUIDELINES.md) | Design system |

## 🚀 Tech Stack

- **Frontend**: Next.js 14, React Flow, Tailwind CSS
- **Backend**: Cloudflare Workers, D1, R2, Queues
- **WhatsApp**: Baileys + Durable Objects
- **AI**: Workers AI, OpenAI, Gemini, Claude

## 📦 Features

- ✅ Visual Flow Builder (drag & drop)
- ✅ Multi-device WhatsApp connection
- ✅ Broadcast/Blast messaging
- ✅ AI Assistant with RAG
- ✅ Contact CRM
- ✅ Multi-tenant SaaS

## 🚀 Getting Started

```bash
# Install dependencies
npm install

# Development
npm run dev

# Deploy
npx wrangler deploy
```

## 📄 License

MIT
