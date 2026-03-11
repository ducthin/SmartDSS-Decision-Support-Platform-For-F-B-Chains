package C2SE._1.Capstone2.service.impl;

import C2SE._1.Capstone2.dto.UserDTO;
import C2SE._1.Capstone2.dto.PageResponse;
import C2SE._1.Capstone2.entity.Role;
import C2SE._1.Capstone2.entity.RoleName;
import C2SE._1.Capstone2.entity.User;
import C2SE._1.Capstone2.exception.DuplicateResourceException;
import C2SE._1.Capstone2.exception.ResourceNotFoundException;
import C2SE._1.Capstone2.mapper.UserMapper;
import C2SE._1.Capstone2.repository.RoleRepository;
import C2SE._1.Capstone2.repository.UserRepository;
import C2SE._1.Capstone2.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final UserMapper userMapper;

    @Override
    @Transactional(readOnly = true)
    public List<UserDTO> getAllUsers() {
        return userMapper.toDTOList(userRepository.findAll());
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<UserDTO> getAllUsers(Pageable pageable) {
        Page<User> page = userRepository.findAll(pageable);
        return PageResponse.of(page, userMapper.toDTOList(page.getContent()));
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<UserDTO> searchUsers(String keyword, Pageable pageable) {
        Page<User> page = userRepository.search(keyword, pageable);
        return PageResponse.of(page, userMapper.toDTOList(page.getContent()));
    }

    @Override
    @Transactional(readOnly = true)
    public UserDTO getUserById(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", id));
        return userMapper.toDTO(user);
    }

    @Override
    public UserDTO createUser(UserDTO userDTO) {
        if (userRepository.existsByUsername(userDTO.getUsername())) {
            throw new DuplicateResourceException("Username already exists: " + userDTO.getUsername());
        }
        if (userDTO.getEmail() != null && userRepository.existsByEmail(userDTO.getEmail())) {
            throw new DuplicateResourceException("Email already exists: " + userDTO.getEmail());
        }

        Role role = roleRepository.findByName(RoleName.valueOf(userDTO.getRoleName()))
                .orElseThrow(() -> new ResourceNotFoundException("Role", "name", userDTO.getRoleName()));

        User user = userMapper.toEntity(userDTO);
        user.setPassword(passwordEncoder.encode(userDTO.getPassword()));
        user.setRole(role);
        if (user.getActive() == null) {
            user.setActive(true);
        }

        return userMapper.toDTO(userRepository.save(user));
    }

    @Override
    public UserDTO updateUser(Long id, UserDTO userDTO) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", id));

        // Kiểm tra trùng username khi đổi username
        if (userDTO.getUsername() != null && !userDTO.getUsername().equals(user.getUsername())
                && userRepository.existsByUsername(userDTO.getUsername())) {
            throw new DuplicateResourceException("Username already exists: " + userDTO.getUsername());
        }
        // Kiểm tra trùng email khi đổi email
        if (userDTO.getEmail() != null && !userDTO.getEmail().equals(user.getEmail())
                && userRepository.existsByEmail(userDTO.getEmail())) {
            throw new DuplicateResourceException("Email already exists: " + userDTO.getEmail());
        }

        userMapper.updateEntityFromDTO(userDTO, user);

        if (userDTO.getPassword() != null && !userDTO.getPassword().isBlank()) {
            user.setPassword(passwordEncoder.encode(userDTO.getPassword()));
        }
        if (userDTO.getRoleName() != null) {
            Role role = roleRepository.findByName(RoleName.valueOf(userDTO.getRoleName()))
                    .orElseThrow(() -> new ResourceNotFoundException("Role", "name", userDTO.getRoleName()));
            user.setRole(role);
        }

        return userMapper.toDTO(userRepository.save(user));
    }

    @Override
    public void deleteUser(Long id) {
        if (!userRepository.existsById(id)) {
            throw new ResourceNotFoundException("User", "id", id);
        }
        userRepository.deleteById(id);
    }
}
