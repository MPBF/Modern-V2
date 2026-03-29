# MPBF - Manufacturing Planning for Plastic Bag Factory

## Overview

A full-stack Manufacturing Resource Planning (MRP) system for a plastic bag manufacturing facility. Manages the entire production lifecycle: customer orders, multi-stage production (film extrusion, printing, cutting), warehouse inventory, quality control, machine maintenance, HR/attendance, and real-time factory monitoring. The interface is Arabic-first (RTL) with English fallback.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, TanStack Query v5, Tailwind CSS, shadcn/ui (Radix), Recharts, Three.js |
| Backend | Node.js, Express.js, TypeScript (tsx) |
| Database | PostgreSQL (Neon Serverless) via Drizzle ORM |
| Auth | Dual: session-based (Passport.js) + Replit Auth (OpenID Connect) + mobile Bearer tokens |
| i18n | i18next (Arabic/English) |
| Notifications | Meta WhatsApp Business API, Taqnyat SMS, Twilio WhatsApp |
| PDF | Adobe Document Generation API (@adobe/pdfservices-node-sdk) |
| AI | OpenAI integration for factory AI assistant |
| PWA | Service worker, manifest.json, install prompt |

## Project Structure

```
├── client/                          # React frontend (Vite)
│   ├── src/
│   │   ├── App.tsx                  # Route definitions with lazy loading
│   │   ├── main.tsx                 # App entry point
│   │   ├── pages/                   # 40+ page components (see Pages section)
│   │   ├── components/
│   │   │   ├── ui/                  # 51 shadcn/ui primitives (Button, Dialog, Table, etc.)
│   │   │   ├── layout/              # PageLayout, Sidebar, Navbar
│   │   │   ├── orders/              # Order forms, tables, print templates, roll tabs
│   │   │   ├── production/          # Production queues, roll cards, stage stats
│   │   │   ├── warehouse/           # Voucher forms/lists, definitions, reports
│   │   │   ├── hr/                  # Attendance, leaves, performance, training
│   │   │   ├── maintenance/         # Consumable parts tab
│   │   │   ├── dashboard/           # Stats, widgets, customizer, quick notes
│   │   │   ├── factory/             # Factory floor map component
│   │   │   ├── charts/              # Recharts wrappers
│   │   │   ├── modals/              # Shared modal components
│   │   │   ├── notifications/       # Notification bell and list
│   │   │   ├── settings/            # Settings tabs
│   │   │   └── pwa/                 # PWA install prompt
│   │   ├── hooks/
│   │   │   ├── use-auth.tsx         # Auth context and hook (login/logout/session)
│   │   │   ├── use-toast.tsx        # Toast notification hook
│   │   │   ├── use-mobile.tsx       # Mobile viewport detection
│   │   │   ├── use-localized-name.ts # AR/EN name resolution
│   │   │   ├── use-sse.tsx          # Server-sent events hook
│   │   │   └── useRemainingQuantity.ts # Order remaining qty calculation
│   │   ├── contexts/
│   │   │   ├── LanguageContext.tsx   # AR/EN language switching
│   │   │   └── ThemeContext.tsx      # Light/dark theme
│   │   ├── config/
│   │   │   └── navigationConfig.ts  # Sidebar navigation items and groups
│   │   ├── lib/
│   │   │   ├── queryClient.ts       # TanStack Query config, apiRequest(), getQueryFn()
│   │   │   ├── dashboard-widgets.ts # Widget registry for customizable dashboard
│   │   │   ├── formatNumber.ts      # Arabic numeral formatting
│   │   │   ├── toastMessages.ts     # Reusable toast messages
│   │   │   └── utils.ts             # cn() Tailwind merge utility
│   │   └── i18n/locales/
│   │       ├── ar.json              # Arabic translations
│   │       └── en.json              # English translations
│   └── index.html                   # HTML entry with PWA meta tags
│
├── server/
│   ├── index.ts                     # Express app bootstrap, CORS, session, Vite setup
│   ├── routes.ts                    # Main API routes (~11,000 lines, all REST endpoints)
│   ├── storage.ts                   # Database access layer (~5,200 lines, all CRUD ops)
│   ├── db.ts                        # Drizzle DB connection (Neon serverless)
│   ├── vite.ts                      # Vite dev server integration (DO NOT MODIFY)
│   ├── ai-agent-routes.ts           # AI assistant chat, knowledge base, tools
│   ├── auth/
│   │   └── sessionUser.ts           # Session user resolution
│   ├── middleware/
│   │   ├── auth.ts                  # requireAuth, requireAdmin, requirePermission
│   │   ├── session-auth.ts          # Session + Bearer token auth, roles cache, mobile tokens
│   │   ├── validation.ts            # Zod-based request validation middleware
│   │   └── performance-monitor.ts   # Request latency and resource tracking
│   ├── services/
│   │   ├── notification-manager.ts  # Multi-channel notification orchestration
│   │   ├── notification-service.ts  # Notification delivery logic
│   │   ├── event-trigger-service.ts # Event-driven notification triggers
│   │   ├── meta-whatsapp.ts         # Meta WhatsApp Business API client
│   │   ├── taqnyat-sms.ts           # Taqnyat SMS gateway
│   │   ├── system-health-monitor.ts # DB/memory/perf health checks
│   │   ├── alert-manager.ts         # Smart alert rule engine
│   │   ├── database-monitor.ts      # DB connection pool monitoring
│   │   ├── memory-monitor.ts        # Heap/RSS memory tracking
│   │   ├── data-validator.ts        # Business rule validation engine
│   │   ├── code-health-checker.ts   # Code quality diagnostics
│   │   ├── error-learning-enhancer.ts # Error pattern learning
│   │   ├── transaction.ts           # DB transaction wrapper
│   │   └── adobe-pdf/               # PDF generation with templates
│   ├── routes/
│   │   ├── alerts.ts                # System alerts CRUD
│   │   ├── monitoring.ts            # System monitoring endpoints
│   │   └── index.ts                 # Route registration
│   ├── replit_integrations/
│   │   ├── object_storage/          # Replit Object Storage for file uploads
│   │   ├── chat/                    # Replit AI chat integration
│   │   ├── image/                   # Replit AI image generation
│   │   └── batch/                   # Batch processing
│   ├── lib/
│   │   └── logger.ts                # Structured logging utility
│   └── types/                       # TypeScript type declarations
│
├── shared/                          # Code shared between frontend and backend
│   ├── schema.ts                    # Drizzle ORM schema (~3,650 lines, 60+ tables)
│   ├── permissions.ts               # Central permissions registry (~820 lines)
│   ├── validation-utils.ts          # parseIntSafe, parseFloatSafe, coerce helpers
│   ├── quantity-utils.ts            # Production quantity calculations
│   ├── decimal-utils.ts             # Decimal precision handling
│   ├── number-utils.ts              # Number formatting utilities
│   ├── id-generator.ts              # Sequential ID generation (ORD-XXXX, PO-XXXX)
│   ├── NumberInput.tsx              # Shared numeric input component
│   ├── MachineSelect.tsx            # Shared machine selector
│   └── ProductionOrderSelect.tsx    # Shared production order selector
│
├── migrations/                      # Drizzle SQL migration files
├── public/                          # Static assets (PWA icons, manifest, service worker)
├── drizzle.config.ts                # Drizzle config (DO NOT MODIFY)
├── vite.config.ts                   # Vite config (DO NOT MODIFY)
└── package.json                     # Dependencies (DO NOT MODIFY directly)
```

