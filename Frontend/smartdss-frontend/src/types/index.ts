// API Response wrapper
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

// Paginated response
export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

// Auth
export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  tokenType: string;
  user: User;
}

// User
export interface User {
  id: number;
  username: string;
  fullName: string;
  email: string;
  phone: string;
  active: boolean;
  roleName: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserForm {
  username: string;
  password?: string;
  fullName: string;
  email: string;
  phone: string;
  active: boolean;
  roleName: string;
}

// Category
export interface Category {
  id: number;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryForm {
  name: string;
  description: string;
}

// Drink options (when menu item is a beverage)
export interface DrinkSizeOption {
  code: string;
  label: string;
  priceExtra: number;
}

export interface DrinkToppingOption {
  code: string;
  label: string;
  price: number;
}

// Menu Item
export interface MenuItem {
  id: number;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  available: boolean;
  categoryId: number;
  categoryName: string;
  /** When true, orders must include selectedSizeCode; toppings optional. */
  drink?: boolean;
  drinkSizes?: DrinkSizeOption[];
  drinkToppings?: DrinkToppingOption[];
  /** Nhãn “Món mới” trên menu */
  badgeNew?: boolean;
  /** Nhãn “Best seller” */
  badgeBestSeller?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MenuItemForm {
  name: string;
  description: string;
  price: number;
  imageUrl?: string;
  available: boolean;
  categoryId: number;
  drink?: boolean;
  drinkSizes?: DrinkSizeOption[];
  drinkToppings?: DrinkToppingOption[];
  badgeNew?: boolean;
  badgeBestSeller?: boolean;
}

// Ingredient
export interface Ingredient {
  id: number;
  name: string;
  unit: string;
  createdAt: string;
  updatedAt: string;
}

// Recipe
export interface Recipe {
  id: number;
  menuItemId: number;
  menuItemName: string;
  ingredientId: number;
  ingredientName: string;
  ingredientUnit?: string;
  quantity: number;
  createdAt: string;
  updatedAt: string;
}

export interface RecipeForm {
  menuItemId: number;
  ingredientId: number;
  quantity: number;
}

// Inventory
export interface Inventory {
  id: number;
  ingredientId: number;
  ingredientName: string;
  quantity: number;
  minimumStock: number;
  unit: string;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryTransactionForm {
  inventoryId: number;
  quantity: number;
  reason: string;
}

export interface InventoryTransactionHistory {
  id: number;
  type: 'ADD' | 'DEDUCT';
  quantity: number;
  reason?: string;
  createdAt: string;
}

export interface InventoryItemForm {
  ingredientName: string;
  unit: string;
  quantity: number;
  minimumStock: number;
}

// Order
export type OrderStatus = 'PENDING' | 'PREPARING' | 'COMPLETED' | 'CANCELLED';

export interface OrderToppingLine {
  code: string;
  label: string;
  price: number;
}

export interface OrderItem {
  id?: number;
  menuItemId: number;
  menuItemName?: string;
  quantity: number;
  unitPrice?: number;
  subtotal?: number;
  selectedSizeCode?: string;
  selectedSizeLabel?: string;
  /** Response only — snapshot of toppings on the line */
  selectedToppings?: OrderToppingLine[];
}

export interface Order {
  id: number;
  orderItems: OrderItem[];
  totalAmount: number;
  status: OrderStatus;
  tableNumber?: string;
  /** Đơn QR: khớp với phiên trình duyệt */
  qrClientSessionId?: string | null;
  createdByName: string;
  createdAt: string;
  note?: string;
  updatedAt: string;
}

export interface OrderLineRequest {
  menuItemId: number;
  quantity: number;
  selectedSizeCode?: string;
  selectedToppingCodes?: string[];
}

export interface OrderForm {
  orderItems: OrderLineRequest[];
}

// Dining Table
export interface DiningTable {
  id: number;
  name: string;
  qrToken: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DiningTableForm {
  name: string;
  active: boolean;
}

// QR Order
export interface QrOrderForm {
  clientSessionId: string;
  note?: string;
  orderItems: OrderLineRequest[];
}

// Staff Call (from QR)
export interface StaffCall {
  id: number;
  tableName: string;
  message?: string;
  createdAt: string;
}

export interface QrStaffCallForm {
  message?: string;
}

// Customer Feedback
export type FeedbackStatus = 'NEW' | 'IN_REVIEW' | 'RESOLVED';

export interface QrFeedbackForm {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  rating: number;
  content: string;
  images?: File[];
}

export interface CustomerFeedback {
  id: number;
  tableName: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  rating: number;
  content: string;
  imageUrl?: string;
  imageUrls?: string[];
  status: FeedbackStatus;
  internalNote?: string;
  createdAt: string;
}

export interface FeedbackStats {
  total: number;
  newCount: number;
  inReviewCount: number;
  resolvedCount: number;
  lowRatingCount: number;
  todayCount: number;
  averageRating: number;
}

export type FeedbackAlertLevel = 'HIGH' | 'CRITICAL';

export interface FeedbackAlert {
  feedbackId: number;
  tableName: string;
  customerName: string;
  rating: number;
  content: string;
  level: FeedbackAlertLevel;
  lowRatingCountInWindow: number;
  windowMinutes: number;
  createdAt: string;
}

// Sales
export interface SalesItem {
  id: number;
  menuItemName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface Sales {
  id: number;
  orderId: number;
  netAmount: number;
  vatRate: number;
  vatAmount: number;
  salesItems: SalesItem[];
  totalAmount: number;
  cashierName: string;
  createdAt: string;
}

export interface TaxPolicy {
  vatRatePercent: number;
  priceIncludesVat: boolean;
}

// Settings
export interface StoreLocation {
  latitude: number | null;
  longitude: number | null;
  address: string | null;
}

export interface StoreLocationUpdate {
  latitude: number | null;
  longitude: number | null;
  address: string | null;
}

export type PaymentState = 'PENDING' | 'PAID';
export type PaymentMethod = 'PENDING' | 'CASH' | 'QR';

export interface PaymentStatus {
  orderId: number;
  status: PaymentState;
  paymentMethod: PaymentMethod;
}

export interface PaymentInit {
  orderId: number;
  amount: number;
  transferContent: string;
  qrImageUrl: string;
  qrCode?: string;
  checkoutUrl?: string;
  provider?: 'PAYOS' | 'VIETQR';
  expiresAt: string;
  paymentStatus: PaymentStatus;
}

// Reports
export interface DailySalesReport {
  date: string;
  totalOrders: number;
  totalRevenue: number;
}

export interface TaxReportItem {
  date: string;
  totalOrders: number;
  netAmount: number;
  vatAmount: number;
  totalAmount: number;
}

export interface TaxReportResponse {
  summary: TaxReportItem;
  items: TaxReportItem[];
}

export interface BestProduct {
  menuItemName: string;
  totalQuantitySold: number;
  totalRevenue: number;
}

export interface LowStockItem {
  ingredientName: string;
  currentQuantity: number;
  minimumStock: number;
  unit: string;
}

// Weather
export interface WeatherData {
  id: number;
  recordDate: string;
  temperature: number;
  feelsLike: number;
  humidity: number;
  condition: string;
  description: string;
  icon: string;
  windSpeed: number;
  rainfall: number;
  city: string;
  createdAt: string;
}

// Event
export type EventType = 'FESTIVAL' | 'HOLIDAY' | 'CONCERT' | 'SPORT' | 'PROMOTION' | 'CONFERENCE' | 'OTHER';
export type ImpactLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface Event {
  id: number;
  name: string;
  description: string;
  eventType: EventType;
  startDate: string;
  endDate: string;
  location: string;
  expectedImpact: ImpactLevel;
  notes: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EventForm {
  name: string;
  description: string;
  eventType: EventType;
  startDate: string;
  endDate: string;
  location: string;
  expectedImpact: ImpactLevel;
  notes: string;
  active: boolean;
}

// Holiday Calendar
export type HolidayType = 'PUBLIC_HOLIDAY' | 'CULTURAL' | 'RELIGIOUS' | 'SCHOOL' | 'COMPANY' | 'OTHER';

export interface HolidayCalendar {
  id: number;
  name: string;
  holidayDate: string;
  holidayType: HolidayType;
  recurring: boolean;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface HolidayCalendarForm {
  name: string;
  holidayDate: string;
  holidayType: HolidayType;
  recurring: boolean;
  description: string;
}

export type AreaBusynessLevel = 'IT_DONG' | 'TRUNG_BINH' | 'DONG_DUC';
export type AreaBusynessSourceType = 'REALTIME' | 'CACHE' | 'FALLBACK';

export interface AreaBusyness {
  level: AreaBusynessLevel;
  score: number;
  poiCount: number;
  foodCount: number;
  transitCount: number;
  commerceCount: number;
  educationCount: number;
  latitude: number;
  longitude: number;
  address?: string;
  recommendation: string;
  source: string;
  sourceType?: AreaBusynessSourceType;
  analyzedAt: string;
}

/** So sánh tùy chọn với OpenAI (khi gọi API kèm compareLlm=true) */
export interface LlmComparison {
  status: 'ok' | 'skipped' | 'error';
  model?: string;
  comment_vi?: string;
  rough_revenue_vnd?: number | null;
  rough_orders?: number | null;
  vs_ml?: string;
  detail?: string;
}

// AI Prediction (DSS Thông minh - Hỗ trợ Ra Quyết định)
export interface AIPrediction {
  predicted_revenue: number;
  predicted_orders: number;
  predicted_inventory_demand: Record<string, number>;
  confidence_score: number;
  message: string;
  llm_comparison?: LlmComparison | null;
  /** Giờ chạy phân tích (server, app.timezone) */
  analysis_at_local?: string;
  /** full_day_ml | eod_adjusted */
  prediction_kind?: string;
  /** 0–1 tiến độ ngày ước (cùng ngày) */
  day_progress_fraction?: number | null;
  actual_revenue_so_far?: number | null;
  actual_orders_so_far?: number | null;
  ml_baseline_revenue?: number | null;
  ml_baseline_orders?: number | null;
}
