import requests
import sys
import json
from datetime import datetime, timedelta

class VacayStayAPITester:
    def __init__(self, base_url="https://vacaystay-5.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.admin_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.property_id = None
        self.booking_id = None

    def log(self, message):
        print(f"[{datetime.now().strftime('%H:%M:%S')}] {message}")

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None, use_admin=False):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if headers:
            test_headers.update(headers)
            
        if use_admin and self.admin_token:
            test_headers['Authorization'] = f'Bearer {self.admin_token}'
        elif self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'

        self.tests_run += 1
        self.log(f"🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PATCH':
                response = requests.patch(url, json=data, headers=test_headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=10)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                self.log(f"✅ {name} - Status: {response.status_code}")
                try:
                    return success, response.json()
                except:
                    return success, {}
            else:
                self.log(f"❌ {name} - Expected {expected_status}, got {response.status_code}")
                try:
                    error_detail = response.json()
                    self.log(f"   Error: {error_detail}")
                except:
                    self.log(f"   Response: {response.text[:200]}")
                return False, {}

        except Exception as e:
            self.log(f"❌ {name} - Error: {str(e)}")
            return False, {}

    def test_root_endpoint(self):
        """Test root API endpoint"""
        return self.run_test("Root API", "GET", "", 200)

    def test_seed_data(self):
        """Seed demo data"""
        success, response = self.run_test("Seed Demo Data", "POST", "seed", 200)
        return success

    def test_admin_login(self):
        """Test admin login"""
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data={"email": "admin@vacaystay.com", "password": "admin123"}
        )
        if success and 'access_token' in response:
            self.admin_token = response['access_token']
            self.log(f"   Admin token obtained")
            return True
        return False

    def test_user_registration(self):
        """Test user registration"""
        test_user_data = {
            "email": f"test_{datetime.now().strftime('%H%M%S')}@example.com",
            "password": "TestPass123!",
            "full_name": "Test User",
            "phone": "+393445361830"
        }
        success, response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data=test_user_data
        )
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.log(f"   User token obtained")
            return True
        return False

    def test_get_properties(self):
        """Test get properties endpoint"""
        success, response = self.run_test("Get Properties", "GET", "properties", 200)
        if success and len(response) > 0:
            self.property_id = response[0]['id']
            self.log(f"   Found {len(response)} properties, using property ID: {self.property_id}")
            return True
        return success

    def test_get_property_detail(self):
        """Test get single property"""
        if not self.property_id:
            return False
        return self.run_test(
            "Get Property Detail", 
            "GET", 
            f"properties/{self.property_id}", 
            200
        )[0]

    def test_property_filters(self):
        """Test property filtering"""
        # Test city filter
        success1 = self.run_test(
            "Filter by City", 
            "GET", 
            "properties?city=Porto Cervo", 
            200
        )[0]
        
        # Test guests filter
        success2 = self.run_test(
            "Filter by Guests", 
            "GET", 
            "properties?min_guests=4", 
            200
        )[0]
        
        # Test price filter
        success3 = self.run_test(
            "Filter by Price", 
            "GET", 
            "properties?max_price=500", 
            200
        )[0]
        
        return success1 and success2 and success3

    def test_price_calculation(self):
        """Test price calculation"""
        if not self.property_id:
            return False
            
        check_in = (datetime.now() + timedelta(days=30)).strftime('%Y-%m-%d')
        check_out = (datetime.now() + timedelta(days=33)).strftime('%Y-%m-%d')
        
        price_data = {
            "property_id": self.property_id,
            "check_in": check_in,
            "check_out": check_out,
            "guests": 2,
            "extras": []
        }
        
        success, response = self.run_test(
            "Price Calculation",
            "POST",
            "properties/calculate-price",
            200,
            data=price_data
        )
        
        if success and 'total' in response:
            self.log(f"   Price calculated: €{response['total']} for {response['nights']} nights")
            return True
        return False

    def test_property_availability(self):
        """Test property availability"""
        if not self.property_id:
            return False
        return self.run_test(
            "Property Availability", 
            "GET", 
            f"properties/{self.property_id}/availability", 
            200
        )[0]

    def test_create_booking(self):
        """Test booking creation"""
        if not self.property_id:
            return False
            
        check_in = (datetime.now() + timedelta(days=30)).strftime('%Y-%m-%d')
        check_out = (datetime.now() + timedelta(days=33)).strftime('%Y-%m-%d')
        
        booking_data = {
            "property_id": self.property_id,
            "check_in": check_in,
            "check_out": check_out,
            "guests": 2,
            "guest_name": "Test Guest",
            "guest_email": "test@example.com",
            "guest_phone": "+393445361830",
            "extras": [],
            "notes": "Test booking"
        }
        
        success, response = self.run_test(
            "Create Booking",
            "POST",
            "bookings",
            200,
            data=booking_data
        )
        
        if success and 'id' in response:
            self.booking_id = response['id']
            self.log(f"   Booking created with ID: {self.booking_id}")
            return True
        return False

    def test_get_bookings_admin(self):
        """Test get bookings (admin only)"""
        return self.run_test(
            "Get Bookings (Admin)", 
            "GET", 
            "bookings", 
            200, 
            use_admin=True
        )[0]

    def test_update_booking_status(self):
        """Test booking status update"""
        if not self.booking_id:
            return False
        return self.run_test(
            "Update Booking Status",
            "PATCH",
            f"bookings/{self.booking_id}/status?status=confirmed",
            200,
            use_admin=True
        )[0]

    def test_contact_form(self):
        """Test contact form submission"""
        contact_data = {
            "name": "Test Contact",
            "email": "contact@example.com",
            "phone": "+393445361830",
            "message": "Test message from API test"
        }
        
        return self.run_test(
            "Contact Form",
            "POST",
            "contact",
            200,
            data=contact_data
        )[0]

    def test_admin_dashboard(self):
        """Test admin dashboard"""
        return self.run_test(
            "Admin Dashboard", 
            "GET", 
            "admin/dashboard", 
            200, 
            use_admin=True
        )[0]

    def test_get_contacts_admin(self):
        """Test get contacts (admin only)"""
        return self.run_test(
            "Get Contacts (Admin)", 
            "GET", 
            "contacts", 
            200, 
            use_admin=True
        )[0]

    def test_stripe_payment_creation(self):
        """Test Stripe payment session creation"""
        if not self.booking_id:
            return False
            
        # Test creating checkout session
        success, response = self.run_test(
            "Create Stripe Checkout",
            "POST",
            f"payments/create-checkout?booking_id={self.booking_id}&payment_type=full",
            200,
            headers={'origin': 'https://vacaystay-5.preview.emergentagent.com'}
        )
        
        if success and 'checkout_url' in response:
            self.log(f"   Checkout URL created: {response['checkout_url'][:50]}...")
            return True
        return False

