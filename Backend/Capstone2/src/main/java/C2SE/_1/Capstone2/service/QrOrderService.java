package C2SE._1.Capstone2.service;

import C2SE._1.Capstone2.dto.DiningTableDTO;
import C2SE._1.Capstone2.dto.MenuItemDTO;
import C2SE._1.Capstone2.dto.OrderDTO;
import C2SE._1.Capstone2.dto.QrOrderDTO;
import C2SE._1.Capstone2.dto.QrStaffCallDTO;
import C2SE._1.Capstone2.dto.StaffCallDTO;

import java.util.List;

public interface QrOrderService {

    DiningTableDTO getTableInfo(String qrToken);

    List<MenuItemDTO> getMenuForTable(String qrToken);

    OrderDTO placeOrder(String qrToken, QrOrderDTO qrOrderDTO);

    List<OrderDTO> getTableOrders(String qrToken);

    StaffCallDTO callStaff(String qrToken, QrStaffCallDTO callDTO);
}
