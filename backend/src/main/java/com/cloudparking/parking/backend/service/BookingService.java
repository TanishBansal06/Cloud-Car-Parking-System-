package com.cloudparking.parking.backend.service;

import com.cloudparking.parking.backend.dto.BookingRequest;
import com.cloudparking.parking.backend.entity.Booking;
import com.cloudparking.parking.backend.entity.ParkingSpace;
import com.cloudparking.parking.backend.enums.BookingStatus;
import com.cloudparking.parking.backend.enums.SpaceStatus;
import com.cloudparking.parking.backend.exception.ResourceNotFoundException;
import com.cloudparking.parking.backend.repository.BookingRepository;
import com.cloudparking.parking.backend.repository.ParkingSpaceRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class BookingService {

    private final BookingRepository bookingRepository;
    private final ParkingSpaceRepository spaceRepository;

    public BookingService(BookingRepository bookingRepository, ParkingSpaceRepository spaceRepository) {
        this.bookingRepository = bookingRepository;
        this.spaceRepository = spaceRepository;
    }

    @Transactional
    public Booking createBooking(BookingRequest request) {
        processExpiredBookings();

        if (request.getEndTime().isBefore(request.getStartTime()) || request.getEndTime().isEqual(request.getStartTime())) {
            throw new IllegalArgumentException("Booking end time must be strictly after start time.");
        }

        // Allow flexible timezone tolerance (e.g. UTC vs local time offsets)
        if (request.getStartTime().isBefore(LocalDateTime.now().minusHours(12))) {
            throw new IllegalArgumentException("Booking start time cannot be in the past.");
        }

        ParkingSpace space = spaceRepository.findById(request.getSpaceId())
                .orElseThrow(() -> new ResourceNotFoundException("Parking space with ID " + request.getSpaceId() + " not found."));

        if (space.getStatus() == SpaceStatus.MAINTENANCE) {
            throw new IllegalStateException("Parking space is currently under maintenance.");
        }

        boolean spaceOverlaps = bookingRepository.existsOverlappingBookingForSpace(
                request.getSpaceId(), request.getStartTime(), request.getEndTime());
        if (spaceOverlaps) {
            throw new IllegalArgumentException("Parking space " + space.getSpaceNumber() + " is already booked during the requested time slot. Please select a different slot.");
        }

        // Enforce 1 slot per person policy: same user cannot book more than one slot during the same time window
        boolean userOverlaps = bookingRepository.existsOverlappingBookingForUser(
                request.getUserEmail(), request.getStartTime(), request.getEndTime());
        if (userOverlaps) {
            throw new IllegalArgumentException("Reservation limit reached: User " + request.getUserEmail() + 
                    " already has an active reservation during this time window. Campus policy permits only one parking slot per person at a time.");
        }

        // Fee Calculation: (Duration in minutes / 60.0) * hourlyRate
        long minutes = Duration.between(request.getStartTime(), request.getEndTime()).toMinutes();
        double hours = Math.max(1.0, minutes / 60.0);
        double totalFee = hours * space.getParkingLot().getHourlyRate().doubleValue();

        Booking booking = new Booking();
        booking.setParkingSpace(space);
        booking.setUserEmail(request.getUserEmail());
        booking.setStartTime(request.getStartTime());
        booking.setEndTime(request.getEndTime());
        booking.setStatus(BookingStatus.CONFIRMED);
        booking.setCreatedAt(LocalDateTime.now());
        booking.setBookingReference("BK-" + System.currentTimeMillis());
        booking.setTotalAmount(totalFee);

        space.setStatus(SpaceStatus.RESERVED);
        spaceRepository.save(space);

        return bookingRepository.save(booking);
    }

    @Transactional
    public Booking cancelBooking(Long bookingId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking with ID " + bookingId + " not found."));

        if (booking.getStatus() == BookingStatus.CANCELLED) {
            throw new IllegalArgumentException("Booking is already cancelled.");
        }

        if (booking.getStatus() == BookingStatus.COMPLETED) {
            throw new IllegalArgumentException("Cannot cancel a completed booking.");
        }

        booking.setStatus(BookingStatus.CANCELLED);

        // Reset space status back to AVAILABLE
        ParkingSpace space = booking.getParkingSpace();
        space.setStatus(SpaceStatus.AVAILABLE);
        spaceRepository.save(space);

        return bookingRepository.save(booking);
    }

    @Scheduled(fixedRate = 10000)
    @Transactional
    public List<Booking> processExpiredBookings() {
        LocalDateTime now = LocalDateTime.now();
        List<Booking> expiredList = bookingRepository.findExpiredActiveBookings(now);
        for (Booking booking : expiredList) {
            booking.setStatus(BookingStatus.COMPLETED);
            ParkingSpace space = booking.getParkingSpace();
            if (space != null) {
                // If the space is currently marked RESERVED, ensure no other ongoing active reservation holds it
                if (space.getStatus() == SpaceStatus.RESERVED) {
                    boolean hasOverlappingActive = bookingRepository.existsOverlappingBookingForSpace(
                            space.getId(), now.minusMinutes(1), now.plusMinutes(1));
                    if (!hasOverlappingActive) {
                        space.setStatus(SpaceStatus.AVAILABLE);
                        spaceRepository.save(space);
                    }
                }
            }
            bookingRepository.save(booking);
        }
        return expiredList;
    }

    public List<Booking> getBookingsByUser(String userEmail) {
        processExpiredBookings();
        return bookingRepository.findByUserEmail(userEmail);
    }

    public List<Booking> getAllActiveBookings() {
        processExpiredBookings();
        return bookingRepository.findAllActiveBookings();
    }

    @Transactional
    public Booking releaseNoShow(Long bookingId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking with ID " + bookingId + " not found."));

        booking.setStatus(BookingStatus.CANCELLED);

        // Vacate parking space and set back to AVAILABLE
        ParkingSpace space = booking.getParkingSpace();
        if (space != null) {
            space.setStatus(SpaceStatus.AVAILABLE);
            spaceRepository.save(space);
        }

        return bookingRepository.save(booking);
    }

    @Transactional
    public Booking releaseNoShowBySpaceId(Long spaceId) {
        ParkingSpace space = spaceRepository.findById(spaceId)
                .orElseThrow(() -> new ResourceNotFoundException("Parking space with ID " + spaceId + " not found."));

        // Free the slot
        space.setStatus(SpaceStatus.AVAILABLE);
        spaceRepository.save(space);

        // Cancel any active bookings tied to this space
        List<Booking> active = bookingRepository.findActiveBookingsBySpaceId(spaceId);
        Booking cancelledBooking = null;
        for (Booking b : active) {
            b.setStatus(BookingStatus.CANCELLED);
            cancelledBooking = bookingRepository.save(b);
        }

        return cancelledBooking;
    }

    @Transactional
    public Booking reassignBooking(Long bookingId, String newEmail) {
        if (newEmail == null || newEmail.trim().isEmpty()) {
            throw new IllegalArgumentException("New student email cannot be empty.");
        }
        String cleanEmail = newEmail.trim().toLowerCase();
        if (!cleanEmail.endsWith("@thapar.edu")) {
            throw new IllegalArgumentException("Access restricted: Only official Thapar University email addresses (@thapar.edu) are permitted.");
        }

        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking with ID " + bookingId + " not found."));

        if (booking.getStatus() == BookingStatus.CANCELLED) {
            throw new IllegalStateException("Cannot reassign a cancelled reservation.");
        }

        // Check 1 slot per person policy
        boolean userOverlaps = bookingRepository.existsOverlappingBookingForUser(
                cleanEmail, booking.getStartTime(), booking.getEndTime());
        if (userOverlaps && !cleanEmail.equalsIgnoreCase(booking.getUserEmail())) {
            throw new IllegalArgumentException("Reservation limit reached: User " + cleanEmail + 
                    " already has an active reservation during this time window. Campus policy permits only one parking slot per person.");
        }

        booking.setUserEmail(cleanEmail);
        return bookingRepository.save(booking);
    }

    @Transactional
    public Booking reassignSpaceReservation(Long spaceId, String newEmail) {
        if (newEmail == null || newEmail.trim().isEmpty()) {
            throw new IllegalArgumentException("New student email cannot be empty.");
        }
        String cleanEmail = newEmail.trim().toLowerCase();
        if (!cleanEmail.endsWith("@thapar.edu")) {
            throw new IllegalArgumentException("Access restricted: Only official Thapar University email addresses (@thapar.edu) are permitted.");
        }

        ParkingSpace space = spaceRepository.findById(spaceId)
                .orElseThrow(() -> new ResourceNotFoundException("Parking space with ID " + spaceId + " not found."));

        List<Booking> active = bookingRepository.findActiveBookingsBySpaceId(spaceId);
        if (!active.isEmpty()) {
            return reassignBooking(active.get(0).getId(), cleanEmail);
        }

        // If slot was reserved manually without an active booking record, create a confirmed booking for the new user
        LocalDateTime start = LocalDateTime.now();
        LocalDateTime end = start.plusHours(2);

        boolean userOverlaps = bookingRepository.existsOverlappingBookingForUser(cleanEmail, start, end);
        if (userOverlaps) {
            throw new IllegalArgumentException("Reservation limit reached: User " + cleanEmail + 
                    " already has an active reservation during this time window.");
        }

        Booking booking = new Booking();
        booking.setParkingSpace(space);
        booking.setUserEmail(cleanEmail);
        booking.setStartTime(start);
        booking.setEndTime(end);
        booking.setStatus(BookingStatus.CONFIRMED);
        booking.setCreatedAt(LocalDateTime.now());
        booking.setBookingReference("BK-TRANS-" + System.currentTimeMillis());
        double rate = (space.getParkingLot() != null && space.getParkingLot().getHourlyRate() != null)
                ? space.getParkingLot().getHourlyRate().doubleValue() * 2.0 : 100.0;
        booking.setTotalAmount(rate);

        space.setStatus(SpaceStatus.RESERVED);
        spaceRepository.save(space);

        return bookingRepository.save(booking);
    }
}