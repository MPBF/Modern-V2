# Order Management System for Plastic Bag Manufacturing

## Overview

This project is an advanced order management system for plastic bag manufacturing. Its main purpose is to streamline manufacturing processes, improve decision-making, and provide a robust, user-friendly platform. Key capabilities include comprehensive order and production management, quality control, maintenance tracking, and HR management. The system aims to provide real-time tracking, multilingual interfaces, and efficient data processing to improve overall operational efficiency and decision-making.

## User Preferences

- Language: Arabic (RTL) with English fallback
- Error handling: User-friendly messages in Arabic
- Logging: Comprehensive server-side logging for debugging
- Code style: Consistent TypeScript with proper type safety

## System Architecture

The system is built with a modern stack emphasizing efficiency and scalability, with a strong focus on Arabic RTL design principles.

- **Frontend**: React, TypeScript, Vite, TanStack Query, Tailwind CSS, and shadcn/ui components.
- **Backend**: Node.js and Express.
- **Database**: PostgreSQL (Neon Serverless) managed with Drizzle ORM.
- **UI/UX Decisions**: Prioritizes Arabic RTL design, features a centralized toast notification system, IconWithTooltip for accessibility, and enhanced loading states with skeleton loaders.
- **Technical Implementations**: Includes comprehensive number formatting (Arabic numerals, 2 decimal places for weight, 1-2 decimal precision for percentages), sequential ID generation, and integrated attendance and notification systems. Query optimization utilizes indexed foreign keys, aggregate functions, and grouping. Real-time updates are managed via TanStack Query with 30-second refetch intervals, cache invalidation on mutations, and optimistic updates.
- **Feature Specifications**:
    - Multilingual support (Arabic/English).
    - Real-time order tracking and management.
    - Advanced production order management, including detailed product specifications and notes.
    - **Three-Machine Roll Tracking**: Tracks each roll through film/extruder, printing, and cutting stages.
    - **Material Mixing System**: Formula-based mixing system using size and thickness ranges, and master batch colors. Categorized by machine screw type ('A' or 'ABA'). Ingredients sourced from items table (CAT10 - raw materials).
    - Quality control systems.
    - Maintenance tracking, including spare parts management.
    - HR management with attendance tracking and training programs.
    - **Geolocation-Based Attendance**: Attendance check-in system with GPS verification within factory premises (500m radius) using the Haversine formula. Supports multiple factory locations.
    - Role-based access control (Admin, Production Manager, Film Operator, Printing Operator, Cutting Operator).
    - **Replit Auth Integration**: Dual authentication support (traditional username/password and Replit Auth).
- **System Design Choices**: Features role-based access control, comprehensive order and production management, real-time inventory and warehouse tracking, and integrated quality/maintenance monitoring.
- **Error Handling Strategy**: Implemented with global error boundaries on the frontend, comprehensive error logging and graceful responses on the API, transaction safety and connection resilience for the database, and intelligent retry with exponential backoff for network operations. Detailed Arabic error messages are provided for specific scenarios.
- **System Integration**:
    1.  **Warehouse**: `inventory`, `inventory_movements`, `items` tables.
    2.  **Orders**: `orders` linked to `production_orders`.
    3.  **Production**: `production_orders` linked to `rolls` and `warehouse_receipts`, managing a three-stage workflow (Film → Printing → Cutting → Warehouse).
    4.  **Material Mixing**: `mixing_formulas`, `formula_ingredients`, `mixing_batches`, `batch_ingredients`. Includes an `Inventory Consumption API` for automatic stock deduction.
    All sections maintain referential integrity via foreign keys, real-time cache invalidation, and transaction-safe operations.

## Recent Changes

