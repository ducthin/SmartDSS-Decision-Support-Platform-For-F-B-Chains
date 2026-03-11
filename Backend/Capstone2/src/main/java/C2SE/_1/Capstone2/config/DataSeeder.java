package C2SE._1.Capstone2.config;

import C2SE._1.Capstone2.entity.*;
import C2SE._1.Capstone2.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataSeeder implements CommandLineRunner {

    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    private final CategoryRepository categoryRepository;
    private final MenuItemRepository menuItemRepository;
    private final IngredientRepository ingredientRepository;
    private final RecipeRepository recipeRepository;
    private final InventoryRepository inventoryRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        seedRoles();
        seedUsers();
        seedCategories();
        seedIngredients();
        seedMenuItemsAndRecipes();
    }

    private void seedRoles() {
        for (RoleName roleName : RoleName.values()) {
            if (roleRepository.findByName(roleName).isEmpty()) {
                Role role = Role.builder()
                        .name(roleName)
                        .description(roleName.name() + " role")
                        .build();
                roleRepository.save(role);
                log.info("Created role: {}", roleName);
            }
        }
    }

    private void seedUsers() {
        if (!userRepository.existsByUsername("admin")) {
            Role adminRole = roleRepository.findByName(RoleName.ADMIN)
                    .orElseThrow(() -> new RuntimeException("ADMIN role not found"));

            User admin = User.builder()
                    .username("admin")
                    .password(passwordEncoder.encode("admin123"))
                    .fullName("Administrator")
                    .email("admin@smartdss.com")
                    .phone("0901234567")
                    .active(true)
                    .role(adminRole)
                    .build();
            userRepository.save(admin);
            log.info("Created admin user: admin / admin123");
        }

        if (!userRepository.existsByUsername("manager")) {
            Role managerRole = roleRepository.findByName(RoleName.MANAGER)
                    .orElseThrow(() -> new RuntimeException("MANAGER role not found"));

            User manager = User.builder()
                    .username("manager")
                    .password(passwordEncoder.encode("manager123"))
                    .fullName("Store Manager")
                    .email("manager@smartdss.com")
                    .phone("0901234568")
                    .active(true)
                    .role(managerRole)
                    .build();
            userRepository.save(manager);
            log.info("Created manager user: manager / manager123");
        }

        if (!userRepository.existsByUsername("staff")) {
            Role staffRole = roleRepository.findByName(RoleName.STAFF)
                    .orElseThrow(() -> new RuntimeException("STAFF role not found"));

            User staff = User.builder()
                    .username("staff")
                    .password(passwordEncoder.encode("staff123"))
                    .fullName("Staff Member")
                    .email("staff@smartdss.com")
                    .phone("0901234569")
                    .active(true)
                    .role(staffRole)
                    .build();
            userRepository.save(staff);
            log.info("Created staff user: staff / staff123");
        }
    }

    private void seedCategories() {
        createCategoryIfNotExists("Cà phê", "Các loại cà phê");
        createCategoryIfNotExists("Trà", "Các loại trà");
        createCategoryIfNotExists("Sinh tố", "Các loại sinh tố trái cây");
        createCategoryIfNotExists("Nước ép", "Các loại nước ép tươi");
        createCategoryIfNotExists("Bánh ngọt", "Các loại bánh ngọt");
    }

    private Category createCategoryIfNotExists(String name, String description) {
        return categoryRepository.findByName(name).orElseGet(() -> {
            Category category = Category.builder().name(name).description(description).build();
            categoryRepository.save(category);
            log.info("Created category: {}", name);
            return category;
        });
    }

    private void seedIngredients() {
        // Coffee ingredients
        createIngredientWithInventory("Cà phê xay", "g", 5000);
        createIngredientWithInventory("Sữa tươi", "ml", 10000);
        createIngredientWithInventory("Sữa đặc", "ml", 5000);
        createIngredientWithInventory("Đường", "g", 5000);
        createIngredientWithInventory("Đá viên", "g", 20000);

        // Tea ingredients
        createIngredientWithInventory("Trà đen", "g", 3000);
        createIngredientWithInventory("Trà xanh", "g", 3000);
        createIngredientWithInventory("Trà oolong", "g", 2000);

        // Fruit ingredients
        createIngredientWithInventory("Bơ", "g", 5000);
        createIngredientWithInventory("Xoài", "g", 5000);
        createIngredientWithInventory("Dâu tây", "g", 3000);
        createIngredientWithInventory("Cam", "g", 5000);

        // Others
        createIngredientWithInventory("Kem whip", "ml", 3000);
        createIngredientWithInventory("Bột cacao", "g", 2000);
        createIngredientWithInventory("Siro caramel", "ml", 2000);
        createIngredientWithInventory("Trân châu", "g", 3000);
    }

    private void createIngredientWithInventory(String name, String unit, double initialQty) {
        if (!ingredientRepository.existsByName(name)) {
            Ingredient ingredient = Ingredient.builder().name(name).unit(unit).build();
            ingredientRepository.save(ingredient);

            Inventory inventory = Inventory.builder()
                    .ingredient(ingredient)
                    .quantity(BigDecimal.valueOf(initialQty))
                    .minimumStock(BigDecimal.valueOf(500))
                    .build();
            inventoryRepository.save(inventory);
            log.info("Created ingredient: {} ({}) - stock: {}", name, unit, initialQty);
        }
    }

    private void seedMenuItemsAndRecipes() {
        if (menuItemRepository.count() > 0)
            return;

        Category coffee = categoryRepository.findByName("Cà phê").orElseThrow();
        Category tea = categoryRepository.findByName("Trà").orElseThrow();
        Category smoothie = categoryRepository.findByName("Sinh tố").orElseThrow();
        Category juice = categoryRepository.findByName("Nước ép").orElseThrow();
        Category pastry = categoryRepository.findByName("Bánh ngọt").orElseThrow();

        // --- CÀ PHÊ ---
        MenuItem cfSuaDa = createMenuItem("Cà phê sữa đá", "Cà phê phin truyền thống với sữa đặc", 29000, coffee);
        addRecipe(cfSuaDa, "Cà phê xay", 20);
        addRecipe(cfSuaDa, "Sữa đặc", 30);
        addRecipe(cfSuaDa, "Đá viên", 150);

        MenuItem cfDen = createMenuItem("Cà phê đen đá", "Cà phê đen nguyên chất", 25000, coffee);
        addRecipe(cfDen, "Cà phê xay", 20);
        addRecipe(cfDen, "Đường", 10);
        addRecipe(cfDen, "Đá viên", 150);

        MenuItem latte = createMenuItem("Latte", "Espresso với sữa tươi nóng", 45000, coffee);
        addRecipe(latte, "Cà phê xay", 18);
        addRecipe(latte, "Sữa tươi", 200);

        MenuItem caramelMacchiato = createMenuItem("Caramel Macchiato", "Latte với siro caramel", 55000, coffee);
        addRecipe(caramelMacchiato, "Cà phê xay", 18);
        addRecipe(caramelMacchiato, "Sữa tươi", 200);
        addRecipe(caramelMacchiato, "Siro caramel", 30);
        addRecipe(caramelMacchiato, "Kem whip", 20);

        MenuItem mocha = createMenuItem("Mocha", "Cà phê chocolate sữa", 50000, coffee);
        addRecipe(mocha, "Cà phê xay", 18);
        addRecipe(mocha, "Sữa tươi", 150);
        addRecipe(mocha, "Bột cacao", 20);
        addRecipe(mocha, "Kem whip", 20);

        // --- TRÀ ---
        MenuItem traSuaTranChau = createMenuItem("Trà sữa trân châu", "Trà đen sữa tươi với trân châu", 39000, tea);
        addRecipe(traSuaTranChau, "Trà đen", 10);
        addRecipe(traSuaTranChau, "Sữa tươi", 150);
        addRecipe(traSuaTranChau, "Đường", 20);
        addRecipe(traSuaTranChau, "Trân châu", 50);
        addRecipe(traSuaTranChau, "Đá viên", 100);

        MenuItem traOolong = createMenuItem("Trà Oolong", "Trà oolong tươi mát", 35000, tea);
        addRecipe(traOolong, "Trà oolong", 10);
        addRecipe(traOolong, "Đường", 15);
        addRecipe(traOolong, "Đá viên", 150);

        MenuItem traXanhLatte = createMenuItem("Trà xanh Latte", "Matcha latte sữa tươi", 45000, tea);
        addRecipe(traXanhLatte, "Trà xanh", 15);
        addRecipe(traXanhLatte, "Sữa tươi", 200);
        addRecipe(traXanhLatte, "Đường", 15);

        // --- SINH TỐ ---
        MenuItem sinhToBo = createMenuItem("Sinh tố bơ", "Sinh tố bơ sữa béo ngậy", 45000, smoothie);
        addRecipe(sinhToBo, "Bơ", 150);
        addRecipe(sinhToBo, "Sữa đặc", 40);
        addRecipe(sinhToBo, "Đá viên", 100);

        MenuItem sinhToXoai = createMenuItem("Sinh tố xoài", "Sinh tố xoài tươi mát", 40000, smoothie);
        addRecipe(sinhToXoai, "Xoài", 200);
        addRecipe(sinhToXoai, "Sữa tươi", 50);
        addRecipe(sinhToXoai, "Đường", 15);
        addRecipe(sinhToXoai, "Đá viên", 100);

        MenuItem sinhToDauTay = createMenuItem("Sinh tố dâu tây", "Sinh tố dâu tây tươi", 45000, smoothie);
        addRecipe(sinhToDauTay, "Dâu tây", 150);
        addRecipe(sinhToDauTay, "Sữa tươi", 50);
        addRecipe(sinhToDauTay, "Đường", 15);
        addRecipe(sinhToDauTay, "Đá viên", 100);

        // --- NƯỚC ÉP ---
        MenuItem nuocCam = createMenuItem("Nước cam tươi", "Nước cam ép nguyên chất", 35000, juice);
        addRecipe(nuocCam, "Cam", 300);
        addRecipe(nuocCam, "Đường", 10);
        addRecipe(nuocCam, "Đá viên", 100);

        log.info("Seeded {} menu items with recipes", menuItemRepository.count());
    }

    private MenuItem createMenuItem(String name, String description, double price, Category category) {
        MenuItem item = MenuItem.builder()
                .name(name)
                .description(description)
                .price(BigDecimal.valueOf(price))
                .available(true)
                .category(category)
                .build();
        return menuItemRepository.save(item);
    }

    private void addRecipe(MenuItem menuItem, String ingredientName, double quantity) {
        Ingredient ingredient = ingredientRepository.findByName(ingredientName)
                .orElseThrow(() -> new RuntimeException("Ingredient not found: " + ingredientName));
        Recipe recipe = Recipe.builder()
                .menuItem(menuItem)
                .ingredient(ingredient)
                .quantity(BigDecimal.valueOf(quantity))
                .build();
        recipeRepository.save(recipe);
    }
}
