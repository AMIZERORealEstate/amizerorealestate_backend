// AMIZERO Real Estate Backend Server
// Node.js + Express + MongoDB + Nodemailer

const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('./cloudinary');
const cookieParser = require('cookie-parser');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 2000;

// MongoDB Configuration
const mongoConfig = {
    connectionString: process.env.MONGODB_URI || 'mongodb://localhost:27017',
    databaseName: 'AMIZERORealEstate1'
};

// Middleware
app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// MongoDB Connection Variables
let db;
let mongoClient;

// Nodemailer Configuration
let transporter;

function createMailTransporter() {
    // Configure based on your email provider
    // Example configurations for different providers:
    
    // Gmail Configuration
    if (process.env.EMAIL_SERVICE === 'gmail') {
        transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS // Use App Password for Gmail
            }
        });
    }
    // Custom SMTP Configuration (recommended for production)
    else {
        transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: process.env.SMTP_PORT || 587,
            secure: process.env.SMTP_SECURE === 'false', // true for 465, false for other ports
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            },
            tls: {
                rejectUnauthorized: false
            }
        });
    }

    return transporter;
}

// Verify Nodemailer configuration on startup
(async () => {
    try {
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            console.error('❌ EMAIL_USER or EMAIL_PASSWORD not found in environment variables');
            console.log('📝 Please add the following to your .env file:');
            console.log('   EMAIL_SERVICE=gmail (or leave empty for custom SMTP)');
            console.log('   EMAIL_USER=your-email@gmail.com');
            console.log('   EMAIL_PASSWORD=your-app-password');
            console.log('   SMTP_HOST=smtp.gmail.com (if using custom SMTP)');
            console.log('   SMTP_PORT=587 (if using custom SMTP)');
        } else {
            transporter = createMailTransporter();
            await transporter.verify();
            console.log('✅ Nodemailer is configured and ready to send emails');
        }
    } catch (error) {
        console.error('❌ Nodemailer configuration error:', error.message);
        
    }
})();

// Cloudinary Storage Configuration
const storage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder: 'properties',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp']
    }
});

const upload = multer({ storage });

// Database Connection Function
async function connectToMongoDB() {
    try {
        console.log('🔄 Connecting to MongoDB...');
        
        // Connect using MongoClient for direct DB operations
        mongoClient = new MongoClient(mongoConfig.connectionString);
        await mongoClient.connect();
        console.log('✅ Connected to MongoDB via MongoClient');
        db = mongoClient.db(mongoConfig.databaseName);
        
        // Also connect via Mongoose for schema-based operations
        await mongoose.connect(mongoConfig.connectionString, {
            dbName: mongoConfig.databaseName
        });
        console.log('✅ Connected to MongoDB via Mongoose');

        // Create default admin if needed
        await createDefaultAdmin();
        
        return db;
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        throw error;
    }
}

// Create default admin function
async function createDefaultAdmin() {
    try {
        console.log('📝 Checking for default admin...');
        // Add your admin creation logic here if needed
    } catch (error) {
        console.error('Error creating default admin:', error);
    }
}

// Contact Form Submission
app.post('/api/contact', async (req, res) => {
    try {
        const { name, email, phone, service, message } = req.body;

        // Check database connection
        if (!db) {
            console.error('❌ Database not connected');
            return res.status(500).json({
                success: false,
                error: 'Database connection not available'
            });
        }

        // Validate required fields
        if (!name || !email || !message) {
            return res.status(400).json({
                success: false,
                error: 'Name, email, and message are required fields'
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                error: 'Please provide a valid email address'
            });
        }

        // Create contact document
        const contactData = {
            name: name.trim(),
            email: email.trim().toLowerCase(),
            phone: phone ? phone.trim() : null,
            service: service || 'General Inquiry',
            message: message.trim(),
            timestamp: new Date(),
            status: 'new',
            source: 'website',
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        };

        // Save to MongoDB
        const collection = db.collection('contacts');
        const result = await collection.insertOne(contactData);

        // Send emails using Nodemailer (don't wait for completion)
        sendContactEmails(name, email, phone, service, message, result.insertedId)
            .catch(err => console.error('Email sending error:', err));

        res.json({
            success: true,
            contactId: result.insertedId
        });

    } catch (error) {
        console.error('Contact form error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to submit contact form. Please try again later.'
        });
    }
});

// Helper function to send contact emails using Nodemailer
async function sendContactEmails(name, email, phone, service, message, contactId) {
    try {
        if (!transporter) {
            console.error('❌ Email transporter not configured');
            return;
        }

        const fromEmail = process.env.EMAIL_USER;
        const fromName = process.env.EMAIL_FROM_NAME || 'AMIZERO Real Estate';
        const adminEmail = process.env.ADMIN_EMAIL || 'amizerorealestate@gmail.com';

        // Send admin notification email
        const adminMailOptions = {
            from: `"${fromName}" <${fromEmail}>`,
            to: adminEmail,
            subject: '🏠 New Contact Request - AMIZERO Real Estate',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
                        <h1 style="color: white; margin: 0;">AMIZERO Real Estate</h1>
                        <p style="color: white; margin: 5px 0;">New Contact Request</p>
                    </div>
                    <div style="padding: 20px; background: #f8f9fa;">
                        <h2 style="color: #2c3e50;">Contact Details</h2>
                        <p><strong>Name:</strong> ${name}</p>
                        <p><strong>Email:</strong> ${email}</p>
                        <p><strong>Phone:</strong> ${phone || 'Not provided'}</p>
                        <p><strong>Service:</strong> ${service || 'General Inquiry'}</p>
                        <p><strong>Submitted:</strong> ${new Date().toLocaleString()}</p>
                        
                        <h3 style="color: #2c3e50;">Message</h3>
                        <div style="background: white; padding: 15px; border-left: 4px solid #3498db; margin: 10px 0;">
                            ${message}
                        </div>
                        
                        <p style="margin-top: 20px; color: #7f8c8d; font-size: 0.9em;">
                            Contact ID: ${contactId}
                        </p>
                    </div>
                </div>
            `
        };

        await transporter.sendMail(adminMailOptions);
        console.log('✅ Admin notification email sent');

        // Send customer confirmation email
        const customerMailOptions = {
            from: `"${fromName}" <${fromEmail}>`,
            to: email,
            subject: 'Thank you for contacting AMIZERO Real Estate',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
                        <h1 style="color: white; margin: 0;">AMIZERO Real Estate</h1>
                        <p style="color: white; margin: 5px 0;">Thank You for Your Interest</p>
                    </div>
                    <div style="padding: 20px;">
                        <h2 style="color: #2c3e50;">Dear ${name},</h2>
                        <p>Thank you for contacting AMIZERO Real Estate Ltd. We have received your inquiry and will get back to you within 24 hours.</p>
                        
                        <h3 style="color: #2c3e50;">Your Message Summary:</h3>
                        <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 10px 0;">
                            <p><strong>Service:</strong> ${service || 'General Inquiry'}</p>
                            <p><strong>Message:</strong> ${message}</p>
                        </div>
                        
                        <p>In the meantime, feel free to explore our services or contact us directly:</p>
                        <ul>
                            <li>Phone: +250 725 502 317</li>
                            <li>Email: ${adminEmail}</li>
                        </ul>
                        
                        <p style="margin-top: 30px;">Best regards,<br><strong>AMIZERO Real Estate Team</strong></p>
                    </div>
                </div>
            `
        };

        await transporter.sendMail(customerMailOptions);
        console.log('✅ Customer confirmation email sent');

    } catch (error) {
        console.error('❌ Error sending emails via Nodemailer:', error);
        throw error;
    }
}

// Get all contacts (admin endpoint)
app.get('/api/contacts', async (req, res) => {
    try {
        if (!db) {
            return res.status(500).json({
                success: false,
                error: 'Database connection not available'
            });
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const collection = db.collection('contacts');
        
        const contacts = await collection
            .find({})
            .sort({ timestamp: -1 })
            .skip(skip)
            .limit(limit)
            .toArray();

        const totalContacts = await collection.countDocuments();

        res.json({
            success: true,
            contacts,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(totalContacts / limit),
                totalContacts,
                hasNext: page * limit < totalContacts,
                hasPrev: page > 1
            }
        });

    } catch (error) {
        console.error('Get contacts error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve contacts'
        });
    }
});

