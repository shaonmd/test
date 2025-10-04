// Simple API test script for Hotel Management System

const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

async function testAPI() {
    console.log('🧪 Testing Hotel Management System API...\n');

    try {
        // Test 1: Register a test admin user
        console.log('1. Testing user registration...');
        const registerResponse = await axios.post(`${BASE_URL}/auth/register`, {
            username: 'testadmin',
            email: 'admin@test.com',
            password: 'test123',
            firstName: 'Test',
            lastName: 'Admin',
            role: 'admin'
        });
        
        if (registerResponse.data.success) {
            console.log('✅ User registration successful');
            const token = registerResponse.data.data.token;
            
            // Test 2: Login
            console.log('\n2. Testing user login...');
            const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
                email: 'admin@test.com',
                password: 'test123'
            });
            
            if (loginResponse.data.success) {
                console.log('✅ User login successful');
                
                // Test 3: Get current user
                console.log('\n3. Testing get current user...');
                const userResponse = await axios.get(`${BASE_URL}/auth/me`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (userResponse.data.success) {
                    console.log('✅ Get current user successful');
                    console.log(`   User: ${userResponse.data.data.user.firstName} ${userResponse.data.data.user.lastName}`);
                }
                
                // Test 4: Create a room
                console.log('\n4. Testing room creation...');
                const roomResponse = await axios.post(`${BASE_URL}/rooms`, {
                    roomNumber: '101',
                    roomType: 'double',
                    floor: 1,
                    capacity: 2,
                    pricePerNight: 150,
                    bedType: 'queen',
                    size: 25
                }, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (roomResponse.data.success) {
                    console.log('✅ Room creation successful');
                    console.log(`   Room: ${roomResponse.data.data.room.roomNumber} - $${roomResponse.data.data.room.pricePerNight}/night`);
                }
                
                // Test 5: Get rooms
                console.log('\n5. Testing get rooms...');
                const roomsResponse = await axios.get(`${BASE_URL}/rooms`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (roomsResponse.data.success) {
                    console.log('✅ Get rooms successful');
                    console.log(`   Found ${roomsResponse.data.data.rooms.length} rooms`);
                }
                
                // Test 6: Create a guest
                console.log('\n6. Testing guest creation...');
                const guestResponse = await axios.post(`${BASE_URL}/guests`, {
                    firstName: 'John',
                    lastName: 'Doe',
                    email: 'john.doe@example.com',
                    phone: '+1234567890',
                    nationality: 'US'
                }, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (guestResponse.data.success) {
                    console.log('✅ Guest creation successful');
                    console.log(`   Guest: ${guestResponse.data.data.guest.firstName} ${guestResponse.data.data.guest.lastName}`);
                }
                
                // Test 7: Get dashboard data
                console.log('\n7. Testing dashboard data...');
                const dashboardResponse = await axios.get(`${BASE_URL}/reports/dashboard`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (dashboardResponse.data.success) {
                    console.log('✅ Dashboard data successful');
                    console.log(`   Total rooms: ${dashboardResponse.data.data.totalRooms}`);
                    console.log(`   Available rooms: ${dashboardResponse.data.data.availableRooms}`);
                }
                
                console.log('\n🎉 All API tests completed successfully!');
                console.log('\n📱 You can now access the web interface at http://localhost:3000');
                console.log('🔑 Login with: admin@test.com / test123');
                
            } else {
                console.log('❌ User login failed');
            }
        } else {
            console.log('❌ User registration failed');
        }
        
    } catch (error) {
        if (error.response) {
            console.log(`❌ API Error: ${error.response.status} - ${error.response.data.message || error.response.statusText}`);
        } else if (error.request) {
            console.log('❌ Network Error: Could not connect to the server. Make sure the server is running on port 3000.');
        } else {
            console.log(`❌ Error: ${error.message}`);
        }
    }
}

// Run the test
testAPI();