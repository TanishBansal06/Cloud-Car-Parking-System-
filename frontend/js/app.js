/**
 * CloudPark 3D - Application Controller
 * Handles UI interactions, modal controls, state management, and backend synchronization.
 */

class CloudParkApp {
    constructor() {
        window.app = this;
        this.currentLotId = 1;
        this.lots = [];
        this.spaces = [];
        this.filteredSpaces = [];
        this.adminAllSpaces = [];
        this.adminFilter = { lotId: 'ALL', status: 'ALL', search: '' };
        this.selectedSpace = null;
        this.engine = null;
        this.simulationTimer = null;
        this.isSimulating = false;

        this.filterState = {
            type: 'ALL',
            status: 'ALL',
            search: ''
        };

        this.init();
    }

    async init() {
        this.init3D();
        this.initDOM();
        this.updateAuthUI();

        try {
            await this.loadLots();
            await this.loadSpaces(this.currentLotId);
            this.showToast('Connected to CloudPark Backend', 'success');
        } catch (err) {
            console.error('Initialization error:', err);
            this.showToast('Backend offline or initializing - using mock campus data', 'warning');
            this.fallbackMockData();
        }
    }

    init3D() {
        this.engine = new Parking3DEngine('canvas-container', {
            onSlotSelect: (space) => this.handleSlotSelected(space),
            onHoverChange: (space, event) => this.handleSlotHover(space, event)
        });
    }