// Update contact status
app.put('/api/contacts/:id/status', async (req, res) => {
    try {
        if (!db) {
            return res.status(500).json({
                success: false,
                error: 'Database connection not available'
            });
        }

        const { id } = req.params;
        const { status } = req.body;

        if (!ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid contact ID'
            });
        }

        const validStatuses = ['new', 'contacted', 'in-progress', 'completed', 'closed'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid status value'
            });
        }

        const collection = db.collection('contacts');
        const result = await collection.updateOne(
            { _id: new ObjectId(id) },
            { 
                $set: { 
                    status,
                    lastUpdated: new Date()
                }
            }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({
                success: false,
                error: 'Contact not found'
            });
        }

        res.json({
            success: true,
            message: 'Contact status updated successfully'
        });

    } catch (error) {
        console.error('Update contact status error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update contact status'
        });
    }
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
    const health = {
        status: 'OK',
        timestamp: new Date().toISOString(),
        database: db ? 'Connected' : 'Disconnected',
        email: transporter ? 'Configured' : 'Not Configured'
    };
    
    res.json(health);
});




// MongoDB Schemas

const AdminSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    name: { type: String, required: true },
    role: { type: String, default: 'admin' },
    createdAt: { type: Date, default: Date.now }
});


const PropertySchema = new mongoose.Schema({
    images: [{ type: String, required: true }], // Cloudinary URLs
    title: { type: String, required: true },
    location: { type: String, required: true },
    price: { type: Number, required: true },
    type: { type: String, enum: ['sale', 'rent'], required: true },
    propertyType: { 
        type: String, 
        enum: ['house', 'apartment', 'villa', 'office', 'land', 'commercial'], 
        required: true 
    },
    bedrooms: { type: Number, default: 0 },
    bathrooms: { type: Number, default: 0 },
    area: { type: Number, default: 0 },
    description: { type: String },
    status: { type: String, enum: ['active', 'inactive', 'sold', 'rented'], default: 'active' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});


const ScheduleVisitSchema = new mongoose.Schema({
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
    preferredDate: { type: Date, required: true },
    preferredTime: { type: String, required: true },
    message: { type: String },
    status: { type: String, enum: ['pending', 'confirmed', 'completed', 'cancelled'], default: 'pending' },
    createdAt: { type: Date, default: Date.now }
});

const ScheduleVisit = mongoose.model('ScheduleVisit', ScheduleVisitSchema);

const TeamSchema = new mongoose.Schema({
    name: { type: String, required: true },
    position: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String },
    bio: { type: String },
    image: { type: String },
   
    skills: {
  type: [{ type: String }],
  default: []   // ensures empty array if no skills provided
},

    socialLinks: {
        linkedin: { type: String },
        twitter: { type: String },
        email: { type: String }
    },
    createdAt: { type: Date, default: Date.now }
});

const PortfolioSchema = new mongoose.Schema({
    title: { type: String, required: true },
    category: { 
        type: String, 
        enum: ['valuation', 'management', 'brokerage', 'survey','development'], 
        required: true 
    },
    description: { type: String, required: true },
    value: { type: String },
    date: { type: Date, required: true },
    client: { type: String },
    location: { type: String },
    duration: { type: String },
    status: { 
        type: String, 
        enum: ['completed', 'ongoing', 'planned'], 
        default: 'completed' 
    },
    images: [{ type: String }],  
   
    createdAt: { type: Date, default: Date.now }
});



const ActivitySchema = new mongoose.Schema({
    action: { type: String, required: true },
    description: { type: String, required: true },
    type: { type: String, enum: ['property', 'team', 'portfolio', 'admin'], required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    timestamp: { type: Date, default: Date.now }
});

// Models
const Admin = mongoose.model('Admin', AdminSchema, 'admin'); 
const Property = mongoose.model('Property', PropertySchema);

const Team = mongoose.model('Team', TeamSchema);
const Portfolio = mongoose.model('Portfolio', PortfolioSchema);
const Activity = mongoose.model('Activity', ActivitySchema);

// Create default admin user
async function createDefaultAdmin() {
    try {
        const existingAdmin = await Admin.findOne({ email: 'amizerorealestate01@gmail.com' });
        if (!existingAdmin) {
            const hashedPassword = await bcrypt.hash('AMR123', 12);
            const admin = new Admin({
                email: 'amizerorealestate01@gmail.com',
                password: hashedPassword,
                name: 'AMIZERO ADMIN',
                role: 'admin'
            });
            await admin.save();
            console.log('Default admin created successfully');
            
            // Log activity
            await logActivity('Admin Created', 'Default admin account was created', 'admin');
        }
    } catch (error) {
        console.error('Error creating default admin:', error);
    }
}

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'amizero_jwt_secret_key_2024';

// Authentication middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, admin) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid or expired token' });
        }
        req.admin = admin;
        next();
    });
};

// Activity logging function
async function logActivity(action, description, type, userId = null) {
    try {
        const activity = new Activity({
            action,
            description,
            type,
            userId
        });
        await activity.save();
    } catch (error) {
        console.error('Error logging activity:', error);
    }
}

// Routes

