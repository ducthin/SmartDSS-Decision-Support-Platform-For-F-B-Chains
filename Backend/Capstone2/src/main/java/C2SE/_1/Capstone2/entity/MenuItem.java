package C2SE._1.Capstone2.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "menu_items")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class MenuItem extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(length = 500)
    private String description;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal price;

    @Column(length = 500)
    private String imageUrl;

    @Builder.Default
    @Column(nullable = false)
    private Boolean available = true;

    /** When true, client must pick a size; optional toppings from {@link #drinkToppingsJson}. */
    @Builder.Default
    @Column(nullable = false)
    private Boolean drink = false;

    @Column(name = "drink_sizes_json", columnDefinition = "TEXT")
    private String drinkSizesJson;

    @Column(name = "drink_toppings_json", columnDefinition = "TEXT")
    private String drinkToppingsJson;

    @Builder.Default
    @Column(name = "badge_new", nullable = false)
    private Boolean badgeNew = false;

    @Builder.Default
    @Column(name = "badge_best_seller", nullable = false)
    private Boolean badgeBestSeller = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id", nullable = false)
    private Category category;

    @OneToMany(mappedBy = "menuItem", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<Recipe> recipes = new ArrayList<>();
}
