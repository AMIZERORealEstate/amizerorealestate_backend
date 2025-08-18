// AMIZERO Real Estate Backend Server
// Node.js + Express + MongoDB

const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const cors = require('cors');
const path = require('path');
const nodemailer = require('nodemailer');
require('dotenv').config();

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
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'frontend')));

// MongoDB Connection
let db;
async function connectToMongoDB() {
    try {
        const client = new MongoClient(mongoConfig.connectionString);
        await client.connect();
        console.log('✅ Connected to MongoDB');
        db = client.db(mongoConfig.databaseName);
        return db;
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        throw error;
    }
}

// Email Configuration (for sending notifications)


const emailTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER || 'amizerorealestate@gmail.com',
        pass: process.env.EMAIL_PASS // App-specific password (not normal Gmail password)
    },
    tls: {
        rejectUnauthorized: false // 👈 allows self-signed certs
    }
});


// Routes

// Home route - serve the HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// API Routes

// Contact Form Submission
app.post('/api/contact', async (req, res) => {
    try {
        const { name, email, phone, service, message } = req.body;

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

        // Send notification email to admin
        const adminEmailContent = {
            from: process.env.EMAIL_USER,
            to: 'amizerorealestate@gmail.com',
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
                            Contact ID: ${result.insertedId}
                        </p>
                    </div>
                </div>
            `
        };

        // Send auto-reply email to customer
        const customerEmailContent = {
            from: process.env.EMAIL_USER,
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
                            <li>Email: amizerorealestate@gmail.com</li>
                        </ul>
                        
                        <p style="margin-top: 30px;">Best regards,<br><strong> AMIZERO Real Estate Team</strong></p>
                    </div>
                </div>
            `
        };

        emailTransporter.verify((error, success) => {
    if (error) {
    console.error('❌ SMTP connection error:', error);
  } else {
    console.log('✅ SMTP server is ready to take our messages');
  }
});


        // Send emails (don't wait for them to complete)
        emailTransporter.sendMail(adminEmailContent).catch(err => 
            console.error('Admin email error:', err)
        );
        emailTransporter.sendMail(customerEmailContent).catch(err => 
            console.error('Customer email error:', err)
        );

        res.json({
            success: true,
            message: 'Thank you for your message! We will get back to you soon.',
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

// Get all contacts (admin endpoint)
app.get('/api/contacts', async (req, res) => {
    try {
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

// Analytics endpoint
app.get('/api/analytics', async (req, res) => {
    try {
        const collection = db.collection('contacts');
        
        // Get contact statistics
        const totalContacts = await collection.countDocuments();
        const newContacts = await collection.countDocuments({ status: 'new' });
        const thisMonth = new Date();
        thisMonth.setDate(1);
        const monthlyContacts = await collection.countDocuments({
            timestamp: { $gte: thisMonth }
        });

        // Get service distribution
        const serviceStats = await collection.aggregate([
            { $group: { _id: '$service', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]).toArray();

        // Get monthly trend (last 6 months)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        
        const monthlyTrend = await collection.aggregate([
            { $match: { timestamp: { $gte: sixMonthsAgo } } },
            {
                $group: {
                    _id: {
                        year: { $year: '$timestamp' },
                        month: { $month: '$timestamp' }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]).toArray();

        res.json({
            success: true,
            analytics: {
                totalContacts,
                newContacts,
                monthlyContacts,
                serviceStats,
                monthlyTrend
            }
        });

    } catch (error) {
        console.error('Analytics error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve analytics'
        });
    }
});

// Newsletter signup endpoint
app.post('/api/newsletter', async (req, res) => {
    try {
        const { email, name } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                error: 'Email is required'
            });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                error: 'Please provide a valid email address'
            });
        }

        const collection = db.collection('newsletter');
        
        // Check if email already exists
        const existing = await collection.findOne({ email: email.toLowerCase() });
        if (existing) {
            return res.status(400).json({
                success: false,
                error: 'Email is already subscribed to our newsletter'
            });
        }

        // Add to newsletter
        const newsletterData = {
            email: email.toLowerCase(),
            name: name || null,
            subscribedAt: new Date(),
            status: 'active',
            source: 'website'
        };

        await collection.insertOne(newsletterData);

        res.json({
            success: true,
            message: 'Successfully subscribed to newsletter!'
        });

    } catch (error) {
        console.error('Newsletter signup error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to subscribe to newsletter'
        });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        error: 'Something went wrong on our server'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found'
    });
});

// Start server
async function startServer() {
    try {
        await connectToMongoDB();
        
        app.listen(PORT, () => {
            console.log(`🚀 AMIZERO Real Estate server running on port ${PORT}`);
            console.log(`📂 Serving static files from 'public' directory`);
            console.log(`🌐 API endpoints available at http://localhost:${PORT}/api/`);
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