## Database Schema (60+ Tables)

### Core Business Tables

| Table | Purpose |
|-------|---------|
| `users` | All system users with auth, role, section assignment |
| `roles` | Named roles with permissions JSON array |
| `customers` | Customer master data (name, phone, tax, sales rep) |
| `customer_products` | Product specs per customer (width, thickness, material, colors) |
| `orders` | Customer orders with specs, quantities, delivery dates |
| `production_orders` | Manufacturing orders linked to customer orders |
| `rolls` | Individual rolls tracked through film → printing → cutting stages |
| `cuts` | Cutting records from rolls with package counts and weights |
| `machines` | Factory machines with type, section, status |
| `sections` | Factory departments/sections |

### Inventory & Warehouse

| Table | Purpose |
|-------|---------|
| `items` | Material/product catalog (raw materials, finished goods) |
| `categories` | Material group categories |
| `inventory` | Current stock levels per item per location |
| `inventory_movements` | Stock in/out transaction log |
| `warehouse_receipts` | Production-to-warehouse receipt records |
| `warehouse_transactions` | General warehouse movements |
| `locations` | Storage locations within warehouse |

### Production Support

| Table | Purpose |
|-------|---------|
| `waste` | Production waste records per roll/stage |
| `quality_checks` | Quality inspection results |
| `quality_issues` | Production quality problems tracking |
| `quality_issue_responsibles` | Workers responsible for quality issues |
| `quality_issue_actions` | Corrective/preventive actions for issues |
| `mixing_batches` | Material mixing batch records |
| `batch_ingredients` | Ingredients in each mixing batch |
| `machine_queues` | Production order queue per machine |
| `production_settings` | Production configuration (overrun tolerance, etc.) |
| `master_batch_colors` | Master batch color definitions |

