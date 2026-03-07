package C2SE._1.Capstone2.service;

import C2SE._1.Capstone2.dto.CategoryDTO;
import C2SE._1.Capstone2.dto.PageResponse;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface CategoryService {

    List<CategoryDTO> getAllCategories();

    PageResponse<CategoryDTO> getAllCategories(Pageable pageable);

    PageResponse<CategoryDTO> searchCategories(String keyword, Pageable pageable);

    CategoryDTO getCategoryById(Long id);

    CategoryDTO createCategory(CategoryDTO categoryDTO);

    CategoryDTO updateCategory(Long id, CategoryDTO categoryDTO);

    void deleteCategory(Long id);
}
