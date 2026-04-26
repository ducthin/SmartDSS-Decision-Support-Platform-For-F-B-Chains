package C2SE._1.Capstone2.mapper;

import C2SE._1.Capstone2.dto.VoucherDTO;
import C2SE._1.Capstone2.entity.Voucher;
import C2SE._1.Capstone2.exception.BadRequestException;
import org.mapstruct.*;

import java.util.List;

@Mapper(componentModel = "spring")
public interface VoucherMapper {

    @Mapping(source = "discountType", target = "discountType", qualifiedByName = "discountTypeToString")
    VoucherDTO toDTO(Voucher voucher);

    List<VoucherDTO> toDTOList(List<Voucher> vouchers);

    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "usedCount", ignore = true)
    @Mapping(source = "discountType", target = "discountType", qualifiedByName = "stringToDiscountType")
    Voucher toEntity(VoucherDTO dto);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "usedCount", ignore = true)
    @Mapping(source = "discountType", target = "discountType", qualifiedByName = "stringToDiscountType")
    void updateEntityFromDTO(VoucherDTO dto, @MappingTarget Voucher voucher);

    @Named("discountTypeToString")
    default String discountTypeToString(Voucher.DiscountType type) {
        return type == null ? null : type.name();
    }

    @Named("stringToDiscountType")
    default Voucher.DiscountType stringToDiscountType(String type) {
        if (type == null || type.isBlank()) {
            return null;
        }
        try {
            return Voucher.DiscountType.valueOf(type.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new BadRequestException("Loại voucher không hợp lệ: " + type);
        }
    }
}
