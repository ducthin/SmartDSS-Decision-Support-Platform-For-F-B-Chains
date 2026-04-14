package C2SE._1.Capstone2.controller;

import C2SE._1.Capstone2.dto.ApiResponse;
import C2SE._1.Capstone2.dto.RecipeDTO;
import C2SE._1.Capstone2.service.RecipeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/recipes")
@RequiredArgsConstructor
public class RecipeController {

    private final RecipeService recipeService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<RecipeDTO>>> getAllRecipes() {
        return ResponseEntity.ok(ApiResponse.success(recipeService.getAllRecipes()));
    }

    @GetMapping(params = "menuItemId")
    public ResponseEntity<ApiResponse<List<RecipeDTO>>> getRecipesByMenuItemId(@RequestParam Long menuItemId) {
        return ResponseEntity.ok(ApiResponse.success(recipeService.getRecipesByMenuItemId(menuItemId)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<RecipeDTO>> createRecipe(@Valid @RequestBody RecipeDTO recipeDTO) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(recipeService.createRecipe(recipeDTO)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<RecipeDTO>> updateRecipe(@PathVariable Long id, @Valid @RequestBody RecipeDTO recipeDTO) {
        return ResponseEntity.ok(ApiResponse.success(recipeService.updateRecipe(id, recipeDTO)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteRecipe(@PathVariable Long id) {
        recipeService.deleteRecipe(id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
