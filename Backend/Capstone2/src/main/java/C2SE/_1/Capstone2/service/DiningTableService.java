package C2SE._1.Capstone2.service;

import C2SE._1.Capstone2.dto.DiningTableDTO;

import java.util.List;

public interface DiningTableService {

    List<DiningTableDTO> getAllTables();

    DiningTableDTO getTableById(Long id);

    DiningTableDTO createTable(DiningTableDTO dto);

    DiningTableDTO updateTable(Long id, DiningTableDTO dto);

    void deleteTable(Long id);

    DiningTableDTO regenerateQrToken(Long id);
}
