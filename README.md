# Hotel Management System

A comprehensive hotel management software built with Node.js, Express, MongoDB, and a modern web interface.

## Features

### 🏨 Core Management
- **Room Management**: Add, edit, delete rooms with detailed information
- **Guest Management**: Complete guest profiles with loyalty programs
- **Booking System**: Full booking lifecycle from creation to checkout
- **Payment Processing**: Multiple payment methods with refund capabilities
- **User Management**: Role-based access control (Admin, Manager, Receptionist, Staff)

### 📊 Analytics & Reports
- **Occupancy Reports**: Daily, weekly, monthly occupancy analytics
- **Revenue Reports**: Payment tracking and revenue analysis
- **Guest Analytics**: Guest behavior and loyalty program insights
- **Dashboard**: Real-time hotel statistics and key metrics

### 🔐 Security & Authentication
- JWT-based authentication
- Role-based authorization
- Password hashing with bcrypt
- Rate limiting and security headers

### 🎨 Modern UI/UX
- Responsive Bootstrap 5 design
- Real-time data updates
- Interactive dashboards
- Mobile-friendly interface

## Technology Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database with Mongoose ODM
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **express-validator** - Input validation
- **helmet** - Security middleware
- **express-rate-limit** - Rate limiting

### Frontend
- **HTML5** - Markup
- **CSS3** - Styling with custom variables
- **JavaScript (ES6+)** - Client-side logic
- **Bootstrap 5** - UI framework
- **Font Awesome** - Icons

## Installation

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn

### Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd hotel-management-system
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   ```bash
   cp .env.example .env
   ```
   
   Update the `.env` file with your configuration:
   ```env
   MONGODB_URI=mongodb://localhost:27017/hotel_management
   JWT_SECRET=your_super_secret_jwt_key_here
   PORT=3000
   ```

4. **Start MongoDB**
   ```bash
   # Using MongoDB service
   sudo systemctl start mongod
   
   # Or using Docker
   docker run -d -p 27017:27017 --name mongodb mongo:latest
   ```

5. **Initialize the database** (optional - creates sample data)
   ```bash
   npm run init-db
   ```

6. **Run the application**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

7. **Access the application**
   Open your browser and navigate to `http://localhost:3000`
   
   If port 3000 is in use, the application will automatically use the next available port or you can specify a different port:
   ```bash
   PORT=3001 npm start
   ```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update profile
- `PUT /api/auth/change-password` - Change password

### Rooms
- `GET /api/rooms` - Get all rooms (with filtering)
- `GET /api/rooms/:id` - Get room by ID
- `POST /api/rooms` - Create new room
- `PUT /api/rooms/:id` - Update room
- `DELETE /api/rooms/:id` - Delete room
- `PUT /api/rooms/:id/status` - Update room status
- `GET /api/rooms/available/search` - Search available rooms

### Bookings
- `GET /api/bookings` - Get all bookings
- `GET /api/bookings/:id` - Get booking by ID
- `POST /api/bookings` - Create new booking
- `PUT /api/bookings/:id` - Update booking
- `PUT /api/bookings/:id/check-in` - Check in guest
- `PUT /api/bookings/:id/check-out` - Check out guest
- `PUT /api/bookings/:id/cancel` - Cancel booking

### Guests
- `GET /api/guests` - Get all guests
- `GET /api/guests/:id` - Get guest by ID
- `POST /api/guests` - Create new guest
- `PUT /api/guests/:id` - Update guest
- `PUT /api/guests/:id/loyalty` - Update loyalty program
- `PUT /api/guests/:id/vip` - Toggle VIP status
- `POST /api/guests/:id/notes` - Add guest note

### Payments
- `GET /api/payments` - Get all payments
- `GET /api/payments/:id` - Get payment by ID
- `POST /api/payments` - Create new payment
- `PUT /api/payments/:id/refund` - Process refund
- `GET /api/payments/summary/daily` - Daily payment summary

### Reports
- `GET /api/reports/occupancy` - Occupancy report
- `GET /api/reports/revenue` - Revenue report
- `GET /api/reports/guests` - Guest analytics
- `GET /api/reports/dashboard` - Dashboard summary

