package com.connectflow.config;

import com.connectflow.model.Blacklist;
import com.connectflow.model.Branch;
import com.connectflow.model.Customer;
import com.connectflow.model.InterestRate;
import com.connectflow.model.ItemType;
import com.connectflow.model.PawnTransaction;
import com.connectflow.model.PawnTransactionItem;
import com.connectflow.model.PawnTransactionItemImage;
import com.connectflow.model.User;
import com.connectflow.model.UserRole;
import com.connectflow.repository.BlacklistRepository;
import com.connectflow.repository.BranchRepository;
import com.connectflow.repository.CustomerRepository;
import com.connectflow.repository.InterestRateRepository;
import com.connectflow.repository.ItemTypeRepository;
import com.connectflow.repository.PawnTransactionRepository;
import com.connectflow.repository.PawnTransactionItemRepository;
import com.connectflow.repository.PawnTransactionItemImageRepository;
import com.connectflow.repository.UserRepository;
import com.connectflow.repository.UserRoleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Configuration;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Slf4j
@Configuration
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final BranchRepository branchRepository;
    private final UserRepository userRepository;
    private final UserRoleRepository userRoleRepository;
    private final InterestRateRepository interestRateRepository;
    private final ItemTypeRepository itemTypeRepository;
    private final CustomerRepository customerRepository;
    private final BlacklistRepository blacklistRepository;
    private final PawnTransactionRepository pawnTransactionRepository;
    private final PawnTransactionItemRepository pawnTransactionItemRepository;
    private final PawnTransactionItemImageRepository pawnTransactionItemImageRepository;

    private BigDecimal resolveFirstMonthRate(BigDecimal transactionRatePercent, InterestRate linkedRate) {
        if (linkedRate != null
            && linkedRate.getRatePercent() != null
            && transactionRatePercent != null
            && linkedRate.getRatePercent().compareTo(transactionRatePercent) == 0
            && linkedRate.getFirstMonthRatePercent() != null) {
            return linkedRate.getFirstMonthRatePercent();
        }

        if (transactionRatePercent == null) {
            return new BigDecimal("0.00");
        }

        return transactionRatePercent.divide(new BigDecimal("12"), 2, RoundingMode.HALF_UP);
    }

    @Override
    public void run(String... args) {
        log.info("Starting data initialization...");

        // Ensure branches exist
        Branch mainBranch = branchRepository.findByIsActiveTrueOrderByName().stream()
            .filter(b -> "Main Branch".equalsIgnoreCase(b.getName()))
            .findFirst()
            .orElseGet(() -> {
                log.info("Creating Main Branch...");
                Branch saved = branchRepository.save(Branch.builder()
                    .name("Main Branch")
                    .address("123 Main Street")
                    .phone("+1-555-1000")
                    .isActive(true)
                    .build());
                log.info("Main Branch created with ID: {}", saved.getId());
                return saved;
            });

        log.info("Main Branch exists: {} (ID: {})", mainBranch.getName(), mainBranch.getId());

        Branch eastBranch = branchRepository.findByIsActiveTrueOrderByName().stream()
            .filter(b -> "East Branch".equalsIgnoreCase(b.getName()))
            .findFirst()
            .orElseGet(() -> {
                log.info("Creating East Branch...");
                Branch saved = branchRepository.save(Branch.builder()
                    .name("East Branch")
                    .address("456 East Avenue")
                    .phone("+1-555-1001")
                    .isActive(true)
                    .build());
                log.info("East Branch created with ID: {}", saved.getId());
                return saved;
            });

        log.info("East Branch exists: {} (ID: {})", eastBranch.getName(), eastBranch.getId());

        long branchCount = branchRepository.count();
        log.info("Total branches in database: {}", branchCount);

        // Initialize interest rates if they don't exist
        long rateCount = interestRateRepository.count();
        log.info("Existing interest rates count: {}", rateCount);

        if (rateCount == 0) {
            log.info("Creating sample interest rates...");

            interestRateRepository.save(InterestRate.builder()
                .name("Standard Rate")
                .ratePercent(new BigDecimal("8.50"))
                .isActive(true)
                .isDefault(true)
                .build());

            interestRateRepository.save(InterestRate.builder()
                .name("Premium Rate")
                .ratePercent(new BigDecimal("7.00"))
                .isActive(true)
                .isDefault(false)
                .build());

            interestRateRepository.save(InterestRate.builder()
                .name("High Value Rate")
                .ratePercent(new BigDecimal("6.50"))
                .isActive(true)
                .isDefault(false)
                .build());

            long finalRateCount = interestRateRepository.count();
            log.info("Created {} interest rates", finalRateCount);
        } else {
            log.info("Interest rates already exist, skipping creation");
        }

        // Initialize item types if they don't exist
        long itemTypeCount = itemTypeRepository.count();
        log.info("Existing item types count: {}", itemTypeCount);

        if (itemTypeCount == 0) {
            log.info("Creating sample item types...");

            itemTypeRepository.save(ItemType.builder()
                .name("Gold Ring")
                .description("Various types of gold rings (plain, with stones, wedding bands, etc.)")
                .isActive(true)
                .build());

            itemTypeRepository.save(ItemType.builder()
                .name("Gold Necklace")
                .description("Gold necklaces and chains of various lengths and designs")
                .isActive(true)
                .build());

            itemTypeRepository.save(ItemType.builder()
                .name("Gold Bracelet")
                .description("Gold bracelets, bangles, and arm jewelry")
                .isActive(true)
                .build());

            itemTypeRepository.save(ItemType.builder()
                .name("Gold Earrings")
                .description("All types of gold earrings (studs, hoops, danglers, etc.)")
                .isActive(true)
                .build());

            itemTypeRepository.save(ItemType.builder()
                .name("Gold Chain")
                .description("Gold chains for neck or body")
                .isActive(true)
                .build());

            itemTypeRepository.save(ItemType.builder()
                .name("Gold Pendant")
                .description("Gold pendants and lockets")
                .isActive(true)
                .build());

            itemTypeRepository.save(ItemType.builder()
                .name("Gold Bangle")
                .description("Traditional gold bangles and kadas")
                .isActive(true)
                .build());

            itemTypeRepository.save(ItemType.builder()
                .name("Gold Coin")
                .description("Gold coins and medallions")
                .isActive(true)
                .build());

            itemTypeRepository.save(ItemType.builder()
                .name("Gold Bar")
                .description("Gold bars and ingots")
                .isActive(true)
                .build());

            itemTypeRepository.save(ItemType.builder()
                .name("Gold Watch")
                .description("Watches made of or containing gold")
                .isActive(true)
                .build());

            itemTypeRepository.save(ItemType.builder()
                .name("Gold Anklet")
                .description("Gold anklets and foot jewelry")
                .isActive(true)
                .build());

            itemTypeRepository.save(ItemType.builder()
                .name("Gold Brooch")
                .description("Gold brooches and pins")
                .isActive(true)
                .build());

            itemTypeRepository.save(ItemType.builder()
                .name("Gold Nose Ring")
                .description("Nose rings and studs made of gold")
                .isActive(true)
                .build());

            itemTypeRepository.save(ItemType.builder()
                .name("Gold Ornament Set")
                .description("Complete jewelry sets (necklace, earrings, etc.)")
                .isActive(true)
                .build());

            itemTypeRepository.save(ItemType.builder()
                .name("Other Gold Item")
                .description("Other gold items not categorized above")
                .isActive(true)
                .build());

            long finalItemTypeCount = itemTypeRepository.count();
            log.info("Created {} item types", finalItemTypeCount);
        } else {
            log.info("Item types already exist, skipping creation");
        }

        // Only create users if they don't exist
        long userCount = userRepository.count();
        log.info("Existing users count: {}", userCount);

        if (userCount > 0) {
            log.info("Users already exist, skipping user creation");
            return;
        }

        log.info("Starting PROFILES table population with test users...");

        // Create users (will be inserted into PROFILES table)
        User superAdmin = userRepository.save(User.builder()
            .id(UUID.randomUUID())
            .fullName("Super Administrator")
            .email("superadmin@connectflow.com")
            .phone("+1-555-0100")
            .password("SuperAdmin@123")
            .build());
        log.info("SUPERADMIN user inserted into PROFILES table - ID: {}, Email: {}",
            superAdmin.getId(), superAdmin.getEmail());

        User admin = userRepository.save(User.builder()
            .id(UUID.randomUUID())
            .fullName("System Administrator")
            .email("admin@connectflow.com")
            .phone("+1-555-0101")
            .password("Admin@123")
            .build());
        log.info("ADMIN user inserted into PROFILES table - ID: {}, Email: {}",
            admin.getId(), admin.getEmail());

        User manager = userRepository.save(User.builder()
            .id(UUID.randomUUID())
            .fullName("Branch Manager")
            .email("manager@connectflow.com")
            .phone("+1-555-0102")
            .password("Manager@123")
            .build());
        log.info("MANAGER user inserted into PROFILES table - ID: {}, Email: {}",
            manager.getId(), manager.getEmail());

        User staff = userRepository.save(User.builder()
            .id(UUID.randomUUID())
            .fullName("Staff Member")
            .email("staff@connectflow.com")
            .phone("+1-555-0103")
            .password("Staff@123")
            .build());
        log.info("STAFF user inserted into PROFILES table - ID: {}, Email: {}",
            staff.getId(), staff.getEmail());

        log.info("All test users successfully inserted into PROFILES table");

        // Assign roles
        // SUPERADMIN - assign to Main Branch as default for operations
        userRoleRepository.save(UserRole.builder()
            .userId(superAdmin.getId())
            .role(UserRole.Role.SUPERADMIN)
            .branchId(mainBranch.getId())
            .build());

        // ADMIN - assign to Main Branch as default for operations
        userRoleRepository.save(UserRole.builder()
            .userId(admin.getId())
            .role(UserRole.Role.ADMIN)
            .branchId(mainBranch.getId())
            .build());

        // MANAGER - assign to Main Branch
        userRoleRepository.save(UserRole.builder()
            .userId(manager.getId())
            .role(UserRole.Role.MANAGER)
            .branchId(mainBranch.getId())
            .build());

        // STAFF - assign to East Branch
        userRoleRepository.save(UserRole.builder()
            .userId(staff.getId())
            .role(UserRole.Role.STAFF)
            .branchId(eastBranch.getId())
            .build());

        // Initialize blacklist entries
        long blacklistCount = blacklistRepository.count();
        log.info("Existing blacklist entries count: {}", blacklistCount);

        if (blacklistCount == 0) {
            log.info("Creating sample blacklist entries...");

            blacklistRepository.save(Blacklist.builder()
                .customerName("John Doe")
                .customerNic("123456789V")
                .reason("Fraudulent pawn transaction - fake gold items")
                .policeReportNumber("PR-2025-001")
                .policeReportDate(LocalDate.of(2025, 12, 15))
                .branchId(mainBranch.getId())
                .addedBy(manager.getId())
                .isActive(true)
                .build());

            blacklistRepository.save(Blacklist.builder()
                .customerName("Jane Smith")
                .customerNic("987654321V")
                .reason("Failed to repay loan - absconded")
                .policeReportNumber("PR-2025-002")
                .policeReportDate(LocalDate.of(2025, 11, 20))
                .branchId(eastBranch.getId())
                .addedBy(staff.getId())
                .isActive(true)
                .build());

            blacklistRepository.save(Blacklist.builder()
                .customerName("Mike Johnson")
                .customerNic("456789123V")
                .reason("Stolen items pawned - confirmed by police")
                .policeReportNumber("PR-2025-003")
                .policeReportDate(LocalDate.of(2026, 1, 10))
                .branchId(mainBranch.getId())
                .addedBy(admin.getId())
                .isActive(true)
                .build());

            blacklistRepository.save(Blacklist.builder()
                .customerName("Sarah Williams")
                .customerNic("789123456V")
                .reason("Multiple fraudulent transactions")
                .branchId(eastBranch.getId())
                .addedBy(manager.getId())
                .isActive(true)
                .build());

            blacklistRepository.save(Blacklist.builder()
                .customerName("David Brown")
                .customerNic("321654987V")
                .reason("Identity fraud - using fake NIC")
                .policeReportNumber("PR-2026-001")
                .policeReportDate(LocalDate.of(2026, 2, 1))
                .branchId(mainBranch.getId())
                .addedBy(superAdmin.getId())
                .isActive(false)
                .build());

            long finalBlacklistCount = blacklistRepository.count();
            log.info("Created {} blacklist entries", finalBlacklistCount);
        } else {
            log.info("Blacklist entries already exist, skipping creation");
        }

        // Initialize pawn transactions if they don't exist
        long transactionCount = pawnTransactionRepository.count();
        log.info("Existing pawn transactions count: {}", transactionCount);

        if (transactionCount == 0) {
            log.info("Creating sample pawn transactions...");

            // Create customers first
            Customer customer1 = customerRepository.save(Customer.builder()
                .fullName("Rajesh Kumar")
                .nic("852369741V")
                .phone("+94-77-1234567")
                .address("45 Temple Road, Colombo")
                .gender("Male")
                .customerType("Regular")
                .isActive(true)
                .build());

            Customer customer2 = customerRepository.save(Customer.builder()
                .fullName("Sita Perera")
                .nic("654987321V")
                .phone("+94-75-3216549")
                .address("89 Hill Street, Galle")
                .gender("Female")
                .customerType("Regular")
                .isActive(true)
                .build());

            Customer customer3 = customerRepository.save(Customer.builder()
                .fullName("Anita Silva")
                .nic("369852147V")
                .phone("+94-70-9876543")
                .address("12 Lake View, Kandy")
                .customerType("VIP")
                .isActive(true)
                .build());

            Customer customer4 = customerRepository.save(Customer.builder()
                .fullName("Hemantha Jayaweer")
                .nic("741258963V")
                .phone("+94-72-5555555")
                .address("56 Beach Road, Negombo")
                .gender("Male")
                .customerType("Regular")
                .isActive(true)
                .build());

            Customer customer5 = customerRepository.save(Customer.builder()
                .fullName("Kumar Fernando")
                .nic("987456123V")
                .phone("+94-77-8887777")
                .address("23 Market Street, Matara")
                .gender("Male")
                .customerType("Loyal")
                .isActive(true)
                .build());

            log.info("Created {} customers", 5);

            // Get interest rates (use the first two for sample transactions)
            List<InterestRate> allRates = interestRateRepository.findAll();
            InterestRate rate1 = allRates.isEmpty() ? null : allRates.get(0);
            InterestRate rate2 = allRates.size() > 1 ? allRates.get(1) : rate1;

            // Transaction 1 - Active
            BigDecimal txn1RatePercent = rate1 != null ? rate1.getRatePercent() : new BigDecimal("8.50");
            PawnTransaction txn1 = pawnTransactionRepository.save(PawnTransaction.builder()
                .pawnId("PW0001")
                .branchId(mainBranch.getId())
                .customerId(customer1.getId())
                .customer(customer1)
                .idType("NIC")
                .patternMode("A")
                .loanAmount(new BigDecimal("100000"))
                .remainingBalance(new BigDecimal("100000"))
                .interestRateId(rate1 != null ? rate1.getId() : null)
                .interestRatePercent(txn1RatePercent)
                .firstMonthInterestRatePercent(resolveFirstMonthRate(txn1RatePercent, rate1))
                .periodMonths(6)
                .pawnDate(LocalDate.now().minusDays(10))
                .maturityDate(LocalDate.now().plusMonths(6).minusDays(10))
                .status("Active")
                .remarks("High-quality gold item, excellent condition")
                .createdBy(manager.getId())
                .build());

            // Add items for Transaction 1
            PawnTransactionItem txn1Item = pawnTransactionItemRepository.save(PawnTransactionItem.builder()
                .transactionId(txn1.getId())
                .description("22K Gold Ring with Ruby Stone")
                .content("Ring")
                .condition("Excellent")
                .weightGrams(new BigDecimal("15.50"))
                .karat("22K")
                .appraisedValue(new BigDecimal("125000"))
                .itemOrder(0)
                .build());

            pawnTransactionItemImageRepository.save(PawnTransactionItemImage.builder()
                .itemId(txn1Item.getId())
                .transactionId(txn1.getId())
                .imageUrl("/uploads/pawn-transactions/PW0001_ring_01.jpg")
                .imageOrder(0)
                .build());

            pawnTransactionItemImageRepository.save(PawnTransactionItemImage.builder()
                .itemId(txn1Item.getId())
                .transactionId(txn1.getId())
                .imageUrl("/uploads/pawn-transactions/PW0001_ring_02.jpg")
                .imageOrder(1)
                .build());

            // Transaction 2 - Active
            BigDecimal txn2RatePercent = new BigDecimal("7.00");
            PawnTransaction txn2 = pawnTransactionRepository.save(PawnTransaction.builder()
                .pawnId("PW0002")
                .branchId(mainBranch.getId())
                .customerId(customer3.getId())
                .customer(customer3)
                .idType("NIC")
                .patternMode("A")
                .loanAmount(new BigDecimal("220000"))
                .remainingBalance(new BigDecimal("220000"))
                .interestRateId(rate1 != null ? rate1.getId() : null)
                .interestRatePercent(txn2RatePercent)
                .firstMonthInterestRatePercent(resolveFirstMonthRate(txn2RatePercent, rate1))
                .periodMonths(6)
                .pawnDate(LocalDate.now().minusDays(5))
                .maturityDate(LocalDate.now().plusMonths(6).minusDays(5))
                .status("Active")
                .remarks("VIP customer - reduced interest rate")
                .createdBy(staff.getId())
                .build());

            // Add items for Transaction 2
            PawnTransactionItem txn2Item = pawnTransactionItemRepository.save(PawnTransactionItem.builder()
                .transactionId(txn2.getId())
                .description("24K Gold Necklace")
                .content("Necklace")
                .condition("Good")
                .weightGrams(new BigDecimal("28.30"))
                .karat("24K")
                .appraisedValue(new BigDecimal("280000"))
                .itemOrder(0)
                .build());

            pawnTransactionItemImageRepository.save(PawnTransactionItemImage.builder()
                .itemId(txn2Item.getId())
                .transactionId(txn2.getId())
                .imageUrl("/uploads/pawn-transactions/PW0002_necklace_01.jpg")
                .imageOrder(0)
                .build());

            // Transaction 3 - Active (East Branch) - Multiple Items
            BigDecimal txn3RatePercent = rate2 != null ? rate2.getRatePercent() : new BigDecimal("10.00");
            PawnTransaction txn3 = pawnTransactionRepository.save(PawnTransaction.builder()
                .pawnId("PW0003")
                .branchId(eastBranch.getId())
                .customerId(customer4.getId())
                .customer(customer4)
                .idType("NIC")
                .patternMode("A")
                .loanAmount(new BigDecimal("280000"))
                .remainingBalance(new BigDecimal("280000"))
                .interestRateId(rate2 != null ? rate2.getId() : null)
                .interestRatePercent(txn3RatePercent)
                .firstMonthInterestRatePercent(resolveFirstMonthRate(txn3RatePercent, rate2))
                .periodMonths(12)
                .pawnDate(LocalDate.now().minusDays(15))
                .maturityDate(LocalDate.now().plusMonths(12).minusDays(15))
                .status("Active")
                .remarks("Customer requested 12-month loan period")
                .createdBy(staff.getId())
                .build());

            // Add first item for Transaction 3
            PawnTransactionItem txn3Item1 = pawnTransactionItemRepository.save(PawnTransactionItem.builder()
                .transactionId(txn3.getId())
                .description("22K Gold Bracelet")
                .content("Bracelet")
                .condition("Fair")
                .weightGrams(new BigDecimal("21.00"))
                .karat("22K")
                .appraisedValue(new BigDecimal("165000"))
                .itemOrder(0)
                .build());

            pawnTransactionItemImageRepository.save(PawnTransactionItemImage.builder()
                .itemId(txn3Item1.getId())
                .transactionId(txn3.getId())
                .imageUrl("/uploads/pawn-transactions/PW0003_bracelet_01.jpg")
                .imageOrder(0)
                .build());

            // Add second item for Transaction 3
            PawnTransactionItem txn3Item2 = pawnTransactionItemRepository.save(PawnTransactionItem.builder()
                .transactionId(txn3.getId())
                .description("18K Gold Pendant")
                .content("Pendant")
                .condition("Good")
                .weightGrams(new BigDecimal("12.50"))
                .karat("18K")
                .appraisedValue(new BigDecimal("115000"))
                .itemOrder(1)
                .build());

            pawnTransactionItemImageRepository.save(PawnTransactionItemImage.builder()
                .itemId(txn3Item2.getId())
                .transactionId(txn3.getId())
                .imageUrl("/uploads/pawn-transactions/PW0003_pendant_01.jpg")
                .imageOrder(0)
                .build());

            // Transaction 4 - Completed
            BigDecimal txn4RatePercent = new BigDecimal("8.50");
            PawnTransaction txn4 = pawnTransactionRepository.save(PawnTransaction.builder()
                .pawnId("PW0004")
                .branchId(mainBranch.getId())
                .customerId(customer2.getId())
                .customer(customer2)
                .idType("NIC")
                .patternMode("A")
                .loanAmount(new BigDecimal("45000"))
                .remainingBalance(new BigDecimal("0"))
                .interestRateId(rate1 != null ? rate1.getId() : null)
                .interestRatePercent(txn4RatePercent)
                .firstMonthInterestRatePercent(resolveFirstMonthRate(txn4RatePercent, rate1))
                .periodMonths(6)
                .pawnDate(LocalDate.now().minusMonths(7))
                .maturityDate(LocalDate.now().minusMonths(1))
                .status("Completed")
                .remarks("Loan repaid in full with interest")
                .createdBy(manager.getId())
                .build());

            // Add items for Transaction 4
            PawnTransactionItem txn4Item = pawnTransactionItemRepository.save(PawnTransactionItem.builder()
                .transactionId(txn4.getId())
                .description("18K Gold Earrings")
                .content("Earrings")
                .condition("Excellent")
                .weightGrams(new BigDecimal("8.50"))
                .karat("18K")
                .appraisedValue(new BigDecimal("60000"))
                .itemOrder(0)
                .build());

            pawnTransactionItemImageRepository.save(PawnTransactionItemImage.builder()
                .itemId(txn4Item.getId())
                .transactionId(txn4.getId())
                .imageUrl("/uploads/pawn-transactions/PW0004_earrings_01.jpg")
                .imageOrder(0)
                .build());

            // Transaction 5 - Active
            BigDecimal txn5RatePercent = new BigDecimal("7.50");
            PawnTransaction txn5 = pawnTransactionRepository.save(PawnTransaction.builder()
                .pawnId("PW0005")
                .branchId(eastBranch.getId())
                .customerId(customer5.getId())
                .customer(customer5)
                .idType("NIC")
                .patternMode("A")
                .loanAmount(new BigDecimal("130000"))
                .remainingBalance(new BigDecimal("130000"))
                .interestRateId(rate1 != null ? rate1.getId() : null)
                .interestRatePercent(txn5RatePercent)
                .firstMonthInterestRatePercent(resolveFirstMonthRate(txn5RatePercent, rate1))
                .periodMonths(6)
                .pawnDate(LocalDate.now().minusDays(2))
                .maturityDate(LocalDate.now().plusMonths(6).minusDays(2))
                .status("Active")
                .remarks("Loyal customer - preferential rate applied")
                .createdBy(staff.getId())
                .build());

            // Add items for Transaction 5
            PawnTransactionItem txn5Item = pawnTransactionItemRepository.save(PawnTransactionItem.builder()
                .transactionId(txn5.getId())
                .description("22K Gold Chain")
                .content("Chain")
                .condition("Good")
                .weightGrams(new BigDecimal("20.00"))
                .karat("22K")
                .appraisedValue(new BigDecimal("165000"))
                .itemOrder(0)
                .build());

            pawnTransactionItemImageRepository.save(PawnTransactionItemImage.builder()
                .itemId(txn5Item.getId())
                .transactionId(txn5.getId())
                .imageUrl("/uploads/pawn-transactions/PW0005_chain_01.jpg")
                .imageOrder(0)
                .build());

            long finalTransactionCount = pawnTransactionRepository.count();
            log.info("Created {} pawn transactions with items and images", finalTransactionCount);
        } else {
            log.info("Pawn transactions already exist, skipping creation");
        }
    }
}