### Roles & Permissions System Hardening (March 11, 2026)
- **Backend middleware fix**: `requireAdmin` and `requirePermission` now check `permissions` array for `'admin'` instead of checking role name string — consistent with frontend behavior
- **Admin compatibility**: Session population (`session-auth.ts`) auto-injects `'admin'` permission for role_id 1 or role named 'admin', preventing lockouts for legacy admin roles
- **Backend route enforcement**: Added `requirePermission(...)` to ~60 write/delete API routes across all modules:
  - Orders: `manage_orders` for POST/PUT customers and POST orders
  - Production: `manage_production` for POST production orders (single + batch)
  - Quality: `manage_quality` for all quality issue CRUD, responsibles, actions
  - Maintenance: `manage_maintenance` for requests, actions, reports, spare parts, consumable parts
  - Warehouse: `manage_warehouse` for items, inventory, inventory movements, warehouse transactions, suppliers
  - HR: `manage_hr` for training programs, materials, enrollments, evaluations, performance reviews, leave requests
  - Definitions: `manage_definitions` for machines CRUD
  - Users: `manage_users` for user CRUD
- **Route permissions**: Added `/factory-floor` to `ROUTE_PERMISSIONS` in `shared/permissions.ts`
- **Frontend sidebar filtering**: Already uses `canAccessRoute()` → `ROUTE_PERMISSIONS` to show/hide menu items per user permissions

### Quality Management System (March 11, 2026)
- **New tables**: `quality_issues`, `quality_issue_responsibles`, `quality_issue_actions`
- **Quality Issues**: Track production problems from inspections, customer complaints, or internal reports
  - Source types: inspection, customer_complaint, internal_report
  - Categories: film_error, printing_error, cutting_error, color_mismatch, size_error, material_defect, contamination, packaging_error, weight_error, other
  - Severity levels: low, medium, high, critical
  - Status flow: open → investigating → resolved → closed
  - Links to orders, production orders, rolls, and customers
- **Responsibles**: Track workers responsible for each issue by department, with penalty types and action taken
- **Actions**: Track corrective, preventive, customer compensation, investigation, follow-up, and rework actions
- **Frontend**: Full quality management page at `/quality` with issue listing, creation dialog, detail view with tabs (details, responsibles, actions, customer), filters, and analytics dashboard
- **API endpoints**: GET/POST/PATCH quality issues, POST/PATCH/DELETE responsibles, POST/PATCH actions, GET stats

### Warehouse Quantity Tracking & Validation (March 10, 2026)

**Production Order → Warehouse Receipt Flow:**
- Added `warehouse_received_kg` column to `production_orders` to track received quantities
- When creating a finished goods receipt (FP-Rec), the system validates:
  - The quantity does not exceed the remaining amount on the production order
  - Once fully received, the production order disappears from the receipt dropdown
- Receipt and delivery operations run inside database transactions for data integrity
- Finished goods receipts automatically update inventory stock
- Finished goods deliveries validate against available stock before allowing deduction
- API endpoint: `GET /api/warehouse/production-orders-for-receipt` returns orders with remaining quantities

### Warehouse Module Reorganization - 4-Voucher System (March 10, 2026)

**Voucher Types:**
- `FP-Rec.XXXX` - Finished goods receipt from production hall (سند استلام مواد تامة من صالة الإنتاج)
- `FP-Del.XXXX` - Finished goods delivery to customer (سند تسليم مواد تامة للعميل)
- `RM-Rec.XXXX` - Raw material receipt from supplier (سند استلام مواد خام من المورد)
- `RM-Del.XXXX` - Raw material issue to production hall (سند إخراج مواد خام لصالة الإنتاج)

**Workflow:**
1. After cutting, quantities appear cumulatively in Production Hall → Warehouse keeper verifies and receives (partial or full) → Creates FP-Rec voucher → Enters finished goods warehouse
2. For customer delivery → Creates FP-Del voucher → Exits finished goods warehouse
3. When receiving from supplier → Creates RM-Rec voucher → Enters raw materials warehouse
4. When needed for production → Creates RM-Del voucher → Exits to production hall

**UI Structure (5 tabs):**
- Production Hall (صالة الإنتاج) - Shows completed cutting quantities for receipt
- Finished Goods Warehouse (مستودع المواد التامة) - FP-Rec and FP-Del vouchers
- Raw Materials Warehouse (مستودع المواد الخام) - RM-Rec and RM-Del vouchers
- Definitions (التعريفات) - Items, suppliers, units
- Reports (التقارير) - Movement and balance reports

