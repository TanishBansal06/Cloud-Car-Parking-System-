package com.cloudparking.parking.backend.controller;

import com.cloudparking.parking.backend.dto.BookingRequest;
import com.cloudparking.parking.backend.entity.Booking;
import com.cloudparking.parking.backend.service.BookingService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/bookings")
public class BookingController {

    private final BookingService bookingService;

    public BookingController(BookingService bookingService) {
        this.bookingService = bookingService;
    }

    @PostMapping
    public ResponseEntity<Booking> createBooking(@RequestBody BookingRequest request) {
        Booking booking = bookingService.createBooking(request);
        return new ResponseEntity<>(booking, HttpStatus.CREATED);
    }

    @PutMapping("/{id}/cancel")
    public ResponseEntity<Booking> cancelBooking(@PathVariable Long id) {
        Booking cancelledBooking = bookingService.cancelBooking(id);
        return ResponseEntity.ok(cancelledBooking);
    }

    @GetMapping
    public ResponseEntity<List<Booking>> getBookings(@RequestParam String email) {
        List<Booking> bookings = bookingService.getBookingsByUser(email);
        return ResponseEntity.ok(bookings);
    }

    // GET /api/bookings/active -> Returns all active campus bookings (Admin)
    @GetMapping("/active")
    public ResponseEntity<List<Booking>> getActiveBookings() {
        return ResponseEntity.ok(bookingService.getAllActiveBookings());
    }

    // PUT /api/bookings/{id}/no-show -> Admin releases a no-show user, cancels booking and frees slot
    @PutMapping("/{id}/no-show")
    public ResponseEntity<Booking> releaseNoShow(@PathVariable Long id) {
        Booking booking = bookingService.releaseNoShow(id);
        return ResponseEntity.ok(booking);
    }

    // PUT /api/bookings/{id}/reassign?newEmail=... -> Admin reassigns booking to another student
    @PutMapping("/{id}/reassign")
    public ResponseEntity<Booking> reassignBooking(@PathVariable Long id, @RequestParam String newEmail) {
        Booking booking = bookingService.reassignBooking(id, newEmail);
        return ResponseEntity.ok(booking);
    }

    // PUT /api/bookings/space/{spaceId}/release-noshow -> Releases no-show reservation on given space
    @PutMapping("/space/{spaceId}/release-noshow")
    public ResponseEntity<?> releaseSpaceNoShow(@PathVariable Long spaceId) {
        Booking booking = bookingService.releaseNoShowBySpaceId(spaceId);
        return ResponseEntity.ok(booking != null ? booking : java.util.Map.of("message", "Space " + spaceId + " freed and set to AVAILABLE"));
    }

    // PUT /api/bookings/space/{spaceId}/reassign?newEmail=... -> Reassigns space reservation to another student
    @PutMapping("/space/{spaceId}/reassign")
    public ResponseEntity<Booking> reassignSpaceReservation(@PathVariable Long spaceId, @RequestParam String newEmail) {
        Booking booking = bookingService.reassignSpaceReservation(spaceId, newEmail);
        return ResponseEntity.ok(booking);
    }
}