### Maintenance

| Table | Purpose |
|-------|---------|
| `maintenance_requests` | Machine repair/service requests |
| `maintenance_actions` | Actions taken on maintenance requests |
| `maintenance_reports` | Maintenance summary reports |
| `operator_negligence_reports` | Operator error/negligence tracking |
| `spare_parts` | Spare parts inventory |
| `consumable_parts` | Consumable supplies tracking |
| `consumable_parts_transactions` | Consumable usage log |

### HR & Attendance

| Table | Purpose |
|-------|---------|
| `attendance` | Daily check-in/check-out with GPS data |
| `leave_types` | Leave categories (annual, sick, etc.) |
| `leave_requests` | Employee leave applications |
| `leave_balances` | Per-employee leave balance tracking |
| `performance_reviews` | Employee performance evaluations |
| `performance_criteria` | Evaluation criteria definitions |
| `performance_ratings` | Individual ratings per review |
| `training_programs` | Training program definitions |
| `training_records` | Employee training completions |
| `training_materials` | Training content resources |
| `training_enrollments` | Program enrollment tracking |
| `training_evaluations` | Post-training assessments |
| `training_certificates` | Issued certificates |

### System & Configuration

| Table | Purpose |
|-------|---------|
| `system_settings` | Global system configuration key-value store |
| `user_settings` | Per-user preferences (dashboard config, theme, etc.) |
| `notifications` | In-app notification messages |
| `notification_templates` | Notification message templates |
| `user_requests` | Employee requests (documents, certificates, etc.) |
| `factory_locations` | GPS coordinates of factory locations for attendance |
| `system_alerts` | Automated system warning alerts |
| `alert_rules` | Alert trigger rule definitions |
| `system_health_checks` | System health check records |
| `system_performance_metrics` | Performance metric snapshots |
| `system_analytics` | Analytics data points |
| `corrective_actions` | System corrective action tracking |
| `quick_notes` | Quick sticky notes for users |
| `note_attachments` | File attachments on notes |
| `factory_layouts` | 3D factory layout configurations |
| `factory_snapshots` | Saved factory simulation states |
| `admin_decisions` | Admin decision audit log |

## Pages & Routes

### Primary Operations
| Route | Page | Purpose |
|-------|------|---------|
| `/` | Dashboard | Main overview with customizable widgets |
| `/orders` | Orders | Unified view: orders, production orders, queues, roll search, reports (tabbed) |
| `/production` | Production | Production stage management |
| `/production-dashboard` | ProductionDashboard | Unified operator dashboard (film/printing/cutting) |
| `/warehouse` | Warehouse | 5-tab: Production Hall, Finished Goods, Raw Materials, Definitions, Reports |
| `/quality` | Quality | Quality issues tracking and analytics |
| `/maintenance` | Maintenance | Machine maintenance requests and tracking |

### HR & People
| Route | Page | Purpose |
|-------|------|---------|
| `/hr` | HR | Attendance, leaves, training, performance reviews |
| `/user-dashboard` | UserDashboard | Individual employee self-service dashboard |