**Files Modified:**
- `shared/schema.ts` - Updated voucher table comments for new numbering format
- `server/storage.ts` - Updated `getNextVoucherNumber()` for new prefixes, `getWarehouseVouchersStats()` returns per-type counts
- `server/routes.ts` - Updated voucher routes for new prefix types
- `client/src/pages/warehouse.tsx` - Complete rebuild with 5-tab layout, production hall receipt system
- `client/src/components/warehouse/VoucherForm.tsx` - Auto-generates correct voucher numbers
- `client/src/i18n/locales/ar.json` - Updated warehouse translations for new voucher system
- `client/src/i18n/locales/en.json` - Updated warehouse translations for new voucher system

**API Endpoints:**
- `GET /api/warehouse/vouchers/next-number/:type` - Accepts FP-Rec, FP-Del, RM-Rec, RM-Del prefixes
- `POST /api/warehouse/vouchers/finished-goods-in` - Creates FP-Rec voucher from production hall
- `GET /api/warehouse/vouchers/stats` - Returns counts per voucher type (rm_in, rm_out, fp_in, fp_out)

### Customizable Role-Based Dashboard (March 8, 2026)

**Dashboard Configuration API:**
- GET/PUT `/api/dashboard/config` endpoints for per-user widget configuration
- Stored in `user_settings` table (setting_key: `dashboard_config`, setting_type: `json`)
- Server-side validation against known widget IDs
- Role-based default widget sets (admin, production, HR, warehouse, sales, default)

**Widget Registry:**
- `client/src/lib/dashboard-widgets.ts` - Central registry of all dashboard widgets with metadata
- Maps widget IDs to display names (EN/AR), categories, required permissions, and default sizes
- Role category detection via `getRoleCategoryFromPermissions()`

**New Widget Components** (`client/src/components/dashboard/widgets/`):
- `InventoryWidget` - Warehouse stock summary with low-stock alerts
- `QuotesWidget` - Recent quotes and status breakdown
- `AttendanceWidget` - Today's attendance overview with progress bar
- `RecentOrdersWidget` - Latest orders list with status badges
- `ProductionProgressWidget` - Active production progress bars
- `MaintenanceWidget` - Pending maintenance alerts with priority badges

**Dashboard Customizer:**
- `client/src/components/dashboard/DashboardCustomizer.tsx` - Dialog for adding/removing/reordering widgets
- Toggle switches per widget, organized by category
- Up/down reorder controls for active widgets
- Reset to role defaults button
- Persists config to server via PUT API

**PageLayout Enhancement:**
- Added optional `actions` prop to `PageLayout` component for header-level action buttons

### Adobe PDF Generation Service (March 7, 2026)

**Integration:**
- Installed `@adobe/pdfservices-node-sdk` (v4.1.0) for Adobe Document Generation API
- Created PDF service module at `server/services/adobe-pdf/pdf-service.ts`
- Templates directory: `server/services/adobe-pdf/templates/` (place .docx templates here)

**Arabic Quote Template (Document Merge):**
- AI agent's `generate_quote_pdf` tool now uses Adobe Document Merge API with Arabic Word template (`quote-template-ar.docx`)
- Template created programmatically via `server/services/adobe-pdf/create-template.ts` using the `docx` library
- Supports up to 10 items per quote with fields like `item_N_name`, `item_N_quantity`, `item_N_unit_price`, `item_N_total`, etc.
- Includes company logo, customer info, items table, totals with VAT, notes, terms, and dual signature blocks
- Falls back to PDFKit (`server/pdf-generator.ts`) if Adobe credentials are unavailable or fails
- Uses manual XML merge approach: replaces `{{tag}}` placeholders directly in DOCX XML via JSZip, then converts to PDF using Adobe CreatePDF API (not Document Merge, which has table-cell merge limitations with `docx` library templates)
- The main function `generateQuotePdfWithAdobe()` in `server/adobe-pdf-service.ts` handles the flow
- Helper `mergeTemplateData()` does the XML tag replacement, `buildTemplateData()` converts quote DB records to template fields

**Environment Variables:**
- `ADOBE_CLIENT_ID` - Adobe API Key
- `ADOBE_CLIENT_SECRET` - Adobe Client Secret (stored as secret)
- `ADOBE_ORGANIZATION_ID` - Adobe Organization ID

