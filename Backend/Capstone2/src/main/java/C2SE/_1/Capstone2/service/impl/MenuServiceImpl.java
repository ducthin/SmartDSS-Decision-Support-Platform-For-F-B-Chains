package C2SE._1.Capstone2.service.impl;

import C2SE._1.Capstone2.dto.MenuItemDTO;
import C2SE._1.Capstone2.dto.PageResponse;
import C2SE._1.Capstone2.entity.Category;
import C2SE._1.Capstone2.entity.MenuItem;
import C2SE._1.Capstone2.exception.BadRequestException;
import C2SE._1.Capstone2.exception.ResourceNotFoundException;
import C2SE._1.Capstone2.mapper.MenuItemMapper;
import C2SE._1.Capstone2.repository.CategoryRepository;
import C2SE._1.Capstone2.repository.MenuItemRepository;
import C2SE._1.Capstone2.service.MenuService;
import C2SE._1.Capstone2.util.DrinkOptionsJsonMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class MenuServiceImpl implements MenuService {

    private final MenuItemRepository menuItemRepository;
    private final CategoryRepository categoryRepository;
    private final MenuItemMapper menuItemMapper;
    private final DrinkOptionsJsonMapper drinkOptionsJsonMapper;

    @Override
    @Transactional(readOnly = true)
    public List<MenuItemDTO> getAllMenuItems() {
        return menuItemRepository.findAll().stream()
                .map(this::toDtoWithDrink)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<MenuItemDTO> getAllMenuItems(Pageable pageable) {
        Page<MenuItem> page = menuItemRepository.findAll(pageable);
        List<MenuItemDTO> content = page.getContent().stream()
                .map(this::toDtoWithDrink)
                .collect(Collectors.toList());
        return PageResponse.of(page, content);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<MenuItemDTO> searchMenuItems(String keyword, Long categoryId, Boolean available, Pageable pageable) {
        Page<MenuItem> page = menuItemRepository.search(keyword, categoryId, available, pageable);
        List<MenuItemDTO> content = page.getContent().stream()
                .map(this::toDtoWithDrink)
                .collect(Collectors.toList());
        return PageResponse.of(page, content);
    }

    @Override
    @Transactional(readOnly = true)
    public MenuItemDTO getMenuItemById(Long id) {
        MenuItem menuItem = menuItemRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("MenuItem", "id", id));
        return toDtoWithDrink(menuItem);
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
        applyDrinkJsonFromDto(dto, menuItem);

        MenuItem saved = menuItemRepository.save(menuItem);
        return toDtoWithDrink(saved);
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

        applyDrinkJsonFromDto(dto, menuItem);

        MenuItem saved = menuItemRepository.save(menuItem);
        return toDtoWithDrink(saved);
    }

    @Override
    public void deleteMenuItem(Long id) {
        if (!menuItemRepository.existsById(id)) {
            throw new ResourceNotFoundException("MenuItem", "id", id);
        }
        menuItemRepository.deleteById(id);
    }

    private MenuItemDTO toDtoWithDrink(MenuItem entity) {
        MenuItemDTO dto = menuItemMapper.toDTO(entity);
        drinkOptionsJsonMapper.attachDrinkLists(dto, entity);
        return dto;
    }

    /**
     * Persists drink size/topping JSON from DTO when {@code drink} is present on the request.
     */
    private void applyDrinkJsonFromDto(MenuItemDTO dto, MenuItem entity) {
        if (dto.getDrink() == null) {
            return;
        }
        entity.setDrink(Boolean.TRUE.equals(dto.getDrink()));
        if (!Boolean.TRUE.equals(entity.getDrink())) {
            entity.setDrinkSizesJson(null);
            entity.setDrinkToppingsJson(null);
            return;
        }
        if (dto.getDrinkSizes() == null || dto.getDrinkSizes().isEmpty()) {
            throw new BadRequestException("Đồ uống cần ít nhất một kích cỡ (size)");
        }
        entity.setDrinkSizesJson(drinkOptionsJsonMapper.toJsonSizes(dto.getDrinkSizes()));
        entity.setDrinkToppingsJson(drinkOptionsJsonMapper.toJsonToppings(
                dto.getDrinkToppings() != null ? dto.getDrinkToppings() : List.of()));
    }
}
