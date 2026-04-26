package C2SE._1.Capstone2.repository;

import C2SE._1.Capstone2.entity.InvoiceRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface InvoiceRequestRepository extends JpaRepository<InvoiceRequest, Long> {
}