### Users
- `GET /api/users` - Get all users (Admin/Manager only)
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user
- `PUT /api/users/:id/activate` - Activate/deactivate user
- `PUT /api/users/:id/reset-password` - Reset password

## Database Schema

### User Model
- Personal information (name, email, phone)
- Role-based access (admin, manager, receptionist, staff)
- Authentication data
- Activity tracking

### Room Model
- Room details (number, type, floor, capacity)
- Pricing and amenities
- Status tracking
- Maintenance notes

### Guest Model
- Personal information
- Contact details and preferences
- Loyalty program data
- Stay history and spending

### Booking Model
- Guest and room references
- Check-in/out dates
- Payment information
- Status tracking
- Special requests

### Payment Model
- Payment details and methods
- Transaction tracking
- Refund capabilities
- Receipt generation

## Usage

### Getting Started

1. **First Login**: The system doesn't have a default admin user. You'll need to register the first admin user through the API or create one directly in the database.

2. **Create Admin User** (via API):
   ```bash
   curl -X POST http://localhost:3000/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{
       "username": "admin",
       "email": "admin@hotel.com",
       "password": "admin123",
       "firstName": "Admin",
       "lastName": "User",
       "role": "admin"
     }'
   ```

3. **Login**: Use the registered credentials to log in through the web interface.

### Key Workflows

#### Room Management
1. Navigate to Rooms section
2. Add rooms with details (number, type, capacity, price)
3. Update room status as needed
4. Track maintenance and cleaning schedules

#### Booking Process
1. Create guest profile (if new guest)
2. Search for available rooms
3. Create booking with dates and preferences
4. Process payments
5. Check-in guest
6. Check-out and finalize

#### Reporting
1. Navigate to Reports section
2. Select report type and date range
3. Generate and view analytics
4. Export data for external analysis

## Development

### Project Structure
```
hotel-management-system/
├── models/           # Database models
├── routes/           # API routes
├── middleware/       # Custom middleware
├── public/           # Frontend assets
│   ├── css/         # Stylesheets
│   ├── js/          # JavaScript files
│   └── index.html   # Main HTML file
├── server.js         # Main server file
├── package.json      # Dependencies
└── README.md        # Documentation
```

### Adding New Features

1. **Backend**: Add new routes in `/routes` directory
2. **Frontend**: Extend the `HotelManagementApp` class
3. **Database**: Create new models in `/models` directory
4. **Validation**: Add validation rules using express-validator

### Testing

```bash
# Test API endpoints
npm run test-api

# Run tests (when implemented)
npm test

# Run with coverage
npm run test:coverage
```

### Quick Start with Sample Data

1. **Start MongoDB** (if not already running)
2. **Initialize database with sample data**:
   ```bash
   npm run init-db
   ```
3. **Start the application**:
   ```bash
   npm start
   ```
4. **Access the web interface** at `http://localhost:3000`
5. **Login with sample credentials**:
   - Admin: `admin@hotel.com` / `admin123`
   - Manager: `manager@hotel.com` / `manager123`
   - Receptionist: `reception@hotel.com` / `reception123`

## Deployment

### Production Setup

1. **Environment Variables**:
   ```env
   NODE_ENV=production
   MONGODB_URI=mongodb://your-production-db
   JWT_SECRET=your-production-secret
   ```

2. **Process Management**:
   ```bash
   # Using PM2
   npm install -g pm2
   pm2 start server.js --name hotel-management
   ```

3. **Reverse Proxy** (Nginx):
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation

## Roadmap

### Upcoming Features
- [ ] Email notifications
- [ ] Advanced reporting with charts
- [ ] Mobile app
- [ ] Integration with external booking systems
- [ ] Multi-language support
- [ ] Advanced room pricing strategies
- [ ] Guest communication system
- [ ] Inventory management
- [ ] Staff scheduling
- [ ] Financial reporting

---

**Hotel Management System** - Streamlining hospitality operations with modern technology.