def main():
    tester = VacayStayAPITester()
    
    print("🚀 Starting VacayStay API Tests")
    print("=" * 50)
    
    # Test sequence
    tests = [
        ("Root Endpoint", tester.test_root_endpoint),
        ("Seed Demo Data", tester.test_seed_data),
        ("Admin Login", tester.test_admin_login),
        ("User Registration", tester.test_user_registration),
        ("Get Properties", tester.test_properties),
        ("Get Property Detail", tester.test_get_property_detail),
        ("Property Filters", tester.test_property_filters),
        ("Price Calculation", tester.test_price_calculation),
        ("Property Availability", tester.test_property_availability),
        ("Create Booking", tester.test_create_booking),
        ("Get Bookings (Admin)", tester.test_get_bookings_admin),
        ("Update Booking Status", tester.test_update_booking_status),
        ("Contact Form", tester.test_contact_form),
        ("Admin Dashboard", tester.test_admin_dashboard),
        ("Get Contacts (Admin)", tester.test_get_contacts_admin),
        ("Stripe Payment Creation", tester.test_stripe_payment_creation),
    ]
    
    failed_tests = []
    
    for test_name, test_func in tests:
        try:
            if not test_func():
                failed_tests.append(test_name)
        except Exception as e:
            tester.log(f"❌ {test_name} - Exception: {str(e)}")
            failed_tests.append(test_name)
    
    # Print results
    print("\n" + "=" * 50)
    print(f"📊 Test Results: {tester.tests_passed}/{tester.tests_run} passed")
    
    if failed_tests:
        print(f"\n❌ Failed Tests ({len(failed_tests)}):")
        for test in failed_tests:
            print(f"   - {test}")
    else:
        print("\n🎉 All tests passed!")
    
    success_rate = (tester.tests_passed / tester.tests_run * 100) if tester.tests_run > 0 else 0
    print(f"\n📈 Success Rate: {success_rate:.1f}%")
    
    return 0 if len(failed_tests) == 0 else 1

if __name__ == "__main__":
    sys.exit(main())