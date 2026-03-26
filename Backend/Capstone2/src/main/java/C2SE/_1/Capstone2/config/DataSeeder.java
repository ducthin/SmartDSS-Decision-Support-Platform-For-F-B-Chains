package C2SE._1.Capstone2.config;

import C2SE._1.Capstone2.entity.*;
import C2SE._1.Capstone2.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;

@Component
@RequiredArgsConstructor
@Slf4j
@ConditionalOnProperty(name = "app.seed.enabled", havingValue = "true")
public class DataSeeder implements CommandLineRunner {

    /** Giá gốc + phụ phí → 21k / 29k / 39k */
    private static final String SML_21_29_39 = "[{\"code\":\"S\",\"label\":\"S\",\"priceExtra\":0},{\"code\":\"M\",\"label\":\"M\",\"priceExtra\":8000},{\"code\":\"L\",\"label\":\"L\",\"priceExtra\":18000}]";
    /** 29k / 39k / 55k */
    private static final String SML_29_39_55 = "[{\"code\":\"S\",\"label\":\"S\",\"priceExtra\":0},{\"code\":\"M\",\"label\":\"M\",\"priceExtra\":10000},{\"code\":\"L\",\"label\":\"L\",\"priceExtra\":26000}]";
    /** 39k / 49k / 59k */
    private static final String SML_39_49_59 = "[{\"code\":\"S\",\"label\":\"S\",\"priceExtra\":0},{\"code\":\"M\",\"label\":\"M\",\"priceExtra\":10000},{\"code\":\"L\",\"label\":\"L\",\"priceExtra\":20000}]";
    /** 29k / 37k / 47k */
    private static final String SML_29_37_47 = "[{\"code\":\"S\",\"label\":\"S\",\"priceExtra\":0},{\"code\":\"M\",\"label\":\"M\",\"priceExtra\":8000},{\"code\":\"L\",\"label\":\"L\",\"priceExtra\":18000}]";
    /** Chỉ size M — 29k */
    private static final String SIZE_M_29 = "[{\"code\":\"M\",\"label\":\"M\",\"priceExtra\":0}]";
    /** 35k / 49k */
    private static final String SM_35_49 = "[{\"code\":\"S\",\"label\":\"S\",\"priceExtra\":0},{\"code\":\"M\",\"label\":\"M\",\"priceExtra\":14000}]";
    /** Mặc định specialty: S/M/L +5k/+10k */
    private static final String SEED_DRINK_SIZES_JSON = "[{\"code\":\"S\",\"label\":\"Nhỏ\",\"priceExtra\":0},{\"code\":\"M\",\"label\":\"Vừa\",\"priceExtra\":5000},{\"code\":\"L\",\"label\":\"Lớn\",\"priceExtra\":10000}]";
    /** Topping phổ biến menu VN (QR chọn thêm) */
    private static final String SEED_DRINK_TOPPINGS_JSON = "["
            + "{\"code\":\"TRAN_CHAU\",\"label\":\"Trân châu\",\"price\":7000},"
            + "{\"code\":\"TRAN_CHAU_DD\",\"label\":\"Trân châu đường đen\",\"price\":8000},"
            + "{\"code\":\"TRAN_CHAU_HK\",\"label\":\"Trân châu hoàng kim\",\"price\":9000},"
            + "{\"code\":\"THACH\",\"label\":\"Thạch trái cây\",\"price\":5000},"
            + "{\"code\":\"THACH_DUA\",\"label\":\"Thạch dừa\",\"price\":6000},"
            + "{\"code\":\"KEM_CHEESE\",\"label\":\"Kem cheese\",\"price\":10000},"
            + "{\"code\":\"PHO_MAI_TUOI\",\"label\":\"Phô mai tươi\",\"price\":8000},"
            + "{\"code\":\"PUDDING\",\"label\":\"Pudding trứng\",\"price\":8000},"
            + "{\"code\":\"FLAN\",\"label\":\"Bánh flan\",\"price\":10000},"
            + "{\"code\":\"NHADAM\",\"label\":\"Nha đam\",\"price\":6000},"
            + "{\"code\":\"KEM_TUOI\",\"label\":\"Kem tươi\",\"price\":7000},"
            + "{\"code\":\"SUONG_SAO\",\"label\":\"Sương sáo\",\"price\":5000},"
            + "{\"code\":\"BOT_DE\",\"label\":\"Bột đậu đỏ\",\"price\":6000}"
            + "]";

    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    private final CategoryRepository categoryRepository;
    private final MenuItemRepository menuItemRepository;
    private final IngredientRepository ingredientRepository;
    private final RecipeRepository recipeRepository;
    private final InventoryRepository inventoryRepository;
    private final OrderItemRepository orderItemRepository;
    private final SalesItemRepository salesItemRepository;
    private final PlatformTransactionManager transactionManager;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.seed.resetMenu:false}")
    private boolean resetMenu;

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
            log.info("Created admin user: admin");
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
            log.info("Created manager user: manager");
        }

        if (!userRepository.existsByUsername("barista")) {
            Role baristaRole = roleRepository.findByName(RoleName.BARISTA)
                    .orElseThrow(() -> new RuntimeException("BARISTA role not found"));

            User barista = User.builder()
                    .username("barista")
                    .password(passwordEncoder.encode("barista123"))
                    .fullName("Barista")
                    .email("barista@smartdss.com")
                    .phone("0901234569")
                    .active(true)
                    .role(baristaRole)
                    .build();
            userRepository.save(barista);
            log.info("Created barista user: barista");
        }

        if (!userRepository.existsByUsername("waiter")) {
            Role waiterRole = roleRepository.findByName(RoleName.WAITER)
                    .orElseThrow(() -> new RuntimeException("WAITER role not found"));

            User waiter = User.builder()
                    .username("waiter")
                    .password(passwordEncoder.encode("waiter123"))
                    .fullName("Waiter")
                    .email("waiter@smartdss.com")
                    .phone("0901234570")
                    .active(true)
                    .role(waiterRole)
                    .build();
            userRepository.save(waiter);
            log.info("Created waiter user: waiter");
        }
    }

    private void seedCategories() {
        createCategoryIfNotExists("Cà phê", "Các loại cà phê");
        createCategoryIfNotExists("Trà sữa", "Trà sữa nhiều vị");
        createCategoryIfNotExists("Trà", "Trà trái cây / trà mát");
        createCategoryIfNotExists("Machiato", "Machiato");
        createCategoryIfNotExists("Mojito", "Mojito");
        createCategoryIfNotExists("Sinh tố", "Sinh tố & đá xay");
        createCategoryIfNotExists("Nước ép", "Các loại nước ép tươi");
        createCategoryIfNotExists("Topping", "Topping thêm (đặt riêng như món)");
        createCategoryIfNotExists("Bánh ngọt", "Các loại bánh ngọt");
        createCategoryIfNotExists("Trà kem cheese", "Trà kem muối / cheese foam");
        createCategoryIfNotExists("Sữa chua uống", "Yogurt uống trái cây");
        createCategoryIfNotExists("Cà phê đặc biệt", "Salt coffee, dừa, trend");
        createCategoryIfNotExists("Trà trái cây", "Trà trái cây tươi / freeze");
        createCategoryIfNotExists("Đồ ăn nhẹ", "Mì cay ly, snack kèm nước");
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

        createIngredientWithInventory("Chanh", "g", 5000);
        createIngredientWithInventory("Táo", "g", 5000);
        createIngredientWithInventory("Dứa", "g", 5000);
        createIngredientWithInventory("Cà rốt", "g", 5000);
        createIngredientWithInventory("Ổi", "g", 4000);
        createIngredientWithInventory("Mận", "g", 3000);
        createIngredientWithInventory("Dưa hấu", "g", 5000);
        createIngredientWithInventory("Sữa chua", "ml", 8000);
        createIngredientWithInventory("Nước cốt dừa", "ml", 5000);
        createIngredientWithInventory("Muối", "g", 2000);
        createIngredientWithInventory("Siro chocolate", "ml", 2000);
        createIngredientWithInventory("Siro dâu", "ml", 2000);
        createIngredientWithInventory("Bột matcha", "g", 1500);
        createIngredientWithInventory("Trà lài", "g", 2500);
        createIngredientWithInventory("Chuối", "g", 5000);
        createIngredientWithInventory("Thạch trái cây", "g", 2500);
        createIngredientWithInventory("Thạch dừa", "g", 2500);
        createIngredientWithInventory("Phô mai tươi", "g", 1800);
        createIngredientWithInventory("Pudding trứng", "phần", 120);
        createIngredientWithInventory("Bánh flan", "phần", 80);
        createIngredientWithInventory("Nha đam", "g", 1800);
        createIngredientWithInventory("Sương sáo", "g", 1800);
        createIngredientWithInventory("Bột đậu đỏ", "g", 1500);
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
        if (resetMenu) {
            log.warn("app.seed.resetMenu=true: xóa order_items, sales_items, recipes, menu_items rồi seed lại menu (chỉ dùng trên dev).");
            new TransactionTemplate(transactionManager).executeWithoutResult(status -> {
                orderItemRepository.deleteAllInBatch();
                salesItemRepository.deleteAllInBatch();
                recipeRepository.deleteAllInBatch();
                menuItemRepository.deleteAllInBatch();
            });
        } else if (menuItemRepository.count() > 0) {
            log.info("Đã có menu trong DB — bỏ qua seed menu. Để seed lại: đặt app.seed.resetMenu=true (và app.seed.enabled=true), hoặc xóa bảng menu/recipes/order_items liên quan.");
            return;
        }

        Category coffee = categoryRepository.findByName("Cà phê").orElseThrow();
        Category coffeeSpecial = categoryRepository.findByName("Cà phê đặc biệt").orElseThrow();
        Category milkTea = categoryRepository.findByName("Trà sữa").orElseThrow();
        Category tea = categoryRepository.findByName("Trà").orElseThrow();
        Category cheeseTea = categoryRepository.findByName("Trà kem cheese").orElseThrow();
        Category fruitTea = categoryRepository.findByName("Trà trái cây").orElseThrow();
        Category machiato = categoryRepository.findByName("Machiato").orElseThrow();
        Category mojito = categoryRepository.findByName("Mojito").orElseThrow();
        Category smoothie = categoryRepository.findByName("Sinh tố").orElseThrow();
        Category yogurt = categoryRepository.findByName("Sữa chua uống").orElseThrow();
        Category juice = categoryRepository.findByName("Nước ép").orElseThrow();
        Category toppingCat = categoryRepository.findByName("Topping").orElseThrow();
        Category bakery = categoryRepository.findByName("Bánh ngọt").orElseThrow();
        Category snack = categoryRepository.findByName("Đồ ăn nhẹ").orElseThrow();

        // --- CÀ PHÊ cổ điển ---
        MenuItem cfDenLy = createMenuItem("Cà phê đá", "Phin đen đá", 19000, coffee, false, false, true, null, null);
        addRecipe(cfDenLy, "Cà phê xay", 18);
        addRecipe(cfDenLy, "Đường", 8);
        addRecipe(cfDenLy, "Đá viên", 120);

        MenuItem cfSuaLy = createMenuItem("Cà phê sữa đá", "Phin nóng sữa đặc đá", 19000, coffee, false, false, true, null, null);
        addRecipe(cfSuaLy, "Cà phê xay", 18);
        addRecipe(cfSuaLy, "Sữa đặc", 25);
        addRecipe(cfSuaLy, "Đá viên", 120);

        MenuItem cfSuaTuoi = createMenuItem("Cà phê sữa tươi", "Phin sữa tươi thanh", 25000, coffee, false, false, false, null, null);
        addRecipe(cfSuaTuoi, "Cà phê xay", 18);
        addRecipe(cfSuaTuoi, "Sữa tươi", 120);
        addRecipe(cfSuaTuoi, "Đường", 10);
        addRecipe(cfSuaTuoi, "Đá viên", 120);

        MenuItem bacXiu = createMenuItem("Bạc xỉu", "Nhiều sữa ít cà phê", 25000, coffee, false, true, true, null, null);
        addRecipe(bacXiu, "Cà phê xay", 12);
        addRecipe(bacXiu, "Sữa đặc", 35);
        addRecipe(bacXiu, "Sữa tươi", 80);
        addRecipe(bacXiu, "Đá viên", 120);

        MenuItem latte = createMenuItem("Latte", "Espresso sữa tươi", 45000, coffee, true, false, false, SEED_DRINK_SIZES_JSON, SEED_DRINK_TOPPINGS_JSON);
        addRecipe(latte, "Cà phê xay", 18);
        addRecipe(latte, "Sữa tươi", 200);

        MenuItem cappu = createMenuItem("Cappuccino", "Espresso bọt sữa", 48000, coffee, true, false, false, SEED_DRINK_SIZES_JSON, SEED_DRINK_TOPPINGS_JSON);
        addRecipe(cappu, "Cà phê xay", 18);
        addRecipe(cappu, "Sữa tươi", 150);
        addRecipe(cappu, "Kem whip", 20);

        MenuItem americano = createMenuItem("Americano", "Espresso pha loãng", 35000, coffee, true, false, false, SEED_DRINK_SIZES_JSON, SEED_DRINK_TOPPINGS_JSON);
        addRecipe(americano, "Cà phê xay", 22);
        addRecipe(americano, "Đường", 8);
        addRecipe(americano, "Đá viên", 150);

        MenuItem mocha = createMenuItem("Mocha", "Cà phê cacao sữa", 50000, coffee, true, false, true, SEED_DRINK_SIZES_JSON, SEED_DRINK_TOPPINGS_JSON);
        addRecipe(mocha, "Cà phê xay", 18);
        addRecipe(mocha, "Sữa tươi", 150);
        addRecipe(mocha, "Bột cacao", 20);
        addRecipe(mocha, "Kem whip", 15);

        MenuItem caramelMac = createMenuItem("Caramel macchiato", "Espresso caramel sữa", 52000, coffee, true, true, false, SEED_DRINK_SIZES_JSON, SEED_DRINK_TOPPINGS_JSON);
        addRecipe(caramelMac, "Cà phê xay", 18);
        addRecipe(caramelMac, "Sữa tươi", 160);
        addRecipe(caramelMac, "Siro caramel", 25);
        addRecipe(caramelMac, "Kem whip", 15);

        // --- CÀ PHÊ TREND VN ---
        MenuItem cfMuoi = createMenuItem("Cà phê muối", "Salt coffee kem mặn ngọt", 35000, coffeeSpecial, true, true, true, SML_29_37_47, SEED_DRINK_TOPPINGS_JSON);
        addRecipe(cfMuoi, "Cà phê xay", 18);
        addRecipe(cfMuoi, "Sữa tươi", 150);
        addRecipe(cfMuoi, "Muối", 2);
        addRecipe(cfMuoi, "Kem whip", 25);
        addRecipe(cfMuoi, "Đá viên", 100);

        MenuItem cfDua = createMenuItem("Cà phê cốt dừa", "Dừa béo cà phê đậm", 39000, coffeeSpecial, true, false, true, SML_29_39_55, SEED_DRINK_TOPPINGS_JSON);
        addRecipe(cfDua, "Cà phê xay", 16);
        addRecipe(cfDua, "Nước cốt dừa", 80);
        addRecipe(cfDua, "Sữa tươi", 80);
        addRecipe(cfDua, "Đường", 12);
        addRecipe(cfDua, "Đá viên", 110);

        MenuItem cfTrung = createMenuItem("Cà phê trứng", "Kem trứng đặc trưng HN", 42000, coffeeSpecial, true, false, true, SEED_DRINK_SIZES_JSON, SEED_DRINK_TOPPINGS_JSON);
        addRecipe(cfTrung, "Cà phê xay", 18);
        addRecipe(cfTrung, "Sữa đặc", 30);
        addRecipe(cfTrung, "Đường", 10);
        addRecipe(cfTrung, "Đá viên", 80);

        MenuItem cfSuaTuoiMuoi = createMenuItem("Sữa tươi cà phê muối", "Kem cheese muối trend", 36000, coffeeSpecial, true, true, false, SML_29_37_47, SEED_DRINK_TOPPINGS_JSON);
        addRecipe(cfSuaTuoiMuoi, "Cà phê xay", 14);
        addRecipe(cfSuaTuoiMuoi, "Sữa tươi", 180);
        addRecipe(cfSuaTuoiMuoi, "Muối", 1);
        addRecipe(cfSuaTuoiMuoi, "Đá viên", 100);

        // --- TRÀ SỮA ---
        MenuItem ts1 = createMenuItem("Trà sữa truyền thống", "Trà đen sữa", 21000, milkTea, true, false, true, SML_21_29_39, SEED_DRINK_TOPPINGS_JSON);
        addRecipe(ts1, "Trà đen", 10);
        addRecipe(ts1, "Sữa tươi", 120);
        addRecipe(ts1, "Đường", 15);
        addRecipe(ts1, "Đá viên", 100);

        MenuItem tsDuongDen = createMenuItem("Trà sữa đường đen", "Đường đen caramel", 29000, milkTea, true, true, true, SML_29_37_47, SEED_DRINK_TOPPINGS_JSON);
        addRecipe(tsDuongDen, "Trà đen", 10);
        addRecipe(tsDuongDen, "Sữa tươi", 130);
        addRecipe(tsDuongDen, "Siro caramel", 20);
        addRecipe(tsDuongDen, "Đá viên", 100);

        MenuItem ts2 = createMenuItem("Trà sữa Thái xanh", "Thái xanh béo", 21000, milkTea, true, false, false, SML_21_29_39, SEED_DRINK_TOPPINGS_JSON);
        addRecipe(ts2, "Trà xanh", 12);
        addRecipe(ts2, "Sữa tươi", 120);
        addRecipe(ts2, "Đường", 15);
        addRecipe(ts2, "Đá viên", 100);

        MenuItem ts3 = createMenuItem("Trà sữa Thái đỏ", "Thái đỏ đặc trưng", 21000, milkTea, true, false, false, SML_21_29_39, SEED_DRINK_TOPPINGS_JSON);
        addRecipe(ts3, "Trà đen", 10);
        addRecipe(ts3, "Sữa đặc", 20);
        addRecipe(ts3, "Đường", 15);
        addRecipe(ts3, "Đá viên", 100);

        MenuItem tsOolong = createMenuItem("Trà sữa oolong", "Oolong sữa thanh", 25000, milkTea, true, false, true, SML_21_29_39, SEED_DRINK_TOPPINGS_JSON);
        addRecipe(tsOolong, "Trà oolong", 12);
        addRecipe(tsOolong, "Sữa tươi", 130);
        addRecipe(tsOolong, "Đường", 14);
        addRecipe(tsOolong, "Đá viên", 100);

        MenuItem tsMatcha = createMenuItem("Trà sữa matcha", "Matcha Nhật béo", 32000, milkTea, true, true, false, SML_29_37_47, SEED_DRINK_TOPPINGS_JSON);
        addRecipe(tsMatcha, "Bột matcha", 8);
        addRecipe(tsMatcha, "Sữa tươi", 160);
        addRecipe(tsMatcha, "Đường", 16);
        addRecipe(tsMatcha, "Đá viên", 100);

        MenuItem tsSocola = createMenuItem("Trà sữa socola", "Socola đậm", 29000, milkTea, true, false, false, SML_29_37_47, SEED_DRINK_TOPPINGS_JSON);
        addRecipe(tsSocola, "Trà đen", 10);
        addRecipe(tsSocola, "Sữa tươi", 120);
        addRecipe(tsSocola, "Siro chocolate", 25);
        addRecipe(tsSocola, "Đá viên", 100);

        MenuItem tsDau = createMenuItem("Trà sữa dâu tây", "Dâu ngọt thơm", 29000, milkTea, true, false, false, SML_29_37_47, SEED_DRINK_TOPPINGS_JSON);
        addRecipe(tsDau, "Trà đen", 10);
        addRecipe(tsDau, "Sữa tươi", 120);
        addRecipe(tsDau, "Siro dâu", 22);
        addRecipe(tsDau, "Đá viên", 100);

        MenuItem tsKiwi = createMenuItem("Trà sữa kiwi", "Kiwi chua ngọt", 28000, milkTea, true, false, false, SML_29_37_47, SEED_DRINK_TOPPINGS_JSON);
        addRecipe(tsKiwi, "Trà xanh", 10);
        addRecipe(tsKiwi, "Sữa tươi", 125);
        addRecipe(tsKiwi, "Đường", 16);
        addRecipe(tsKiwi, "Đá viên", 100);

        MenuItem tsPmt = createMenuItem("Trà sữa phô mai tươi", "Kem phô mai mặn ngọt", 29000, milkTea, true, false, true, SML_29_37_47, SEED_DRINK_TOPPINGS_JSON);
        addRecipe(tsPmt, "Trà đen", 10);
        addRecipe(tsPmt, "Sữa tươi", 150);
        addRecipe(tsPmt, "Đường", 15);
        addRecipe(tsPmt, "Đá viên", 100);

        MenuItem tsKhoai = createMenuItem("Trà sữa khoai môn phô mai", "Khoai môn kem cheese", 39000, milkTea, true, true, false, SML_39_49_59, SEED_DRINK_TOPPINGS_JSON);
        addRecipe(tsKhoai, "Trà đen", 10);
        addRecipe(tsKhoai, "Sữa tươi", 150);
        addRecipe(tsKhoai, "Đường", 20);
        addRecipe(tsKhoai, "Đá viên", 100);

        MenuItem tsHongTra = createMenuItem("Hồng trà sữa", "Hồng trà Đài Loan", 23000, milkTea, true, false, true, SML_21_29_39, SEED_DRINK_TOPPINGS_JSON);
        addRecipe(tsHongTra, "Trà đen", 11);
        addRecipe(tsHongTra, "Sữa tươi", 125);
        addRecipe(tsHongTra, "Đường", 14);
        addRecipe(tsHongTra, "Đá viên", 100);

        MenuItem tsLai = createMenuItem("Trà sữa lài", "Trà lài sữa thơm", 25000, milkTea, true, false, false, SML_21_29_39, SEED_DRINK_TOPPINGS_JSON);
        addRecipe(tsLai, "Trà lài", 10);
        addRecipe(tsLai, "Sữa tươi", 130);
        addRecipe(tsLai, "Đường", 14);
        addRecipe(tsLai, "Đá viên", 100);

        // --- TRÀ KEM CHEESE ---
        MenuItem tkcDao = createMenuItem("Trà đào kem cheese", "Kem mặn + đào", 39000, cheeseTea, true, true, true, SML_29_39_55, SEED_DRINK_TOPPINGS_JSON);
        addRecipe(tkcDao, "Trà đen", 8);
        addRecipe(tkcDao, "Đường", 14);
        addRecipe(tkcDao, "Đá viên", 120);

        MenuItem tkcVai = createMenuItem("Trà vải kem cheese", "Vải thơm kem cheese", 39000, cheeseTea, true, false, true, SML_29_39_55, SEED_DRINK_TOPPINGS_JSON);
        addRecipe(tkcVai, "Trà đen", 8);
        addRecipe(tkcVai, "Đường", 14);
        addRecipe(tkcVai, "Đá viên", 120);

        MenuItem tkcMatcha = createMenuItem("Matcha kem cheese", "Matcha kem mặn", 42000, cheeseTea, true, false, true, SML_39_49_59, SEED_DRINK_TOPPINGS_JSON);
        addRecipe(tkcMatcha, "Bột matcha", 10);
        addRecipe(tkcMatcha, "Sữa tươi", 140);
        addRecipe(tkcMatcha, "Đường", 12);
        addRecipe(tkcMatcha, "Đá viên", 110);

        MenuItem tkcMuoi = createMenuItem("Trà kem muối", "Cheese foam muối hồng", 35000, cheeseTea, true, true, false, SML_29_37_47, SEED_DRINK_TOPPINGS_JSON);
        addRecipe(tkcMuoi, "Trà oolong", 10);
        addRecipe(tkcMuoi, "Sữa tươi", 100);
        addRecipe(tkcMuoi, "Muối", 1);
        addRecipe(tkcMuoi, "Đá viên", 115);

        MenuItem tkcXoai = createMenuItem("Trà xoài kem cheese", "Xoài chín ngọt", 39000, cheeseTea, true, false, false, SML_29_39_55, SEED_DRINK_TOPPINGS_JSON);
        addRecipe(tkcXoai, "Trà xanh", 8);
        addRecipe(tkcXoai, "Xoài", 80);
        addRecipe(tkcXoai, "Đường", 16);
        addRecipe(tkcXoai, "Đá viên", 120);

        // --- TRÀ (classic) ---
        MenuItem traDao = createMenuItem("Trà đào", "Trà đào miếng", 29000, tea, true, false, true, SML_29_39_55, SEED_DRINK_TOPPINGS_JSON);
        addRecipe(traDao, "Trà đen", 8);
        addRecipe(traDao, "Đường", 15);
        addRecipe(traDao, "Đá viên", 120);

        MenuItem traVai = createMenuItem("Trà vải", "Trà vải thơm", 29000, tea, true, false, true, SML_29_39_55, SEED_DRINK_TOPPINGS_JSON);
        addRecipe(traVai, "Trà đen", 8);
        addRecipe(traVai, "Đường", 15);
        addRecipe(traVai, "Đá viên", 120);

        MenuItem traChanh = createMenuItem("Trà chanh nha đam", "Thanh mát", 29000, tea, true, false, false, SML_29_39_55, SEED_DRINK_TOPPINGS_JSON);
        addRecipe(traChanh, "Trà đen", 8);
        addRecipe(traChanh, "Đường", 15);
        addRecipe(traChanh, "Đá viên", 120);

        MenuItem traTac = createMenuItem("Trà tắc", "Tắc xí muội mặn ngọt", 25000, tea, true, true, true, SML_29_37_47, SEED_DRINK_TOPPINGS_JSON);
        addRecipe(traTac, "Trà đen", 8);
        addRecipe(traTac, "Chanh", 40);
        addRecipe(traTac, "Đường", 18);
        addRecipe(traTac, "Đá viên", 130);

        MenuItem traSen = createMenuItem("Trà sen vàng", "Lài sen thanh", 32000, tea, true, false, false, SML_29_39_55, SEED_DRINK_TOPPINGS_JSON);
        addRecipe(traSen, "Trà lài", 12);
        addRecipe(traSen, "Đường", 12);
        addRecipe(traSen, "Đá viên", 125);

        MenuItem traHib = createMenuItem("Trà hibiscus", "Hoa atiso đỏ", 39000, tea, true, true, false, SML_39_49_59, SEED_DRINK_TOPPINGS_JSON);
        addRecipe(traHib, "Trà đen", 8);
        addRecipe(traHib, "Đường", 15);
        addRecipe(traHib, "Đá viên", 120);

        MenuItem traOolong = createMenuItem("Trà Oolong", "Oolong thanh", 35000, tea, true, false, false, SEED_DRINK_SIZES_JSON, SEED_DRINK_TOPPINGS_JSON);
        addRecipe(traOolong, "Trà oolong", 10);
        addRecipe(traOolong, "Đường", 12);
        addRecipe(traOolong, "Đá viên", 130);

        MenuItem traDaoCamSa = createMenuItem("Trà đào cam sả", "Cam sả thơm nồng", 35000, tea, true, true, false, SML_29_39_55, SEED_DRINK_TOPPINGS_JSON);
        addRecipe(traDaoCamSa, "Trà đen", 8);
        addRecipe(traDaoCamSa, "Cam", 120);
        addRecipe(traDaoCamSa, "Đường", 14);
        addRecipe(traDaoCamSa, "Đá viên", 120);

        // --- TRÀ TRÁI CÂY / FREEZE ---
        MenuItem ftXoai = createMenuItem("Trà xoài", "Xoài tươi thanh", 32000, fruitTea, true, false, true, SML_29_39_55, SEED_DRINK_TOPPINGS_JSON);
        addRecipe(ftXoai, "Trà xanh", 8);
        addRecipe(ftXoai, "Xoài", 100);
        addRecipe(ftXoai, "Đường", 16);
        addRecipe(ftXoai, "Đá viên", 130);

        MenuItem ftOi = createMenuItem("Trà ổi hồng", "Ổi hồng giòn", 32000, fruitTea, true, false, false, SML_29_39_55, SEED_DRINK_TOPPINGS_JSON);
        addRecipe(ftOi, "Trà lài", 8);
        addRecipe(ftOi, "Ổi", 120);
        addRecipe(ftOi, "Đường", 14);
        addRecipe(ftOi, "Đá viên", 125);

        MenuItem ftMan = createMenuItem("Trà mận", "Mận chua mặn", 30000, fruitTea, true, false, false, SML_29_39_55, SEED_DRINK_TOPPINGS_JSON);
        addRecipe(ftMan, "Trà đen", 8);
        addRecipe(ftMan, "Mận", 90);
        addRecipe(ftMan, "Đường", 18);
        addRecipe(ftMan, "Đá viên", 120);

        MenuItem ftDuaLuoi = createMenuItem("Trà dưa lưới", "Dưa lưới ngọt", 31000, fruitTea, true, true, false, SML_29_39_55, SEED_DRINK_TOPPINGS_JSON);
        addRecipe(ftDuaLuoi, "Trà xanh", 8);
        addRecipe(ftDuaLuoi, "Dưa hấu", 80);
        addRecipe(ftDuaLuoi, "Đường", 15);
        addRecipe(ftDuaLuoi, "Đá viên", 125);

        MenuItem ftChanhLeo = createMenuItem("Trà chanh leo", "Passion thanh chua", 33000, fruitTea, true, false, true, SML_29_39_55, SEED_DRINK_TOPPINGS_JSON);
        addRecipe(ftChanhLeo, "Trà xanh", 8);
        addRecipe(ftChanhLeo, "Chanh", 35);
        addRecipe(ftChanhLeo, "Đường", 16);
        addRecipe(ftChanhLeo, "Đá viên", 130);

        MenuItem ftDau = createMenuItem("Trà dâu tây", "Dâu đỏ mọng", 34000, fruitTea, true, false, false, SML_29_39_55, SEED_DRINK_TOPPINGS_JSON);
        addRecipe(ftDau, "Trà đen", 8);
        addRecipe(ftDau, "Dâu tây", 70);
        addRecipe(ftDau, "Siro dâu", 15);
        addRecipe(ftDau, "Đá viên", 120);

        MenuItem freezeSocola = createMenuItem("Freeze socola", "Đá xay socola", 38000, fruitTea, true, true, false, SM_35_49, SEED_DRINK_TOPPINGS_JSON);
        addRecipe(freezeSocola, "Siro chocolate", 35);
        addRecipe(freezeSocola, "Sữa tươi", 140);
        addRecipe(freezeSocola, "Đường", 12);
        addRecipe(freezeSocola, "Đá viên", 220);

        // --- MACHIATO ---
        MenuItem macDen = createMenuItem("Machiato đen", "Espresso kem sữa", 29000, machiato, true, false, false, SML_29_39_55, SEED_DRINK_TOPPINGS_JSON);
        addRecipe(macDen, "Cà phê xay", 20);
        addRecipe(macDen, "Sữa tươi", 80);
        addRecipe(macDen, "Đường", 10);
        addRecipe(macDen, "Đá viên", 100);

        MenuItem macXanh = createMenuItem("Machiato matcha", "Matcha kem", 29000, machiato, true, false, false, SML_29_39_55, SEED_DRINK_TOPPINGS_JSON);
        addRecipe(macXanh, "Trà xanh", 15);
        addRecipe(macXanh, "Sữa tươi", 150);
        addRecipe(macXanh, "Đường", 12);
        addRecipe(macXanh, "Đá viên", 100);

        MenuItem macCaramel = createMenuItem("Machiato caramel", "Caramel bọt sữa", 31000, machiato, true, true, false, SML_29_39_55, SEED_DRINK_TOPPINGS_JSON);
        addRecipe(macCaramel, "Cà phê xay", 16);
        addRecipe(macCaramel, "Sữa tươi", 120);
        addRecipe(macCaramel, "Siro caramel", 22);
        addRecipe(macCaramel, "Đá viên", 105);

        MenuItem macCacao = createMenuItem("Machiato cacao", "Cacao kem", 30000, machiato, true, false, true, SML_29_39_55, SEED_DRINK_TOPPINGS_JSON);
        addRecipe(macCacao, "Bột cacao", 22);
        addRecipe(macCacao, "Sữa tươi", 140);
        addRecipe(macCacao, "Đường", 14);
        addRecipe(macCacao, "Đá viên", 100);

        // --- MOJITO ---
        MenuItem mj1 = createMenuItem("Mojito Blue Ocean", "Việt quất soda", 29000, mojito, true, false, false, SIZE_M_29, SEED_DRINK_TOPPINGS_JSON);
        addRecipe(mj1, "Đường", 15);
        addRecipe(mj1, "Đá viên", 150);
        MenuItem mj2 = createMenuItem("Mojito Red Sunset", "Dâu soda", 29000, mojito, true, false, false, SIZE_M_29, SEED_DRINK_TOPPINGS_JSON);
        addRecipe(mj2, "Đường", 15);
        addRecipe(mj2, "Đá viên", 150);
        MenuItem mj3 = createMenuItem("Mojito chanh", "Chanh tươi soda", 29000, mojito, true, false, false, SIZE_M_29, SEED_DRINK_TOPPINGS_JSON);
        addRecipe(mj3, "Chanh", 30);
        addRecipe(mj3, "Đường", 15);
        addRecipe(mj3, "Đá viên", 150);
        MenuItem mj4 = createMenuItem("Mojito hibiscus", "Hibiscus soda", 29000, mojito, true, true, false, SIZE_M_29, SEED_DRINK_TOPPINGS_JSON);
        addRecipe(mj4, "Đường", 15);
        addRecipe(mj4, "Đá viên", 150);
        MenuItem mjKiwi = createMenuItem("Mojito kiwi", "Kiwi soda xanh", 29000, mojito, true, false, false, SIZE_M_29, SEED_DRINK_TOPPINGS_JSON);
        addRecipe(mjKiwi, "Đường", 15);
        addRecipe(mjKiwi, "Đá viên", 150);
        MenuItem mjDuaHau = createMenuItem("Mojito dưa hấu", "Dưa hấu mát", 28000, mojito, true, false, true, SIZE_M_29, SEED_DRINK_TOPPINGS_JSON);
        addRecipe(mjDuaHau, "Dưa hấu", 100);
        addRecipe(mjDuaHau, "Đường", 14);
        addRecipe(mjDuaHau, "Đá viên", 155);
        MenuItem mjTac = createMenuItem("Mojito tắc", "Tắc soda giải nhiệt", 27000, mojito, true, true, false, SIZE_M_29, SEED_DRINK_TOPPINGS_JSON);
        addRecipe(mjTac, "Chanh", 25);
        addRecipe(mjTac, "Đường", 16);
        addRecipe(mjTac, "Đá viên", 150);

        // --- SINH TỐ / ĐÁ XAY ---
        MenuItem daXayCf = createMenuItem("Đá xay cà phê", "Coffee blended", 35000, smoothie, true, false, false, SM_35_49, SEED_DRINK_TOPPINGS_JSON);
        addRecipe(daXayCf, "Cà phê xay", 15);
        addRecipe(daXayCf, "Sữa tươi", 100);
        addRecipe(daXayCf, "Đường", 15);
        addRecipe(daXayCf, "Đá viên", 200);

        MenuItem daXayMatcha = createMenuItem("Đá xay matcha", "Matcha sữa", 35000, smoothie, true, false, false, SM_35_49, SEED_DRINK_TOPPINGS_JSON);
        addRecipe(daXayMatcha, "Trà xanh", 18);
        addRecipe(daXayMatcha, "Sữa tươi", 120);
        addRecipe(daXayMatcha, "Đường", 15);
        addRecipe(daXayMatcha, "Đá viên", 200);

        MenuItem daXayOreo = createMenuItem("Đá xay Oreo / cookies", "Bánh quy sữa", 39000, smoothie, true, true, true, SM_35_49, SEED_DRINK_TOPPINGS_JSON);
        addRecipe(daXayOreo, "Siro chocolate", 30);
        addRecipe(daXayOreo, "Sữa tươi", 130);
        addRecipe(daXayOreo, "Kem whip", 25);
        addRecipe(daXayOreo, "Đá viên", 210);

        MenuItem sinhToBo = createMenuItem("Sinh tố bơ", "Bơ sữa béo", 45000, smoothie, true, false, true, SEED_DRINK_SIZES_JSON, SEED_DRINK_TOPPINGS_JSON);
        addRecipe(sinhToBo, "Bơ", 150);
        addRecipe(sinhToBo, "Sữa đặc", 40);
        addRecipe(sinhToBo, "Đá viên", 100);

        MenuItem sinhToXoai = createMenuItem("Sinh tố xoài", "Xoài Cát Chu", 40000, smoothie, true, false, false, SEED_DRINK_SIZES_JSON, SEED_DRINK_TOPPINGS_JSON);
        addRecipe(sinhToXoai, "Xoài", 180);
        addRecipe(sinhToXoai, "Sữa tươi", 80);
        addRecipe(sinhToXoai, "Đường", 12);
        addRecipe(sinhToXoai, "Đá viên", 100);

        MenuItem sinhToDau = createMenuItem("Sinh tố dâu", "Dâu sữa chua", 42000, smoothie, true, false, false, SEED_DRINK_SIZES_JSON, SEED_DRINK_TOPPINGS_JSON);
        addRecipe(sinhToDau, "Dâu tây", 120);
        addRecipe(sinhToDau, "Sữa chua", 60);
        addRecipe(sinhToDau, "Đường", 10);
        addRecipe(sinhToDau, "Đá viên", 95);

        MenuItem sinhToChuoi = createMenuItem("Sinh tố chuối bơ đậu", "Chuối sữa healthy", 38000, smoothie, true, false, false, SEED_DRINK_SIZES_JSON, SEED_DRINK_TOPPINGS_JSON);
        addRecipe(sinhToChuoi, "Chuối", 160);
        addRecipe(sinhToChuoi, "Sữa tươi", 100);
        addRecipe(sinhToChuoi, "Đường", 10);
        addRecipe(sinhToChuoi, "Đá viên", 90);

        MenuItem daXayDua = createMenuItem("Đá xay dừa cà phê", "Cốt dừa cà phê", 41000, smoothie, true, true, false, SM_35_49, SEED_DRINK_TOPPINGS_JSON);
        addRecipe(daXayDua, "Cà phê xay", 12);
        addRecipe(daXayDua, "Nước cốt dừa", 70);
        addRecipe(daXayDua, "Sữa tươi", 90);
        addRecipe(daXayDua, "Đá viên", 200);

        // --- SỮA CHUA UỐNG ---
        MenuItem ygVq = createMenuItem("Sữa chua uống việt quất", "Yogurt việt quất", 35000, yogurt, true, false, true, SEED_DRINK_SIZES_JSON, SEED_DRINK_TOPPINGS_JSON);
        addRecipe(ygVq, "Sữa chua", 150);
        addRecipe(ygVq, "Đường", 14);
        addRecipe(ygVq, "Đá viên", 110);

        MenuItem ygXoai = createMenuItem("Sữa chua uống xoài", "Yogurt xoài", 35000, yogurt, true, false, true, SEED_DRINK_SIZES_JSON, SEED_DRINK_TOPPINGS_JSON);
        addRecipe(ygXoai, "Sữa chua", 140);
        addRecipe(ygXoai, "Xoài", 90);
        addRecipe(ygXoai, "Đường", 12);
        addRecipe(ygXoai, "Đá viên", 105);

        MenuItem ygDau = createMenuItem("Sữa chua uống dâu", "Yogurt dâu", 36000, yogurt, true, true, false, SEED_DRINK_SIZES_JSON, SEED_DRINK_TOPPINGS_JSON);
        addRecipe(ygDau, "Sữa chua", 145);
        addRecipe(ygDau, "Dâu tây", 70);
        addRecipe(ygDau, "Siro dâu", 12);
        addRecipe(ygDau, "Đá viên", 105);

        MenuItem ygChanhLeo = createMenuItem("Sữa chua chanh leo", "Chua thanh mát", 34000, yogurt, true, false, false, SEED_DRINK_SIZES_JSON, SEED_DRINK_TOPPINGS_JSON);
        addRecipe(ygChanhLeo, "Sữa chua", 150);
        addRecipe(ygChanhLeo, "Chanh", 30);
        addRecipe(ygChanhLeo, "Đường", 16);
        addRecipe(ygChanhLeo, "Đá viên", 110);

        // --- NƯỚC ÉP ---
        MenuItem nuocCam = createMenuItem("Nước cam tươi", "Ép nguyên chất", 35000, juice, true, false, true, SEED_DRINK_SIZES_JSON, SEED_DRINK_TOPPINGS_JSON);
        addRecipe(nuocCam, "Cam", 300);
        addRecipe(nuocCam, "Đường", 10);
        addRecipe(nuocCam, "Đá viên", 100);

        MenuItem epCarot = createMenuItem("Nước ép cà rốt táo", "Mix vitamin", 32000, juice, true, false, false, SEED_DRINK_SIZES_JSON, SEED_DRINK_TOPPINGS_JSON);
        addRecipe(epCarot, "Cà rốt", 200);
        addRecipe(epCarot, "Táo", 150);
        addRecipe(epCarot, "Đá viên", 90);

        MenuItem epDua = createMenuItem("Nước ép dứa", "Dứa chua ngọt", 30000, juice, true, false, false, SEED_DRINK_SIZES_JSON, SEED_DRINK_TOPPINGS_JSON);
        addRecipe(epDua, "Dứa", 250);
        addRecipe(epDua, "Đường", 8);
        addRecipe(epDua, "Đá viên", 100);

        MenuItem epOi = createMenuItem("Nước ép ổi", "Ổi hồng thơm", 30000, juice, true, true, false, SEED_DRINK_SIZES_JSON, SEED_DRINK_TOPPINGS_JSON);
        addRecipe(epOi, "Ổi", 280);
        addRecipe(epOi, "Đường", 8);
        addRecipe(epOi, "Đá viên", 95);

        MenuItem epThom = createMenuItem("Nước ép thơm", "Dứa ép đậm vị", 29000, juice, true, false, false, SEED_DRINK_SIZES_JSON, SEED_DRINK_TOPPINGS_JSON);
        addRecipe(epThom, "Dứa", 260);
        addRecipe(epThom, "Đường", 10);
        addRecipe(epThom, "Đá viên", 100);

        MenuItem epDuaHau = createMenuItem("Nước ép dưa hấu", "Giải nhiệt", 28000, juice, true, false, true, SEED_DRINK_SIZES_JSON, SEED_DRINK_TOPPINGS_JSON);
        addRecipe(epDuaHau, "Dưa hấu", 320);
        addRecipe(epDuaHau, "Đá viên", 100);

        // --- BÁNH (không công thức BTP chi tiết) ---
        createMenuItem("Croissant bơ", "Bánh sáng kiểu Pháp", 28000, bakery, false, false, true, null, null);
        createMenuItem("Tiramisu ly", "Cà phê mascarpone", 45000, bakery, false, true, false, null, null);
        createMenuItem("Cheesecake việt quất", "Phô mai kem berry", 42000, bakery, false, false, true, null, null);
        createMenuItem("Bánh mì phô mai nướng", "Ăn kèm cà phê", 22000, bakery, false, false, false, null, null);
        createMenuItem("Macaron hộp 3", "Ngọt nhẹ", 55000, bakery, false, true, false, null, null);

        // --- ĐỒ ĂN NHẸ ---
        createMenuItem("Mì cay ly Hàn", "Cay vừa + trứng", 35000, snack, false, true, true, null, null);
        createMenuItem("Xúc xích phô mai chiên", "Ăn vặt hot", 25000, snack, false, false, false, null, null);
        createMenuItem("Khoai tây lắc phô mai", "Giòn tan", 28000, snack, false, false, true, null, null);
        createMenuItem("Gà popcorn cay", "Snack cay nhẹ", 32000, snack, false, true, false, null, null);

        // --- TOPPING ---
        MenuItem phoMaiTuoi = createMenuItem("Phô mai tươi (topping)", "Thêm 1 phần", 8000, toppingCat, false, false, true, null, null);
        addRecipe(phoMaiTuoi, "Phô mai tươi", 25);
        MenuItem tranChauHoangKim = createMenuItem("Trân châu hoàng kim", "Thêm 1 phần", 8000, toppingCat, false, false, true, null, null);
        addRecipe(tranChauHoangKim, "Trân châu", 35);
        MenuItem tranChauDen = createMenuItem("Trân châu đen", "Thêm 1 phần", 4000, toppingCat, false, false, false, null, null);
        addRecipe(tranChauDen, "Trân châu", 30);
        MenuItem tranChauDuongDen = createMenuItem("Trân châu đường đen", "Thêm 1 phần", 8000, toppingCat, false, true, false, null, null);
        addRecipe(tranChauDuongDen, "Trân châu", 30);
        addRecipe(tranChauDuongDen, "Đường", 8);
        MenuItem thachTraiCay = createMenuItem("Thạch trái cây", "Thêm 1 phần", 4000, toppingCat, false, false, false, null, null);
        addRecipe(thachTraiCay, "Thạch trái cây", 30);
        MenuItem thachDua = createMenuItem("Thạch dừa", "Thêm 1 phần", 6000, toppingCat, false, false, false, null, null);
        addRecipe(thachDua, "Thạch dừa", 30);
        createMenuItem("Thạch phô mai", "Thêm 1 phần", 2000, toppingCat, false, false, true, null, null);
        MenuItem kemCheese = createMenuItem("Kem cheese (thêm)", "Thêm 1 phần", 10000, toppingCat, false, false, false, null, null);
        addRecipe(kemCheese, "Kem whip", 25);
        MenuItem pudding = createMenuItem("Pudding trứng (thêm)", "Thêm 1 phần", 8000, toppingCat, false, false, false, null, null);
        addRecipe(pudding, "Pudding trứng", 1);
        MenuItem flan = createMenuItem("Bánh flan (thêm)", "Thêm 1 phần", 10000, toppingCat, false, false, false, null, null);
        addRecipe(flan, "Bánh flan", 1);
        MenuItem nhaDam = createMenuItem("Nha đam (thêm)", "Thêm 1 phần", 6000, toppingCat, false, true, false, null, null);
        addRecipe(nhaDam, "Nha đam", 25);
        MenuItem suongSao = createMenuItem("Sương sáo (thêm)", "Thêm 1 phần", 5000, toppingCat, false, false, false, null, null);
        addRecipe(suongSao, "Sương sáo", 25);
        MenuItem botDauDo = createMenuItem("Bột đậu đỏ (thêm)", "Thêm 1 phần", 6000, toppingCat, false, false, false, null, null);
        addRecipe(botDauDo, "Bột đậu đỏ", 20);
        MenuItem kemTuoi = createMenuItem("Kem tươi (thêm)", "Thêm 1 phần", 7000, toppingCat, false, false, false, null, null);
        addRecipe(kemTuoi, "Kem whip", 20);

        log.info("Seeded {} menu items with recipes", menuItemRepository.count());
    }

    private MenuItem createMenuItem(String name, String description, double price, Category category, boolean drink,
            boolean badgeNew, boolean badgeBestSeller, String drinkSizesJson, String drinkToppingsJson) {
        MenuItem item = MenuItem.builder()
                .name(name)
                .description(description)
                .price(BigDecimal.valueOf(price))
                .available(true)
                .category(category)
                .drink(drink)
                .badgeNew(badgeNew)
                .badgeBestSeller(badgeBestSeller)
                .drinkSizesJson(drink ? drinkSizesJson : null)
                .drinkToppingsJson(drink ? drinkToppingsJson : null)
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
