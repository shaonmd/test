// Hotel Management System - Frontend JavaScript

class HotelManagementApp {
    constructor() {
        this.apiBaseUrl = '/api';
        this.currentUser = null;
        this.token = localStorage.getItem('token');
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkAuthentication();
        this.setDefaultDates();
    }

    setupEventListeners() {
        // Login form
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // Navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.setActiveNavLink(link);
            });
        });
    }

    checkAuthentication() {
        if (this.token) {
            this.getCurrentUser();
        } else {
            this.showLoginModal();
        }
    }

    async getCurrentUser() {
        try {
            const response = await this.apiCall('/auth/me');
            if (response.success) {
                this.currentUser = response.data.user;
                this.updateUserInterface();
                this.hideLoginModal();
                this.loadDashboard();
            } else {
                this.logout();
            }
        } catch (error) {
            console.error('Error getting current user:', error);
            this.logout();
        }
    }

    async handleLogin() {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        try {
            const response = await fetch(`${this.apiBaseUrl}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (data.success) {
                this.token = data.data.token;
                this.currentUser = data.data.user;
                localStorage.setItem('token', this.token);
                this.updateUserInterface();
                this.hideLoginModal();
                this.loadDashboard();
                this.showAlert('Login successful!', 'success');
            } else {
                this.showAlert(data.message, 'danger');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showAlert('Login failed. Please try again.', 'danger');
        }
    }

    logout() {
        this.token = null;
        this.currentUser = null;
        localStorage.removeItem('token');
        this.showLoginModal();
        this.showAlert('Logged out successfully', 'info');
    }

    updateUserInterface() {
        if (this.currentUser) {
            document.getElementById('userName').textContent = 
                `${this.currentUser.firstName} ${this.currentUser.lastName}`;
        }
    }

    showLoginModal() {
        const modal = new bootstrap.Modal(document.getElementById('loginModal'));
        modal.show();
    }

    hideLoginModal() {
        const modal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
        if (modal) {
            modal.hide();
        }
    }

    setActiveNavLink(activeLink) {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        activeLink.classList.add('active');
    }

    showContent(contentId) {
        document.querySelectorAll('.content-section').forEach(section => {
            section.style.display = 'none';
        });
        document.getElementById(contentId).style.display = 'block';
    }

    async apiCall(endpoint, options = {}) {
        const url = `${this.apiBaseUrl}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...(this.token && { 'Authorization': `Bearer ${this.token}` })
            },
            ...options
        };

        const response = await fetch(url, config);
        return await response.json();
    }

    showAlert(message, type = 'info') {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
        alertDiv.style.top = '20px';
        alertDiv.style.right = '20px';
        alertDiv.style.zIndex = '9999';
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        document.body.appendChild(alertDiv);

        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.parentNode.removeChild(alertDiv);
            }
        }, 5000);
    }

    setDefaultDates() {
        const today = new Date().toISOString().split('T')[0];
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        const nextMonthStr = nextMonth.toISOString().split('T')[0];

        // Set default dates for report forms
        const dateInputs = [
            'occupancyStartDate', 'occupancyEndDate',
            'revenueStartDate', 'revenueEndDate',
            'guestStartDate', 'guestEndDate'
        ];

        dateInputs.forEach((inputId, index) => {
            const input = document.getElementById(inputId);
            if (input) {
                input.value = index % 2 === 0 ? today : nextMonthStr;
            }
        });
    }

    // Dashboard methods
    async loadDashboard() {
        this.showContent('dashboardContent');
        this.setActiveNavLink(document.querySelector('[onclick="showDashboard()"]'));
        await this.loadDashboardStats();
    }

    async loadDashboardStats() {
        try {
            const response = await this.apiCall('/reports/dashboard');
            if (response.success) {
                this.displayDashboardStats(response.data);
            }
        } catch (error) {
            console.error('Error loading dashboard stats:', error);
        }
    }

    displayDashboardStats(data) {
        const statsContainer = document.getElementById('dashboardStats');
        statsContainer.innerHTML = `
            <div class="col-md-3 mb-3">
                <div class="stats-card">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <div class="stats-number">${data.todaysCheckIns}</div>
                            <div class="stats-label">Today's Check-ins</div>
                        </div>
                        <div class="stats-icon">
                            <i class="fas fa-sign-in-alt"></i>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-md-3 mb-3">
                <div class="stats-card">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <div class="stats-number">${data.todaysCheckOuts}</div>
                            <div class="stats-label">Today's Check-outs</div>
                        </div>
                        <div class="stats-icon">
                            <i class="fas fa-sign-out-alt"></i>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-md-3 mb-3">
                <div class="stats-card">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <div class="stats-number">${data.currentOccupancy}</div>
                            <div class="stats-label">Current Occupancy</div>
                        </div>
                        <div class="stats-icon">
                            <i class="fas fa-bed"></i>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-md-3 mb-3">
                <div class="stats-card">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <div class="stats-number">${data.occupancyRate}%</div>
                            <div class="stats-label">Occupancy Rate</div>
                        </div>
                        <div class="stats-icon">
                            <i class="fas fa-chart-pie"></i>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // Room management methods
    async loadRooms() {
        this.showContent('roomsContent');
        this.setActiveNavLink(document.querySelector('[onclick="showRooms()"]'));
        await this.fetchAndDisplayRooms();
    }

    async fetchAndDisplayRooms() {
        try {
            const response = await this.apiCall('/rooms');
            if (response.success) {
                this.displayRooms(response.data.rooms);
            }
        } catch (error) {
            console.error('Error loading rooms:', error);
            this.showAlert('Error loading rooms', 'danger');
        }
    }

    displayRooms(rooms) {
        const tbody = document.getElementById('roomsTableBody');
        tbody.innerHTML = rooms.map(room => `
            <tr>
                <td>${room.roomNumber}</td>
                <td>${room.roomType.charAt(0).toUpperCase() + room.roomType.slice(1)}</td>
                <td>${room.floor}</td>
                <td>${room.capacity}</td>
                <td>$${room.pricePerNight}</td>
                <td><span class="status-badge status-${room.status.replace('_', '-')}">${room.status.replace('_', ' ')}</span></td>
                <td>
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="app.editRoom('${room._id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="app.deleteRoom('${room._id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    // Booking management methods
    async loadBookings() {
        this.showContent('bookingsContent');
        this.setActiveNavLink(document.querySelector('[onclick="showBookings()"]'));
        await this.fetchAndDisplayBookings();
    }

    async fetchAndDisplayBookings() {
        try {
            const response = await this.apiCall('/bookings');
            if (response.success) {
                this.displayBookings(response.data.bookings);
            }
        } catch (error) {
            console.error('Error loading bookings:', error);
            this.showAlert('Error loading bookings', 'danger');
        }
    }

    displayBookings(bookings) {
        const tbody = document.getElementById('bookingsTableBody');
        tbody.innerHTML = bookings.map(booking => `
            <tr>
                <td>${booking.bookingNumber}</td>
                <td>${booking.guest.firstName} ${booking.guest.lastName}</td>
                <td>${booking.room.roomNumber}</td>
                <td>${new Date(booking.checkIn).toLocaleDateString()}</td>
                <td>${new Date(booking.checkOut).toLocaleDateString()}</td>
                <td><span class="status-badge status-${booking.status.replace('_', '-')}">${booking.status.replace('_', ' ')}</span></td>
                <td>$${booking.totalAmount}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="app.viewBooking('${booking._id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-success me-1" onclick="app.checkIn('${booking._id}')">
                        <i class="fas fa-sign-in-alt"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-warning" onclick="app.checkOut('${booking._id}')">
                        <i class="fas fa-sign-out-alt"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    // Guest management methods
    async loadGuests() {
        this.showContent('guestsContent');
        this.setActiveNavLink(document.querySelector('[onclick="showGuests()"]'));
        await this.fetchAndDisplayGuests();
    }

    async fetchAndDisplayGuests() {
        try {
            const response = await this.apiCall('/guests');
            if (response.success) {
                this.displayGuests(response.data.guests);
            }
        } catch (error) {
            console.error('Error loading guests:', error);
            this.showAlert('Error loading guests', 'danger');
        }
    }

    displayGuests(guests) {
        const tbody = document.getElementById('guestsTableBody');
        tbody.innerHTML = guests.map(guest => `
            <tr>
                <td>${guest.firstName} ${guest.lastName}</td>
                <td>${guest.email}</td>
                <td>${guest.phone}</td>
                <td>${guest.nationality || 'N/A'}</td>
                <td><span class="status-badge loyalty-${guest.loyaltyProgram?.tier || 'bronze'}">${guest.loyaltyProgram?.tier || 'Bronze'}</span></td>
                <td>${guest.vipStatus ? '<span class="status-badge vip-badge">VIP</span>' : 'No'}</td>
                <td>${guest.totalStays}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="app.editGuest('${guest._id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-info" onclick="app.viewGuest('${guest._id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    // Payment management methods
    async loadPayments() {
        this.showContent('paymentsContent');
        this.setActiveNavLink(document.querySelector('[onclick="showPayments()"]'));
        await this.fetchAndDisplayPayments();
    }

    async fetchAndDisplayPayments() {
        try {
            const response = await this.apiCall('/payments');
            if (response.success) {
                this.displayPayments(response.data.payments);
            }
        } catch (error) {
            console.error('Error loading payments:', error);
            this.showAlert('Error loading payments', 'danger');
        }
    }

    displayPayments(payments) {
        const tbody = document.getElementById('paymentsTableBody');
        tbody.innerHTML = payments.map(payment => `
            <tr>
                <td>${payment.paymentNumber}</td>
                <td>${payment.booking?.bookingNumber || 'N/A'}</td>
                <td>${payment.guest?.firstName} ${payment.guest?.lastName}</td>
                <td>$${payment.amount}</td>
                <td>${payment.paymentMethod.replace('_', ' ')}</td>
                <td><span class="status-badge status-${payment.status}">${payment.status}</span></td>
                <td>${new Date(payment.processedAt).toLocaleDateString()}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="app.viewPayment('${payment._id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                    ${payment.status === 'completed' ? `
                        <button class="btn btn-sm btn-outline-warning" onclick="app.refundPayment('${payment._id}')">
                            <i class="fas fa-undo"></i>
                        </button>
                    ` : ''}
                </td>
            </tr>
        `).join('');
    }

    // Reports methods
    async loadReports() {
        this.showContent('reportsContent');
        this.setActiveNavLink(document.querySelector('[onclick="showReports()"]'));
    }

    async generateOccupancyReport() {
        const startDate = document.getElementById('occupancyStartDate').value;
        const endDate = document.getElementById('occupancyEndDate').value;

        if (!startDate || !endDate) {
            this.showAlert('Please select both start and end dates', 'warning');
            return;
        }

        try {
            const response = await this.apiCall(`/reports/occupancy?startDate=${startDate}&endDate=${endDate}`);
            if (response.success) {
                this.displayReportResults('Occupancy Report', response.data);
            }
        } catch (error) {
            console.error('Error generating occupancy report:', error);
            this.showAlert('Error generating occupancy report', 'danger');
        }
    }

    async generateRevenueReport() {
        const startDate = document.getElementById('revenueStartDate').value;
        const endDate = document.getElementById('revenueEndDate').value;

        if (!startDate || !endDate) {
            this.showAlert('Please select both start and end dates', 'warning');
            return;
        }

        try {
            const response = await this.apiCall(`/reports/revenue?startDate=${startDate}&endDate=${endDate}`);
            if (response.success) {
                this.displayReportResults('Revenue Report', response.data);
            }
        } catch (error) {
            console.error('Error generating revenue report:', error);
            this.showAlert('Error generating revenue report', 'danger');
        }
    }

    async generateGuestReport() {
        const startDate = document.getElementById('guestStartDate').value;
        const endDate = document.getElementById('guestEndDate').value;

        if (!startDate || !endDate) {
            this.showAlert('Please select both start and end dates', 'warning');
            return;
        }

        try {
            const response = await this.apiCall(`/reports/guests?startDate=${startDate}&endDate=${endDate}`);
            if (response.success) {
                this.displayReportResults('Guest Analytics Report', response.data);
            }
        } catch (error) {
            console.error('Error generating guest report:', error);
            this.showAlert('Error generating guest report', 'danger');
        }
    }

    displayReportResults(title, data) {
        const resultsContainer = document.getElementById('reportResults');
        resultsContainer.innerHTML = `
            <h5>${title}</h5>
            <div class="row">
                <div class="col-12">
                    <pre class="bg-light p-3 rounded">${JSON.stringify(data, null, 2)}</pre>
                </div>
            </div>
        `;
    }

    // Action methods (placeholders for now)
    editRoom(roomId) {
        this.showAlert('Edit room functionality coming soon', 'info');
    }

    deleteRoom(roomId) {
        if (confirm('Are you sure you want to delete this room?')) {
            this.showAlert('Delete room functionality coming soon', 'info');
        }
    }

    viewBooking(bookingId) {
        this.showAlert('View booking functionality coming soon', 'info');
    }

    checkIn(bookingId) {
        this.showAlert('Check-in functionality coming soon', 'info');
    }

    checkOut(bookingId) {
        this.showAlert('Check-out functionality coming soon', 'info');
    }

    editGuest(guestId) {
        this.showAlert('Edit guest functionality coming soon', 'info');
    }

    viewGuest(guestId) {
        this.showAlert('View guest functionality coming soon', 'info');
    }

    viewPayment(paymentId) {
        this.showAlert('View payment functionality coming soon', 'info');
    }

    refundPayment(paymentId) {
        if (confirm('Are you sure you want to process a refund for this payment?')) {
            this.showAlert('Refund functionality coming soon', 'info');
        }
    }
}

// Global functions for onclick handlers
function showDashboard() {
    app.loadDashboard();
}

function showRooms() {
    app.loadRooms();
}

function showBookings() {
    app.loadBookings();
}

function showGuests() {
    app.loadGuests();
}

function showPayments() {
    app.loadPayments();
}

function showReports() {
    app.loadReports();
}

function showAddRoomModal() {
    app.showAlert('Add room functionality coming soon', 'info');
}

function showAddBookingModal() {
    app.showAlert('Add booking functionality coming soon', 'info');
}

function showAddGuestModal() {
    app.showAlert('Add guest functionality coming soon', 'info');
}

function showAddPaymentModal() {
    app.showAlert('Add payment functionality coming soon', 'info');
}

function filterRooms() {
    app.showAlert('Room filtering functionality coming soon', 'info');
}

function filterBookings() {
    app.showAlert('Booking filtering functionality coming soon', 'info');
}

function filterGuests() {
    app.showAlert('Guest filtering functionality coming soon', 'info');
}

function searchGuests() {
    app.showAlert('Guest search functionality coming soon', 'info');
}

function filterPayments() {
    app.showAlert('Payment filtering functionality coming soon', 'info');
}

function generateOccupancyReport() {
    app.generateOccupancyReport();
}

function generateRevenueReport() {
    app.generateRevenueReport();
}

function generateGuestReport() {
    app.generateGuestReport();
}

function showProfile() {
    app.showAlert('Profile functionality coming soon', 'info');
}

function logout() {
    app.logout();
}

// Initialize the application
const app = new HotelManagementApp();