package com.cloudparking.parking.backend.config;

import com.cloudparking.parking.backend.entity.Booking;
import com.cloudparking.parking.backend.entity.ParkingLot;
import com.cloudparking.parking.backend.entity.ParkingSpace;
import com.cloudparking.parking.backend.entity.User;
import com.cloudparking.parking.backend.enums.BookingStatus;
import com.cloudparking.parking.backend.enums.Role;
import com.cloudparking.parking.backend.enums.SpaceStatus;
import com.cloudparking.parking.backend.enums.SpaceType;
import com.cloudparking.parking.backend.repository.BookingRepository;
import com.cloudparking.parking.backend.repository.ParkingLotRepository;
import com.cloudparking.parking.backend.repository.ParkingSpaceRepository;
import com.cloudparking.parking.backend.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Component
public class DataInitializer implements CommandLineRunner {

    private final ParkingLotRepository lotRepository;
    private final ParkingSpaceRepository spaceRepository;
    private final UserRepository userRepository;
    private final BookingRepository bookingRepository;
    private final PasswordEncoder passwordEncoder;

    public DataInitializer(ParkingLotRepository lotRepository,
                           ParkingSpaceRepository spaceRepository,
                           UserRepository userRepository,
                           BookingRepository bookingRepository,
                           PasswordEncoder passwordEncoder) {
        this.lotRepository = lotRepository;
        this.spaceRepository = spaceRepository;
        this.userRepository = userRepository;
        this.bookingRepository = bookingRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) throws Exception {
        // 1. Seed Initial Admin & User Accounts (@thapar.edu domain) if missing
        if (userRepository.count() == 0) {
            System.out.println("=== Seeding Initial Admin & User Accounts (@thapar.edu) ===");

            User admin = new User("Campus Admin", "admin@thapar.edu", passwordEncoder.encode("admin123"), Role.ROLE_ADMIN);
            userRepository.save(admin);

            User user = new User("Alex Student", "alex@thapar.edu", passwordEncoder.encode("user123"), Role.ROLE_USER);
            userRepository.save(user);

            System.out.println("Default Accounts Created:");
            System.out.println(" - ADMIN: admin@thapar.edu / admin123");
            System.out.println(" - USER:  alex@thapar.edu / user123");
        }

        // Ensure tbansal1_24@thapar.edu is always seeded as an active Campus Administrator
        User tbansal = userRepository.findByEmail("tbansal1_24@thapar.edu").orElse(null);
        if (tbansal == null) {
            tbansal = new User("Tanish Bansal", "tbansal1_24@thapar.edu", passwordEncoder.encode("admin123"), Role.ROLE_ADMIN);
            userRepository.save(tbansal);
            System.out.println("=== Campus Admin Account Created: tbansal1_24@thapar.edu / admin123 ===");
        } else if (tbansal.getRole() != Role.ROLE_ADMIN) {
            tbansal.setRole(Role.ROLE_ADMIN);
            userRepository.save(tbansal);
            System.out.println("=== User tbansal1_24@thapar.edu updated to ROLE_ADMIN ===");
        }

        // 2. Seed Campus Parking Data if missing
        if (lotRepository.count() == 0) {
            System.out.println("=== Seeding Campus Parking Data into MySQL ===");

            ParkingLot mainGate = saveLot("Main Gate Parking", "Main Gate Entrance", 70, "50.00");
            generateSpacesForLot(mainGate, "MG", 70);

            ParkingLot rdGate = saveLot("Research and Development Gate Parking", "R&D Gate Entrance", 30, "50.00");
            generateSpacesForLot(rdGate, "RD", 30);

            System.out.println("=== Campus Parking Data Successfully Seeded into MySQL! ===");
        }

        // 3. Seed initial sample active bookings for Admin demonstration if none exist
        if (bookingRepository.count() == 0) {
            ParkingSpace rd03 = spaceRepository.findAll().stream()
                    .filter(s -> "RD-03".equalsIgnoreCase(s.getSpaceNumber()))
                    .findFirst().orElse(null);
            if (rd03 != null) {
                Booking b1 = new Booking();
                b1.setParkingSpace(rd03);
                b1.setUserEmail("alex@thapar.edu");
                b1.setStartTime(LocalDateTime.now().minusMinutes(20));
                b1.setEndTime(LocalDateTime.now().plusHours(2));
                b1.setStatus(BookingStatus.CONFIRMED);
                b1.setCreatedAt(LocalDateTime.now().minusMinutes(20));
                b1.setBookingReference("BK-DEMO-RD03");
                b1.setTotalAmount(100.0);
                bookingRepository.save(b1);

                rd03.setStatus(SpaceStatus.RESERVED);
                spaceRepository.save(rd03);
            }

            ParkingSpace mg05 = spaceRepository.findAll().stream()
                    .filter(s -> "MG-05".equalsIgnoreCase(s.getSpaceNumber()))
                    .findFirst().orElse(null);
            if (mg05 != null) {
                Booking b2 = new Booking();
                b2.setParkingSpace(mg05);
                b2.setUserEmail("student_rohit@thapar.edu");
                b2.setStartTime(LocalDateTime.now().minusMinutes(45));
                b2.setEndTime(LocalDateTime.now().plusHours(1));
                b2.setStatus(BookingStatus.CONFIRMED);
                b2.setCreatedAt(LocalDateTime.now().minusMinutes(45));
                b2.setBookingReference("BK-DEMO-MG05");
                b2.setTotalAmount(75.0);
                bookingRepository.save(b2);

                mg05.setStatus(SpaceStatus.RESERVED);
                spaceRepository.save(mg05);
            }
            System.out.println("=== Demo Active Bookings Seeded for No-Show & Reassignment Management ===");
        }
    }

    private ParkingLot saveLot(String name, String address, int totalSpaces, String hourlyRate) {
        ParkingLot lot = new ParkingLot();
        lot.setName(name);
        lot.setAddress(address);
        lot.setTotalSpaces(totalSpaces);
        lot.setHourlyRate(new BigDecimal(hourlyRate));
        return lotRepository.save(lot);
    }

    private void generateSpacesForLot(ParkingLot lot, String prefix, int totalSlots) {
        for (int i = 1; i <= totalSlots; i++) {
            ParkingSpace space = new ParkingSpace();
            space.setParkingLot(lot);
            space.setSpaceNumber(prefix + "-" + String.format("%02d", i));

            if (i % 10 == 0) space.setType(SpaceType.EV_CHARGING);
            else if (i % 8 == 0) space.setType(SpaceType.HANDICAP);
            else if (i % 5 == 0) space.setType(SpaceType.COMPACT);
            else space.setType(SpaceType.STANDARD);

            space.setStatus(SpaceStatus.AVAILABLE);
            spaceRepository.save(space);
        }
    }
}