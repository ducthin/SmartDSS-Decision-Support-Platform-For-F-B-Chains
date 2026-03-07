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
  type: string;
  username: string;
  role: string;
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
  roleId: number;
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
  ingredientId: number;
  quantity: number;
  note: string;
}

// Order
export type OrderStatus = 'PENDING' | 'PREPARING' | 'COMPLETED' | 'CANCELLED';

export interface OrderItem {
  id?: number;
  menuItemId: number;
  menuItemName?: string;
  quantity: number;
  unitPrice?: number;
  subtotal?: number;
}

export interface Order {
  id: number;
  orderItems: OrderItem[];
  totalAmount: number;
  status: OrderStatus;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderForm {
  orderItems: { menuItemId: number; quantity: number }[];
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
  salesItems: SalesItem[];
  totalAmount: number;
  cashierName: string;
  createdAt: string;
}

// Reports
export interface DailySalesReport {
  date: string;
  totalOrders: number;
  totalRevenue: number;
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
