package C2SE._1.Capstone2.repository;

import C2SE._1.Capstone2.entity.Recipe;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RecipeRepository extends JpaRepository<Recipe, Long> {

    List<Recipe> findByMenuItemId(Long menuItemId);

    List<Recipe> findByIngredientId(Long ingredientId);
}
