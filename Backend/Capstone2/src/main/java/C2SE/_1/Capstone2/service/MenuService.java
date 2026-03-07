package C2SE._1.Capstone2.service;

import C2SE._1.Capstone2.dto.MenuItemDTO;
import C2SE._1.Capstone2.dto.PageResponse;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface MenuService {

    List<MenuItemDTO> getAllMenuItems();

    PageResponse<MenuItemDTO> getAllMenuItems(Pageable pageable);

    PageResponse<MenuItemDTO> searchMenuItems(String keyword, Long categoryId, Boolean available, Pageable pageable);

    MenuItemDTO getMenuItemById(Long id);

    MenuItemDTO createMenuItem(MenuItemDTO menuItemDTO);

    MenuItemDTO updateMenuItem(Long id, MenuItemDTO menuItemDTO);

    void deleteMenuItem(Long id);
}
