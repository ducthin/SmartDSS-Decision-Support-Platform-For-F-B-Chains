package C2SE._1.Capstone2.service.impl;

import C2SE._1.Capstone2.dto.MenuItemDTO;
import C2SE._1.Capstone2.dto.PageResponse;
import C2SE._1.Capstone2.entity.Category;
import C2SE._1.Capstone2.entity.MenuItem;
import C2SE._1.Capstone2.exception.ResourceNotFoundException;
import C2SE._1.Capstone2.mapper.MenuItemMapper;
import C2SE._1.Capstone2.repository.CategoryRepository;
import C2SE._1.Capstone2.repository.MenuItemRepository;
import C2SE._1.Capstone2.service.MenuService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class MenuServiceImpl implements MenuService {

    private final MenuItemRepository menuItemRepository;
    private final CategoryRepository categoryRepository;
    private final MenuItemMapper menuItemMapper;

    @Override
    @Transactional(readOnly = true)
    public List<MenuItemDTO> getAllMenuItems() {
        return menuItemMapper.toDTOList(menuItemRepository.findAll());
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<MenuItemDTO> getAllMenuItems(Pageable pageable) {
        Page<MenuItem> page = menuItemRepository.findAll(pageable);
        return PageResponse.of(page, menuItemMapper.toDTOList(page.getContent()));
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<MenuItemDTO> searchMenuItems(String keyword, Long categoryId, Boolean available, Pageable pageable) {
        Page<MenuItem> page = menuItemRepository.search(keyword, categoryId, available, pageable);
        return PageResponse.of(page, menuItemMapper.toDTOList(page.getContent()));
    }

    @Override
    @Transactional(readOnly = true)
    public MenuItemDTO getMenuItemById(Long id) {
        MenuItem menuItem = menuItemRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("MenuItem", "id", id));
        return menuItemMapper.toDTO(menuItem);
    }

    @Override
    public MenuItemDTO createMenuItem(MenuItemDTO dto) {
        Category category = categoryRepository.findById(dto.getCategoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Category", "id", dto.getCategoryId()));

        MenuItem menuItem = menuItemMapper.toEntity(dto);
        menuItem.setCategory(category);
        if (menuItem.getAvailable() == null) {
            menuItem.setAvailable(true);
        }

        return menuItemMapper.toDTO(menuItemRepository.save(menuItem));
    }

    @Override
    public MenuItemDTO updateMenuItem(Long id, MenuItemDTO dto) {
        MenuItem menuItem = menuItemRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("MenuItem", "id", id));

        menuItemMapper.updateEntityFromDTO(dto, menuItem);

        if (dto.getCategoryId() != null) {
            Category category = categoryRepository.findById(dto.getCategoryId())
                    .orElseThrow(() -> new ResourceNotFoundException("Category", "id", dto.getCategoryId()));
            menuItem.setCategory(category);
        }

        return menuItemMapper.toDTO(menuItemRepository.save(menuItem));
    }

    @Override
    public void deleteMenuItem(Long id) {
        if (!menuItemRepository.existsById(id)) {
            throw new ResourceNotFoundException("MenuItem", "id", id);
        }
        menuItemRepository.deleteById(id);
    }
}
