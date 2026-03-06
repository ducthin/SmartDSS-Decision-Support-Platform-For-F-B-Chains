package C2SE._1.Capstone2.service.impl;

import C2SE._1.Capstone2.dto.RecipeDTO;
import C2SE._1.Capstone2.entity.Ingredient;
import C2SE._1.Capstone2.entity.MenuItem;
import C2SE._1.Capstone2.entity.Recipe;
import C2SE._1.Capstone2.exception.ResourceNotFoundException;
import C2SE._1.Capstone2.mapper.RecipeMapper;
import C2SE._1.Capstone2.repository.IngredientRepository;
import C2SE._1.Capstone2.repository.MenuItemRepository;
import C2SE._1.Capstone2.repository.RecipeRepository;
import C2SE._1.Capstone2.service.RecipeService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class RecipeServiceImpl implements RecipeService {

    private final RecipeRepository recipeRepository;
    private final MenuItemRepository menuItemRepository;
    private final IngredientRepository ingredientRepository;
    private final RecipeMapper recipeMapper;

    @Override
    @Transactional(readOnly = true)
    public List<RecipeDTO> getAllRecipes() {
        return recipeMapper.toDTOList(recipeRepository.findAll());
    }

    @Override
    @Transactional(readOnly = true)
    public List<RecipeDTO> getRecipesByMenuItemId(Long menuItemId) {
        return recipeMapper.toDTOList(recipeRepository.findByMenuItemId(menuItemId));
    }

    @Override
    public RecipeDTO createRecipe(RecipeDTO dto) {
        MenuItem menuItem = menuItemRepository.findById(dto.getMenuItemId())
                .orElseThrow(() -> new ResourceNotFoundException("MenuItem", "id", dto.getMenuItemId()));
        Ingredient ingredient = ingredientRepository.findById(dto.getIngredientId())
                .orElseThrow(() -> new ResourceNotFoundException("Ingredient", "id", dto.getIngredientId()));

        Recipe recipe = recipeMapper.toEntity(dto);
        recipe.setMenuItem(menuItem);
        recipe.setIngredient(ingredient);

        return recipeMapper.toDTO(recipeRepository.save(recipe));
    }

    @Override
    public RecipeDTO updateRecipe(Long id, RecipeDTO dto) {
        Recipe recipe = recipeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Recipe", "id", id));

        if (dto.getQuantity() != null) {
            recipe.setQuantity(dto.getQuantity());
        }
        if (dto.getIngredientId() != null) {
            Ingredient ingredient = ingredientRepository.findById(dto.getIngredientId())
                    .orElseThrow(() -> new ResourceNotFoundException("Ingredient", "id", dto.getIngredientId()));
            recipe.setIngredient(ingredient);
        }

        return recipeMapper.toDTO(recipeRepository.save(recipe));
    }

    @Override
    public void deleteRecipe(Long id) {
        if (!recipeRepository.existsById(id)) {
            throw new ResourceNotFoundException("Recipe", "id", id);
        }
        recipeRepository.deleteById(id);
    }
}