### Admin & System
| Route | Page | Purpose |
|-------|------|---------|
| `/definitions` | Definitions | Master data: customers, machines, items, sections, users, roles, colors |
| `/settings` | Settings | System-wide and notification event settings |
| `/reports` | Reports | Analytics and report generation |
| `/notifications` | Notifications | Notification center |
| `/alerts` | AlertsCenter | System alert management |
| `/system-health` | SystemHealth | Database and system health overview |
| `/system-monitoring` | SystemMonitoring | Real-time performance monitoring |
| `/ai-agent` | AiAgent | AI factory assistant chat interface |
| `/ai-agent-settings` | AiAgentSettings | AI agent configuration |
| `/factory-simulation` | FactorySimulation3D | 3D factory floor visualization (Three.js) with real-time machine status indicators |
| `/factory-floor` | FactoryFloor | 2D factory floor map |
| `/display-screen` | DisplayScreen | Public display board (no auth required) |
| `/display-control` | DisplayControlPanel | Display screen content management |
| `/tools` | ToolsPage | Utility tools (barcode generator, etc.) |
| `/material-mixing` | MaterialMixing | Material mixing formula management |
| `/production-monitoring` | ProductionMonitoring | Live production metrics |

### WhatsApp Setup (Admin)
| Route | Purpose |
|-------|---------|
| `/meta-whatsapp-setup` | Meta WhatsApp Business API configuration |
| `/whatsapp-setup` | General WhatsApp setup |
| `/whatsapp-test` | Send test WhatsApp messages |
| `/whatsapp-troubleshoot` | WhatsApp connectivity diagnostics |
| `/whatsapp-production-setup` | Production notification config |
| `/whatsapp-final-setup` | Final WhatsApp integration steps |
| `/whatsapp-webhooks` | Webhook configuration |
| `/whatsapp-template-test` | Template message testing |
| `/twilio-content` | Twilio content template management |

### Redirects (Legacy Routes)
- `/production-orders-management` → `/orders?tab=production-orders`
- `/production-queues` → `/orders?tab=production-queues`
- `/roll-search` → `/orders?tab=roll-search`
- `/production-reports` → `/orders?tab=production-reports`
- `/film-operator`, `/printing-operator`, `/cutting-operator` → `/production-dashboard`

## API Endpoints Summary

### Authentication
- `POST /api/login` — Session login (username/password)
- `POST /api/logout` — Session logout
- `GET /api/me` — Current user with role/permissions
- `GET /api/auth/user` — Replit Auth user resolution
- `POST /api/mobile/login` — Mobile Bearer token login
- `POST /api/mobile/logout` — Revoke mobile token
- `GET /api/mobile/status` — Public health check

### Orders & Production
- `GET/POST /api/orders` — CRUD orders
- `GET /api/orders/enhanced` — Orders with joined customer/product data
- `GET/POST/PATCH /api/production-orders` — Production order management
- `GET/POST/PATCH /api/rolls` — Roll lifecycle (create, update stage, record weights)
- `POST /api/rolls/create-with-timing` — Create roll with production timing data
- `PATCH /api/rolls/:id/print` — Mark roll as printed
- `PATCH /api/rolls/:id/complete-cutting` — Complete cutting stage
- `GET/POST /api/cuts` — Cutting records
- `GET /api/production-orders/active-for-operator` — Operator queue
- `GET/POST/DELETE /api/machine-queues` — Machine production queues

### Warehouse & Inventory
- `GET/POST/PUT/DELETE /api/inventory` — Stock management
- `GET/POST/DELETE /api/inventory-movements` — Stock transactions
- `POST /api/warehouse/vouchers/finished-goods-in` — FP receipt vouchers
- `POST /api/warehouse/vouchers/finished-goods-out` — FP delivery vouchers
- `POST /api/warehouse/vouchers/raw-materials-in` — RM receipt vouchers
- `POST /api/warehouse/vouchers/raw-materials-out` — RM issue vouchers
- `GET /api/warehouse/delivery-hall` — Orders ready for delivery
- `GET /api/warehouse/production-orders-for-receipt` — Orders ready for receipt

### Quality
- `GET/POST/PATCH /api/quality-issues` — Quality issue CRUD
- `POST/PATCH/DELETE /api/quality-issues/:id/responsibles` — Responsible parties
- `POST/PATCH /api/quality-issues/:id/actions` — Corrective actions
- `GET /api/quality-issues/stats` — Quality analytics

### Maintenance
- `GET/POST/PATCH /api/maintenance-requests` — Repair requests
- `POST /api/maintenance-actions` — Record maintenance work
- `GET/POST /api/consumable-parts` — Consumable inventory
- `POST /api/consumable-parts-transactions` — Usage tracking
- `GET/POST /api/spare-parts` — Spare parts management

