package C2SE._1.Capstone2.service;

import C2SE._1.Capstone2.dto.PageResponse;
import C2SE._1.Capstone2.dto.UserDTO;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface UserService {

    List<UserDTO> getAllUsers();

    PageResponse<UserDTO> getAllUsers(Pageable pageable);

    PageResponse<UserDTO> searchUsers(String keyword, Pageable pageable);

    UserDTO getUserById(Long id);

    UserDTO createUser(UserDTO userDTO);

    UserDTO updateUser(Long id, UserDTO userDTO);

    void deleteUser(Long id);
}
