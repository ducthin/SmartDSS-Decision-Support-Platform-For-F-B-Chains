package C2SE._1.Capstone2.service.impl;

import C2SE._1.Capstone2.dto.CategoryDTO;
import C2SE._1.Capstone2.dto.PageResponse;
import C2SE._1.Capstone2.entity.Category;
import C2SE._1.Capstone2.exception.DuplicateResourceException;
import C2SE._1.Capstone2.exception.ResourceNotFoundException;
import C2SE._1.Capstone2.mapper.CategoryMapper;
import C2SE._1.Capstone2.repository.CategoryRepository;
import C2SE._1.Capstone2.service.CategoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class CategoryServiceImpl implements CategoryService {

    private final CategoryRepository categoryRepository;
    private final CategoryMapper categoryMapper;

    @Override
    @Transactional(readOnly = true)
    public List<CategoryDTO> getAllCategories() {
        return categoryMapper.toDTOList(categoryRepository.findAll());
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<CategoryDTO> getAllCategories(Pageable pageable) {
        Page<Category> page = categoryRepository.findAll(pageable);
        return PageResponse.of(page, categoryMapper.toDTOList(page.getContent()));
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<CategoryDTO> searchCategories(String keyword, Pageable pageable) {
        Page<Category> page = categoryRepository.findByNameContainingIgnoreCase(keyword, pageable);
        return PageResponse.of(page, categoryMapper.toDTOList(page.getContent()));
    }

    @Override
    @Transactional(readOnly = true)
    public CategoryDTO getCategoryById(Long id) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Category", "id", id));
        return categoryMapper.toDTO(category);
    }

    @Override
    public CategoryDTO createCategory(CategoryDTO categoryDTO) {
        if (categoryRepository.existsByName(categoryDTO.getName())) {
            throw new DuplicateResourceException("Category already exists: " + categoryDTO.getName());
        }

        Category category = categoryMapper.toEntity(categoryDTO);
        return categoryMapper.toDTO(categoryRepository.save(category));
    }

    @Override
    public CategoryDTO updateCategory(Long id, CategoryDTO categoryDTO) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Category", "id", id));

        // Kiểm tra trùng tên khi đổi tên category
        if (categoryDTO.getName() != null && !categoryDTO.getName().equals(category.getName())
                && categoryRepository.existsByNameAndIdNot(categoryDTO.getName(), id)) {
            throw new DuplicateResourceException("Danh mục '" + categoryDTO.getName() + "' đã tồn tại");
        }

        categoryMapper.updateEntityFromDTO(categoryDTO, category);
        return categoryMapper.toDTO(categoryRepository.save(category));
    }

    @Override
    public void deleteCategory(Long id) {
        if (!categoryRepository.existsById(id)) {
            throw new ResourceNotFoundException("Category", "id", id);
        }
        categoryRepository.deleteById(id);
    }
}