// Authentication Routes
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        // Find admin
        const admin = await Admin.findOne({ email });
        if (!admin) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Check password
        const isValidPassword = await bcrypt.compare(password, admin.password);
        if (!isValidPassword) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Generate JWT token
        const token = jwt.sign(
            { 
                adminId: admin._id, 
                email: admin.email, 
                name: admin.name,
                role: admin.role 
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Log activity
        await logActivity('Admin Login', `${admin.name} logged into the system`, 'admin', admin._id);

        res.json({
            token,
            admin: {
                id: admin._id,
                name: admin.name,
                email: admin.email,
                role: admin.role
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.get('/api/auth/verify', authenticateToken, async (req, res) => {
    try {
        const admin = await Admin.findById(req.admin.adminId).select('-password');
        if (!admin) {
            return res.status(404).json({ message: 'Admin not found' });
        }
        res.json({ admin });
    } catch (error) {
        console.error('Token verification error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Dashboard Statistics Route
app.get('/api/stats', authenticateToken, async (req, res) => {
    try {
        const [properties, team, portfolio] = await Promise.all([
            Property.countDocuments({ status: 'active' }),
            Team.countDocuments(),
            Portfolio.countDocuments()
        ]);

        res.json({
            properties,
            team,
            portfolio
        });
    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({ message: 'Error fetching statistics' });
    }
});

// SERVER SIDE RENDERING

// Add this route BEFORE your other property routes
// This handles server-side rendering for social media crawlers

app.get('/property/:id', async (req, res) => {
    try {
        const propertyId = req.params.id;
        
        // Fetch property from database
        const property = await Property.findById(propertyId).lean();
        
        if (!property) {
            return res.status(404).send(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Property Not Found - AMIZERO Real Estate</title>
                </head>
                <body>
                    <h1>Property Not Found</h1>
                    <p>The property you're looking for doesn't exist.</p>
                    <a href="/listing.html?type=properties">Back to Properties</a>
                </body>
                </html>
            `);
        }

        // Format property data
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const propertyUrl = `${baseUrl}/property/${property._id}`;
        const propertyImage = property.images && property.images.length > 0 
            ? property.images[0] 
            : `${baseUrl}/images/default-property.jpg`;
        
        // Format price
        const formattedPrice = new Intl.NumberFormat('en-RW', {
            style: 'currency',
            currency: 'RWF',
            minimumFractionDigits: 0
        }).format(property.price || 0);
        
        const priceDisplay = property.type === 'rent' ? `${formattedPrice}/month` : formattedPrice;
        
        // Create title and description
        const title = `${property.title} - ${priceDisplay}`;
        const description = `${property.propertyType || 'Property'} in ${property.location} • ${property.bedrooms || 0} beds • ${property.bathrooms || 0} baths • ${property.area || 0} m²`;
        const fullDescription = property.description ? property.description.substring(0, 200) + '...' : description;

        // Generate HTML with meta tags
        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    
    <!-- Basic Meta Tags -->
    <title>${escapeHtml(title)} | AMIZERO Real Estate</title>
    <meta name="description" content="${escapeHtml(fullDescription)}">
    
    <!-- Open Graph Meta Tags (Facebook, WhatsApp, LinkedIn) -->
    <meta property="og:site_name" content="AMIZERO Real Estate Ltd">
    <meta property="og:type" content="website">
    <meta property="og:url" content="${propertyUrl}">
    <meta property="og:title" content="${escapeHtml(title)}">
    <meta property="og:description" content="${escapeHtml(fullDescription)}">
    <meta property="og:image" content="${propertyImage}">
    <meta property="og:image:secure_url" content="${propertyImage}">
    <meta property="og:image:type" content="image/jpeg">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:image:alt" content="${escapeHtml(property.title)}">
    <meta property="og:locale" content="en_US">
    
    <!-- Twitter Card Meta Tags -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(title)}">
    <meta name="twitter:description" content="${escapeHtml(fullDescription)}">
    <meta name="twitter:image" content="${propertyImage}">
    <meta name="twitter:image:alt" content="${escapeHtml(property.title)}">
    
    <!-- Additional Meta Tags -->
    <meta name="robots" content="index, follow">
    <meta name="author" content="AMIZERO Real Estate Ltd">
    <link rel="canonical" href="${propertyUrl}">
    
    <!-- Favicon -->
    <link rel="icon" type="image/png" href="/images/AMR_LOGO_white_color-removebg-preview.png">
    
    <!-- Stylesheet -->
    <link rel="stylesheet" href="/styles.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    
    <!-- Structured Data -->
    <script type="application/ld+json">
    {
        "@context": "https://schema.org",
        "@type": "${property.type === 'sale' ? 'Product' : 'RealEstateListing'}",
        "name": "${escapeHtml(property.title)}",
        "description": "${escapeHtml(property.description || description)}",
        "image": "${propertyImage}",
        "url": "${propertyUrl}",
        "offers": {
            "@type": "Offer",
            "price": "${property.price}",
            "priceCurrency": "RWF",
            "availability": "https://schema.org/InStock"
        },
        "address": {
            "@type": "PostalAddress",
            "addressLocality": "${escapeHtml(property.location)}",
            "addressCountry": "RW"
        },
        "numberOfRooms": ${property.bedrooms || 0},
        "numberOfBathroomsTotal": ${property.bathrooms || 0},
        "floorSize": {
            "@type": "QuantitativeValue",
            "value": ${property.area || 0},
            "unitCode": "MTK"
        }
    }
    </script>
    
    <!-- Redirect script for JavaScript-enabled browsers -->
    <script>
        // Redirect to the actual property details page with query parameter
        window.location.href = '/propertyDetails.html?id=${property._id}';
    </script>
    
    <!-- Noscript fallback -->
    <noscript>
        <meta http-equiv="refresh" content="0;url=/propertyDetails.html?id=${property._id}">
    </noscript>
</head>
<body>
    <!-- Fallback content for crawlers and no-JS browsers -->
    <div class="container" style="max-width: 1200px; margin: 0 auto; padding: 2rem;">
        <header style="margin-bottom: 2rem;">
            <h1 style="color: #2d3748; font-size: 2rem; margin-bottom: 0.5rem;">
                ${escapeHtml(property.title)}
            </h1>
            <p style="color: #718096; font-size: 1.125rem;">
                <strong>${priceDisplay}</strong>
            </p>
        </header>
        
        <main>
            <div style="margin-bottom: 2rem;">
                <img src="${propertyImage}" 
                     alt="${escapeHtml(property.title)}" 
                     style="width: 100%; max-height: 500px; object-fit: cover; border-radius: 8px;">
            </div>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
                <div style="padding: 1rem; background: #f7fafc; border-radius: 8px;">
                    <strong>📍 Location:</strong> ${escapeHtml(property.location)}
                </div>
                <div style="padding: 1rem; background: #f7fafc; border-radius: 8px;">
                    <strong>🛏️ Bedrooms:</strong> ${property.bedrooms || 'N/A'}
                </div>
                <div style="padding: 1rem; background: #f7fafc; border-radius: 8px;">
                    <strong>🚿 Bathrooms:</strong> ${property.bathrooms || 'N/A'}
                </div>
                <div style="padding: 1rem; background: #f7fafc; border-radius: 8px;">
                    <strong>📐 Area:</strong> ${property.area ? property.area + ' m²' : 'N/A'}
                </div>
            </div>
            
            <div style="margin-bottom: 2rem;">
                <h2 style="color: #2d3748; font-size: 1.5rem; margin-bottom: 1rem;">Description</h2>
                <p style="color: #4a5568; line-height: 1.6;">
                    ${escapeHtml(property.description || 'No description available')}
                </p>
            </div>
            
            <div style="padding: 1.5rem; background: #edf2f7; border-radius: 8px; text-align: center;">
                <p style="margin-bottom: 1rem;">If you're not redirected automatically...</p>
                <a href="/propertyDetails.html?id=${property._id}" 
                   style="display: inline-block; padding: 0.75rem 1.5rem; background: #3182ce; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">
                    View Full Property Details
                </a>
            </div>
        </main>
        
        <footer style="margin-top: 3rem; padding-top: 2rem; border-top: 1px solid #e2e8f0; text-align: center; color: #718096;">
            <p><strong>AMIZERO Real Estate Ltd</strong></p>
            <p>📞 +250 (725) 502-317 | 📧 amizerorealestate@gmail.com</p>
        </footer>
    </div>
</body>
</html>
        `;

        res.send(html);

    } catch (error) {
        console.error('Error rendering property:', error);
        res.status(500).send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Error - AMIZERO Real Estate</title>
            </head>
            <body>
                <h1>Error Loading Property</h1>
                <p>There was an error loading this property. Please try again later.</p>
                <a href="/listing.html?type=properties">Back to Properties</a>
            </body>
            </html>
        `);
    }
});

// Helper function to escape HTML special characters
function escapeHtml(text) {
    if (!text) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.toString().replace(/[&<>"']/g, m => map[m]);
}

// Keep your existing routes below this...
// Public route for single property (API endpoint)
app.get("/api/public/properties/:id", async (req, res) => {
    try {
        const property = await Property.findById(req.params.id).lean();
        
        if (!property) {
            return res.status(404).json({ message: 'Property not found' });
        }

        // Return public fields
        const publicProperty = {
            id: property._id,
            title: property.title,
            price: property.price,
            type: property.type,
            location: property.location,
            bedrooms: property.bedrooms,
            bathrooms: property.bathrooms,
            area: property.area,
            propertyType: property.propertyType,
            description: property.description,
            images: property.images || []
        };

        res.json(publicProperty);
    } catch (error) {
        console.error('Property fetch error:', error);
        res.status(500).json({ message: 'Error fetching property' });
    }
});

// Your existing routes...
app.get('/api/properties', authenticateToken, async (req, res) => {
    try {
        const properties = await Property.find()
            .sort({ createdAt: -1 })
            .lean();
        res.json(properties);
    } catch (error) {
        console.error('Properties fetch error:', error);
        res.status(500).json({ message: 'Error fetching properties' });
    }
});

app.get("/api/public/properties", async (req, res) => {
    try {
        const { type, location, propertyType, bedrooms, minPrice, maxPrice, q } = req.query;

        let query = {};

        if (type && type !== 'all') query.type = type;
        if (location) query.location = { $regex: location, $options: 'i' };
        if (propertyType) query.propertyType = propertyType;
        if (bedrooms) query.bedrooms = { $gte: parseInt(bedrooms) };

        if (minPrice || maxPrice) {
            query.price = {};
            if (minPrice) query.price.$gte = parseInt(minPrice);
            if (maxPrice) query.price.$lte = parseInt(maxPrice);
        }

        if (q) {
            const searchRegex = { $regex: q, $options: 'i' };
            query.$or = [
                { title: searchRegex },
                { location: searchRegex },
                { description: searchRegex }
            ];
        }

        const properties = await Property.find(query).sort({ createdAt: -1 }).lean();

        const publicProps = properties.map(p => ({
            id: p._id,
            title: p.title,
            price: p.price,
            type: p.type,
            location: p.location,
            bedrooms: p.bedrooms,
            bathrooms: p.bathrooms,
            area: p.area,
            propertyType: p.propertyType,
            description: p.description,
            images: p.images || []
        }));

        res.json(publicProps);

    } catch (err) {
        console.error("Failed to fetch properties", err);
        res.status(500).json({ error: "Failed to fetch properties" });
    }
});

app.get('/api/properties/:id', authenticateToken, async (req, res) => {
    try {
        const property = await Property.findById(req.params.id);
        if (!property) {
            return res.status(404).json({ message: 'Property not found' });
        }
        res.json(property);
    } catch (error) {
        console.error('Property fetch error:', error);
        res.status(500).json({ message: 'Error fetching property' });
    }
});

app.post('/api/properties', authenticateToken, upload.array('images', 6), async (req, res) => {
    try {
    
        const propertyData = { ...req.body };

        if (req.files && req.files.length > 0) {
            const newImages = req.files
                .map(file => file.path)   // CloudinaryStorage puts URL in path
                .filter(url => typeof url === 'string');

            propertyData.images = newImages;
        } else {
            propertyData.images = [];
        }

        // Convert string numbers to actual numbers
        if (propertyData.price) propertyData.price = parseFloat(propertyData.price);
        if (propertyData.bedrooms) propertyData.bedrooms = parseInt(propertyData.bedrooms);
        if (propertyData.bathrooms) propertyData.bathrooms = parseInt(propertyData.bathrooms);
        if (propertyData.area) propertyData.area = parseFloat(propertyData.area);

        // Save new property
        const property = new Property(propertyData);
        await property.save();

        // Log activity
        await logActivity(
            'Property Created',
            `New property "${property.title}" was added`,
            'property',
            req.admin.adminId
        );

        res.status(201).json(property);
    } catch (error) {
        console.error('Property creation error:', error);
        res.status(400).json({ message: error.message || 'Error creating property' });
    }
});



app.put('/api/properties/:id', authenticateToken, upload.array('images', 10), async (req, res) => {
    try {
        const propertyData = { ...req.body };
        propertyData.updatedAt = new Date();

        // Handle file uploads
        if (req.files && req.files.length > 0) {
            const newImages = req.files.map(file => `/uploads/${file.filename}`);
            // If existing images, append new ones, otherwise use new ones
            if (propertyData.existingImages) {
                propertyData.images = [...JSON.parse(propertyData.existingImages), ...newImages];
            } else {
                propertyData.images = newImages;
            }
        }

        // Convert string numbers to actual numbers
        if (propertyData.price) propertyData.price = parseFloat(propertyData.price);
        if (propertyData.bedrooms) propertyData.bedrooms = parseInt(propertyData.bedrooms);
        if (propertyData.bathrooms) propertyData.bathrooms = parseInt(propertyData.bathrooms);
        if (propertyData.area) propertyData.area = parseFloat(propertyData.area);

        const property = await Property.findByIdAndUpdate(
            req.params.id,
            propertyData,
            { new: true, runValidators: true }
        );

        if (!property) {
            return res.status(404).json({ message: 'Property not found' });
        }

        // Log activity
        await logActivity('Property Updated', `Property "${property.title}" was updated`, 'property', req.admin.adminId);

        res.json(property);
    } catch (error) {
        console.error('Property update error:', error);
        res.status(400).json({ message: error.message || 'Error updating property' });
    }
});

app.delete('/api/properties/:id', authenticateToken, async (req, res) => {
    try {
        const property = await Property.findByIdAndDelete(req.params.id);
        if (!property) {
            return res.status(404).json({ message: 'Property not found' });
        }

        // Delete associated images
        if (property.images && property.images.length > 0) {
            property.images.forEach(image => {
                const imagePath = path.join(__dirname, 'public', image);
                if (fs.existsSync(imagePath)) {
                    fs.unlinkSync(imagePath);
                }
            });
        }

        // Log activity
        await logActivity('Property Deleted', `Property "${property.title}" was deleted`, 'property', req.admin.adminId);

        res.json({ message: 'Property deleted successfully' });
    } catch (error) {
        console.error('Property deletion error:', error);
        res.status(500).json({ message: 'Error deleting property' });
    }
});




// GET all schedule visits (Admin only)
app.get('/api/schedule-visits', authenticateToken, async (req, res) => {
    try {
        const scheduleVisits = await ScheduleVisit.find()
            .populate('propertyId', 'title location')
            .sort({ createdAt: -1 })
            .lean();
        res.json(scheduleVisits);
    } catch (error) {
        console.error('Schedule visits fetch error:', error);
        res.status(500).json({ message: 'Error fetching schedule visits' });
    }
});

// GET single schedule visit (Admin only)
app.get('/api/schedule-visits/:id', authenticateToken, async (req, res) => {
    try {
        const scheduleVisit = await ScheduleVisit.findById(req.params.id)
            .populate('propertyId', 'title location');
        if (!scheduleVisit) {
            return res.status(404).json({ message: 'Schedule visit not found' });
        }
        res.json(scheduleVisit);
    } catch (error) {
        console.error('Schedule visit fetch error:', error);
        res.status(500).json({ message: 'Error fetching schedule visit' });
    }
});

// POST new schedule visit (Public endpoint)
app.post('/api/schedule-visits', async (req, res) => {
    try {
        const scheduleVisit = new ScheduleVisit(req.body);
        await scheduleVisit.save();

        // Log activity
        await logActivity('New Visit Scheduled', `New visit scheduled by ${scheduleVisit.firstName} ${scheduleVisit.lastName}`, 'schedule_visit');

        res.status(201).json(scheduleVisit);
    } catch (error) {
        console.error('Schedule visit creation error:', error);
        res.status(400).json({ message: error.message || 'Error creating schedule visit' });
    }
});

// PUT update schedule visit (Admin only)
app.put('/api/schedule-visits/:id', authenticateToken, async (req, res) => {
    try {
        const scheduleVisit = await ScheduleVisit.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!scheduleVisit) {
            return res.status(404).json({ message: 'Schedule visit not found' });
        }

        // Log activity
        await logActivity('Visit Updated', `Visit by ${scheduleVisit.firstName} ${scheduleVisit.lastName} was updated`, 'schedule_visit', req.admin.adminId);

        res.json(scheduleVisit);
    } catch (error) {
        console.error('Schedule visit update error:', error);
        res.status(400).json({ message: error.message || 'Error updating schedule visit' });
    }
});


// PATCH /api/schedule-visits/:id  → Confirm visit
app.patch('/api/schedule-visits/:id', authenticateToken, async (req, res) => {
    try {
        const visitId = req.params.id;
        const { status } = req.body;

        const visit = await ScheduleVisit.findByIdAndUpdate(
            visitId,
            { status },
            { new: true } // return updated document
        );

        if (!visit) return res.status(404).json({ message: 'Visit not found' });

        res.json({ message: 'Visit updated', visit });
    } catch (error) {
        console.error('Failed to update visit:', error);
        res.status(500).json({ message: 'Failed to update visit' });
    }
});


// DELETE schedule visit (Admin only)
app.delete('/api/schedule-visits/:id', authenticateToken, async (req, res) => {
    try {
        const scheduleVisit = await ScheduleVisit.findByIdAndDelete(req.params.id);
        if (!scheduleVisit) {
            return res.status(404).json({ message: 'Schedule visit not found' });
        }

        // Log activity
        await logActivity('Visit Deleted', `Visit by ${scheduleVisit.firstName} ${scheduleVisit.lastName} was deleted`, 'schedule_visit', req.admin.adminId);

        res.json({ message: 'Schedule visit deleted successfully' });
    } catch (error) {
        console.error('Schedule visit deletion error:', error);
        res.status(500).json({ message: 'Error deleting schedule visit' });
    }
});

module.exports = { ScheduleVisit };



// Define Newsletter schema + model right here
const NewsletterSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  subscribedAt: { type: Date, default: Date.now },
  status: { type: String, default: 'active' },
  source: { type: String, default: 'website' }
});

const Newsletter = mongoose.model('Newsletter', NewsletterSchema);

// Newsletter signup endpoint
app.post('/api/newsletter', async (req, res) => {
    try {
        const { email, name } = req.body;

        if (!email) {
            return res.status(400).json({ success: false, error: 'Email is required' });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ success: false, error: 'Please provide a valid email address' });
        }

        const existing = await Newsletter.findOne({ email: email.toLowerCase() });
        if (existing) {
            return res.status(400).json({ success: false, error: 'Email is already subscribed to our newsletter' });
        }

        await Newsletter.create({
            email: email.toLowerCase(),
            name: name || null
        });

        res.json({ success: true, message: 'Successfully subscribed to newsletter!' });
    } catch (error) {
        console.error('Newsletter signup error:', error);
        res.status(500).json({ success: false, error: 'Failed to subscribe to newsletter' });
    }
});

// Get all newsletter subscribers (protected)
app.get('/api/newsletter', authenticateToken, async (req, res) => {
    try {
        const subscribers = await Newsletter.find().sort({ subscribedAt: -1 });
        res.json({ success: true, subscribers });
    } catch (error) {
        console.error("Error fetching newsletter subscribers:", error);
        res.status(500).json({ success: false, error: 'Failed to fetch subscribers' });
    }
});



// Team Routes
app.get('/api/team', authenticateToken, async (req, res) => {
    try {
        const team = await Team.find().sort({ createdAt: -1 }).lean();
        res.json(team);
    } catch (error) {
        console.error('Team fetch error:', error);
        res.status(500).json({ message: 'Error fetching team members' });
    }
});


// Public API endpoint for team members (no authentication required)
app.get('/api/public/team', async (req, res) => {
    try {
        const team = await Team.find()
            .sort({ createdAt: -1 })
            .lean();

        // Build the object with all the fields you want exposed
        const publicTeam = team.map(member => ({
            _id: member._id,
            name: member.name,
            position: member.position,
            bio: member.bio,
            image: member.image,
            skills: member.skills,
            email: member.email, // keep or remove depending on security
            phone: member.phone,
            socialLinks: member.socialLinks, // ✅ include this
            createdAt: member.createdAt
        }));

        res.json(publicTeam);
    } catch (error) {
        console.error('Public team fetch error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error fetching team members',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});


app.get('/api/team/:id', authenticateToken, async (req, res) => {
    try {
        const member = await Team.findById(req.params.id);
        if (!member) {
            return res.status(404).json({ message: 'Team member not found' });
        }
        res.json(member);
    } catch (error) {
        console.error('Team member fetch error:', error);
        res.status(500).json({ message: 'Error fetching team member' });
    }
});

app.post('/api/team', authenticateToken, upload.single('image'), async (req, res) => {
    try {
        const memberData = { ...req.body };

        // Handle Cloudinary file upload
        if (req.file) {
            // If using Cloudinary uploader, req.file.path or req.file.url contains the URL
            memberData.image = req.file.path || req.file.url;
        } else {
            memberData.image = ''; // empty if no image uploaded
        }

        // Parse skills if provided as comma-separated string
     let skills = memberData.skills;
if (skills) {
    if (typeof skills === 'string') {
        try {
            const parsed = JSON.parse(skills);
            if (Array.isArray(parsed)) {
                skills = parsed.filter(skill => skill.trim().length > 0);
            } else {
                skills = skills.split(',').map(s => s.trim()).filter(s => s);
            }
        } catch {
            skills = skills.split(',').map(s => s.trim()).filter(s => s);
        }
    }
} else {
    skills = [];
}
memberData.skills = skills;



        const member = new Team(memberData);
        await member.save();

        // Log activity
        await logActivity(
            'Team Member Added',
            `${member.name} was added to the team`,
            'team',
            req.admin.adminId
        );

        res.status(201).json(member);
    } catch (error) {
        console.error('Team member creation error:', error);
        res.status(400).json({ message: error.message || 'Error creating team member' });
    }
});


app.put('/api/team/:id', authenticateToken, upload.single('image'), async (req, res) => {
    try {
        const memberData = { ...req.body };

        // Handle file upload
        if (req.file) {
            memberData.image = `/uploads/${req.file.filename}`;
        }

        // Parse skills if it's a string
        if (memberData.skills && typeof memberData.skills === 'string') {
            memberData.skills = memberData.skills.split(',').map(skill => skill.trim());
        }

        const member = await Team.findByIdAndUpdate(
            req.params.id,
            memberData,
            { new: true, runValidators: true }
        );

        if (!member) {
            return res.status(404).json({ message: 'Team member not found' });
        }

        // Log activity
        await logActivity('Team Member Updated', `${member.name}'s profile was updated`, 'team', req.admin.adminId);

        res.json(member);
    } catch (error) {
        console.error('Team member update error:', error);
        res.status(400).json({ message: error.message || 'Error updating team member' });
    }
});

app.delete('/api/team/:id', authenticateToken, async (req, res) => {
    try {
        const member = await Team.findByIdAndDelete(req.params.id);
        if (!member) {
            return res.status(404).json({ message: 'Team member not found' });
        }

        // Delete associated image
        if (member.image) {
            const imagePath = path.join(__dirname, 'public', member.image);
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        }

        // Log activity
        await logActivity('Team Member Removed', `${member.name} was removed from the team`, 'team', req.admin.adminId);

        res.json({ message: 'Team member deleted successfully' });
    } catch (error) {
        console.error('Team member deletion error:', error);
        res.status(500).json({ message: 'Error deleting team member' });
    }
});

// Portfolio Routes
app.get('/api/portfolio', authenticateToken, async (req, res) => {
    try {
        const portfolio = await Portfolio.find().sort({ date: -1 }).lean();
        res.json(portfolio);
    } catch (error) {
        console.error('Portfolio fetch error:', error);
        res.status(500).json({ message: 'Error fetching portfolio items' });
    }
});

app.get('/api/portfolio/:id', authenticateToken, async (req, res) => {
    try {
        const item = await Portfolio.findById(req.params.id);
        if (!item) {
            return res.status(404).json({ message: 'Portfolio item not found' });
        }
        res.json(item);
    } catch (error) {
        console.error('Portfolio item fetch error:', error);
        res.status(500).json({ message: 'Error fetching portfolio item' });
    }
});

app.get('/api/public/portfolio', async (req, res) => {
  try {
    const { category, status } = req.query;

    // Start with empty query (fetch all by default)
    let query = {};

    // Status filter (optional)
    if (status && status !== 'all') {
      query.status = status; // e.g., "completed", "ongoing", "planned"
    }

    // Category filter (optional)
    if (category && category !== 'all') {
      query.category = category;
    }

    const portfolio = await Portfolio.find(query).sort({ date: -1 }).lean();

    // Return only public fields
    const publicPortfolio = portfolio.map(p => ({
      id: p._id,
      title: p.title,
      category: p.category,
      description: p.description,
      value: p.value,
      date: p.date,
      client: p.client,
      location: p.location,
      duration: p.duration,
      status: p.status,
      images: p.images || []
    }));

    res.json(publicPortfolio);
  } catch (error) {
    console.error('Portfolio fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch portfolio items' });
  }
});



// FIXED Portfolio POST endpoint - Replace in your server.js

app.post('/api/portfolio', authenticateToken, upload.array('images', 5), async (req, res) => {
    try {

        const portfolioData = { ...req.body };

        // ✅ CRITICAL FIX: Handle Cloudinary file uploads properly
        if (req.files && req.files.length > 0) {
            // Extract image URLs from Cloudinary response
            portfolioData.images = req.files.map(file => {
                // Cloudinary stores the URL in file.path
                const imageUrl = file.path || file.url || file.secure_url;
                console.log('🖼️ Processing image:', imageUrl);
                return imageUrl;
            }).filter(url => url && typeof url === 'string'); // Remove any invalid URLs
            
            
        } else {
            
            portfolioData.images = [];
        }

        // ✅ Ensure value is a string (not a number)
        if (portfolioData.value) {
            portfolioData.value = String(portfolioData.value).trim();
        }

        // ✅ Validate and convert date properly
        if (portfolioData.date) {
            const dateObj = new Date(portfolioData.date);
            
            if (isNaN(dateObj.getTime())) {
                console.error('❌ Invalid date provided:', portfolioData.date);
                return res.status(400).json({ 
                    message: 'Invalid date format. Please provide a valid date.' 
                });
            }
            
            portfolioData.date = dateObj;
            console.log('✅ Date parsed:', dateObj);
        } else {
            console.error('❌ No date provided');
            return res.status(400).json({ 
                message: 'Date is required for portfolio items' 
            });
        }

        // ✅ Validate category field
        const validCategories = ['valuation', 'management', 'brokerage', 'survey', 'development'];
        if (!portfolioData.category) {
            console.error('❌ No category provided');
            return res.status(400).json({ 
                message: 'Category is required' 
            });
        }
        
        if (!validCategories.includes(portfolioData.category)) {
            console.error('❌ Invalid category:', portfolioData.category);
            return res.status(400).json({ 
                message: `Invalid category. Must be one of: ${validCategories.join(', ')}` 
            });
        }

        // ✅ Validate status field
        const validStatuses = ['completed', 'ongoing', 'planned'];
        if (portfolioData.status && !validStatuses.includes(portfolioData.status)) {
            console.error('❌ Invalid status:', portfolioData.status);
            return res.status(400).json({ 
                message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
            });
        }

        // ✅ Validate required fields
        if (!portfolioData.title || !portfolioData.description) {
            console.error('❌ Missing required fields');
            return res.status(400).json({ 
                message: 'Title and description are required fields' 
            });
        }

       

        // Create and save portfolio
        const portfolio = new Portfolio(portfolioData);
        await portfolio.save();

        // Log activity (wrapped to prevent failure)
        try {
            await logActivity(
                'Portfolio Created',
                `New portfolio item "${portfolio.title}" was added with ${portfolio.images.length} image(s)`,
                'portfolio',
                req.admin?.adminId
            );
        } catch (logError) {
            console.error('⚠️ Activity logging failed:', logError.message);
        }

        res.status(201).json({
            success: true,
            portfolio,
            message: `Portfolio item created successfully with ${portfolio.images.length} image(s)`
        });

    } catch (error) {
        console.error('❌ Portfolio creation error:', error);
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        
        // Handle Mongoose validation errors
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => ({
                field: err.path,
                message: err.message
            }));
            
            console.error('Validation errors:', errors);
            
            return res.status(400).json({ 
                success: false,
                message: 'Validation failed', 
                errors: errors 
            });
        }

        // Handle duplicate key errors
        if (error.code === 11000) {
            return res.status(400).json({ 
                success: false,
                message: 'A portfolio item with this data already exists' 
            });
        }

        // Generic error response
        res.status(500).json({ 
            success: false,
            message: 'Error creating portfolio item',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

app.put('/api/portfolio/:id', authenticateToken, upload.array('images', 5), async (req, res) => {
    try {
        const portfolioData = { ...req.body };

        // Handle file uploads
        if (req.files && req.files.length > 0) {
            const newImages = req.files.map(file => `/uploads/${file.filename}`);
            // If existing images, append new ones, otherwise use new ones
            if (portfolioData.existingImages) {
                portfolioData.images = [...JSON.parse(portfolioData.existingImages), ...newImages];
            } else {
                portfolioData.images = newImages;
            }
        }

        // Convert date string to Date object
        if (portfolioData.date) {
            portfolioData.date = new Date(portfolioData.date);
        }

        const item = await Portfolio.findByIdAndUpdate(
            req.params.id,
            portfolioData,
            { new: true, runValidators: true }
        );

        if (!item) {
            return res.status(404).json({ message: 'Portfolio item not found' });
        }

        // Log activity
        await logActivity('Portfolio Item Updated', `Portfolio item "${item.title}" was updated`, 'portfolio', req.admin.adminId);

        res.json(item);
    } catch (error) {
        console.error('Portfolio item update error:', error);
        res.status(400).json({ message: error.message || 'Error updating portfolio item' });
    }
});

app.delete('/api/portfolio/:id', authenticateToken, async (req, res) => {
    try {
        const item = await Portfolio.findByIdAndDelete(req.params.id);
        if (!item) {
            return res.status(404).json({ message: 'Portfolio item not found' });
        }

        // Delete associated images
        if (item.images && item.images.length > 0) {
            item.images.forEach(image => {
                const imagePath = path.join(__dirname, 'public', image);
                if (fs.existsSync(imagePath)) {
                    fs.unlinkSync(imagePath);
                }
            });
        }

        // Log activity
        await logActivity('Portfolio Item Deleted', `Portfolio item "${item.title}" was deleted`, 'portfolio', req.admin.adminId);

        res.json({ message: 'Portfolio item deleted successfully' });
    } catch (error) {
        console.error('Portfolio item deletion error:', error);
        res.status(500).json({ message: 'Error deleting portfolio item' });
    }
});





// Achievement Management Routes 

// Achievement Schema 
const AchievementSchema = new mongoose.Schema({
    listings: {
        type: Number,
        default: 0,
        min: 0,
        required: true
    },
    propertiesManaged: {
        type: Number,
        default: 0,
        min: 0,
        required: true
    },
    transactions: {
        type: Number,
        default: 0,
        min: 0,
        required: true
    },
    projects: {
        type: Number,
        default: 0,
        min: 0,
        required: true
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    },
    updatedBy: {
        type: String,
        default: 'admin'
    }
}, {
    timestamps: true
});

// Achievement Model 
const Achievement = mongoose.model('Achievement', AchievementSchema);

// Routes

// GET - Retrieve current achievements (Public - no authentication required)
app.get('/api/achievements', async (req, res) => {
    try {
        let achievements = await Achievement.findOne().sort({ createdAt: -1 });
        
        // If no achievements found, create default ones
        if (!achievements) {
            achievements = new Achievement({
                listings: 300,
                propertiesManaged: 300,
                transactions: 1000,
                projects: 50,
                updatedBy: 'system'
            });
            await achievements.save();
            
            // Log activity
            await logActivity('Achievements Initialized', 'Default achievement values created', 'admin');
        }
        
        res.json({
            success: true,
            data: {
                listings: achievements.listings,
                propertiesManaged: achievements.propertiesManaged,
                transactions: achievements.transactions,
                projects: achievements.projects,
                lastUpdated: achievements.lastUpdated,
                updatedBy: achievements.updatedBy
            },
            message: 'Achievements retrieved successfully'
        });
    } catch (error) {
        console.error('Error retrieving achievements:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving achievements',
            error: error.message
        });
    }
});

// POST - Create or update achievements (Requires authentication)
app.post('/api/achievements', authenticateToken, async (req, res) => {
    try {
        const { listings, propertiesManaged, transactions, projects, updatedBy } = req.body;
        
        // Validate required fields
        if (listings === undefined || propertiesManaged === undefined || 
            transactions === undefined || projects === undefined) {
            return res.status(400).json({
                success: false,
                message: 'All achievement values are required (listings, propertiesManaged, transactions, projects)'
            });
        }
        
        // Validate that values are non-negative numbers
        const values = { listings, propertiesManaged, transactions, projects };
        for (const [key, value] of Object.entries(values)) {
            if (typeof value !== 'number' || value < 0 || isNaN(value)) {
                return res.status(400).json({
                    success: false,
                    message: `${key} must be a non-negative number`
                });
            }
        }
        
        // Create new achievement record (keeping history)
        const achievement = new Achievement({
            listings: Math.floor(listings),
            propertiesManaged: Math.floor(propertiesManaged),
            transactions: Math.floor(transactions),
            projects: Math.floor(projects),
            updatedBy: updatedBy || req.admin?.name || 'admin',
            lastUpdated: new Date()
        });
        
        const savedAchievement = await achievement.save();
        
        // Log activity
        await logActivity(
            'Achievements Updated', 
            `Achievement values updated: Listings: ${listings}, Properties: ${propertiesManaged}, Transactions: ${transactions}, Projects: ${projects}`, 
            'admin', 
            req.admin?.adminId
        );
        
        res.json({
            success: true,
            data: {
                listings: savedAchievement.listings,
                propertiesManaged: savedAchievement.propertiesManaged,
                transactions: savedAchievement.transactions,
                projects: savedAchievement.projects,
                lastUpdated: savedAchievement.lastUpdated,
                updatedBy: savedAchievement.updatedBy
            },
            message: 'Achievements updated successfully'
        });
    } catch (error) {
        console.error('Error updating achievements:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating achievements',
            error: error.message
        });
    }
});

// PUT - Edit specific achievement field (Requires authentication)
app.put('/api/achievements/:field', authenticateToken, async (req, res) => {
    try {
        const { field } = req.params;
        const { value, updatedBy } = req.body;
        
        // Validate field name
        const validFields = ['listings', 'propertiesManaged', 'transactions', 'projects'];
        if (!validFields.includes(field)) {
            return res.status(400).json({
                success: false,
                message: `Invalid field. Must be one of: ${validFields.join(', ')}`
            });
        }
        
        // Validate value
        if (typeof value !== 'number' || value < 0 || isNaN(value)) {
            return res.status(400).json({
                success: false,
                message: 'Value must be a non-negative number'
            });
        }
        
        // Get the latest achievement record
        let latestAchievement = await Achievement.findOne().sort({ createdAt: -1 });
        
        if (!latestAchievement) {
            // Create new if none exists with default values
            latestAchievement = {
                listings: 300,
                propertiesManaged: 300,
                transactions: 1000,
                projects: 50
            };
        }
        
        // Create new achievement record with updated field
        const newAchievement = new Achievement({
            listings: latestAchievement.listings,
            propertiesManaged: latestAchievement.propertiesManaged,
            transactions: latestAchievement.transactions,
            projects: latestAchievement.projects,
            // Update the specific field
            [field]: Math.floor(value),
            lastUpdated: new Date(),
            updatedBy: updatedBy || req.admin?.name || 'admin'
        });
        
        const savedAchievement = await newAchievement.save();
        
        // Log activity
        await logActivity(
            'Achievement Field Updated', 
            `${field} updated from ${latestAchievement[field]} to ${value}`, 
            'admin', 
            req.admin?.adminId
        );
        
        res.json({
            success: true,
            data: {
                listings: savedAchievement.listings,
                propertiesManaged: savedAchievement.propertiesManaged,
                transactions: savedAchievement.transactions,
                projects: savedAchievement.projects,
                lastUpdated: savedAchievement.lastUpdated,
                updatedBy: savedAchievement.updatedBy
            },
            message: `${field} updated successfully to ${value}`
        });
    } catch (error) {
        console.error('Error updating achievement field:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating achievement field',
            error: error.message
        });
    }
});

// GET - Retrieve achievement history (Requires authentication)
app.get('/api/achievements/history', authenticateToken, async (req, res) => {
    try {
        const { limit = 10, page = 1 } = req.query;
        const skip = (page - 1) * limit;
        
        const achievements = await Achievement.find()
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip(skip)
            .select('-__v')
            .lean();
        
        const total = await Achievement.countDocuments();
        
        res.json({
            success: true,
            data: achievements,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / limit),
                hasNext: page * limit < total,
                hasPrev: page > 1
            },
            message: 'Achievement history retrieved successfully'
        });
    } catch (error) {
        console.error('Error retrieving achievement history:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving achievement history',
            error: error.message
        });
    }
});

// Activity Routes
app.get('/api/activity', authenticateToken, async (req, res) => {
    try {
        const activities = await Activity.find()
            .populate('userId', 'name email')
            .sort({ timestamp: -1 })
            .limit(50)
            .lean();
        res.json(activities);
    } catch (error) {
        console.error('Activity fetch error:', error);
        res.status(500).json({ message: 'Error fetching recent activity' });
    }
});

// Public Routes (for frontend website)
app.get('/api/public/properties', async (req, res) => {
    try {
        const { type, propertyType, minPrice, maxPrice, location, page = 1, limit = 12 } = req.query;
        
        const query = { status: 'active' };
        
        if (type) query.type = type;
        if (propertyType) query.propertyType = propertyType;
        if (location) query.location = { $regex: location, $options: 'i' };
        if (minPrice || maxPrice) {
            query.price = {};
            if (minPrice) query.price.$gte = parseFloat(minPrice);
            if (maxPrice) query.price.$lte = parseFloat(maxPrice);
        }

        const properties = await Property.find(query)
            .select('-__v')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .lean();

        const total = await Property.countDocuments(query);

        res.json({
            properties,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            total
        });
    } catch (error) {
        console.error('Public properties fetch error:', error);
        res.status(500).json({ message: 'Error fetching properties' });
    }
});

app.get('/api/public/properties/:id', async (req, res) => {
    try {
        const property = await Property.findOne({ _id: req.params.id, status: 'active' });
        if (!property) {
            return res.status(404).json({ message: 'Property not found' });
        }
        res.json(property);
    } catch (error) {
        console.error('Public property fetch error:', error);
        res.status(500).json({ message: 'Error fetching property' });
    }
});



app.get('/api/public/portfolio', async (req, res) => {
    try {
        const { category } = req.query;
        const query = category ? { category } : {};
        
        const portfolio = await Portfolio.find(query)
            .select('-__v')
            .sort({ date: -1 })
            .lean();
        res.json(portfolio);
    } catch (error) {
        console.error('Public portfolio fetch error:', error);
        res.status(500).json({ message: 'Error fetching portfolio items' });
    }
});



// File upload endpoint
app.post('/api/upload', authenticateToken, upload.array('files', 10), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ message: 'No files uploaded' });
        }

        const fileUrls = req.files.map(file => `/uploads/${file.filename}`);
        
        // Log activity
        await logActivity('Files Uploaded', `${req.files.length} file(s) uploaded`, 'admin', req.admin.adminId);

        res.json({
            message: 'Files uploaded successfully',
            files: fileUrls
        });
    } catch (error) {
        console.error('File upload error:', error);
        res.status(500).json({ message: 'Error uploading files' });
    }
});

// Search endpoint
app.get('/api/search', authenticateToken, async (req, res) => {
    try {
        const { q, type } = req.query;
        
        if (!q) {
            return res.status(400).json({ message: 'Search query is required' });
        }

        const searchRegex = { $regex: q, $options: 'i' };
        const results = {};

        if (!type || type === 'properties') {
            results.properties = await Property.find({
                $or: [
                    { title: searchRegex },
                    { location: searchRegex },
                    { description: searchRegex }
                ]
            }).limit(10).lean();
        }

        if (!type || type === 'team') {
            results.team = await Team.find({
                $or: [
                    { name: searchRegex },
                    { position: searchRegex },
                    { email: searchRegex }
                ]
            }).limit(10).lean();
        }

        if (!type || type === 'portfolio') {
            results.portfolio = await Portfolio.find({
                $or: [
                    { title: searchRegex },
                    { description: searchRegex },
                    { client: searchRegex }
                ]
            }).limit(10).lean();
        }

        res.json(results);
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ message: 'Error performing search' });
    }
});

