package C2SE._1.Capstone2.repository;

import C2SE._1.Capstone2.entity.CustomerFeedback;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CustomerFeedbackRepository extends JpaRepository<CustomerFeedback, Long> {
    Page<CustomerFeedback> findAllByOrderByCreatedAtDesc(Pageable pageable);
}