**API Endpoints:**
- `POST /api/pdf/generate` - Generate PDF/DOCX from template + JSON data
  - Body: `{ templateName, jsonData, outputFormat: "pdf"|"docx" }`
- `GET /api/pdf/status` - Check if Adobe PDF service is configured
- `GET /api/pdf/templates` - List available .docx templates

**Usage:** Place Word (.docx) templates with merge fields in the templates directory. Send JSON data matching the template fields to generate PDFs.

### Password Hashing Fix (March 7, 2026)
- Fixed `createUser` and `updateUser` in `server/storage.ts` to hash passwords with bcrypt before storing
- Previously passwords were stored as plaintext, causing login failures for newly created users
- Uses `bcrypt.getRounds()` to detect already-hashed passwords and avoid double-hashing

### Dark Mode Toggle Feature (March 7, 2026)

**Implementation:**
- Added `ThemeProvider` context (`client/src/contexts/ThemeContext.tsx`) managing theme state with `localStorage` persistence (`mpbf_theme` key)
- Theme toggle button (Moon/Sun icon) added to Header for quick access
- Dark mode toggle also available in MobileShell drawer menu
- UserProfile dark mode switch now immediately applies theme via ThemeContext
- Server-synced theme settings applied on load via `applyTheme` in UserProfile useEffect

**Files Added:**
- `client/src/contexts/ThemeContext.tsx` - Theme state management with `useTheme` hook

**Files Modified:**
- `client/src/main.tsx` - Wrapped app with `ThemeProvider`
- `client/src/components/layout/Header.tsx` - Added dark mode toggle button + dark: CSS variants
- `client/src/components/layout/Sidebar.tsx` - Added dark: CSS variants
- `client/src/components/layout/MobileShell.tsx` - Added theme toggle in drawer
- `client/src/components/dashboard/UserProfile.tsx` - Connected switch to ThemeContext
- `client/src/index.css` - Added dark: variants for nav-item, tables, dashboard-card, sidebar, mobile-nav, modals, forms, AI chat
- `client/index.html` - Dark mode styles for initial loading screen, removed hardcoded background on loader

**Technical Details:**
- Uses `darkMode: ["class"]` in Tailwind config (already existed)
- CSS variables for dark theme defined in `.dark` block in `index.css` (already existed)
- `index.html` script detects stored theme on page load to prevent flicker
- Theme persisted to `localStorage` under key `mpbf_theme`

### AI Agent Major Enhancement (February 25, 2026)

**New Tools Added to AI Agent (server/ai-agent-routes.ts):**
- `get_customers_list` - Full customers list with filters
- `get_users_info` - Query users/employees by name or role
- `get_machines_status` - Machine status with maintenance requests (extruder/printer/cutter)
- `get_inventory_status` - Inventory levels with join to items table, low stock filter
- `calculate_bag_quantity` - Smart calculation: bags count from dimensions/weight or weight from bag count using density formulas (HDPE=0.95, LDPE=0.92, LLDPE=0.93, PP=0.91)
- `calculate_printing_costs` - Cliché/plate printing costs based on colors, dimensions, and quantity
- `send_quote_email` - Send quote PDF via email using Nodemailer (SMTP_HOST, SMTP_USER, SMTP_PASS env vars needed)

**System Prompt Updated:** Full awareness of all system entities (customers, users, machines, inventory)

**UI Improvements (client/src/pages/ai-agent.tsx):**
- Clickable quick suggestion buttons (6 shortcuts) on welcome screen
- Message timestamps shown on hover
- Scroll-to-bottom floating button
- Improved message bubbles with better shadows and styling
- Better mobile responsive input area
- Improved quotes history with inline status badges
- Professional recording indicator

**Dependencies added:** nodemailer, @types/nodemailer



### Internationalization (i18n) - English Language Support (January 5, 2026)

**Implementation:**
- Added full English language support using react-i18next
- Users can switch between Arabic and English via language switcher in Header and Mobile menu
- RTL/LTR direction switches automatically based on language selection
- Language preference persisted to localStorage

