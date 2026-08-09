require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Property = require('../models/Property');
const Lease = require('../models/Lease');
const Payment = require('../models/Payment');
const MaintenanceRequest = require('../models/MaintenanceRequest');
const Product = require('../models/Product');
const Rental = require('../models/Rental');

const seedDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb+srv://debjeet-kundu:debjeet%4014072022@leaseify.wnloexf.mongodb.net/?appName=Leaseify';
    await mongoose.connect(mongoUri);
    console.log('[Seed] Connected to MongoDB for seeding...');

    // Clear existing collections
    await User.deleteMany();
    await Property.deleteMany();
    await Lease.deleteMany();
    await Payment.deleteMany();
    await MaintenanceRequest.deleteMany();
    await Product.deleteMany();
    await Rental.deleteMany();
    console.log('[Seed] Cleared existing data.');

    // 1. Create Users (Admin & Tenants)
    const admin = await User.create({
      name: 'Sarah Jenkins (Property Manager)',
      email: 'admin@leaseify.com',
      password: 'password123',
      role: 'admin',
      phone: '+1 (555) 234-5678',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    });
    
    await User.create({
      name: 'Debjeet Kundu (Admin)',
      email: 'kundujeet255@gmail.com',
      password: 'password123',
      role: 'admin',
      phone: '+1 (555) 123-4567',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    });

    const tenant1 = await User.create({
      name: 'Alex Rivera',
      email: 'tenant@leaseify.com',
      password: 'password123',
      role: 'user',
      phone: '+1 (555) 876-5432',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      emergencyContact: {
        name: 'Maria Rivera',
        phone: '+1 (555) 999-1122',
        relationship: 'Spouse',
      },
    });

    const tenant2 = await User.create({
      name: 'Elena Rostova',
      email: 'elena@leaseify.com',
      password: 'password123',
      role: 'user',
      phone: '+1 (555) 432-1098',
      avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
    });

    console.log('[Seed] Created default users: admin@leaseify.com / tenant@leaseify.com (Pass: password123)');

    // 2. Create Properties
    const propertiesData = [
      {
        title: 'Skyline Luxury Penthouse with Terrace',
        description: 'Spectacular panoramic city skyline views with floor-to-ceiling windows, high-end Italian quartz kitchen, smart climate control, and a private 400 sq ft rooftop terrace.',
        type: 'Apartment',
        address: {
          street: '742 Evergreen Terrace, Suite 44B',
          city: 'San Francisco',
          state: 'CA',
          zipCode: '94107',
          country: 'USA',
        },
        rentAmount: 3850,
        securityDeposit: 3850,
        bedrooms: 3,
        bathrooms: 2.5,
        areaSqFt: 1850,
        status: 'rented',
        amenities: ['Floor-to-Ceiling Windows', 'Private Terrace', 'Smart Home Automation', 'EV Charging', 'Infinity Pool access', 'Concierge 24/7'],
        images: [
          'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&auto=format&fit=crop&q=80',
        ],
        yearBuilt: 2022,
        petFriendly: true,
        currentTenant: tenant1._id,
        createdBy: admin._id,
      },
      {
        title: 'Modern Minimalist Loft in Arts District',
        description: 'Sun-drenched open concept industrial loft featuring exposed brick, polished concrete floors, 14ft timber ceilings, and stainless steel designer kitchen.',
        type: 'Condo',
        address: {
          street: '120 Art District Ave, Unit 302',
          city: 'Austin',
          state: 'TX',
          zipCode: '78701',
          country: 'USA',
        },
        rentAmount: 2400,
        securityDeposit: 2400,
        bedrooms: 2,
        bathrooms: 2,
        areaSqFt: 1250,
        status: 'rented',
        amenities: ['Exposed Brick', 'Polished Concrete Floors', 'High Speed Fiber', 'Fitness Center', 'Rooftop Lounge'],
        images: [
          'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&auto=format&fit=crop&q=80',
        ],
        yearBuilt: 2020,
        petFriendly: true,
        currentTenant: tenant2._id,
        createdBy: admin._id,
      },
      {
        title: 'The Grand View Harbor Studio',
        description: 'Chic waterfront studio offering uninterrupted marina views, custom fold-away Murphy bed, integrated work desk, and premium Bosch appliances.',
        type: 'Studio',
        address: {
          street: '45 Marina Blvd, Apt 1204',
          city: 'Seattle',
          state: 'WA',
          zipCode: '98101',
          country: 'USA',
        },
        rentAmount: 1850,
        securityDeposit: 1850,
        bedrooms: 1,
        bathrooms: 1,
        areaSqFt: 620,
        status: 'available',
        amenities: ['Waterfront Views', 'In-Unit Washer/Dryer', 'Bike Storage', 'Resident Kayak Dock', 'Fitness Studio'],
        images: [
          'https://images.unsplash.com/photo-1536376072261-38c75010e6c9?w=800&auto=format&fit=crop&q=80',
        ],
        yearBuilt: 2023,
        petFriendly: false,
        createdBy: admin._id,
      },
      {
        title: 'Oakwood Family Residence & Garden',
        description: 'Spacious single family home in quiet cul-de-sac with manicured private backyard, 2-car garage, solar panels, master suite with walk-in closet and spa bath.',
        type: 'Single Family Home',
        address: {
          street: '884 Oakwood Pines Dr',
          city: 'Denver',
          state: 'CO',
          zipCode: '80203',
          country: 'USA',
        },
        rentAmount: 4200,
        securityDeposit: 4200,
        bedrooms: 4,
        bathrooms: 3,
        areaSqFt: 2800,
        status: 'available',
        amenities: ['Fenced Backyard', '2-Car Garage', 'Solar Powered', 'Fireplace', 'Home Office', 'Central HVAC'],
        images: [
          'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&auto=format&fit=crop&q=80',
        ],
        yearBuilt: 2019,
        petFriendly: true,
        createdBy: admin._id,
      },
      {
        title: 'Highland Park Modern Townhouse',
        description: 'Tri-level modern townhouse featuring private attached garage, gourmet chef kitchen, walk-in pantry, and private rooftop entertainment deck.',
        type: 'Townhouse',
        address: {
          street: '310 Highland Ridge Way',
          city: 'Chicago',
          state: 'IL',
          zipCode: '60614',
          country: 'USA',
        },
        rentAmount: 3100,
        securityDeposit: 3100,
        bedrooms: 3,
        bathrooms: 2.5,
        areaSqFt: 1950,
        status: 'maintenance',
        amenities: ['Rooftop Deck', 'Attached Garage', 'Hardwood Flooring', 'Wine Cooler', 'Smart Thermostat'],
        images: [
          'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&auto=format&fit=crop&q=80',
        ],
        yearBuilt: 2021,
        petFriendly: true,
        createdBy: admin._id,
      },
    ];

    const indianCities = [
      { name: 'Bangalore', state: 'KA', zip: '560001', localities: ['Indiranagar', 'Whitefield', 'Koramangala', 'HSR Layout', 'Jayanagar'] },
      { name: 'Mumbai', state: 'MH', zip: '400001', localities: ['Bandra West', 'Andheri West', 'Juhu', 'Powai', 'Worli'] },
      { name: 'Delhi NCR', state: 'DL', zip: '110001', localities: ['DLF Phase 5 Gurgaon', 'Vasant Kunj', 'Saket', 'Noida Sector 62', 'Greater Kailash'] },
      { name: 'Chennai', state: 'TN', zip: '600001', localities: ['Adyar', 'Mylapore', 'OMR Road', 'Velachery', 'Besant Nagar'] },
      { name: 'Hyderabad', state: 'TG', zip: '500001', localities: ['Gachibowli', 'Jubilee Hills', 'Banjara Hills', 'Kondapur', 'Madhapur'] },
      { name: 'Pune', state: 'MH', zip: '411001', localities: ['Koregaon Park', 'Kalyani Nagar', 'Baner', 'Hinjewadi', 'Viman Nagar'] }
    ];

    const propTypes = ['Apartment', 'Single Family Home', 'Condo', 'Townhouse', 'Studio'];
    const propPrefixes = ['Elegant 3BHK', 'Spacious 2BHK', 'Luxury Penthouse Loft', 'Cozy 1BHK Studio', 'Premium Townhouse'];
    const propDescriptions = [
      'Stunning modern residence featuring high ceilings, premium Italian marble flooring, high-speed fiber internet, and 24/7 power backup in a gated community.',
      'Sleek and contemporary home situated in a prime locality, equipped with fully fitted modular kitchen, high-quality sanitary fixtures, and beautiful balcony views.',
      'Luxury high-rise residence offering gorgeous sky views, private elevator access, double parking slot, smart lock entry, and close proximity to IT hubs.',
      'Magnificent gated villa built with architectural perfection, featuring a private terrace garden, dedicated study/office room, and world-class society amenities.'
    ];

    const propertyImages = [
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1536376072261-38c75010e6c9?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&auto=format&fit=crop&q=80'
    ];

    const extraPropertiesData = [];
    for (let i = 0; i < 50; i++) {
      const cityData = indianCities[i % indianCities.length];
      const locality = cityData.localities[(i * 3) % cityData.localities.length];
      const type = propTypes[i % propTypes.length];
      const prefix = propPrefixes[(i * 7) % propPrefixes.length];
      const description = propDescriptions[(i * 11) % propDescriptions.length];
      const image = propertyImages[(i * 13) % propertyImages.length];

      const rentAmount = Math.floor(18000 + ((i * 4500) % 85000));
      const securityDeposit = rentAmount * 3;

      extraPropertiesData.push({
        title: `${prefix} at ${locality}`,
        description: `${description} Conveniently located in ${locality}, ${cityData.name}. Ready to move in.`,
        type,
        address: {
          street: `${100 + i * 4}, Block ${String.fromCharCode(65 + (i % 6))}, ${locality}`,
          city: cityData.name,
          state: cityData.state,
          zipCode: cityData.zip,
          country: 'India'
        },
        rentAmount,
        securityDeposit,
        bedrooms: Math.floor(1 + (i % 4)),
        bathrooms: Math.floor(1 + ((i * 2) % 3)),
        areaSqFt: Math.floor(650 + ((i * 45) % 2200)),
        status: i % 10 === 0 ? 'rented' : 'available',
        amenities: ['Power Backup', '24/7 Security', 'Covered Parking', 'Elevator', 'Gated Community', 'Swimming Pool', 'Gym'].slice(0, 3 + (i % 5)),
        images: [image],
        yearBuilt: 2015 + (i % 10),
        petFriendly: i % 3 !== 0,
        createdBy: admin._id
      });
    }

    const properties = await Property.insertMany([...propertiesData, ...extraPropertiesData]);
    console.log(`[Seed] Created ${properties.length} properties.`);

    // 3. Create Leases
    const lease1 = await Lease.create({
      property: properties[0]._id,
      tenant: tenant1._id,
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-12-31'),
      monthlyRent: properties[0].rentAmount,
      securityDeposit: properties[0].securityDeposit,
      status: 'active',
      terms: 'Standard 12-month residential agreement with automatic renewal option.',
    });

    const lease2 = await Lease.create({
      property: properties[1]._id,
      tenant: tenant2._id,
      startDate: new Date('2026-03-01'),
      endDate: new Date('2027-02-28'),
      monthlyRent: properties[1].rentAmount,
      securityDeposit: properties[1].securityDeposit,
      status: 'active',
      terms: 'Tenant responsible for electric and high-speed internet.',
    });

    console.log('[Seed] Created active leases.');

    // 4. Create Payments
    await Payment.create([
      {
        lease: lease1._id,
        property: properties[0]._id,
        tenant: tenant1._id,
        amount: 3850,
        paymentDate: new Date('2026-08-01'),
        dueDate: new Date('2026-08-01'),
        type: 'Rent',
        paymentMethod: 'Bank Transfer',
        status: 'paid',
        transactionId: 'TXN-AUG26-001',
      },
      {
        lease: lease1._id,
        property: properties[0]._id,
        tenant: tenant1._id,
        amount: 3850,
        paymentDate: new Date('2026-07-01'),
        dueDate: new Date('2026-07-01'),
        type: 'Rent',
        paymentMethod: 'Credit Card',
        status: 'paid',
        transactionId: 'TXN-JUL26-042',
      },
      {
        lease: lease2._id,
        property: properties[1]._id,
        tenant: tenant2._id,
        amount: 2400,
        paymentDate: new Date('2026-08-01'),
        dueDate: new Date('2026-08-01'),
        type: 'Rent',
        paymentMethod: 'Stripe',
        status: 'paid',
        transactionId: 'TXN-AUG26-089',
      },
      {
        lease: lease1._id,
        property: properties[0]._id,
        tenant: tenant1._id,
        amount: 3850,
        paymentDate: new Date('2026-09-01'),
        dueDate: new Date('2026-09-01'),
        type: 'Rent',
        paymentMethod: 'Bank Transfer',
        status: 'pending',
        transactionId: 'TXN-SEP26-001',
      },
    ]);

    console.log('[Seed] Created sample payment transactions.');

    // 5. Create Maintenance Requests
    await MaintenanceRequest.create([
      {
        property: properties[0]._id,
        tenant: tenant1._id,
        title: 'Master Bathroom Shower Pressure Inspection',
        description: 'Water pressure in master shower head has decreased noticeably over the last few days.',
        category: 'Plumbing',
        priority: 'medium',
        status: 'in_progress',
        estimatedCost: 180,
        contractorAssigned: {
          name: 'Apex Plumbing Services',
          phone: '+1 (555) 300-8822',
        },
      },
      {
        property: properties[1]._id,
        tenant: tenant2._id,
        title: 'HVAC Air Filter Replacement & Smart Thermostat Sync',
        description: 'Regular quarterly filter replacement and reconnecting WiFi sensor.',
        category: 'HVAC',
        priority: 'low',
        status: 'resolved',
        estimatedCost: 75,
        resolvedDate: new Date('2026-07-28'),
      },
      {
        property: properties[4]._id,
        tenant: tenant1._id,
        title: 'Main Kitchen Refrigerator Ice Maker Repair',
        description: 'Ice maker stopped dispensing and motor sounds irregular.',
        category: 'Appliance',
        priority: 'high',
        status: 'open',
        estimatedCost: 320,
      },
    ]);

    // 6. Create Rental Products
    const sampleProducts = [
      {
        name: 'Ultra-Comfort Modular Velvet Sectional Sofa',
        description: 'Deep-seat luxury modular 4-piece sectional with stain-resistant velvet fabric, solid oak framing, and high-resiliency foam cushions.',
        category: 'Furniture',
        pricePerDay: 18,
        securityDeposit: 250,
        stockQuantity: 6,
        isAvailable: true,
        images: [
          'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=800&auto=format&fit=crop&q=80',
        ],
        features: ['Stain Resistant', 'Modular Configuration', 'Includes 4 Accent Pillows', 'Solid Hardwood Legs'],
        specifications: {
          brand: 'West Elm Studio',
          model: 'Haven-4P',
          condition: 'Brand New',
          dimensions: '112"W x 65"D x 34"H',
        },
        createdBy: admin._id,
      },
      {
        name: 'LG C3 65" 4K OLED evo Smart Cinema TV',
        description: 'Self-lit OLED pixels, 120Hz refresh rate, Dolby Vision IQ & Dolby Atmos, WebOS smart hub with streaming apps pre-installed.',
        category: 'Electronics',
        pricePerDay: 14,
        securityDeposit: 200,
        stockQuantity: 8,
        isAvailable: true,
        images: [
          'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=800&auto=format&fit=crop&q=80',
        ],
        features: ['4K Ultra HD OLED', '120Hz Gaming Mode', 'Dolby Atmos Audio', 'Includes Smart Remote & Stand'],
        specifications: {
          brand: 'LG Electronics',
          model: 'OLED65C3PUA',
          condition: 'Like New',
          dimensions: '57.1"W x 32.7"H x 1.8"D',
        },
        createdBy: admin._id,
      },
      {
        name: 'Ergonomic Standing Desk & Herman Miller Embody Chair Set',
        description: 'Electric dual-motor height adjustable motorized bamboo desk (60"x30") paired with authentic Herman Miller ergonomic posture-correct chair.',
        category: 'Furniture',
        pricePerDay: 16,
        securityDeposit: 220,
        stockQuantity: 5,
        isAvailable: true,
        images: [
          'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=800&auto=format&fit=crop&q=80',
        ],
        features: ['Dual Motor Electric Lift', 'Memory Presets', 'Breathable Mesh Back', 'Adjustable Armrests'],
        specifications: {
          brand: 'Jarvis & Herman Miller',
          model: 'Pro Desk + Embody',
          condition: 'Brand New',
          dimensions: '60"W x 30"D (Height 25"-51")',
        },
        createdBy: admin._id,
      },
      {
        name: 'Dyson Purifier Hot+Cool Formaldehyde HP09',
        description: 'Intelligent HEPA H13 filtration capturing 99.97% of particles, real-time air quality sensor, heating and cooling airflow.',
        category: 'Appliances',
        pricePerDay: 9,
        securityDeposit: 120,
        stockQuantity: 12,
        isAvailable: true,
        images: [
          'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=800&auto=format&fit=crop&q=80',
        ],
        features: ['HEPA H13 Sealed System', 'Dual Heating & Cooling', 'App Controlled', 'Whisper Quiet Night Mode'],
        specifications: {
          brand: 'Dyson',
          model: 'HP09 Purifier',
          condition: 'Like New',
          dimensions: '8.7"W x 30.1"H',
        },
        createdBy: admin._id,
      },
      {
        name: 'DeWalt 20V MAX Cordless 7-Tool Combo Kit',
        description: 'Complete heavy-duty contractor power tool set including brushless drill/driver, impact driver, circular saw, reciprocating saw, oscillating tool, 2 batteries and charger.',
        category: 'Tools',
        pricePerDay: 12,
        securityDeposit: 150,
        stockQuantity: 7,
        isAvailable: true,
        images: [
          'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=800&auto=format&fit=crop&q=80',
        ],
        features: ['Brushless Motors', '2x 5.0Ah XR Batteries', 'Heavy Duty Contractor Bag', 'Fast Charger'],
        specifications: {
          brand: 'DeWalt',
          model: 'DCK694P2',
          condition: 'Excellent',
          dimensions: '18" x 14" x 10" Bag',
        },
        createdBy: admin._id,
      },
      {
        name: 'Breville Barista Touch Espresso Machine & Grinder',
        description: 'Automated touchscreen coffee machine with integrated conical burr grinder, 3-second ThermoJet heating, and automatic micro-foam milk texturing.',
        category: 'Appliances',
        pricePerDay: 11,
        securityDeposit: 160,
        stockQuantity: 4,
        isAvailable: true,
        images: [
          'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&auto=format&fit=crop&q=80',
        ],
        features: ['Touchscreen Menu', 'Integrated Burr Grinder', 'Auto Microfoam Steam', '3-Sec Rapid Heat'],
        specifications: {
          brand: 'Breville',
          model: 'BES880BSS',
          condition: 'Brand New',
          dimensions: '12.6"W x 15.5"H x 12"D',
        },
        createdBy: admin._id,
      },
    ];

    const categoriesList = ['Furniture', 'Electronics', 'Appliances', 'Tools', 'Fitness', 'Home Decor'];
    const adjectivesList = ['Premium', 'Luxury', 'Ultra-Comfort', 'Smart', 'Ergonomic', 'Professional', 'Elite', 'Heavy-Duty', 'Compact', 'Pro-Series', 'Wireless', 'High-Fidelity', 'Eco-Friendly', 'Vintage', 'Modern'];
    const brandsList = {
      'Furniture': ['Herman Miller', 'West Elm', 'IKEA', 'Steelcase', 'Wayfair'],
      'Electronics': ['Sony', 'LG', 'Samsung', 'Apple', 'Bose', 'Dell', 'HP', 'Sennheiser'],
      'Appliances': ['Dyson', 'Breville', 'LG', 'Samsung', 'KitchenAid', 'Philips', 'Panasonic'],
      'Tools': ['DeWalt', 'Bosch', 'Makita', 'Milwaukee', 'Black & Decker', 'Ryobi'],
      'Fitness': ['Peloton', 'Bowflex', 'NordicTrack', 'Rogue Fitness', 'Theragun', 'Fitbit'],
      'Home Decor': ['West Elm Decor', 'Crate & Barrel', 'Target Home', 'CB2', 'Pottery Barn', 'Zara Home']
    };
    const productNounsList = {
      'Furniture': ['Velvet Sofa', 'Standing Desk', 'Ergonomic Chair', 'Dining Table', 'Bookshelf', 'Recliner', 'Bed Frame', 'Coffee Table'],
      'Electronics': ['4K OLED TV', 'Noise Cancelling Headphones', 'Soundbar System', 'Laptop Pro', 'Smart Projector', 'Bluetooth Speaker', 'Monitor 34"', 'Tablet Duo'],
      'Appliances': ['Air Purifier', 'Espresso Machine', 'Smart Refrigerator', 'Air Fryer', 'Microwave Oven', 'Robotic Vacuum', 'Blender Professional'],
      'Tools': ['Drill Combo Kit', 'Circular Saw', 'Toolbox Organizer', 'Laser Level', 'Pressure Washer', 'Power Sanders Set'],
      'Fitness': ['Stationary Bike', 'Adjustable Dumbbells', 'Treadmill Elite', 'Yoga Set Pro', 'Massage Gun', 'Rowing Machine'],
      'Home Decor': ['Abstract Painting', 'Luxury Floor Rug', 'Minimalist Vase', 'Ceramic Table Lamp', 'Scented Candle Set', 'Floating Wall Shelves']
    };
    const imageTemplatesList = {
      'Furniture': [
        'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=800&auto=format&fit=crop&q=80'
      ],
      'Electronics': [
        'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1546054454-aa26e2b734c7?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80'
      ],
      'Appliances': [
        'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?w=800&auto=format&fit=crop&q=80'
      ],
      'Tools': [
        'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1530124560676-10551d5b3db0?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1581147036324-c17ac41dfa6c?w=800&auto=format&fit=crop&q=80'
      ],
      'Fitness': [
        'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?w=800&auto=format&fit=crop&q=80'
      ],
      'Home Decor': [
        'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1537225228614-56cc3556d7ed?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1533873984035-25970ab07461?w=800&auto=format&fit=crop&q=80'
      ]
    };

    const extraProducts = [];
    for (let i = 0; i < 300; i++) {
      const category = categoriesList[i % categoriesList.length];
      const adj = adjectivesList[(i * 7) % adjectivesList.length];
      const brandList = brandsList[category];
      const brand = brandList[(i * 11) % brandList.length];
      const nounList = productNounsList[category];
      const noun = nounList[(i * 13) % nounList.length];
      const imagesList = imageTemplatesList[category];
      const image = imagesList[(i * 17) % imagesList.length];

      const name = `${adj} ${brand} ${noun} (Model #${1001 + i})`;
      const pricePerDay = Math.floor(5 + ((i * 3) % 25));
      const securityDeposit = pricePerDay * Math.floor(10 + ((i * 2) % 15));

      extraProducts.push({
        name,
        description: `This is a high-quality ${name} designed for maximum efficiency and durability. Enjoy premium features and industry-leading performance.`,
        category,
        pricePerDay,
        securityDeposit,
        stockQuantity: Math.floor(2 + (i % 15)),
        isAvailable: true,
        images: [image],
        features: [`${adj} build quality`, `From trusted brand ${brand}`, 'Easy setup & deployment'],
        specifications: {
          brand,
          model: `MDL-${2026 + i}`,
          condition: i % 2 === 0 ? 'Brand New' : 'Like New',
          dimensions: 'Standard size'
        },
        createdBy: admin._id
      });
    }

    const products = await Product.insertMany([...sampleProducts, ...extraProducts]);
    console.log(`[Seed] Created ${products.length} rental products.`);

    // 7. Create Sample Rental Booking
    await Rental.create({
      user: tenant1._id,
      items: [
        {
          product: products[0]._id,
          name: products[0].name,
          pricePerDay: products[0].pricePerDay,
          securityDeposit: products[0].securityDeposit,
          startDate: new Date('2026-08-01'),
          endDate: new Date('2026-08-15'),
          days: 14,
          subtotal: products[0].pricePerDay * 14,
          deposit: products[0].securityDeposit,
          image: products[0].images[0],
        },
        {
          product: products[1]._id,
          name: products[1].name,
          pricePerDay: products[1].pricePerDay,
          securityDeposit: products[1].securityDeposit,
          startDate: new Date('2026-08-01'),
          endDate: new Date('2026-08-15'),
          days: 14,
          subtotal: products[1].pricePerDay * 14,
          deposit: products[1].securityDeposit,
          image: products[1].images[0],
        },
      ],
      startDate: new Date('2026-08-01'),
      endDate: new Date('2026-08-15'),
      totalDays: 14,
      rentalTotal: (18 * 14) + (14 * 14), // $448
      depositTotal: 250 + 200,            // $450
      grandTotal: 448 + 450,              // $898
      status: 'active',
      paymentMethod: 'Credit Card',
      paymentStatus: 'paid',
      transactionId: 'RNT-AUG26-009',
      notes: 'Delivered to Suite 44B. Scheduled for pickup on Aug 15.',
    });

    console.log('[Seed] Created sample rental booking.');
    console.log('[Seed] Database seeding completed successfully! ✨');
    process.exit(0);
  } catch (error) {
    console.error('[Seed Error]:', error);
    process.exit(1);
  }
};

seedDB();