// Admin management routes
app.get('/api/admin/profile', authenticateToken, async (req, res) => {
    try {
        const admin = await Admin.findById(req.admin.adminId).select('-password');
        if (!admin) {
            return res.status(404).json({ message: 'Admin not found' });
        }
        res.json(admin);
    } catch (error) {
        console.error('Admin profile error:', error);
        res.status(500).json({ message: 'Error fetching admin profile' });
    }
});

app.put('/api/admin/profile', authenticateToken, async (req, res) => {
    try {
        const { name, email, currentPassword, newPassword } = req.body;
        const admin = await Admin.findById(req.admin.adminId);
        
        if (!admin) {
            return res.status(404).json({ message: 'Admin not found' });
        }

        // Update basic info
        if (name) admin.name = name;
        if (email) admin.email = email;

        // Update password if provided
        if (currentPassword && newPassword) {
            const isValidPassword = await bcrypt.compare(currentPassword, admin.password);
            if (!isValidPassword) {
                return res.status(400).json({ message: 'Current password is incorrect' });
            }
            admin.password = await bcrypt.hash(newPassword, 12);
        }

        await admin.save();

        // Log activity
        await logActivity('Profile Updated', `${admin.name} updated their profile`, 'admin', admin._id);

        res.json({ 
            message: 'Profile updated successfully',
            admin: {
                id: admin._id,
                name: admin.name,
                email: admin.email,
                role: admin.role
            }
        });
    } catch (error) {
        console.error('Admin profile update error:', error);
        res.status(500).json({ message: 'Error updating profile' });
    }
});