### HR & Attendance
- `GET/POST /api/attendance` — Attendance records
- `POST /api/attendance/check-in` — GPS-validated check-in
- `POST /api/attendance/check-out` — Check-out
- `GET /api/attendance/daily-status/:userId` — Today's status
- `GET /api/attendance/summary/:userId` — Period summary
- `POST /api/attendance/manual` — Bulk manual entry
- `POST /api/attendance/import` — Excel import
- `GET/POST /api/leave-requests` — Leave management
- `GET/POST /api/performance-reviews` — Performance reviews

### Definitions (Master Data)
- `GET/POST/PUT/DELETE /api/customers` — Customer management
- `GET/POST/PUT/DELETE /api/customer-products` — Product specs
- `GET/POST/PUT/DELETE /api/machines` — Machine management
- `GET/POST/PUT/DELETE /api/items` — Material/product catalog
- `GET/POST /api/sections` — Department sections
- `GET/POST /api/categories` — Material categories
- `GET/POST/PUT/DELETE /api/master-batch-colors` — Color definitions
- `GET/POST/PUT/DELETE /api/roles` — Role management with permissions
- `GET/POST/PUT /api/users` — User administration

### Notifications
- `GET/POST /api/notifications` — In-app notifications
- `POST /api/notifications/send-whatsapp` — Send WhatsApp message
- `POST /api/sms/send` — Send SMS via Taqnyat
- `POST /api/notifications/webhook/meta` — WhatsApp webhook receiver

### System
- `GET/PUT /api/system-settings` — Global settings
- `GET/POST /api/settings/user/:userId` — Per-user settings
- `GET/PUT /api/dashboard/config` — Dashboard widget configuration
- `GET /api/dashboard/stats` — Dashboard statistics
- `GET /api/health` — System health check
- Various `/api/monitoring/*` and `/api/system/*` endpoints

### AI Agent
- `POST /api/ai-agent/chat` — AI assistant conversation (SSE streaming)
- `GET/POST/PUT/DELETE /api/ai-agent/knowledge` — Knowledge base management
- `GET /api/ai-agent/settings` — AI configuration
- **AI Agent Tools** (OpenAI function calling):
  - `get_order_status`, `get_orders_summary`, `list_orders` — Order queries with filtering/search
  - `create_order` — Create new orders (requires `manage_orders` permission, auto-generates order number with advisory lock)
  - `update_order_status` — Change order status (requires `manage_orders`/`update_order_status`/`manage_production`)
  - `create_customer` — Register new customers (requires `manage_customers`/`manage_definitions`, auto-generates CID)
  - `create_customer_product` — Register product specs for customers (requires `manage_customers`/`manage_definitions`)
  - `get_customer_info`, `get_customers_list` — Customer search/list
  - `get_production_order_status`, `get_production_summary`, `get_recent_production` — Production queries
  - `get_machines_status`, `get_inventory_status`, `get_users_info` — Factory status queries
  - `create_quote`, `generate_quote_pdf`, `get_quote_templates`, `get_quote_by_number` — Quote management
  - `send_whatsapp_message`, `send_quote_whatsapp`, `send_quote_email` — Communication
  - `calculate_bag_quantity`, `calculate_printing_costs` — Industry calculations
  - `convert_currency`, `get_exchange_rates` — Currency tools
  - `search_knowledge_base`, `add_to_knowledge_base`, `get_website_info` — Knowledge management

## Authentication & Authorization

### Auth Flow
1. **Web Login**: `POST /api/login` → bcrypt password check → session cookie with userId, roleName, permissions
2. **Replit Auth**: OpenID Connect callback → `GET /api/auth/user` → auto-create user if new
3. **Mobile Login**: `POST /api/mobile/login` → bcrypt check → Bearer token (30-day expiry, in-memory store)