**Files Added:**
- `client/src/i18n/config.ts` - i18n initialization with language detection
- `client/src/i18n/locales/ar.json` - Arabic translations
- `client/src/i18n/locales/en.json` - English translations
- `client/src/contexts/LanguageContext.tsx` - Language state management and RTL/LTR switching
- `client/src/components/ui/LanguageSwitcher.tsx` - Language toggle component (dropdown/button variants)

**Updated Components:**
- `main.tsx` - Added LanguageProvider wrapper
- `Header.tsx` - Added language switcher dropdown
- `MobileShell.tsx` - Added language switcher and localized navigation labels
- `Sidebar.tsx` - Uses localized navigation names
- `navigationConfig.ts` - Added `name_en` field and `getLocalizedName` helper

**Pages with i18n Support:**
- All pages now use `useTranslation` hook for full bilingual support
- Core pages: Orders, Dashboard, Warehouse, HR, Quality, Maintenance
- Production pages: ProductionDashboard, ProductionOrdersManagement, ProductionQueues, ProductionReports
- Operator dashboards: FilmOperatorDashboard, PrintingOperatorDashboard, CuttingOperatorDashboard
- System pages: SystemHealth, AlertsCenter, RollSearch
- Tools & Definitions: ToolsPage, Definitions, MaterialMixing, ProductionMonitoring
- WhatsApp pages: All 5 WhatsApp setup/troubleshoot/template pages
- Other pages: Login, Settings, Notifications, UserDashboard, NotFound

**Translation Keys Structure:**
- `common.*` - Shared UI text (buttons, labels, actions)
- `navigation.*` - Menu and navigation items
- `auth.*` - Login and authentication messages
- `orders.*` - Order management
- `production.*` - Production dashboards, orders, queues, reports
- `operators.*` - Operator-specific dashboards (film, printing, cutting)
- `system.*` - System health, alerts, roll search
- `tools.*`, `definitions.*`, `mixing.*`, `monitoring.*` - Tools and settings
- `whatsapp.*` - WhatsApp integration setup and troubleshooting
- `settings.*`, `notifications.*`, `userDashboard.*`, `errors.*` - Other pages

### Enhanced Attendance & Location Verification System (December 6, 2025)

**Security Improvements:**
- **GPS Accuracy Verification**: System now validates GPS accuracy before allowing attendance check-in
  - Maximum allowed accuracy: 100 meters
  - Rejects low-accuracy readings with user-friendly Arabic error messages
  - Logs accuracy warnings for monitoring
- **Mock Location Detection**: Detects attempts to fake GPS location
  - Records violations in `violations` table with severity level
  - Blocks check-in and logs detailed device information
- **Timestamp Freshness Check**: Ensures location data is recent (within 5 minutes)
- **Device Information Logging**: Records IP address, User-Agent, and timezone for audit trails

**Technical Implementation:**
- Backend (`server/routes.ts` POST `/api/attendance`):
  - Validates accuracy, coordinates, and timestamp
  - Handles undefined accuracy gracefully
  - Stores `location_accuracy`, `device_info`, `distance_from_factory` in attendance records
- Frontend (`client/src/pages/user-dashboard.tsx`):
  - Sends enhanced location data (accuracy, timestamp)
  - Client-side validation before API call
  - Shows accuracy status (high/medium/low) with badges

**User Experience:**
- Clear Arabic error messages for each validation failure
- Real-time GPS accuracy display with color-coded badges
- Refresh location button for users to get better readings
- Warnings when GPS accuracy is low

### Unified Mobile & Desktop Navigation System (November 19, 2025)

**Architecture Overhaul:**
- Created centralized navigation configuration system with role-based access control
- Implemented unified `PageLayout` component that replaced legacy Header/Sidebar/MobileNav pattern across 30+ pages
- Built responsive `MobileShell` component with dual navigation:
  - **Quick Actions Bar**: Bottom bar with 4 high-priority items (priority ≤ 4)
  - **Hamburger Drawer**: Full navigation menu grouped by categories with role-based filtering

**Components:**
- `navigationConfig.ts`: Single source of truth for all routes with role permissions, priorities, and grouping
- `PageLayout.tsx`: Wrapper component that embeds Header, Sidebar, and MobileShell automatically
- `MobileShell.tsx`: Mobile-first navigation with Sheet drawer and fixed bottom actions bar
- Updated `Sidebar.tsx` to consume navigationConfig for consistency

