package C2SE._1.Capstone2.service;

import C2SE._1.Capstone2.dto.MenuItemDTO;

import java.util.List;

public interface MenuService {

    List<MenuItemDTO> getAllMenuItems();

    MenuItemDTO getMenuItemById(Long id);

    MenuItemDTO createMenuItem(MenuItemDTO menuItemDTO);

    MenuItemDTO updateMenuItem(Long id, MenuItemDTO menuItemDTO);

    void deleteMenuItem(Long id);
}