### Permission System
- Permissions defined in `shared/permissions.ts` (~86 permission keys)
- Stored as JSON string array in `roles.permissions` column
- Backend enforcement: `requireAuth`, `requireAdmin`, `requirePermission('perm1', 'perm2')` middleware
- Frontend enforcement: `canAccessRoute()`, `canAccessSettingsTab()`, `canAccessDefinitionsTab()`
- Admin role (role_id 10, name "Admin") has `'admin'` permission that bypasses all checks
- Role cache with 60s TTL via `getCachedRoles()`, invalidated on role CRUD
- `requireAdmin` is only used for database management and system-level operations
- **Table Data Import** (`TableImportDialog`): Settings > Database section allows importing data from CSV/Excel/JSON files with interactive column mapping. Supported tables for batch import: customers, categories, sections, items, customer_products, users, machines, locations. Backend endpoint: `POST /api/database/import/:tableName/batch`, schema info: `GET /api/database/table-schema/:tableName`
- All business operations (orders, production, attendance, etc.) use `requirePermission` with appropriate permissions

### Permission Categories
- **View**: `view_home`, `view_dashboard`, `view_orders`, `view_production`, `view_hr`, etc.
- **Manage**: `manage_orders`, `manage_production`, `manage_warehouse`, `manage_users`, etc.
- **Specialized**: `update_order_status`, `create_quality_inspections`, `manage_spare_parts`, `use_ai_agent`, etc.
- **Operator**: `view_film_dashboard`, `view_printing_dashboard`, `view_cutting_dashboard` (also grant production write access for operator-specific actions)
- **Admin**: `admin` (super permission, bypasses all checks)

## Manufacturing Workflow

### Production Lifecycle
```
Customer Order → Production Order(s) → Film Stage → Printing Stage → Cutting Stage → Warehouse Receipt → Customer Delivery
```

### Stage Details
1. **Film (Extruder)**: Creates plastic film rolls. Operator records roll weight, machine, timing.
2. **Printing**: Applies designs to film rolls. Records printing details and waste.
3. **Cutting**: Cuts printed rolls into final bags. Records package counts and cut weights.
4. **Warehouse**: Receives finished goods (FP-Rec voucher), stores, delivers to customer (FP-Del voucher).

### Business Rules (Enforced)
- Sum of production order quantities cannot exceed order total + overrun tolerance
- Sum of roll weights cannot exceed production order final quantity + tolerance
- Inventory stock levels must never go negative
- Rolls must follow sequential stage transitions (film → printing → cutting → done)
- Production operations require active machines only
- Paused orders block new production entries

### Voucher System (4 Types)
- `FP-Rec.XXXX` — Finished goods receipt from production hall
- `FP-Del.XXXX` — Finished goods delivery to customer
- `RM-Rec.XXXX` — Raw material receipt from supplier
- `RM-Del.XXXX` — Raw material issue to production hall

## Frontend Patterns

### Data Fetching
- TanStack Query v5 (object form only): `useQuery({ queryKey: ['/api/endpoint'] })`
- Default `queryFn` configured globally in `queryClient.ts` — queries need only `queryKey`
- Hierarchical keys for cache invalidation: `queryKey: ['/api/orders', id]` (not interpolated strings)
- Mutations via `apiRequest(url, { method, body })` from `queryClient.ts`
- Always invalidate cache after mutations: `queryClient.invalidateQueries({ queryKey: [...] })`
- 2-minute staleTime, 10-minute gcTime, max 1 retry for server errors only

### Routing
- `wouter` for client-side routing
- All pages lazy-loaded with `React.lazy()` and `Suspense`
- `ProtectedRoute` component wraps authenticated pages
- Navigation config in `client/src/config/navigationConfig.ts`

### UI Components
- 51 shadcn/ui components in `client/src/components/ui/`
- Icons from `lucide-react`, company logos from `react-icons/si`
- Forms use `react-hook-form` with `zodResolver` for validation
- Toast notifications via `useToast()` from `@/hooks/use-toast`
- RTL layout with Arabic-first design

### State Management
- Server state: TanStack Query
- Auth state: React Context (`use-auth.tsx`)
- Language: React Context (`LanguageContext.tsx`)
- Theme: React Context (`ThemeContext.tsx`)
- No global client state library — all state is server-driven

## Mobile App Integration

- **API Contract**: `attached_assets/MOBILE_APP_API_CONTRACT.md`
- **Auth**: Bearer token via `POST /api/mobile/login`, 30-day expiry
- **Token Store**: In-memory Map in `session-auth.ts` with hourly expired token cleanup
- **CORS**: Allows Expo dev origins, Replit domains, and null Origin (mobile apps)
- **Data Rules**: Decimals returned as STRING. Customer/Machine IDs are STRING. Order status uses `waiting` (not `pending`).
- **Response Format**: Mixed — some endpoints return `{data:[], success}`, others return raw arrays. Mobile app handles both patterns.
- **DO NOT** change field names, data types, or remove fields without updating contract doc.

