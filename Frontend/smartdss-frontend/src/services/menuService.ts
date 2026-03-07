import api from './api';
import type { ApiResponse, Category, CategoryForm, MenuItem, MenuItemForm, Ingredient, Recipe, RecipeForm, PageResponse } from '@/types';

export const categoryService = {
  getAll: (page = 0, size = 10, keyword?: string) =>
    api.get<ApiResponse<PageResponse<Category>>>('/categories', { params: { page, size, keyword: keyword || undefined } }),
  getAllNoPaging: () => api.get<ApiResponse<Category[]>>('/categories/all'),
  create: (data: CategoryForm) => api.post<ApiResponse<Category>>('/categories', data),
  update: (id: number, data: CategoryForm) => api.put<ApiResponse<Category>>(`/categories/${id}`, data),
  delete: (id: number) => api.delete<ApiResponse<void>>(`/categories/${id}`),
};

export const menuService = {
  getAll: (page = 0, size = 10, keyword?: string, categoryId?: number, available?: boolean) =>
    api.get<ApiResponse<PageResponse<MenuItem>>>('/menu', { params: { page, size, keyword: keyword || undefined, categoryId: categoryId || undefined, available: available ?? undefined } }),
  getAllNoPaging: () => api.get<ApiResponse<MenuItem[]>>('/menu/all'),
  getById: (id: number) => api.get<ApiResponse<MenuItem>>(`/menu/${id}`),
  create: (data: MenuItemForm) => api.post<ApiResponse<MenuItem>>('/menu', data),
  update: (id: number, data: MenuItemForm) => api.put<ApiResponse<MenuItem>>(`/menu/${id}`, data),
  delete: (id: number) => api.delete<ApiResponse<void>>(`/menu/${id}`),
};

export const ingredientService = {
  getAll: () => api.get<ApiResponse<Ingredient[]>>('/ingredients'),
};

export const recipeService = {
  getAll: () => api.get<ApiResponse<Recipe[]>>('/recipes'),
  create: (data: RecipeForm) => api.post<ApiResponse<Recipe>>('/recipes', data),
  update: (id: number, data: RecipeForm) => api.put<ApiResponse<Recipe>>(`/recipes/${id}`, data),
  delete: (id: number) => api.delete<ApiResponse<void>>(`/recipes/${id}`),
};
