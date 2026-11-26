package com.cloudparking.parking.backend.controller;

import com.cloudparking.parking.backend.dto.SpaceRequest;
import com.cloudparking.parking.backend.entity.ParkingLot;
import com.cloudparking.parking.backend.entity.ParkingSpace;
import com.cloudparking.parking.backend.enums.SpaceStatus;
import com.cloudparking.parking.backend.repository.ParkingLotRepository;
import com.cloudparking.parking.backend.repository.ParkingSpaceRepository;
import com.cloudparking.parking.backend.service.BookingService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/spaces")
public class ParkingSpaceController {

    private final ParkingSpaceRepository spaceRepository;
    private final ParkingLotRepository lotRepository;
    private final BookingService bookingService;

    public ParkingSpaceController(ParkingSpaceRepository spaceRepository,
                                  ParkingLotRepository lotRepository,
                                  BookingService bookingService) {
        this.spaceRepository = spaceRepository;
        this.lotRepository = lotRepository;
        this.bookingService = bookingService;
    }

    // GET /api/spaces/lot/1 -> Returns all available spaces for Lot ID 1
    @GetMapping("/lot/{lotId}")
    public List<ParkingSpace> getSpacesByLot(@PathVariable Long lotId) {
        bookingService.processExpiredBookings();
        return spaceRepository.findByParkingLotIdAndStatus(lotId, SpaceStatus.AVAILABLE);
    }

    // GET /api/spaces/lot/1/all -> Returns ALL spaces for Lot ID 1 (Available, Reserved, Occupied, Maintenance)
    @GetMapping("/lot/{lotId}/all")
    public List<ParkingSpace> getAllSpacesByLot(@PathVariable Long lotId) {
        bookingService.processExpiredBookings();
        return spaceRepository.findByParkingLotId(lotId);
    }

    // PATCH /api/spaces/1/status?status=OCCUPIED -> Updates the status of a parking space
    @PatchMapping("/{spaceId}/status")
    public ParkingSpace updateSpaceStatus(@PathVariable Long spaceId, @RequestParam SpaceStatus status) {
        ParkingSpace space = spaceRepository.findById(spaceId)
                .orElseThrow(() -> new IllegalArgumentException("Parking space not found with ID: " + spaceId));

        // If setting space to AVAILABLE or MAINTENANCE, automatically cancel any active reservation
        // so the user's booking quota is freed and the slot can be booked again immediately.
        if (status == SpaceStatus.AVAILABLE) {
            bookingService.releaseNoShowBySpaceId(spaceId);
            space.setStatus(SpaceStatus.AVAILABLE);
        } else if (status == SpaceStatus.MAINTENANCE) {
            bookingService.releaseNoShowBySpaceId(spaceId);
            space.setStatus(SpaceStatus.MAINTENANCE);
            spaceRepository.save(space);
        } else {
            space.setStatus(status);
            spaceRepository.save(space);
        }

        return space;
    }

    // POST /api/spaces -> Adds a new space using JSON body
    @PostMapping
    public ParkingSpace addSpace(@RequestBody SpaceRequest request) {
        ParkingLot lot = lotRepository.findById(request.getLotId())
                .orElseThrow(() -> new IllegalArgumentException("Parking lot not found with ID: " + request.getLotId()));

        ParkingSpace space = new ParkingSpace(request.getSpaceNumber(), request.getType(), SpaceStatus.AVAILABLE, lot);
        return spaceRepository.save(space);
    }

    // GET /api/spaces/all -> Returns all spaces across all campus lots (Admin)
    @GetMapping("/all")
    public List<ParkingSpace> getAllSpaces() {
        bookingService.processExpiredBookings();
        return spaceRepository.findAll();
    }

    // DELETE /api/spaces/{spaceId} -> Deletes a space (Admin)
    @DeleteMapping("/{spaceId}")
    public ResponseEntity<Void> deleteSpace(@PathVariable Long spaceId) {
        if (!spaceRepository.existsById(spaceId)) {
            throw new IllegalArgumentException("Parking space not found with ID: " + spaceId);
        }
        bookingService.releaseNoShowBySpaceId(spaceId);
        spaceRepository.deleteById(spaceId);
        return ResponseEntity.noContent().build();
    }
}