    initDOM() {
        // Camera View Buttons
        document.querySelectorAll('.cam-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.cam-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const view = btn.dataset.view;
                this.engine.setCameraPreset(view);
            });
        });

        // Day/Night Toggle
        const dayNightBtn = document.getElementById('day-night-toggle');
        if (dayNightBtn) {
            dayNightBtn.addEventListener('click', () => {
                const isNight = this.engine.toggleDayNight();
                dayNightBtn.innerHTML = isNight 
                    ? '<i class="fa-solid fa-moon"></i> Night' 
                    : '<i class="fa-solid fa-sun"></i> Day';
            });
        }

        // Simulation Toggle
        const simBtn = document.getElementById('simulation-toggle');
        if (simBtn) {
            simBtn.addEventListener('click', () => this.toggleSimulation());
        }

        // Search Bar
        const searchInput = document.getElementById('search-space-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterState.search = e.target.value.trim().toUpperCase();
                this.applyFilters();
            });
        }

        // Type Filter Pills
        document.querySelectorAll('.filter-pill[data-type]').forEach(pill => {
            pill.addEventListener('click', () => {
                document.querySelectorAll('.filter-pill[data-type]').forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
                this.filterState.type = pill.dataset.type;
                this.applyFilters();
            });
        });

        // Status Filter Pills
        document.querySelectorAll('.filter-pill[data-status]').forEach(pill => {
            pill.addEventListener('click', () => {
                document.querySelectorAll('.filter-pill[data-status]').forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
                this.filterState.status = pill.dataset.status;
                this.applyFilters();
            });
        });

        // Drawer Close
        const drawerClose = document.getElementById('drawer-close-btn');
        if (drawerClose) {
            drawerClose.addEventListener('click', () => this.closeDrawer());
        }

        // Reservation Timing Mode Toggle (Now vs Advance)
        const timingNowBtn = document.getElementById('timing-mode-now');
        const timingAdvanceBtn = document.getElementById('timing-mode-advance');
        const advanceGroup = document.getElementById('advance-time-group');
        const startTimeInput = document.getElementById('booking-start-time');

        if (timingNowBtn && timingAdvanceBtn) {
            timingNowBtn.addEventListener('click', () => {
                timingNowBtn.classList.add('active');
                timingAdvanceBtn.classList.remove('active');
                advanceGroup.classList.add('hidden');
            });

            timingAdvanceBtn.addEventListener('click', () => {
                timingAdvanceBtn.classList.add('active');
                timingNowBtn.classList.remove('active');
                advanceGroup.classList.remove('hidden');

                // Default to 1 hour from now formatted for datetime-local
                const inOneHour = new Date(Date.now() + 60 * 60 * 1000);
                const localISO = new Date(inOneHour.getTime() - inOneHour.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
                startTimeInput.value = localISO;
                startTimeInput.min = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
            });
        }

        // Booking Duration Buttons
        document.querySelectorAll('.duration-chip[data-hours]').forEach(chip => {
            chip.addEventListener('click', () => {
                document.querySelectorAll('.duration-chip[data-hours]').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                const hours = parseInt(chip.dataset.hours, 10);
                this.updateBookingCalculation(hours);
            });
        });

        // Confirm Booking Button
        const confirmBtn = document.getElementById('confirm-booking-btn');
        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => this.handleBookingSubmit());
        }

        // Auth Buttons
        const loginBtn = document.getElementById('nav-login-btn');
        if (loginBtn) {
            loginBtn.addEventListener('click', () => this.openModal('auth-modal'));
        }

        const logoutBtn = document.getElementById('nav-logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.handleLogout());
        }

        const userBadge = document.getElementById('nav-user-badge');
        if (userBadge) {
            userBadge.addEventListener('click', () => {
                if (confirm(`Do you want to sign out from ${api.user ? api.user.name : 'Campus Account'}?`)) {
                    this.handleLogout();
                }
            });
        }

        const adminPanelLogoutBtn = document.getElementById('admin-panel-logout-btn');
        if (adminPanelLogoutBtn) {
            adminPanelLogoutBtn.addEventListener('click', () => this.handleLogout());
        }

        const analyticsLogoutBtn = document.getElementById('analytics-logout-btn');
        if (analyticsLogoutBtn) {
            analyticsLogoutBtn.addEventListener('click', () => this.handleLogout());
        }

        const ticketViewBookings = document.getElementById('ticket-view-bookings-btn');
        if (ticketViewBookings) {
            ticketViewBookings.addEventListener('click', () => {
                this.closeModal('ticket-modal');
                this.openMyBookings();
            });
        }

        const myBookingsBtn = document.getElementById('nav-my-bookings-btn');
        if (myBookingsBtn) {
            myBookingsBtn.addEventListener('click', () => this.openMyBookings());
        }

        const analyticsBtn = document.getElementById('nav-analytics-btn');
        if (analyticsBtn) {
            analyticsBtn.addEventListener('click', () => this.openAnalytics());
        }

        // 1-Click Demo Login Shortcuts (Logs in immediately)
        const autoLogin = async (email, password) => {
            try {
                await api.login(email, password);
                this.closeModal('auth-modal');
                this.updateAuthUI();
                this.showToast(`Signed in as ${api.user.name}!`, 'success');
                if (this.selectedSpace) {
                    this.handleSlotSelected(this.selectedSpace);
                }
            } catch (err) {
                this.showToast('Login failed: ' + err.message, 'error');
            }
        };

        const demoTbansalBtn = document.getElementById('demo-tbansal-btn');
        if (demoTbansalBtn) {
            demoTbansalBtn.addEventListener('click', () => autoLogin('tbansal1_24@thapar.edu', 'admin123'));
        }

        const demoStudentBtn = document.getElementById('demo-student-btn');
        if (demoStudentBtn) {
            demoStudentBtn.addEventListener('click', () => autoLogin('alex@thapar.edu', 'user123'));
        }

        const demoAdminBtn = document.getElementById('demo-admin-btn');
        if (demoAdminBtn) {
            demoAdminBtn.addEventListener('click', () => autoLogin('admin@thapar.edu', 'admin123'));
        }

        const adminPanelBtn = document.getElementById('nav-admin-panel-btn');
        if (adminPanelBtn) {
            adminPanelBtn.addEventListener('click', () => this.openAdminPanel());
        }

        const quickStudentBtn = document.getElementById('drawer-quick-student-login');
        if (quickStudentBtn) {
            quickStudentBtn.addEventListener('click', () => autoLogin('alex@thapar.edu', 'user123'));
        }

        const viewExistingBookingBtn = document.getElementById('drawer-view-existing-booking-btn');
        if (viewExistingBookingBtn) {
            viewExistingBookingBtn.addEventListener('click', () => {
                this.closeDrawer();
                this.openMyBookings();
            });
        }

        const findAvailBtn = document.getElementById('find-available-slot-btn');
        if (findAvailBtn) {
            findAvailBtn.addEventListener('click', () => {
                const nextAvail = this.spaces.find(s => s.status === 'AVAILABLE');
                if (nextAvail) {
                    this.engine.selectSlot(nextAvail.id);
                    this.showToast(`Selected available slot ${nextAvail.spaceNumber}`, 'info');
                } else {
                    this.showToast('No available slots in this lot! Try switching lots.', 'warning');
                }
            });
        }

        // Auth Form Submit
        const authForm = document.getElementById('auth-form');
        if (authForm) {
            authForm.addEventListener('submit', (e) => this.handleAuthSubmit(e));
        }

        // Auth Tabs (Login vs Register)
        document.querySelectorAll('.auth-tab-btn').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.auth-tab-btn').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                const mode = tab.dataset.mode;
                const nameField = document.getElementById('auth-name-group');
                const submitBtn = document.getElementById('auth-submit-btn');

                if (mode === 'register') {
                    nameField.classList.remove('hidden');
                    submitBtn.textContent = 'Create Campus Account';
                } else {
                    nameField.classList.add('hidden');
                    submitBtn.textContent = 'Sign In';
                }
            });
        });

        // Add Space Form (Admin Analytics Modal)
        const addSpaceForm = document.getElementById('admin-add-space-form');
        if (addSpaceForm) {
            addSpaceForm.addEventListener('submit', (e) => this.handleAddSpaceSubmit(e));
        }

        // Dedicated Admin Panel Controls
        const panelAddForm = document.getElementById('panel-add-space-form');
        if (panelAddForm) {
            panelAddForm.addEventListener('submit', (e) => this.handlePanelAddSpace(e));
        }

        const panelSearch = document.getElementById('admin-panel-search');
        if (panelSearch) {
            panelSearch.addEventListener('input', (e) => {
                this.adminFilter.search = e.target.value.trim().toUpperCase();
                this.renderAdminTable();
            });
        }

        const panelLotFilter = document.getElementById('admin-panel-lot-filter');
        if (panelLotFilter) {
            panelLotFilter.addEventListener('change', (e) => {
                this.adminFilter.lotId = e.target.value;
                this.renderAdminTable();
            });
        }

        const panelStatusFilter = document.getElementById('admin-panel-status-filter');
        if (panelStatusFilter) {
            panelStatusFilter.addEventListener('change', (e) => {
                this.adminFilter.status = e.target.value;
                this.renderAdminTable();
            });
        }

        const panelRefreshBtn = document.getElementById('admin-panel-refresh-btn');
        if (panelRefreshBtn) {
            panelRefreshBtn.addEventListener('click', () => this.loadAdminPanelData());
        }

        // Admin Tab Buttons
        const tabSlotsBtn = document.getElementById('admin-tab-slots-btn');
        const tabBookingsBtn = document.getElementById('admin-tab-bookings-btn');
        if (tabSlotsBtn) {
            tabSlotsBtn.addEventListener('click', () => this.switchAdminTab('slots'));
        }
        if (tabBookingsBtn) {
            tabBookingsBtn.addEventListener('click', () => this.switchAdminTab('bookings'));
        }

        const refreshBookingsBtn = document.getElementById('admin-refresh-bookings-btn');
        if (refreshBookingsBtn) {
            refreshBookingsBtn.addEventListener('click', () => this.loadAdminPanelData());
        }

        // Reassign Form & Cancel
        const reassignForm = document.getElementById('admin-reassign-form');
        if (reassignForm) {
            reassignForm.addEventListener('submit', (e) => this.handleReassignSubmit(e));
        }
        const reassignCancelBtn = document.getElementById('reassign-cancel-btn');
        if (reassignCancelBtn) {
            reassignCancelBtn.addEventListener('click', () => {
                const modal = document.getElementById('admin-reassign-modal');
                if (modal) modal.classList.remove('active');
            });
        }
        const reassignCloseBtn = document.getElementById('reassign-close-btn');
        if (reassignCloseBtn) {
            reassignCloseBtn.addEventListener('click', () => {
                const modal = document.getElementById('admin-reassign-modal');
                if (modal) modal.classList.remove('active');
            });
        }

        // Generic Modal Close Buttons
        document.querySelectorAll('.modal-close-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal-overlay');
                if (modal) modal.classList.remove('active');
            });
        });
    }

    async loadLots() {
        this.lots = await api.getLots();
        const lotSelector = document.getElementById('lot-selector-container');
        if (!lotSelector || !this.lots.length) return;

        lotSelector.innerHTML = this.lots.map(lot => `
            <button class="lot-pill-btn ${lot.id === this.currentLotId ? 'active' : ''}" data-lot-id="${lot.id}">
                <i class="fa-solid fa-square-parking"></i>
                <div class="lot-info">
                    <span class="lot-title">${lot.name}</span>
                    <span class="lot-sub">${lot.totalSpaces} Slots • ₹${lot.hourlyRate}/hr</span>
                </div>
            </button>
        `).join('');

        lotSelector.querySelectorAll('.lot-pill-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                lotSelector.querySelectorAll('.lot-pill-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentLotId = parseInt(btn.dataset.lotId, 10);
                this.closeDrawer();
                await this.loadSpaces(this.currentLotId);
                this.engine.setCameraPreset('isometric');
            });
        });
    }

    async loadSpaces(lotId) {
        try {
            this.spaces = await api.getSpacesForLot(lotId);
            this.applyFilters();
            this.updateStatsCounters();
        } catch (error) {
            console.error('Failed to load spaces from backend:', error);
            this.showToast('Could not load slots: ' + error.message, 'error');
        }
    }

    applyFilters() {
        let result = [...this.spaces];

        if (this.filterState.type !== 'ALL') {
            result = result.filter(s => s.type === this.filterState.type);
        }

        if (this.filterState.status !== 'ALL') {
            result = result.filter(s => s.status === this.filterState.status);
        }

        if (this.filterState.search) {
            result = result.filter(s => s.spaceNumber.includes(this.filterState.search));
        }

        this.filteredSpaces = result;
        this.engine.loadSpaces(this.filteredSpaces);
    }

    updateStatsCounters() {
        const total = this.spaces.length;
        const available = this.spaces.filter(s => s.status === 'AVAILABLE').length;
        const reserved = this.spaces.filter(s => s.status === 'RESERVED').length;
        const occupied = this.spaces.filter(s => s.status === 'OCCUPIED').length;

        document.getElementById('stat-total-count').textContent = total;
        document.getElementById('stat-avail-count').textContent = available;
        document.getElementById('stat-res-count').textContent = reserved;
        document.getElementById('stat-occ-count').textContent = occupied;
    }

    handleSlotHover(space, event) {
        const tooltip = document.getElementById('slot-3d-tooltip');
        if (!space) {
            tooltip.style.opacity = '0';
            return;
        }

        tooltip.innerHTML = `
            <div class="tooltip-header">
                <span class="slot-badge">${space.spaceNumber}</span>
                <span class="status-badge ${space.status.toLowerCase()}">${space.status}</span>
            </div>
            <div class="tooltip-meta">
                <span><i class="fa-solid fa-car"></i> ${space.type.replace('_', ' ')}</span>
                <span><i class="fa-solid fa-indian-rupee-sign"></i> ₹${space.parkingLot ? space.parkingLot.hourlyRate : '50'}/hr</span>
            </div>
        `;
        tooltip.style.left = `${event.clientX + 16}px`;
        tooltip.style.top = `${event.clientY - 42}px`;
        tooltip.style.opacity = '1';
    }

    handleSlotSelected(space) {
        this.selectedSpace = space;
        const drawer = document.getElementById('slot-detail-drawer');
        if (!drawer) return;

        // Populate Drawer Details
        document.getElementById('drawer-slot-number').textContent = space.spaceNumber;
        document.getElementById('drawer-lot-name').textContent = space.parkingLot ? space.parkingLot.name : 'Campus Lot';
        document.getElementById('drawer-space-type').textContent = space.type.replace('_', ' ');

        const statusEl = document.getElementById('drawer-space-status');
        statusEl.textContent = space.status;
        statusEl.className = `status-badge ${space.status.toLowerCase()}`;

        const hourlyRate = space.parkingLot ? space.parkingLot.hourlyRate : 50;
        document.getElementById('drawer-hourly-rate').textContent = `₹${hourlyRate} / hr`;

        // Switch modes: Available (Show Booking Form) vs Occupied/Reserved
        const bookingSection = document.getElementById('drawer-booking-section');
        const occupiedSection = document.getElementById('drawer-occupied-section');
        const adminStatusSection = document.getElementById('drawer-admin-status-section');
        const loginPrompt = document.getElementById('drawer-login-prompt');

        if (space.status === 'AVAILABLE') {
            bookingSection.classList.remove('hidden');
            occupiedSection.classList.add('hidden');
            if (!api.user) {
                loginPrompt?.classList.remove('hidden');
                document.getElementById('drawer-active-booking-banner')?.classList.add('hidden');
            } else {
                loginPrompt?.classList.add('hidden');
                // Check if user already holds an active booking (1 slot per person policy)
                api.getUserBookings(api.user.email).then(bookings => {
                    const activeBooking = bookings && bookings.find(b => b.status === 'CONFIRMED' || b.status === 'ACTIVE');
                    const banner = document.getElementById('drawer-active-booking-banner');
                    if (activeBooking && banner) {
                        banner.classList.remove('hidden');
                        const msg = document.getElementById('drawer-active-booking-msg');
                        if (msg) {
                            msg.textContent = `You already hold active Space ${activeBooking.parkingSpace ? activeBooking.parkingSpace.spaceNumber : ''} (Ref: ${activeBooking.bookingReference}). Campus policy permits only 1 slot per person.`;
                        }
                    } else if (banner) {
                        banner.classList.add('hidden');
                    }
                }).catch(() => {});
            }
            this.updateBookingCalculation(2); // default 2 hours
        } else {
            bookingSection.classList.add('hidden');
            occupiedSection.classList.remove('hidden');
            document.getElementById('occupied-status-text').textContent = `Slot ${space.spaceNumber} is currently ${space.status}. Pick another green slot or auto-select below.`;
        }

        // Admin controls in drawer
        if (api.user && api.user.role === 'ROLE_ADMIN') {
            adminStatusSection.classList.remove('hidden');
            document.getElementById('admin-toggle-occupied-btn').onclick = () => this.toggleSpaceStatus(space.id, 'OCCUPIED');
            document.getElementById('admin-toggle-avail-btn').onclick = () => this.toggleSpaceStatus(space.id, 'AVAILABLE');
            document.getElementById('admin-toggle-maint-btn').onclick = () => this.toggleSpaceStatus(space.id, 'MAINTENANCE');
        } else {
            adminStatusSection.classList.add('hidden');
        }

        drawer.classList.add('active');
    }

    closeDrawer() {
        const drawer = document.getElementById('slot-detail-drawer');
        if (drawer) drawer.classList.remove('active');
    }

    updateBookingCalculation(hours) {
        if (!this.selectedSpace) return;
        const rate = (this.selectedSpace.parkingLot && this.selectedSpace.parkingLot.hourlyRate) 
            ? parseFloat(this.selectedSpace.parkingLot.hourlyRate) 
            : 50.0;
        const total = (hours * rate).toFixed(2);

        document.getElementById('calc-hours-label').textContent = `${hours} hr${hours > 1 ? 's' : ''}`;
        document.getElementById('calc-total-fee').textContent = `₹${total}`;

        const btnText = document.getElementById('confirm-booking-btn-text');
        if (btnText) {
            btnText.textContent = api.user 
                ? `Confirm & Reserve Slot ${this.selectedSpace.spaceNumber} • ₹${total}`
                : `Sign In to Reserve Slot ${this.selectedSpace.spaceNumber}`;
        }
    }

    async handleBookingSubmit() {
        if (!this.selectedSpace) return;

        if (!api.user) {
            this.showToast(`Please sign in with your @thapar.edu account to reserve Slot ${this.selectedSpace.spaceNumber}`, 'warning');
            this.openModal('auth-modal');
            return;
        }

        const confirmBtn = document.getElementById('confirm-booking-btn');
        const originalHtml = confirmBtn ? confirmBtn.innerHTML : '';
        if (confirmBtn) {
            confirmBtn.disabled = true;
            confirmBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Reserving Slot ${this.selectedSpace.spaceNumber}...`;
        }

        const activeChip = document.querySelector('.duration-chip[data-hours].active');
        const hours = activeChip ? parseInt(activeChip.dataset.hours, 10) : 2;

        let startDateTime;
        const isAdvance = document.getElementById('timing-mode-advance')?.classList.contains('active');
        const advanceInput = document.getElementById('booking-start-time');

        if (isAdvance && advanceInput && advanceInput.value) {
            startDateTime = new Date(advanceInput.value);
            if (isNaN(startDateTime.getTime())) {
                this.showToast('Please select a valid advance date & time', 'warning');
                if (confirmBtn) { confirmBtn.disabled = false; confirmBtn.innerHTML = originalHtml; }
                return;
            }
            if (startDateTime < new Date(Date.now() - 5 * 60000)) {
                this.showToast('Scheduled arrival cannot be in the past', 'warning');
                if (confirmBtn) { confirmBtn.disabled = false; confirmBtn.innerHTML = originalHtml; }
                return;
            }
        } else {
            startDateTime = new Date();
        }

        const pad = (n) => String(n).padStart(2, '0');
        const formatLocal = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

        const startTime = formatLocal(startDateTime);
        const endDateTime = new Date(startDateTime.getTime() + hours * 60 * 60 * 1000);
        const endTime = formatLocal(endDateTime);

        const plateInput = document.getElementById('booking-plate-number');
        const plate = plateInput?.value.trim() || 'PB 11 AB 1234';

        try {
            const booking = await api.createBooking(
                this.selectedSpace.id,
                api.user.email,
                startTime,
                endTime
            );

            this.closeDrawer();

            // Populate and show the stylish Booking Ticket Pass!
            const ticketSlot = document.getElementById('ticket-slot-num');
            if (ticketSlot) ticketSlot.textContent = this.selectedSpace.spaceNumber;
            const ticketLot = document.getElementById('ticket-lot-name');
            if (ticketLot) ticketLot.textContent = this.selectedSpace.parkingLot ? this.selectedSpace.parkingLot.name : 'Campus Lot';
            const ticketRef = document.getElementById('ticket-ref');
            if (ticketRef) ticketRef.textContent = booking.bookingReference;
            const ticketPlate = document.getElementById('ticket-plate');
            if (ticketPlate) ticketPlate.textContent = plate;
            const ticketTime = document.getElementById('ticket-time');
            if (ticketTime) ticketTime.textContent = `${this.formatDateTime(booking.startTime)} → ${this.formatDateTime(booking.endTime)} (${hours}h)`;
            const ticketFee = document.getElementById('ticket-fee');
            if (ticketFee) ticketFee.textContent = `₹${booking.totalAmount.toFixed(2)}`;
            
            this.openModal('ticket-modal');
            this.showToast(`🎉 Slot ${this.selectedSpace.spaceNumber} reserved! Ref: ${booking.bookingReference}`, 'success');

            // Refresh spaces to reflect 3D car parking instantly!
            const bookedSpaceId = this.selectedSpace.id;
            await this.loadSpaces(this.currentLotId);
            this.engine.selectSlot(bookedSpaceId);
        } catch (err) {
            console.error('Booking submission error:', err);
            const isLimitError = err.message && (err.message.includes('already has an active reservation') || err.message.includes('Reservation limit'));
            if (isLimitError) {
                this.showToast('⚠️ Reservation blocked: You already hold an active booking! Campus policy permits only 1 slot per person. Check "My Reservations" to view or cancel.', 'warning');
            } else {
                this.showToast('Booking failed: ' + err.message, 'error');
            }
        } finally {
            if (confirmBtn) {
                confirmBtn.disabled = false;
                confirmBtn.innerHTML = originalHtml;
                this.updateBookingCalculation(hours);
            }
        }
    }

    async toggleSpaceStatus(spaceId, newStatus) {
        try {
            await api.updateSpaceStatus(spaceId, newStatus);
            this.showToast(`Slot updated to ${newStatus}`, 'success');
            await this.loadSpaces(this.currentLotId);
            this.closeDrawer();
        } catch (err) {
            this.showToast('Failed to update status: ' + err.message, 'error');
        }
    }

    async openMyBookings() {
        if (!api.user) {
            this.openModal('auth-modal');
            return;
        }

        const listContainer = document.getElementById('my-bookings-list');
        listContainer.innerHTML = '<div class="loader-box"><i class="fa-solid fa-spinner fa-spin"></i> Loading reservations...</div>';
        this.openModal('my-bookings-modal');

        try {
            const bookings = await api.getUserBookings(api.user.email);
            if (!bookings || bookings.length === 0) {
                listContainer.innerHTML = '<div class="empty-state"><i class="fa-solid fa-ticket"></i><p>No active reservations found for ' + api.user.email + '</p></div>';
                return;
            }

            listContainer.innerHTML = bookings.map(b => `
                <div class="booking-card">
                    <div class="booking-card-top">
                        <span class="booking-ref">${b.bookingReference}</span>
                        <span class="status-badge ${b.status.toLowerCase()}">${b.status}</span>
                    </div>
                    <div class="booking-card-mid">
                        <div class="meta-item">
                            <span class="meta-label">Slot</span>
                            <span class="meta-val">${b.parkingSpace ? b.parkingSpace.spaceNumber : 'N/A'}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Time Interval</span>
                            <span class="meta-val">${this.formatDateTime(b.startTime)} → ${this.formatDateTime(b.endTime)}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Fee Paid</span>
                            <span class="meta-val fee">₹${b.totalAmount}</span>
                        </div>
                    </div>
                    ${(b.status === 'CONFIRMED' || b.status === 'ACTIVE') ? `
                        <div class="booking-card-actions">
                            <button class="btn btn-outline-danger cancel-booking-btn" data-id="${b.id}">
                                <i class="fa-solid fa-ban"></i> Cancel Reservation
                            </button>
                        </div>
                    ` : ''}
                </div>
            `).join('');

            listContainer.querySelectorAll('.cancel-booking-btn').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const id = btn.dataset.id;
                    if (confirm('Are you sure you want to cancel this booking?')) {
                        try {
                            await api.cancelBooking(id);
                            this.showToast('Reservation cancelled. Space restored.', 'success');
                            await this.openMyBookings();
                            await this.loadSpaces(this.currentLotId);
                        } catch (err) {
                            this.showToast('Cancellation error: ' + err.message, 'error');
                        }
                    }
                });
            });
        } catch (err) {
            listContainer.innerHTML = '<div class="error-msg">Error loading bookings: ' + err.message + '</div>';
        }
    }

    async openAnalytics() {
        this.openModal('analytics-modal');
        const lot = this.lots.find(l => l.id === this.currentLotId) || this.lots[0];
        document.getElementById('analytics-lot-title').textContent = lot ? lot.name : 'Campus Lot';

        try {
            const [occ, rev] = await Promise.all([
                api.getLotOccupancy(this.currentLotId),
                api.getLotRevenue(this.currentLotId)
            ]);

            document.getElementById('analytics-occupancy-rate').textContent = `${occ.occupancyRate}%`;
            document.getElementById('analytics-gauge-fill').style.width = `${occ.occupancyRate}%`;
            document.getElementById('analytics-occ-available').textContent = occ.available;
            document.getElementById('analytics-occ-reserved').textContent = occ.reserved;
            document.getElementById('analytics-occ-occupied').textContent = occ.occupied;
            document.getElementById('analytics-occ-maint').textContent = occ.maintenance;

            document.getElementById('analytics-revenue-amount').textContent = `₹${rev.totalRevenue}`;
            document.getElementById('analytics-bookings-count').textContent = rev.totalBookings;
        } catch (err) {
            console.error('Analytics load error:', err);
            this.showToast('Failed to load live analytics: ' + err.message, 'error');
        }
    }

    async handleAddSpaceSubmit(e) {
        e.preventDefault();
        const spaceNumber = document.getElementById('admin-new-space-num').value.trim();
        const type = document.getElementById('admin-new-space-type').value;

        if (!spaceNumber) return;

        try {
            await api.addSpace(this.currentLotId, spaceNumber, type);
            this.showToast(`Created new space ${spaceNumber}!`, 'success');
            document.getElementById('admin-new-space-num').value = '';
            await this.loadSpaces(this.currentLotId);
        } catch (err) {
            this.showToast('Error adding space: ' + err.message, 'error');
        }
    }

    async openAdminPanel() {
        this.openModal('admin-panel-modal');
        const user = api.user;
        const sub = document.getElementById('admin-panel-user-sub');
        if (sub && user) {
            sub.textContent = `Administrator: ${user.name} (${user.email})`;
        }
        await this.loadAdminPanelData();
    }

    async loadAdminPanelData() {
        try {
            // Populate lots dropdowns
            const lotSelect = document.getElementById('panel-new-lot');
            const lotFilter = document.getElementById('admin-panel-lot-filter');
            if (lotSelect && this.lots.length) {
                lotSelect.innerHTML = this.lots.map(l => `<option value="${l.id}">${l.name}</option>`).join('');
                lotSelect.value = this.currentLotId;
            }
            if (lotFilter && this.lots.length) {
                const currentFilter = this.adminFilter.lotId;
                lotFilter.innerHTML = `<option value="ALL">All Parking Lots</option>` + 
                    this.lots.map(l => `<option value="${l.id}">${l.name}</option>`).join('');
                lotFilter.value = currentFilter;
            }

            // Fetch all spaces across all campus lots
            try {
                this.adminAllSpaces = await api.getAllSpaces();
            } catch (err) {
                this.adminAllSpaces = [...this.spaces];
            }

            // Fetch active reservations across campus lots
            try {
                this.adminActiveBookings = await api.getActiveBookings();
            } catch (err) {
                console.warn('Could not load active bookings:', err);
                this.adminActiveBookings = [];
            }

            const activeBadge = document.getElementById('admin-active-count-badge');
            if (activeBadge) {
                activeBadge.textContent = this.adminActiveBookings.length;
            }

            this.renderAdminTable();
            this.renderAdminBookingsTable();
        } catch (err) {
            console.error('Error loading admin panel data:', err);
            this.showToast('Failed to load slots: ' + err.message, 'error');
        }
    }

    switchAdminTab(tabName) {
        const slotsTabBtn = document.getElementById('admin-tab-slots-btn');
        const bookingsTabBtn = document.getElementById('admin-tab-bookings-btn');
        const slotsView = document.getElementById('admin-tab-slots-view');
        const bookingsView = document.getElementById('admin-tab-bookings-view');

        if (tabName === 'slots') {
            if (slotsTabBtn) {
                slotsTabBtn.classList.add('active');
                slotsTabBtn.style.color = '#fff';
                slotsTabBtn.style.borderBottom = '2px solid var(--primary)';
            }
            if (bookingsTabBtn) {
                bookingsTabBtn.classList.remove('active');
                bookingsTabBtn.style.color = 'var(--text-secondary)';
                bookingsTabBtn.style.borderBottom = 'none';
            }
            if (slotsView) slotsView.classList.remove('hidden');
            if (bookingsView) bookingsView.classList.add('hidden');
        } else {
            if (bookingsTabBtn) {
                bookingsTabBtn.classList.add('active');
                bookingsTabBtn.style.color = '#fff';
                bookingsTabBtn.style.borderBottom = '2px solid var(--primary)';
            }
            if (slotsTabBtn) {
                slotsTabBtn.classList.remove('active');
                slotsTabBtn.style.color = 'var(--text-secondary)';
                slotsTabBtn.style.borderBottom = 'none';
            }
            if (slotsView) slotsView.classList.add('hidden');
            if (bookingsView) bookingsView.classList.remove('hidden');
        }
    }

    renderAdminTable() {
        const tbody = document.getElementById('admin-slots-table-body');
        const countSpan = document.getElementById('admin-slot-count-filtered');
        if (!tbody) return;

        let filtered = [...(this.adminAllSpaces || [])];

        // Lot filter
        if (this.adminFilter.lotId !== 'ALL') {
            const lid = parseInt(this.adminFilter.lotId, 10);
            filtered = filtered.filter(s => s.parkingLot && s.parkingLot.id === lid);
        }

        // Status filter
        if (this.adminFilter.status !== 'ALL') {
            filtered = filtered.filter(s => s.status === this.adminFilter.status);
        }

        // Search filter
        if (this.adminFilter.search) {
            filtered = filtered.filter(s => 
                (s.spaceNumber && s.spaceNumber.toUpperCase().includes(this.adminFilter.search)) ||
                (s.type && s.type.toUpperCase().includes(this.adminFilter.search))
            );
        }

        if (countSpan) countSpan.textContent = filtered.length;

        if (filtered.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="padding: 30px; text-align: center; color: var(--text-muted);">
                        <i class="fa-solid fa-magnifying-glass" style="font-size: 24px; margin-bottom: 8px; display: block;"></i>
                        No parking spaces match the selected filters.
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = filtered.map(space => {
            const lotName = space.parkingLot ? space.parkingLot.name : 'Campus Lot';
            const statusClass = (space.status || 'AVAILABLE').toLowerCase();
            const typeDisplay = (space.type || 'STANDARD').replace('_', ' ');

            const isReserved = space.status === 'RESERVED';

            return `
                <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.06); transition: background 0.15s;" onmouseover="this.style.background='rgba(255,255,255,0.03)'" onmouseout="this.style.background='transparent'">
                    <td style="padding: 10px 14px; font-family: var(--font-mono); font-weight: 700; color: #f8fafc;">
                        ${space.spaceNumber}
                    </td>
                    <td style="padding: 10px 14px; color: var(--text-secondary); font-size: 12px;">
                        ${lotName}
                    </td>
                    <td style="padding: 10px 14px;">
                        <span style="font-size: 11px; padding: 3px 8px; border-radius: 4px; background: rgba(56, 189, 248, 0.12); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.25);">
                            ${typeDisplay}
                        </span>
                    </td>
                    <td style="padding: 10px 14px;">
                        <span class="status-badge ${statusClass}" style="font-size: 10px; padding: 3px 8px;">
                            ${space.status}
                        </span>
                    </td>
                    <td style="padding: 10px 14px; text-align: center;">
                        <div style="display: inline-flex; gap: 4px; align-items: center; flex-wrap: wrap; justify-content: center;">
                            <button class="table-action-btn ${space.status === 'AVAILABLE' ? 'active-avail' : ''}" onclick="window.app.adminSetStatus(${space.id}, 'AVAILABLE')" title="Set Available (Vacate)">🟢</button>
                            <button class="table-action-btn ${space.status === 'OCCUPIED' ? 'active-occ' : ''}" onclick="window.app.adminSetStatus(${space.id}, 'OCCUPIED')" title="Set Occupied">🔴</button>
                            <button class="table-action-btn ${space.status === 'RESERVED' ? 'active-res' : ''}" onclick="window.app.adminSetStatus(${space.id}, 'RESERVED')" title="Set Reserved">🟡</button>
                            <button class="table-action-btn ${space.status === 'MAINTENANCE' ? 'active-maint' : ''}" onclick="window.app.adminSetStatus(${space.id}, 'MAINTENANCE')" title="Set Maintenance">⚪</button>
                            ${isReserved ? `
                                <button class="table-action-btn btn-noshow" onclick="window.app.adminReleaseNoShow(${space.id}, '${space.spaceNumber}')" title="Student did not arrive: Cancel reservation and vacate slot">
                                    <i class="fa-solid fa-user-xmark"></i> No-Show
                                </button>
                                <button class="table-action-btn btn-reassign" onclick="window.app.openReassignModal(${space.id}, null, '${space.spaceNumber}', null)" title="Transfer reservation to another student">
                                    <i class="fa-solid fa-arrows-rotate"></i> Reassign
                                </button>
                            ` : ''}
                        </div>
                    </td>
                    <td style="padding: 10px 14px; text-align: right;">
                        <button class="table-action-btn btn-del" onclick="window.app.adminDeleteSpace(${space.id}, '${space.spaceNumber}')" title="Delete Slot">
                            <i class="fa-solid fa-trash-can" style="color: #f87171;"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    renderAdminBookingsTable() {
        const tbody = document.getElementById('admin-bookings-table-body');
        if (!tbody) return;

        const bookings = this.adminActiveBookings || [];

        if (bookings.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="padding: 34px; text-align: center; color: var(--text-muted);">
                        <i class="fa-solid fa-calendar-check" style="font-size: 26px; margin-bottom: 8px; display: block; color: var(--primary);"></i>
                        No active student reservations currently found on campus.
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = bookings.map(b => {
            const spaceNum = b.parkingSpace ? b.parkingSpace.spaceNumber : 'N/A';
            const lotName = (b.parkingSpace && b.parkingSpace.parkingLot) ? b.parkingSpace.parkingLot.name : 'Campus Lot';
            const spaceId = b.parkingSpace ? b.parkingSpace.id : null;
            const startStr = b.startTime ? new Date(b.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--';
            const endStr = b.endTime ? new Date(b.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--';

            return `
                <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.06); transition: background 0.15s;" onmouseover="this.style.background='rgba(255,255,255,0.03)'" onmouseout="this.style.background='transparent'">
                    <td style="padding: 10px 14px; font-family: var(--font-mono); font-weight: 700; color: var(--primary);">
                        ${spaceNum}
                    </td>
                    <td style="padding: 10px 14px; color: var(--text-secondary); font-size: 12px;">
                        ${lotName}
                    </td>
                    <td style="padding: 10px 14px; font-size: 13px; color: #f8fafc; font-weight: 500;">
                        <i class="fa-solid fa-graduation-cap" style="color: #a78bfa; margin-right: 6px;"></i>${b.userEmail}
                    </td>
                    <td style="padding: 10px 14px; font-size: 12px; color: var(--text-secondary);">
                        ${startStr} - ${endStr}
                    </td>
                    <td style="padding: 10px 14px;">
                        <span style="font-family: var(--font-mono); font-size: 11px; color: var(--text-muted); display: block;">${b.bookingReference || 'REF'}</span>
                        <span class="status-badge reserved" style="font-size: 10px; padding: 2px 6px;">${b.status}</span>
                    </td>
                    <td style="padding: 10px 14px; text-align: right;">
                        <div style="display: inline-flex; gap: 6px; justify-content: flex-end;">
                            <button class="table-action-btn btn-noshow" onclick="window.app.adminReleaseNoShowBooking(${b.id}, '${spaceNum}')" title="Student did not arrive: Cancel reservation and free slot">
                                <i class="fa-solid fa-user-xmark"></i> Release No-Show
                            </button>
                            <button class="table-action-btn btn-reassign" onclick="window.app.openReassignModal(${spaceId}, ${b.id}, '${spaceNum}', '${b.userEmail}')" title="Transfer this reservation to another @thapar.edu student">
                                <i class="fa-solid fa-arrows-rotate"></i> Reassign User
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    async adminReleaseNoShow(spaceId, spaceNumber) {
        if (!confirm(`Are you sure you want to mark Slot "${spaceNumber}" as a No-Show?\n\nThis will remove the student reservation, vacate the slot (set to AVAILABLE), and remove the parked car from the 3D twin.`)) {
            return;
        }

        try {
            await api.releaseSpaceNoShow(spaceId);
            this.showToast(`No-Show removed! Slot ${spaceNumber} is now Available.`, 'success');

            await this.loadAdminPanelData();
            await this.loadSpaces(this.currentLotId);
        } catch (err) {
            console.error('Error releasing no-show:', err);
            this.showToast('Failed to release no-show: ' + err.message, 'error');
        }
    }

    async adminReleaseNoShowBooking(bookingId, spaceNumber) {
        if (!confirm(`Remove student from reservation for Slot "${spaceNumber}" due to No-Show?\n\nThe slot will be freed immediately.`)) {
            return;
        }

        try {
            await api.releaseNoShow(bookingId);
            this.showToast(`No-Show removed! Slot ${spaceNumber} is now Available.`, 'success');

            await this.loadAdminPanelData();
            await this.loadSpaces(this.currentLotId);
        } catch (err) {
            console.error('Error releasing no-show booking:', err);
            this.showToast('Failed to release no-show: ' + err.message, 'error');
        }
    }

    openReassignModal(spaceId, bookingId, spaceNumber, currentEmail) {
        const spaceInput = document.getElementById('reassign-target-space-id');
        const bookingInput = document.getElementById('reassign-target-booking-id');
        const targetSlot = document.getElementById('reassign-target-slot');
        const currentEmailSpan = document.getElementById('reassign-current-email');
        const newEmailInput = document.getElementById('reassign-new-email');

        if (spaceInput) spaceInput.value = spaceId || '';
        if (bookingInput) bookingInput.value = bookingId || '';
        if (targetSlot) targetSlot.textContent = spaceNumber || 'Selected Slot';
        if (currentEmailSpan) currentEmailSpan.textContent = currentEmail || 'Current Reserved Student';
        if (newEmailInput) newEmailInput.value = '';

        this.openModal('admin-reassign-modal');
    }

    async handleReassignSubmit(e) {
        e.preventDefault();
        const spaceId = document.getElementById('reassign-target-space-id').value;
        const bookingId = document.getElementById('reassign-target-booking-id').value;
        const spaceNumber = document.getElementById('reassign-target-slot').textContent;
        const newEmail = document.getElementById('reassign-new-email').value.trim();

        if (!newEmail || !newEmail.toLowerCase().endsWith('@thapar.edu')) {
            this.showToast('Access restricted: Please enter an official @thapar.edu university email.', 'warning');
            return;
        }

        try {
            if (bookingId) {
                await api.reassignBooking(bookingId, newEmail);
            } else if (spaceId) {
                await api.reassignSpaceReservation(spaceId, newEmail);
            }

            this.showToast(`Reservation for Slot ${spaceNumber} successfully reassigned to ${newEmail}!`, 'success');

            const modal = document.getElementById('admin-reassign-modal');
            if (modal) modal.classList.remove('active');

            await this.loadAdminPanelData();
            await this.loadSpaces(this.currentLotId);
        } catch (err) {
            console.error('Error reassigning reservation:', err);
            this.showToast('Failed to reassign reservation: ' + err.message, 'error');
        }
    }

    async adminSetStatus(spaceId, newStatus) {
        try {
            await api.updateSpaceStatus(spaceId, newStatus);
            this.showToast(`Slot #${spaceId} status updated to ${newStatus}!`, 'success');
            
            // Update in local cache
            const target = this.adminAllSpaces.find(s => s.id === spaceId);
            if (target) target.status = newStatus;
            this.renderAdminTable();

            // Refresh 3D digital twin & counters
            await this.loadSpaces(this.currentLotId);
        } catch (err) {
            this.showToast('Failed to update status: ' + err.message, 'error');
        }
    }

    async adminDeleteSpace(spaceId, spaceNumber) {
        if (!confirm(`Are you sure you want to permanently delete parking space "${spaceNumber}"?`)) {
            return;
        }

        try {
            await api.deleteSpace(spaceId);
            this.showToast(`Parking space ${spaceNumber} deleted!`, 'success');

            // Remove from local cache
            this.adminAllSpaces = this.adminAllSpaces.filter(s => s.id !== spaceId);
            this.renderAdminTable();

            // Refresh 3D digital twin & counters
            await this.loadSpaces(this.currentLotId);
        } catch (err) {
            this.showToast('Failed to delete space: ' + err.message, 'error');
        }
    }

    async handlePanelAddSpace(e) {
        e.preventDefault();
        const lotId = parseInt(document.getElementById('panel-new-lot').value, 10);
        const spaceNumber = document.getElementById('panel-new-space-num').value.trim().toUpperCase();
        const type = document.getElementById('panel-new-type').value;

        if (!spaceNumber) return;

        try {
            const created = await api.addSpace(lotId, spaceNumber, type);
            this.showToast(`Space ${spaceNumber} successfully created!`, 'success');
            document.getElementById('panel-new-space-num').value = '';

            // Add to local admin cache and re-render
            this.adminAllSpaces.push(created);
            this.renderAdminTable();

            // If the space belongs to the currently viewed lot, refresh 3D digital twin
            if (lotId === this.currentLotId) {
                await this.loadSpaces(this.currentLotId);
            }
        } catch (err) {
            this.showToast('Failed to create space: ' + err.message, 'error');
        }
    }

    async handleAuthSubmit(e) {
        e.preventDefault();
        const isRegister = document.querySelector('.auth-tab-btn.active').dataset.mode === 'register';
        const email = document.getElementById('auth-email').value.trim();
        const password = document.getElementById('auth-password').value;
        const name = document.getElementById('auth-name').value.trim();

        try {
            if (isRegister) {
                await api.register(name, email, password);
                this.showToast('Registration successful! Welcome to CloudPark', 'success');
            } else {
                await api.login(email, password);
                this.showToast(`Welcome back, ${api.user.name}!`, 'success');
            }
            this.closeModal('auth-modal');
            this.updateAuthUI();
            if (this.selectedSpace) {
                this.handleSlotSelected(this.selectedSpace);
            }
        } catch (err) {
            this.showToast(err.message, 'error');
        }
    }

    updateAuthUI() {
        const user = api.user;
        const unauthGroup = document.getElementById('nav-unauth-group');
        const authGroup = document.getElementById('nav-auth-group');
        const userBadge = document.getElementById('nav-user-badge');
        const adminBtn = document.getElementById('nav-analytics-btn');
        const adminPanelBtn = document.getElementById('nav-admin-panel-btn');
        const loginPrompt = document.getElementById('drawer-login-prompt');
        const panelUserSub = document.getElementById('admin-panel-user-sub');

        if (user) {
            unauthGroup.classList.add('hidden');
            authGroup.classList.remove('hidden');
            if (loginPrompt) loginPrompt.classList.add('hidden');
            userBadge.innerHTML = `
                <div class="user-avatar" style="${user.role === 'ROLE_ADMIN' ? 'background: #7c3aed;' : ''}">
                    <i class="fa-solid ${user.role === 'ROLE_ADMIN' ? 'fa-user-shield' : 'fa-user-graduate'}"></i>
                </div>
                <div class="user-text">
                    <span class="user-name">${user.name}</span>
                    <span class="user-role ${user.role.toLowerCase()}">${user.role === 'ROLE_ADMIN' ? 'CAMPUS ADMIN' : 'STUDENT'}</span>
                </div>
            `;
            if (user.role === 'ROLE_ADMIN') {
                if (adminBtn) adminBtn.classList.remove('hidden');
                if (adminPanelBtn) adminPanelBtn.classList.remove('hidden');
                if (panelUserSub) panelUserSub.textContent = `Administrator: ${user.name} (${user.email})`;
            } else {
                if (adminBtn) adminBtn.classList.add('hidden');
                if (adminPanelBtn) adminPanelBtn.classList.add('hidden');
            }
        } else {
            unauthGroup.classList.remove('hidden');
            authGroup.classList.add('hidden');
            if (adminBtn) adminBtn.classList.add('hidden');
            if (adminPanelBtn) adminPanelBtn.classList.add('hidden');
            if (this.selectedSpace && this.selectedSpace.status === 'AVAILABLE') {
                if (loginPrompt) loginPrompt.classList.remove('hidden');
            }
        }

        if (this.selectedSpace && this.selectedSpace.status === 'AVAILABLE') {
            const btnText = document.getElementById('confirm-booking-btn-text');
            if (btnText) {
                btnText.textContent = user 
                    ? `Confirm & Reserve Slot ${this.selectedSpace.spaceNumber}`
                    : `Sign In to Reserve Slot ${this.selectedSpace.spaceNumber}`;
            }
        }
    }

    handleLogout() {
        api.clearAuth();
        // Close all active modals
        document.querySelectorAll('.modal-overlay').forEach(modal => modal.classList.remove('active'));
        this.updateAuthUI();
        this.showToast('Logged out successfully. You are now in guest view.', 'info');
        if (this.selectedSpace) {
            this.handleSlotSelected(this.selectedSpace);
        }
    }

    toggleSimulation() {
        this.isSimulating = !this.isSimulating;
        const btn = document.getElementById('simulation-toggle');

        if (this.isSimulating) {
            btn.classList.add('active');
            btn.innerHTML = '<i class="fa-solid fa-robot"></i> Simulation: Active';
            this.showToast('Live traffic simulation started', 'info');

            this.simulationTimer = setInterval(async () => {
                if (!this.spaces.length) return;
                // Pick a random slot to toggle between OCCUPIED and AVAILABLE
                const randSlot = this.spaces[Math.floor(Math.random() * this.spaces.length)];
                if (randSlot.status === 'AVAILABLE') {
                    randSlot.status = 'OCCUPIED';
                } else if (randSlot.status === 'OCCUPIED') {
                    randSlot.status = 'AVAILABLE';
                }
                this.applyFilters();
                this.updateStatsCounters();
            }, 3500);
        } else {
            btn.classList.remove('active');
            btn.innerHTML = '<i class="fa-solid fa-robot"></i> Simulation: Off';
            clearInterval(this.simulationTimer);
            this.showToast('Simulation stopped', 'info');
            this.loadSpaces(this.currentLotId);
        }
    }

    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.add('active');
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.remove('active');
    }

    showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toast-container');
        if (!toastContainer) return;

        const toast = document.createElement('div');
        toast.className = `toast-pill ${type}`;

        let icon = 'info-circle';
        if (type === 'success') icon = 'circle-check';
        if (type === 'error') icon = 'triangle-exclamation';
        if (type === 'warning') icon = 'circle-exclamation';

        toast.innerHTML = `<i class="fa-solid fa-${icon}"></i> <span>${message}</span>`;
        toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('fade-out');
            setTimeout(() => toast.remove(), 400);
        }, 3600);
    }

    formatDateTime(dtStr) {
        if (!dtStr) return '';
        const d = new Date(dtStr);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    }

    fallbackMockData() {
        this.lots = [
            { id: 1, name: 'Main Gate Parking', address: 'Main Gate Entrance', totalSpaces: 70, hourlyRate: 50.00 },
            { id: 2, name: 'Research and Development Gate', address: 'R&D Gate Entrance', totalSpaces: 30, hourlyRate: 50.00 }
        ];
        this.loadLots();

        this.spaces = [];
        for (let i = 1; i <= 70; i++) {
            let type = 'STANDARD';
            if (i % 10 === 0) type = 'EV_CHARGING';
            else if (i % 8 === 0) type = 'HANDICAP';
            else if (i % 5 === 0) type = 'COMPACT';

            let status = 'AVAILABLE';
            if (i % 4 === 0) status = 'OCCUPIED';
            else if (i % 7 === 0) status = 'RESERVED';

            this.spaces.push({
                id: i,
                spaceNumber: 'MG-' + (i < 10 ? '0' + i : i),
                type: type,
                status: status,
                parkingLot: this.lots[0]
            });
        }
        this.applyFilters();
        this.updateStatsCounters();
    }
}

// Bootstrap on DOM Loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new CloudParkApp();
});