## PWA Support

- `public/manifest.json` — App metadata, icons, shortcuts
- `public/sw.js` — Service worker (network-first API, cache-first static)
- `public/icons/` — PNG icons 72-512px
- `client/src/components/pwa/InstallPrompt.tsx` — Mobile install banner
- Express routes serve `sw.js`, `manifest.json`, and `/icons/` with correct MIME types

## Mobile Apps

All mobile pages use internal view state instead of sub-routes, gradient headers with distinct colors, and card-based layouts optimized for touch.

| Page | Route | File | Color | Features |
|------|-------|------|-------|----------|
| المستودع | `/warehouse-mobile` | `warehouse-mobile.tsx` | Blue | Barcode scanner (html5-qrcode), inventory, voucher creation, inventory count |
| لوحة الإنتاج | `/production-mobile` | `production-mobile.tsx` | Indigo | Production orders list, progress tracking, rolls detail view |
| لوحتي | `/user-dashboard-mobile` | `user-dashboard-mobile.tsx` | Emerald | Attendance (check-in/out/lunch), working hours, requests, violations |
| إدارة الطلبات | `/orders-mobile` | `orders-mobile.tsx` | Orange | Orders list with status filters, order details, production orders view |

- **Library**: `html5-qrcode` for camera barcode scanning (warehouse only)
- **Translation keys**: `warehouse.mobile.*` and `mobilePages.*` namespaces
- **API calls**: Uses `apiRequest` from `lib/queryClient` for all mutations

## External Service Integrations

| Service | Purpose | Config |
|---------|---------|--------|
| Meta WhatsApp Business API | Production notifications, customer messaging | `server/services/meta-whatsapp.ts` |
| Taqnyat SMS | SMS notifications to workers | `server/services/taqnyat-sms.ts` |
| Twilio WhatsApp | Alternative WhatsApp channel | Via Twilio SDK |
| Adobe PDF Services | Quote/order PDF generation | `server/services/adobe-pdf/` |
| OpenAI | AI factory assistant | Via Replit AI integration |
| Replit Object Storage | File uploads and storage | `server/replit_integrations/object_storage/` |

## Environment Variables

Key environment variables (managed via Replit Secrets):
- `DATABASE_URL` — PostgreSQL connection string
- `SESSION_SECRET` — Express session secret
- `META_WHATSAPP_TOKEN`, `META_WHATSAPP_PHONE_ID` — WhatsApp API credentials
- `TAQNYAT_API_KEY`, `TAQNYAT_SENDER_NAME` — SMS gateway
- `ADOBE_CLIENT_ID`, `ADOBE_CLIENT_SECRET` — PDF service
- `OPENAI_API_KEY` — AI integration (via Replit integration)

## Development Rules

### Files You Must NOT Modify
- `vite.config.ts` — Vite setup with aliases, proxying, all preconfigured
- `server/vite.ts` — Vite dev server integration
- `drizzle.config.ts` — Drizzle migration config
- `package.json` — Use package management tools instead of manual edits

### Coding Conventions
- All user-facing error messages in Arabic
- Password hashing via bcrypt (checked in both `createUser` and `updateUser` in storage.ts)
- Route parameters validated via `parseRouteParam()` or `parseInt()` + NaN check
- Request bodies validated via Zod schemas (from drizzle-zod `createInsertSchema`)
- Database operations wrapped in transactions for multi-table writes
- Frontend imports use `@/` alias for `client/src/` and `@shared/` for `shared/`
- Assets imported via `@assets/` alias

### How to Run
- Workflow `Start application` runs `npm run dev`
- Express serves both API and Vite frontend on port 5000 (also 8000)
- Hot module replacement enabled for frontend development

## User Preferences
- Language: Arabic (RTL) primary, English fallback
- Error messages: Always in Arabic for end users
- Number formatting: Arabic numerals, 2 decimal places for weight, 1-2 for percentages
- Logging: Comprehensive server-side, never log sensitive data (passwords, tokens)
