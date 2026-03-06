package C2SE._1.Capstone2.dto;

import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserDTO {
    private Long id;
    private String username;
    private String password;
    private String fullName;
    private String email;
    private String phone;
    private Boolean active;
    private String roleName;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
