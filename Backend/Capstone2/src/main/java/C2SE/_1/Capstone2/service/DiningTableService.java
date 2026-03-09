package C2SE._1.Capstone2.service;

import C2SE._1.Capstone2.dto.DiningTableDTO;

import C2SE._1.Capstone2.dto.PageResponse;

public interface DiningTableService {

    PageResponse<DiningTableDTO> getAllTables(int page, int size);

    DiningTableDTO getTableById(Long id);

    DiningTableDTO createTable(DiningTableDTO dto);

    DiningTableDTO updateTable(Long id, DiningTableDTO dto);

    void deleteTable(Long id);

    DiningTableDTO regenerateQrToken(Long id);
}
