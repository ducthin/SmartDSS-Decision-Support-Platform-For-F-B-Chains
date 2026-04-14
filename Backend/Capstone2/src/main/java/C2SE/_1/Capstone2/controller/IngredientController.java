package C2SE._1.Capstone2.controller;

import C2SE._1.Capstone2.dto.ApiResponse;
import C2SE._1.Capstone2.dto.IngredientDTO;
import C2SE._1.Capstone2.mapper.IngredientMapper;
import C2SE._1.Capstone2.repository.IngredientRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/ingredients")
@RequiredArgsConstructor
public class IngredientController {

    private final IngredientRepository ingredientRepository;
    private final IngredientMapper ingredientMapper;

    @GetMapping
    public ResponseEntity<ApiResponse<List<IngredientDTO>>> getAll() {
        List<IngredientDTO> list = ingredientMapper.toDTOList(ingredientRepository.findAll());
        return ResponseEntity.ok(ApiResponse.<List<IngredientDTO>>builder()
                .success(true).data(list).message("OK").build());
    }
}
