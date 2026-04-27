package C2SE._1.Capstone2.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

@Entity
@Table(
        name = "telegram_subscribers",
        uniqueConstraints = {
                @UniqueConstraint(columnNames = {"phone"}),
                @UniqueConstraint(columnNames = {"chat_id"})
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class TelegramSubscriber extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 20)
    private String phone;

    @Column(name = "chat_id", nullable = false, length = 64)
    private String chatId;

    @Column(name = "telegram_username", length = 128)
    private String telegramUsername;

    @Column(name = "telegram_full_name", length = 255)
    private String telegramFullName;
}