// Bulk operations
app.post('/api/properties/bulk-delete', authenticateToken, async (req, res) => {
    try {
        const { ids } = req.body;
        
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ message: 'Property IDs are required' });
        }

        // Get properties before deletion to clean up images
        const properties = await Property.find({ _id: { $in: ids } });
        
        // Delete properties
        const result = await Property.deleteMany({ _id: { $in: ids } });

        // Clean up images
        properties.forEach(property => {
            if (property.images && property.images.length > 0) {
                property.images.forEach(image => {
                    const imagePath = path.join(__dirname, 'public', image);
                    if (fs.existsSync(imagePath)) {
                        fs.unlinkSync(imagePath);
                    }
                });
            }
        });

        // Log activity
        await logActivity('Bulk Delete', `${result.deletedCount} properties deleted`, 'property', req.admin.adminId);

        res.json({ 
            message: `${result.deletedCount} properties deleted successfully`,
            deletedCount: result.deletedCount
        });
    } catch (error) {
        console.error('Bulk delete error:', error);
        res.status(500).json({ message: 'Error deleting properties' });
    }
});



app.get('/api/analytics/overview', authenticateToken, async (req, res) => {
    try {
        const { period = '30d' } = req.query;

        let dateFilter = {};
        const now = new Date();

        switch (period) {
            case '7d':
                dateFilter = { createdAt: { $gte: new Date(now - 7 * 24 * 60 * 60 * 1000) } };
                break;
            case '30d':
                dateFilter = { createdAt: { $gte: new Date(now - 30 * 24 * 60 * 60 * 1000) } };
                break;
            case '90d':
                dateFilter = { createdAt: { $gte: new Date(now - 90 * 24 * 60 * 60 * 1000) } };
                break;
            case '1y':
                dateFilter = { createdAt: { $gte: new Date(now - 365 * 24 * 60 * 60 * 1000) } };
                break;
            default:
                dateFilter = {};
        }

        const [
            totalProperties,
            totalTeam,
            totalPortfolio,
            recentProperties,
            propertyTypes,
            totalVisits,
            confirmedVisits,
            pendingVisits
        ] = await Promise.all([
            Property.countDocuments(),
            Team.countDocuments(),
            Portfolio.countDocuments(),
            Property.countDocuments(dateFilter),
            Property.aggregate([
                { $group: { _id: '$propertyType', count: { $sum: 1 } } }
            ]),
            ScheduleVisit.countDocuments(), // total visits
            ScheduleVisit.countDocuments({ status: 'confirmed' }), // confirmed visits
            ScheduleVisit.countDocuments({ status: 'pending' }) // pending visits
        ]);

        res.json({
            totals: {
                properties: totalProperties,
                team: totalTeam,
                portfolio: totalPortfolio,
                visits: totalVisits,
                confirmedVisits: confirmedVisits,
                pendingVisits: pendingVisits
            },
            period: {
                properties: recentProperties
            },
            breakdown: {
                propertyTypes: propertyTypes.reduce((acc, item) => {
                    acc[item._id] = item.count;
                    return acc;
                }, {})
            }
        });
    } catch (error) {
        console.error('Analytics overview error:', error);
        res.status(500).json({ message: 'Error fetching analytics data' });
    }
});


