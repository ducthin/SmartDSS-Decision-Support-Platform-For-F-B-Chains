package C2SE._1.Capstone2.service.impl;

import C2SE._1.Capstone2.dto.DiningTableDTO;
import C2SE._1.Capstone2.entity.DiningTable;
import C2SE._1.Capstone2.exception.DuplicateResourceException;
import C2SE._1.Capstone2.exception.ResourceNotFoundException;
import C2SE._1.Capstone2.mapper.DiningTableMapper;
import C2SE._1.Capstone2.repository.DiningTableRepository;
import C2SE._1.Capstone2.service.DiningTableService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class DiningTableServiceImpl implements DiningTableService {

    private final DiningTableRepository diningTableRepository;
    private final DiningTableMapper diningTableMapper;

    @Override
    @Transactional(readOnly = true)
    public List<DiningTableDTO> getAllTables() {
        return diningTableMapper.toDTOList(diningTableRepository.findAll());
    }

    @Override
    @Transactional(readOnly = true)
    public DiningTableDTO getTableById(Long id) {
        DiningTable table = diningTableRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("DiningTable", "id", id));
        return diningTableMapper.toDTO(table);
    }

    @Override
    public DiningTableDTO createTable(DiningTableDTO dto) {
        if (diningTableRepository.existsByName(dto.getName())) {
            throw new DuplicateResourceException("Bàn '" + dto.getName() + "' đã tồn tại");
        }
        DiningTable table = diningTableMapper.toEntity(dto);
        table.setQrToken(UUID.randomUUID().toString());
        if (table.getActive() == null) table.setActive(true);
        return diningTableMapper.toDTO(diningTableRepository.save(table));
    }

    @Override
    public DiningTableDTO updateTable(Long id, DiningTableDTO dto) {
        DiningTable table = diningTableRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("DiningTable", "id", id));
        if (diningTableRepository.existsByNameAndIdNot(dto.getName(), id)) {
            throw new DuplicateResourceException("Bàn '" + dto.getName() + "' đã tồn tại");
        }
        diningTableMapper.updateEntityFromDTO(dto, table);
        return diningTableMapper.toDTO(diningTableRepository.save(table));
    }

    @Override
    public void deleteTable(Long id) {
        if (!diningTableRepository.existsById(id)) {
            throw new ResourceNotFoundException("DiningTable", "id", id);
        }
        diningTableRepository.deleteById(id);
    }

    @Override
    public DiningTableDTO regenerateQrToken(Long id) {
        DiningTable table = diningTableRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("DiningTable", "id", id));
        table.setQrToken(UUID.randomUUID().toString());
        return diningTableMapper.toDTO(diningTableRepository.save(table));
    }
}
