You are a senior backend engineer.

Generate a complete backend project using **Spring Boot 3 (Java 17)** for a system called:

SmartDSS – F&B Sales and Management Platform.

This is a **POS and inventory management system for a coffee shop**.

Do NOT include AI or decision support features yet.

Focus only on core business operations:

menu management
orders
sales transactions
inventory management
recipes
reports
user authentication

Follow **clean architecture and layered architecture**.

---

# 1. Technology Stack

Use:

Java 17
Spring Boot 3
Spring Web
Spring Data JPA
Spring Security
JWT Authentication
MySQL
Lombok
MapStruct
Swagger (Springdoc OpenAPI)

---

# 2. Create the Project

Create a Spring Boot Maven project:

project name: smartdss-backend

base package:

com.smartdss

Generate:

Main application class
pom.xml
application.yml

---

# 3. Project Structure

Generate this structure:

src/main/java/com/smartdss

config
security
controller
service
repository
entity
dto
mapper
exception

Example controllers:

AuthController
UserController
MenuController
OrderController
InventoryController
ReportController

Controllers must only handle HTTP requests.

All business logic must be inside the Service layer.

---

# 4. Database Entities

Create JPA entities:

User
Role
Category
MenuItem
Recipe
Ingredient
Inventory
InventoryTransaction
Order
OrderItem
SalesTransaction
SalesItem

Relationships:

User → Role (ManyToOne)

Category → MenuItem (OneToMany)

MenuItem → Recipe (OneToMany)

Ingredient → Recipe (OneToMany)

Order → OrderItem (OneToMany)

SalesTransaction → SalesItem (OneToMany)

Ingredient → Inventory (OneToOne)

Include createdAt and updatedAt fields.

---

# 5. Repositories

Create repositories extending JpaRepository.

Example:

UserRepository
MenuItemRepository
OrderRepository
InventoryRepository
SalesRepository

---

# 6. DTO Layer

Create DTO classes:

UserDTO
MenuItemDTO
OrderDTO
OrderItemDTO
InventoryDTO
SalesDTO

Do not return entities directly in API responses.

---

# 7. Services

Create services:

AuthService
UserService
CategoryService
MenuService
RecipeService
OrderService
InventoryService
SalesService
ReportService

Business rule:

When an order status changes to COMPLETED:

1. Create a sales transaction
2. Deduct ingredients from inventory based on the recipe

Example recipe:

Milk Tea
Tea 50g
Milk 100ml

Order 2 milk tea → deduct:

Tea 100g
Milk 200ml

---

# 8. REST API Endpoints

All endpoints start with:

/api/v1

Authentication:

POST /api/v1/auth/login
GET /api/v1/auth/me

Users:

GET /api/v1/users
POST /api/v1/users
PUT /api/v1/users/{id}
DELETE /api/v1/users/{id}

Categories:

GET /api/v1/categories
POST /api/v1/categories
PUT /api/v1/categories/{id}
DELETE /api/v1/categories/{id}

Menu:

GET /api/v1/menu
GET /api/v1/menu/{id}
POST /api/v1/menu
PUT /api/v1/menu/{id}
DELETE /api/v1/menu/{id}

Recipes:

GET /api/v1/recipes
POST /api/v1/recipes
PUT /api/v1/recipes/{id}
DELETE /api/v1/recipes/{id}

Orders:

POST /api/v1/orders
GET /api/v1/orders
GET /api/v1/orders/{id}
PUT /api/v1/orders/{id}/status

Statuses:

PENDING
PREPARING
COMPLETED
CANCELLED

Sales:

POST /api/v1/sales
GET /api/v1/sales
GET /api/v1/sales/{id}

Inventory:

GET /api/v1/inventory
POST /api/v1/inventory/add
POST /api/v1/inventory/deduct

Reports:

GET /api/v1/reports/daily-sales
GET /api/v1/reports/weekly-sales
GET /api/v1/reports/best-products
GET /api/v1/reports/low-stock

---

# 9. Security

Use Spring Security with JWT.

Roles:

ADMIN
MANAGER
STAFF

Permissions:

ADMIN → manage users

MANAGER → menu + reports

STAFF → orders + sales

---

# 10. API Response Format

All responses must follow this format:

{
"success": true,
"data": {},
"message": "success"
}

Error example:

{
"success": false,
"message": "resource not found"
}

---

# 11. Swagger

Enable Swagger documentation.

Access path:

/swagger-ui.html

---

# 12. Code Quality Rules

Controllers must contain no business logic.

Services contain business logic.

Repositories handle database access.

Follow SOLID principles.

---

# 13. Generate in This Order

Generate files in this order:

1. pom.xml
2. application.yml
3. entities
4. repositories
5. DTOs
6. mappers
7. services
8. controllers
9. security configuration
10. swagger configuration