// Export data endpoints
app.get('/api/export/properties', authenticateToken, async (req, res) => {
    try {
        const properties = await Property.find().lean();
        
        // Convert to CSV format
        const csvData = properties.map(property => ({
            Title: property.title,
            Location: property.location,
            Price: property.price,
            Type: property.type,
            PropertyType: property.propertyType,
            Bedrooms: property.bedrooms,
            Bathrooms: property.bathrooms,
            Area: property.area,
            Status: property.status,
            CreatedAt: property.createdAt,
            UpdatedAt: property.updatedAt
        }));

        res.json({
            data: csvData,
            filename: `properties_export_${new Date().toISOString().split('T')[0]}.csv`
        });
    } catch (error) {
        console.error('Properties export error:', error);
        res.status(500).json({ message: 'Error exporting properties data' });
    }
});


// In-memory storage (use database in production)
let visitorStats = {
  totalVisitors: 0,
  uniqueVisitors: new Set(),
  visitsByDate: {}
};

// Middleware to track visitors
app.use((req, res, next) => {
  // Skip tracking for API endpoints
  if (req.path.startsWith('/api/')) {
    return next();
  }

  let visitorId = req.cookies.visitor_id;
  const isNewVisitor = !visitorId;

  // Generate new visitor ID if doesn't exist
  if (!visitorId) {
    visitorId = uuidv4();
    // Set cookie to expire in 2 years
    res.cookie('visitor_id', visitorId, {
      maxAge: 1000 * 60 * 60 * 24 * 365 * 2,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });
  }

  // Track unique visitor
  if (isNewVisitor) {
    visitorStats.uniqueVisitors.add(visitorId);
    visitorStats.totalVisitors++;

    // Track by date
    const today = new Date().toISOString().split('T')[0];
    if (!visitorStats.visitsByDate[today]) {
      visitorStats.visitsByDate[today] = 0;
    }
    visitorStats.visitsByDate[today]++;
  }

  next();
});

