package com.connectflow.controller;

import com.connectflow.aop.ActivityLog;
import com.connectflow.dto.AdminDashboardStatsDTO;
import com.connectflow.dto.CreateUserRequest;
import com.connectflow.dto.PageResponse;
import com.connectflow.dto.SetPinRequest;
import com.connectflow.dto.SuperAdminDashboardStatsDTO;
import com.connectflow.dto.UserDTO;
import com.connectflow.dto.VerifyPinRequest;
import com.connectflow.model.UserRole;
import com.connectflow.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
@Tag(name = "Users", description = "User Management APIs")
public class UserController {

    private final UserService userService;

    @GetMapping
    @Operation(summary = "Get all users")
    public ResponseEntity<List<UserDTO>> getAllUsers() {
        List<UserDTO> users = userService.getAllUsers();
        return ResponseEntity.ok(users);
    }

    @GetMapping("/paginated")
    @Operation(summary = "Get users with pagination")
    public ResponseEntity<PageResponse<UserDTO>> getUsersPaginated(
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "10") int size,
        @RequestParam(defaultValue = "fullName") String sortBy,
        @RequestParam(defaultValue = "asc") String sortDir
    ) {
        PageResponse<UserDTO> response = userService.getAllUsersPaginated(page, size, sortBy, sortDir);
        return ResponseEntity.ok(response);
    }

    /**
     * Filter users by name, email, role, and/or branch with pagination
     * Follows the same pattern as Customer and Blacklist filter endpoints
     */
    @GetMapping("/filter")
    @Operation(summary = "Filter users by name, email, role, and/or branch with pagination")
    public ResponseEntity<PageResponse<UserDTO>> filterUsers(
            @RequestParam(required = false) String name,
            @RequestParam(required = false) String email,
            @RequestParam(required = false) String role,
            @RequestParam(required = false) String branch,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "fullName") String sortBy,
            @RequestParam(defaultValue = "asc") String sortDir) {
        log.info("GET /users/filter - name: {}, email: {}, role: {}, branch: {}, page: {}, size: {}",
                name, email, role, branch, page, size);

        PageResponse<UserDTO> response = userService.filterUsers(
                name, email, role, branch, page, size, sortBy, sortDir);

        log.info("Filter completed - found {} users", response.getTotalElements());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/email/{email}")
    @Operation(summary = "Get user by email")
    public ResponseEntity<UserDTO> getUserByEmail(@PathVariable String email) {
        Optional<UserDTO> user = userService.getUserByEmail(email);
        return user.map(ResponseEntity::ok)
            .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("/role/{role}")
    @Operation(summary = "Get users by role")
    public ResponseEntity<List<UserDTO>> getUsersByRole(@PathVariable UserRole.Role role) {
        List<UserDTO> users = userService.getUsersByRole(role);
        return ResponseEntity.ok(users);
    }

    @GetMapping("/branch/{branchId}")
    @Operation(summary = "Get users in a specific branch")
    public ResponseEntity<List<UserDTO>> getUsersByBranch(@PathVariable UUID branchId) {
        List<UserDTO> users = userService.getUsersByBranch(branchId);
        return ResponseEntity.ok(users);
    }

    @GetMapping("/dashboard-stats/admin")
    @Operation(summary = "Get admin dashboard stats")
    public ResponseEntity<?> getAdminDashboardStats() {
        Optional<UserDTO> currentUser = getAuthenticatedUser();
        if (currentUser.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        UserRole.Role role = currentUser.get().getRole();
        if (role != UserRole.Role.ADMIN && role != UserRole.Role.SUPERADMIN) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Only Admin and Super Admin can view admin dashboard stats"));
        }

        AdminDashboardStatsDTO response = userService.getAdminDashboardStats();
        return ResponseEntity.ok(response);
    }

    @GetMapping("/dashboard-stats/super-admin")
    @Operation(summary = "Get super admin dashboard stats")
    public ResponseEntity<?> getSuperAdminDashboardStats() {
        Optional<UserDTO> currentUser = getAuthenticatedUser();
        if (currentUser.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        UserRole.Role role = currentUser.get().getRole();
        if (role != UserRole.Role.SUPERADMIN) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Only Super Admin can view super admin dashboard stats"));
        }

        SuperAdminDashboardStatsDTO response = userService.getSuperAdminDashboardStats();
        return ResponseEntity.ok(response);
    }

    @PostMapping
    @Operation(summary = "Create a new user (will be inserted into PROFILES table)")
    @ActivityLog(action = "CREATE_USER", description = "Created new user")
    public ResponseEntity<UserDTO> createUser(@RequestBody CreateUserRequest request) {
        try {
            log.info("Received user creation request - Email: {}, Name: {}, Role: {}",
                request.getEmail(), request.getFullName(), request.getRole());

            UserDTO created = userService.createUser(request);

            log.info("API Response: User created successfully with ID: {}", created.getId());
            return ResponseEntity.status(HttpStatus.CREATED).body(created);
        } catch (IllegalArgumentException e) {
            log.error("User creation failed - Invalid input: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            log.error("User creation failed - Error: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // PIN Management Endpoints - Place these BEFORE generic /{id} endpoint
    @PatchMapping("/{id}/pin")
    @Operation(summary = "Set PIN for a user (typically branch manager)")
    public ResponseEntity<?> setPin(@PathVariable UUID id, @RequestBody SetPinRequest request) {
        try {
            UserDTO updated = userService.setPin(id, request.getPin());
            return ResponseEntity.ok(updated);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        }
    }

    @PostMapping("/{id}/verify-pin")
    @Operation(summary = "Verify PIN for a user")
    public ResponseEntity<?> verifyPin(@PathVariable UUID id, @RequestBody VerifyPinRequest request) {
        try {
            boolean isValid = userService.verifyPin(id, request.getPin());
            if (isValid) {
                return ResponseEntity.ok().body(new java.util.HashMap<String, Boolean>() {{
                    put("valid", true);
                }});
            } else {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid PIN");
            }
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        }
    }

    @GetMapping("/{id}/has-pin")
    @Operation(summary = "Check if user has a PIN set")
    public ResponseEntity<?> hasPinSet(@PathVariable UUID id) {
        try {
            boolean hasPinSet = userService.hasPinSet(id);
            return ResponseEntity.ok().body(new java.util.HashMap<String, Boolean>() {{
                put("hasPinSet", hasPinSet);
            }});
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        }
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get user by ID")
    public ResponseEntity<UserDTO> getUserById(@PathVariable UUID id) {
        Optional<UserDTO> user = userService.getUserById(id);
        return user.map(ResponseEntity::ok)
            .orElseGet(() -> ResponseEntity.notFound().build());
    }

    private Optional<UserDTO> getAuthenticatedUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getPrincipal() == null) {
            return Optional.empty();
        }
        return userService.getUserByEmail(authentication.getPrincipal().toString());
    }
}

