// Database initialization script for Hotel Management System

const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const User = require('./models/User');
const Room = require('./models/Room');
const Guest = require('./models/Guest');

async function initializeDatabase() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hotel_management', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('✅ Connected to MongoDB');

        // Clear existing data (optional - remove in production)
        console.log('🧹 Clearing existing data...');
        await User.deleteMany({});
        await Room.deleteMany({});
        await Guest.deleteMany({});
        console.log('✅ Database cleared');

        // Create admin user
        console.log('👤 Creating admin user...');
        const adminUser = new User({
            username: 'admin',
            email: 'admin@hotel.com',
            password: 'admin123',
            firstName: 'Hotel',
            lastName: 'Administrator',
            role: 'admin',
            phone: '+1234567890'
        });
        await adminUser.save();
        console.log('✅ Admin user created: admin@hotel.com / admin123');

        // Create manager user
        console.log('👤 Creating manager user...');
        const managerUser = new User({
            username: 'manager',
            email: 'manager@hotel.com',
            password: 'manager123',
            firstName: 'Hotel',
            lastName: 'Manager',
            role: 'manager',
            phone: '+1234567891'
        });
        await managerUser.save();
        console.log('✅ Manager user created: manager@hotel.com / manager123');

        // Create receptionist user
        console.log('👤 Creating receptionist user...');
        const receptionistUser = new User({
            username: 'receptionist',
            email: 'reception@hotel.com',
            password: 'reception123',
            firstName: 'Front Desk',
            lastName: 'Staff',
            role: 'receptionist',
            phone: '+1234567892'
        });
        await receptionistUser.save();
        console.log('✅ Receptionist user created: reception@hotel.com / reception123');

        // Create sample rooms
        console.log('🏨 Creating sample rooms...');
        const rooms = [
            {
                roomNumber: '101',
                roomType: 'single',
                floor: 1,
                capacity: 1,
                pricePerNight: 100,
                bedType: 'single',
                size: 20,
                amenities: ['wifi', 'tv', 'air_conditioning'],
                description: 'Comfortable single room with city view'
            },
            {
                roomNumber: '102',
                roomType: 'double',
                floor: 1,
                capacity: 2,
                pricePerNight: 150,
                bedType: 'queen',
                size: 25,
                amenities: ['wifi', 'tv', 'air_conditioning', 'minibar'],
                description: 'Spacious double room with queen bed'
            },
            {
                roomNumber: '201',
                roomType: 'suite',
                floor: 2,
                capacity: 4,
                pricePerNight: 250,
                bedType: 'king',
                size: 40,
                amenities: ['wifi', 'tv', 'air_conditioning', 'minibar', 'balcony', 'jacuzzi'],
                description: 'Luxurious suite with balcony and jacuzzi'
            },
            {
                roomNumber: '301',
                roomType: 'deluxe',
                floor: 3,
                capacity: 2,
                pricePerNight: 200,
                bedType: 'king',
                size: 30,
                amenities: ['wifi', 'tv', 'air_conditioning', 'minibar', 'ocean_view'],
                description: 'Deluxe room with ocean view'
            },
            {
                roomNumber: '401',
                roomType: 'presidential',
                floor: 4,
                capacity: 6,
                pricePerNight: 500,
                bedType: 'king',
                size: 60,
                amenities: ['wifi', 'tv', 'air_conditioning', 'minibar', 'balcony', 'jacuzzi', 'ocean_view', 'room_service'],
                description: 'Presidential suite with panoramic ocean view'
            }
        ];

        for (const roomData of rooms) {
            const room = new Room(roomData);
            await room.save();
        }
        console.log(`✅ Created ${rooms.length} sample rooms`);

        // Create sample guests
        console.log('👥 Creating sample guests...');
        const guests = [
            {
                firstName: 'John',
                lastName: 'Smith',
                email: 'john.smith@example.com',
                phone: '+1234567890',
                nationality: 'US',
                loyaltyProgram: {
                    tier: 'gold',
                    points: 2500
                },
                vipStatus: true,
                totalStays: 15,
                totalSpent: 5000
            },
            {
                firstName: 'Sarah',
                lastName: 'Johnson',
                email: 'sarah.johnson@example.com',
                phone: '+1234567891',
                nationality: 'CA',
                loyaltyProgram: {
                    tier: 'silver',
                    points: 1200
                },
                vipStatus: false,
                totalStays: 8,
                totalSpent: 2500
            },
            {
                firstName: 'Michael',
                lastName: 'Brown',
                email: 'michael.brown@example.com',
                phone: '+1234567892',
                nationality: 'UK',
                loyaltyProgram: {
                    tier: 'platinum',
                    points: 5000
                },
                vipStatus: true,
                totalStays: 25,
                totalSpent: 12000
            }
        ];

        for (const guestData of guests) {
            const guest = new Guest(guestData);
            await guest.save();
        }
        console.log(`✅ Created ${guests.length} sample guests`);

        console.log('\n🎉 Database initialization completed successfully!');
        console.log('\n📋 Summary:');
        console.log('   👤 Users: 3 (admin, manager, receptionist)');
        console.log('   🏨 Rooms: 5 (various types)');
        console.log('   👥 Guests: 3 (with loyalty programs)');
        console.log('\n🔑 Default login credentials:');
        console.log('   Admin: admin@hotel.com / admin123');
        console.log('   Manager: manager@hotel.com / manager123');
        console.log('   Receptionist: reception@hotel.com / reception123');

    } catch (error) {
        console.error('❌ Database initialization failed:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB');
        process.exit(0);
    }
}

// Run initialization
initializeDatabase();