// API endpoint to get visitor statistics
app.get('/api/visitor-stats', (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const todayVisitors = visitorStats.visitsByDate[today] || 0;

  res.json({
    totalVisitors: visitorStats.totalVisitors,
    uniqueVisitors: visitorStats.uniqueVisitors.size,
    todayVisitors: todayVisitors,
    visitsByDate: visitorStats.visitsByDate
  });
});

// API endpoint to manually increment (optional)
app.post('/api/track-visit', (req, res) => {
  let visitorId = req.cookies.visitor_id;
  
  if (!visitorId) {
    visitorId = uuidv4();
    res.cookie('visitor_id', visitorId, {
      maxAge: 1000 * 60 * 60 * 24 * 365 * 2,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });

    visitorStats.uniqueVisitors.add(visitorId);
    visitorStats.totalVisitors++;

    const today = new Date().toISOString().split('T')[0];
    if (!visitorStats.visitsByDate[today]) {
      visitorStats.visitsByDate[today] = 0;
    }
    visitorStats.visitsByDate[today]++;
  }

  res.json({
    success: true,
    visitorId: visitorId,
    isNewVisitor: !req.cookies.visitor_id
  });
});

// Optional: Persist data to file/database

const DATA_FILE = './visitor-data.json';

// Load existing data on startup
function loadVisitorData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      visitorStats.totalVisitors = data.totalVisitors || 0;
      visitorStats.uniqueVisitors = new Set(data.uniqueVisitors || []);
      visitorStats.visitsByDate = data.visitsByDate || {};
    }
  } catch (error) {
    console.error('Error loading visitor data:', error);
  }
}

