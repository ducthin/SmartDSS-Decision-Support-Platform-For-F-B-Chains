package C2SE._1.Capstone2.repository;

import C2SE._1.Capstone2.entity.TelegramSubscriber;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface TelegramSubscriberRepository extends JpaRepository<TelegramSubscriber, Long> {
    Optional<TelegramSubscriber> findByPhone(String phone);
    Optional<TelegramSubscriber> findByChatId(String chatId);
}
