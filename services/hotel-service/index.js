const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const amqp = require('amqplib');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27018/hoteldb', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Hotel Schema
const hotelSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  address: {
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    country: { type: String, required: true },
    zipCode: { type: String, required: true }
  },
  contact: {
    phone: { type: String, required: true },
    email: { type: String, required: true }
  },
  amenities: [{ type: String }],
  images: [{ type: String }],
  rating: { type: Number, min: 0, max: 5, default: 0 },
  totalRooms: { type: Number, required: true, min: 1 },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Hotel = mongoose.model('Hotel', hotelSchema);

// RabbitMQ Connection
let channel;
async function connectRabbitMQ() {
  try {
    const connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost');
    channel = await connection.createChannel();
    
    // Declare exchanges
    await channel.assertExchange('hotel_events', 'topic', { durable: true });
    
    console.log('Connected to RabbitMQ');
  } catch (error) {
    console.error('RabbitMQ connection error:', error);
    setTimeout(connectRabbitMQ, 5000);
  }
}

// Publish event
async function publishEvent(eventType, data) {
  if (channel) {
    const message = JSON.stringify({
      eventType,
      data,
      timestamp: new Date().toISOString(),
      service: 'hotel-service'
    });
    
    channel.publish('hotel_events', eventType, Buffer.from(message));
    console.log(`Published event: ${eventType}`);
  }
}

// Routes

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'hotel-service' });
});

// Get all hotels
app.get('/api/hotels', async (req, res) => {
  try {
    const { city, country, page = 1, limit = 10 } = req.query;
    const query = { isActive: true };
    
    if (city) {
      query['address.city'] = new RegExp(city, 'i');
    }
    if (country) {
      query['address.country'] = new RegExp(country, 'i');
    }

    const hotels = await Hotel.find(query)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ rating: -1, createdAt: -1 });

    const total = await Hotel.countDocuments(query);

    res.json({
      hotels,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Hotels fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get hotel by ID
app.get('/api/hotels/:hotelId', async (req, res) => {
  try {
    const hotel = await Hotel.findById(req.params.hotelId);
    if (!hotel || !hotel.isActive) {
      return res.status(404).json({ error: 'Hotel not found' });
    }

    res.json({ hotel });
  } catch (error) {
    console.error('Hotel fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create hotel (admin only)
app.post('/api/hotels', async (req, res) => {
  try {
    const {
      name,
      description,
      address,
      contact,
      amenities,
      images,
      totalRooms
    } = req.body;

    const hotel = new Hotel({
      name,
      description,
      address,
      contact,
      amenities: amenities || [],
      images: images || [],
      totalRooms
    });

    await hotel.save();

    // Publish hotel created event
    await publishEvent('hotel.created', {
      hotelId: hotel._id,
      name: hotel.name,
      city: hotel.address.city,
      country: hotel.address.country,
      totalRooms: hotel.totalRooms
    });

    res.status(201).json({
      message: 'Hotel created successfully',
      hotel
    });
  } catch (error) {
    console.error('Hotel creation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update hotel
app.put('/api/hotels/:hotelId', async (req, res) => {
  try {
    const {
      name,
      description,
      address,
      contact,
      amenities,
      images,
      totalRooms
    } = req.body;

    const hotel = await Hotel.findByIdAndUpdate(
      req.params.hotelId,
      {
        name,
        description,
        address,
        contact,
        amenities,
        images,
        totalRooms,
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!hotel) {
      return res.status(404).json({ error: 'Hotel not found' });
    }

    // Publish hotel updated event
    await publishEvent('hotel.updated', {
      hotelId: hotel._id,
      name: hotel.name,
      city: hotel.address.city,
      country: hotel.address.country,
      totalRooms: hotel.totalRooms
    });

    res.json({
      message: 'Hotel updated successfully',
      hotel
    });
  } catch (error) {
    console.error('Hotel update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete hotel (soft delete)
app.delete('/api/hotels/:hotelId', async (req, res) => {
  try {
    const hotel = await Hotel.findByIdAndUpdate(
      req.params.hotelId,
      { isActive: false, updatedAt: new Date() },
      { new: true }
    );

    if (!hotel) {
      return res.status(404).json({ error: 'Hotel not found' });
    }

    // Publish hotel deleted event
    await publishEvent('hotel.deleted', {
      hotelId: hotel._id,
      name: hotel.name
    });

    res.json({ message: 'Hotel deleted successfully' });
  } catch (error) {
    console.error('Hotel deletion error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Search hotels
app.get('/api/hotels/search', async (req, res) => {
  try {
    const { q, city, country, minRating, page = 1, limit = 10 } = req.query;
    const query = { isActive: true };

    if (q) {
      query.$or = [
        { name: new RegExp(q, 'i') },
        { description: new RegExp(q, 'i') },
        { amenities: new RegExp(q, 'i') }
      ];
    }

    if (city) {
      query['address.city'] = new RegExp(city, 'i');
    }

    if (country) {
      query['address.country'] = new RegExp(country, 'i');
    }

    if (minRating) {
      query.rating = { $gte: parseFloat(minRating) };
    }

    const hotels = await Hotel.find(query)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ rating: -1, createdAt: -1 });

    const total = await Hotel.countDocuments(query);

    res.json({
      hotels,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Hotel search error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start server
app.listen(PORT, '0.0.0.0', async () => {
  console.log(`Hotel Service running on port ${PORT}`);
  await connectRabbitMQ();
});

module.exports = app;

