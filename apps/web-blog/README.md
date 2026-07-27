# @rx-ted/web-blog

Public-facing blog frontend with full-text search, markdown editing, comments, i18n, and theme customization. Built with Vue 3.

## Tech Stack

- **Framework:** Vue 3 (Composition API)
- **UI Library:** Naive UI
- **State:** Pinia
- **Markdown:** md-editor-v3
- **HTTP:** openapi-fetch (typed API client)
- **Icons:** Iconify
- **Build:** Vite + TypeScript

## Structure

```
src/
├── App.vue                    Root component
├── main.ts                    Entry point
├── api/                       Typed API client (openapi-fetch)
│   └── __generated__/         Auto-generated types from OpenAPI
├── http/                      HTTP client setup + interceptors
├── pages/                     Route pages (20+)
│   ├── HomePage               Blog home with article list
│   ├── PostDetailPage         Article reader
│   ├── EditorPage             Markdown editor
│   ├── SearchPage             Full-text search
│   ├── AuthorPage             Author profile
│   ├── TagsPage / TagDetailPage  Tag listing and detail
│   ├── CategoriesPage / CategoryDetailPage  Category listing
│   ├── ArchivePage            Archive timeline
│   ├── CalendarPage           Calendar view
│   ├── FriendsPage            Friend links
│   ├── GuestbookPage          Guestbook
│   ├── LoginPage / RegisterPage  Auth pages
│   ├── ProfilePage            User profile
│   ├── DashboardPage          Admin dashboard
│   └── ...
├── components/                Reusable UI components
│   ├── blog/                  Article cards, lists, timeline
│   ├── comment/               Comment threads (Giscus + custom)
│   ├── editors/               Blog editor with save dialog
│   ├── search/                Search result cards
│   ├── users/                 User cards, login, register
│   ├── seo/                   SEO head management
│   ├── dashboard/             Dashboard stats and activity
│   ├── taxonomy/              Tag/category pill lists, TOC
│   ├── ui/                    Error boundary, lazy image
│   └── ads/                   Ad slot system
├── stores/                    Pinia stores (auth, blog, layout, theme...)
├── composables/               useI18n, useSearch, useHeartbeat, useArchive...
├── router/                    Vue Router configuration
├── theme/                     Theming system (tokens, layout, floating)
├── i18n/                      Internationalization messages
├── config/                    Site config, HTTP config, search config
├── constants/                 API, auth, layout, nav constants
├── layouts/                   App layouts (Full, Simple, SideBar, Doc)
├── styles/                    SCSS (variables, mixins, theme)
├── types/                     TypeScript type definitions
└── utils/                     Blog utils, comment utils, date formatting
```

## Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start dev server |
| `pnpm build` | Build for production |
| `pnpm test` | Run unit tests |
| `pnpm typecheck` | Type check |
| `pnpm generate:api` | Regenerate API types from OpenAPI spec |
| `pnpm test:e2e` | Run Playwright E2E tests |

## Features

- Full-text search with highlight
- Markdown editor for articles
- Comment system with Giscus + custom comments
- Internationalization (i18n)
- Dark/light theme with customization
- Responsive design with mobile navigation
- SEO head management
- User authentication (login, register, profile)
- Admin dashboard (posts, drafts, settings)
- Archive timeline and calendar view
- Friend links and guestbook pages
