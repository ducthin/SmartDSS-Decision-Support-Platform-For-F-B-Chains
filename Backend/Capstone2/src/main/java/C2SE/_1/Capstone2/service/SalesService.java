package C2SE._1.Capstone2.service;

import C2SE._1.Capstone2.dto.SalesDTO;

import java.util.List;

public interface SalesService {

    List<SalesDTO> getAllSales();

    SalesDTO getSaleById(Long id);

    SalesDTO createSale(SalesDTO salesDTO);
}