**Migration Details:**
- Migrated 30+ pages from old pattern: `<div><Header/><Sidebar/><MobileNav/><main>...</main></div></div>`
- To new pattern: `<PageLayout title="..." description="...">...</PageLayout>`
- Eliminated duplicate navigation logic across components
- Ensured consistent padding (pb-24) for mobile navigation clearance
- Operator dashboards support `hideLayout` prop for embedding in tabs

**Benefits:**
- Single, consistent navigation experience across all devices
- Role-based filtering applied uniformly
- Reduced code duplication and maintenance overhead
- Improved mobile user experience with quick access to priority features
- Easier to add new pages (just update navigationConfig.ts)

**Technical Notes:**
- All navigation filtering uses `canAccessRoute()` helper for permission checks
- MobileShell groups routes by category (أوامر الإنتاج, الإنتاج, الجودة والصيانة, etc.)
- PageLayout provides consistent structure without nested div complexity
- User confirmed mobile experience works correctly

### Film Production Auto-Completion & Order Progress Indicators (November 19, 2025)

**Film Production Auto-Completion:**
- Enhanced `createRollWithTiming` in `server/storage.ts` to auto-complete production orders when:
  1. Total produced quantity (`produced_quantity_kg`) reaches or exceeds final quantity (`final_quantity_kg`), OR
  2. Last roll is explicitly marked (`is_last_roll = true`)
- On auto-completion, system automatically:
  - Sets `film_completed = true`, `is_final_roll_created = true`, `status = "completed"`
  - Calculates and stores total production time (`production_time_minutes`)
  - Records production end time (`production_end_time`)
  - Sets `film_completion_percentage = 100`

**Order Management Progress Indicators:**
- Fixed progress calculation in `OrdersTable.tsx` to show accurate stage-based completion percentages:
  - **Film Stage**: `(produced_quantity_kg ÷ quantity_kg) × 100` - Reflects actual roll production
  - **Printing Stage**: `(printed_quantity_kg ÷ quantity_kg) × 100` - Reflects rolls that completed printing
  - **Cutting Stage**: `(net_quantity_kg ÷ quantity_kg) × 100` - Reflects final cut and packaged quantity
- Each indicator now independently tracks its respective production stage
- Uses weighted average when order has multiple production orders

**Technical Implementation:**
- Progress indicators use actual stage quantities from `production_orders` table:
  - `produced_quantity_kg`: Total weight of all created rolls
  - `printed_quantity_kg`: Total weight of rolls that completed printing
  - `net_quantity_kg`: Total net weight after cutting (excluding waste)
- Base comparison quantity: `quantity_kg` (ordered quantity from customer)

### Production Monitoring Dashboard Enhancement (November 18, 2025)

**Major Updates:**
- **New Backend APIs**: Added 5 section-specific endpoints for production monitoring:
  - `GET /api/production/stats-by-section/:section` - Section-wide production statistics
  - `GET /api/production/users-performance/:section` - User performance metrics by section
  - `GET /api/production/machines-production/:section` - Machine production data by section
  - `GET /api/production/rolls-tracking/:section` - Roll tracking and search by section
  - `GET /api/production/orders-tracking/:section` - Production order tracking by section

**Storage Layer:**
- Added 5 new methods to `IStorage` interface and `DatabaseStorage` class
- Implemented section mapping (`film` → `SEC03`, `printing` → `SEC04`, `cutting` → `SEC05`)
- Handled schema inconsistency between `sections.id` (varchar) and `users.section_id` (integer)
- All queries filter by production department users (role_id = 2) and specific sections

**Technical Notes:**
- Section filtering uses mapped section IDs to handle varchar/integer mismatch
- Queries join rolls → machines → sections for proper section-based filtering
- Default date range: last 7 days if not specified
- Search functionality supports roll numbers, production order numbers, and customer names

**Future Considerations:**
- Schema migration recommended to standardize all `section_id` references to `varchar(20)`
- Would eliminate casting and improve query performance
- See architect review for detailed migration plan

## External Dependencies

- **Database**: PostgreSQL (Neon Serverless)
- **Messaging**: Twilio (for WhatsApp notifications)