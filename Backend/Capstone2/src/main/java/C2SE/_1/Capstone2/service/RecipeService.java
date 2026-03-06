package C2SE._1.Capstone2.service;

import C2SE._1.Capstone2.dto.RecipeDTO;

import java.util.List;

public interface RecipeService {

    List<RecipeDTO> getAllRecipes();

    List<RecipeDTO> getRecipesByMenuItemId(Long menuItemId);

    RecipeDTO createRecipe(RecipeDTO recipeDTO);

    RecipeDTO updateRecipe(Long id, RecipeDTO recipeDTO);

    void deleteRecipe(Long id);
}
