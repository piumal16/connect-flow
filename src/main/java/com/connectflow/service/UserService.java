package com.connectflow.service;

import com.connectflow.dto.CreateUserRequest;
import com.connectflow.dto.AdminDashboardStatsDTO;
import com.connectflow.dto.PageResponse;
import com.connectflow.dto.SuperAdminDashboardStatsDTO;
import com.connectflow.dto.UserDTO;
import com.connectflow.model.User;
import com.connectflow.model.UserRole;
import com.connectflow.repository.UserRepository;
import com.connectflow.repository.UserRoleRepository;
import com.connectflow.repository.BranchRepository;
import com.connectflow.repository.PawnTransactionRepository;
import com.connectflow.repository.InterestRateRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class UserService {

    private final UserRepository userRepository;
    private final UserRoleRepository userRoleRepository;
    private final BranchRepository branchRepository;
    private final PawnTransactionRepository pawnTransactionRepository;
    private final InterestRateRepository interestRateRepository;

    public AdminDashboardStatsDTO getAdminDashboardStats() {
        return AdminDashboardStatsDTO.builder()
                .managers(userRoleRepository.countByRole(UserRole.Role.MANAGER))
                .totalStaff(userRoleRepository.countByRole(UserRole.Role.STAFF))
                .activePawns(pawnTransactionRepository.countByStatus("Active"))
                .activeRates(interestRateRepository.countByIsActiveTrue())
                .build();
    }

    public SuperAdminDashboardStatsDTO getSuperAdminDashboardStats() {
        return SuperAdminDashboardStatsDTO.builder()
                .totalBranches(branchRepository.count())
                .pendingRequests(0L)
                .totalUsers(userRepository.count())
                .activeBranches(branchRepository.countByIsActiveTrue())
                .build();
    }

    /**
     * Get user by ID
     */
    public Optional<UserDTO> getUserById(UUID id) {
        return userRepository.findById(id).map(this::convertToDTO);
    }

    /**
     * Get user by email
     */
    public Optional<UserDTO> getUserByEmail(String email) {
        return userRepository.findByEmail(email).map(this::convertToDTO);
    }

    /**
     * Get all users
     */
    public List<UserDTO> getAllUsers() {
        return userRepository.findAll().stream()
            .map(this::convertToDTO)
            .collect(Collectors.toList());
    }

    /**
     * Get users by role
     */
    public List<UserDTO> getUsersByRole(UserRole.Role role) {
        return userRoleRepository.findByRole(role).stream()
            .map(userRole -> userRepository.findById(userRole.getUserId()))
            .filter(Optional::isPresent)
            .map(Optional::get)
            .map(this::convertToDTO)
            .collect(Collectors.toList());
    }

    /**
     * Get users in a branch
     */
    public List<UserDTO> getUsersByBranch(UUID branchId) {
        return userRoleRepository.findByBranchId(branchId).stream()
            .map(userRole -> userRepository.findById(userRole.getUserId()))
            .filter(Optional::isPresent)
            .map(Optional::get)
            .map(this::convertToDTO)
            .collect(Collectors.toList());
    }

    /**
     * Get all users with pagination
     */
    public PageResponse<UserDTO> getAllUsersPaginated(int page, int size, String sortBy, String sortDir) {
        Sort sort = sortDir.equalsIgnoreCase("desc")
            ? Sort.by(sortBy).descending()
            : Sort.by(sortBy).ascending();

        Pageable pageable = PageRequest.of(page, size, sort);
        Page<User> userPage = userRepository.findAll(pageable);

        List<UserDTO> content = userPage.getContent().stream()
            .map(this::convertToDTO)
            .collect(Collectors.toList());

        return new PageResponse<>(
            content,
            userPage.getNumber(),
            userPage.getSize(),
            userPage.getTotalElements(),
            userPage.getTotalPages(),
            userPage.isLast()
        );
    }

    /**
     * Filter users by name, email, role, and/or branch with pagination
     * Uses native @Query with optional parameters
     * Follows the same pattern as CustomerService and BlacklistService
     */
    public PageResponse<UserDTO> filterUsers(String name, String email, String role, String branch,
                                            int page, int size, String sortBy, String sortDir) {
        // Normalize inputs
        String normalizedName = name != null && !name.trim().isEmpty() ? name.trim() : null;
        String normalizedEmail = email != null && !email.trim().isEmpty() ? email.trim() : null;
        String normalizedRole = role != null && !role.trim().isEmpty() && !"all".equalsIgnoreCase(role)
                ? role.trim().toUpperCase()
                : null;
        String normalizedBranch = branch != null && !branch.trim().isEmpty() ? branch.trim() : null;

        log.info("Filtering users - name: {}, email: {}, role: {}, branch: {}, page: {}, size: {}",
                normalizedName, normalizedEmail, normalizedRole, normalizedBranch, page, size);

        // Convert branch name to branchId if provided
        UUID branchId = null;
        if (normalizedBranch != null) {
            // Search for branch by name - for simplicity, we'll pass null to search by branchId only
            // In a real scenario, you might want to add a separate query to find branch by name first
            log.info("Branch filter provided but not implemented yet: {}", normalizedBranch);
        }

        Sort sort = sortDir.equalsIgnoreCase("desc")
                ? Sort.by(sortBy).descending()
                : Sort.by(sortBy).ascending();

        Pageable pageable = PageRequest.of(page, size, sort);

        // Call repository filter method
        Page<User> userPage = userRepository.filterUsers(
                normalizedName,
                normalizedEmail,
                normalizedRole,
                branchId,
                pageable
        );

        List<UserDTO> content = userPage.getContent().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());

        log.info("Filter completed - found {} users", userPage.getTotalElements());

        return new PageResponse<>(
                content,
                userPage.getNumber(),
                userPage.getSize(),
                userPage.getTotalElements(),
                userPage.getTotalPages(),
                userPage.isLast()
        );
    }

    /**
     * Create a new user with role and branch assignment
     * This method inserts the user into the PROFILES table and creates role assignment
     */
    public UserDTO createUser(CreateUserRequest request) {
        log.info("Starting user creation process - Email: {}", request.getEmail());

        // Validate required fields
        if (request.getEmail() == null || request.getEmail().trim().isEmpty()) {
            throw new IllegalArgumentException("Email is required");
        }
        if (request.getPassword() == null || request.getPassword().trim().isEmpty()) {
            throw new IllegalArgumentException("Password is required");
        }
        if (request.getFullName() == null || request.getFullName().trim().isEmpty()) {
            throw new IllegalArgumentException("Full name is required");
        }
        if (request.getRole() == null) {
            throw new IllegalArgumentException("Role is required");
        }

        // Check if email already exists
        if (userRepository.findByEmail(request.getEmail().trim().toLowerCase()).isPresent()) {
            log.warn("User creation failed - Email already exists: {}", request.getEmail());
            throw new IllegalArgumentException("Email already exists");
        }

        // Create the user (will be inserted into PROFILES table)
        User user = User.builder()
            .id(UUID.randomUUID())
            .fullName(request.getFullName().trim())
            .email(request.getEmail().trim().toLowerCase())
            .phone(request.getPhone())
            .password(request.getPassword().trim())
            .build();

        User savedUser = userRepository.save(user);
        log.info("✅ User successfully inserted into PROFILES table - ID: {}, Email: {}, Full Name: {}",
            savedUser.getId(), savedUser.getEmail(), savedUser.getFullName());

        // Create user role assignment
        UserRole userRole = UserRole.builder()
            .userId(savedUser.getId())
            .role(request.getRole())
            .branchId(request.getBranchId())
            .build();

        userRoleRepository.save(userRole);
        log.info("✅ User role assigned - UserID: {}, Role: {}, BranchID: {}",
            savedUser.getId(), request.getRole(), request.getBranchId());

        UserDTO result = convertToDTO(savedUser);
        log.info("✅ User creation completed successfully - UserID: {}", savedUser.getId());
        return result;
    }

    /**
     * Authenticate a user by email and password
     */
    public Optional<UserDTO> authenticate(String email, String password) {
        if (email == null || password == null) {
            return Optional.empty();
        }
        String normalizedEmail = email.trim().toLowerCase();
        String normalizedPassword = password.trim();

        return userRepository.findByEmail(normalizedEmail)
            .filter(user -> normalizedPassword.equals(user.getPassword()))
            .map(this::convertToDTO);
    }

    /**
     * Set PIN for a user (typically for branch managers)
     */
    public UserDTO setPin(UUID userId, String pin) {
        if (pin == null || pin.trim().isEmpty()) {
            throw new IllegalArgumentException("PIN cannot be empty");
        }
        if (!pin.matches("^\\d{4,6}$")) {
            throw new IllegalArgumentException("PIN must be 4-6 digits");
        }

        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));

        user.setPin(pin.trim());
        User updated = userRepository.save(user);
        return convertToDTO(updated);
    }

    /**
     * Verify PIN for a user
     */
    public boolean verifyPin(UUID userId, String pin) {
        if (pin == null || pin.trim().isEmpty()) {
            throw new IllegalArgumentException("PIN cannot be empty");
        }

        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));

        if (user.getPin() == null || user.getPin().trim().isEmpty()) {
            throw new RuntimeException("User does not have a PIN set");
        }

        return pin.trim().equals(user.getPin());
    }

    /**
     * Check if user has a PIN set
     */
    public boolean hasPinSet(UUID userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));

        return user.getPin() != null && !user.getPin().trim().isEmpty();
    }

    /**
     * Convert User entity to UserDTO
     */
    private UserDTO convertToDTO(User user) {
        // Get user's primary role
        Optional<UserRole> userRole = userRoleRepository.findByUserId(user.getId()).stream().findFirst();

        UserRole.Role role = null;
        UUID branchId = null;
        String branch = null;

        if (userRole.isPresent()) {
            role = userRole.get().getRole();
            if (userRole.get().getBranchId() != null) {
                branchId = userRole.get().getBranchId();
                branch = branchRepository.findById(branchId)
                    .map(com.connectflow.model.Branch::getName)
                    .orElse(null);
            }
        }

        return UserDTO.builder()
            .id(user.getId())
            .fullName(user.getFullName())
            .email(user.getEmail())
            .phone(user.getPhone())
            .role(role)
            .branchId(branchId)
            .branch(branch)
            .createdAt(user.getCreatedAt())
            .updatedAt(user.getUpdatedAt())
            .build();
    }
}