// Save data periodically
function saveVisitorData() {
  try {
    const data = {
      totalVisitors: visitorStats.totalVisitors,
      uniqueVisitors: Array.from(visitorStats.uniqueVisitors),
      visitsByDate: visitorStats.visitsByDate
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error saving visitor data:', error);
  }
}

// Load data on startup
loadVisitorData();
setInterval(saveVisitorData, 5 * 60 * 1000);


// ==================== FRONTEND SERVING (ADD HERE!) ====================
// This should be AFTER all /api/* routes but BEFORE error handlers

app.use(express.static(path.join(__dirname, 'frontend')));

// Specific routes
app.get('/admin/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'Admin', 'dashboard.html'));
});

// Home route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});



// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    
    if (error.name === 'ValidationError') {
        const errors = Object.values(error.errors).map(err => err.message);
        return res.status(400).json({ 
            message: 'Validation Error',
            errors 
        });
    }
    
    if (error.name === 'CastError') {
        return res.status(400).json({ message: 'Invalid ID format' });
    }
    
    if (error.code === 11000) {
        return res.status(400).json({ message: 'Duplicate entry' });
    }

    res.status(500).json({ 
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
});

// Handle 404 routes
app.use('*', (req, res) => {
    res.status(404).json({ message: 'Route not found' });
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('Shutting down gracefully...');
    await mongoose.connection.close();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('Shutting down gracefully...');
    await mongoose.connection.close();
    process.exit(0);
});






// Start server
async function startServer() {
    try {
        await connectToMongoDB();
        
      app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 AMIZERO Real Estate server running on port ${PORT}`);
    console.log(`📂 Serving static files from 'public' directory`);
    console.log(`🌐 API endpoints available at http://192.168.1.73:${PORT}/api/`);
});
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n⏳ Shutting down server gracefully...');
    process.exit(0);
});

// Start the server
startServer();