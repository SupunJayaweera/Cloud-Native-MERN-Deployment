const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const amqp = require('amqplib');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3003;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27019/roomdb', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Room Schema
const roomSchema = new mongoose.Schema({
  hotelId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Hotel' },
  roomNumber: { type: String, required: true },
  type: { 
    type: String, 
    required: true, 
    enum: ['single', 'double', 'suite', 'deluxe', 'family'] 
  },
  capacity: { type: Number, required: true, min: 1 },
  pricePerNight: { type: Number, required: true, min: 0 },
  description: { type: String },
  amenities: [{ type: String }],
  images: [{ type: String }],
  status: { 
    type: String, 
    enum: ['available', 'occupied', 'maintenance', 'reserved'], 
    default: 'available' 
  },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Compound index for hotel and room number uniqueness
roomSchema.index({ hotelId: 1, roomNumber: 1 }, { unique: true });

const Room = mongoose.model('Room', roomSchema);

// RabbitMQ Connection
let channel;
async function connectRabbitMQ() {
  try {
    const connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost');
    channel = await connection.createChannel();
    
    // Declare exchanges
    await channel.assertExchange('room_events', 'topic', { durable: true });
    
    // Declare queues for consuming events
    const queue = await channel.assertQueue('room_service_queue', { durable: true });
    
    // Bind to booking events
    await channel.bindQueue(queue.queue, 'booking_events', 'room.reserve');
    await channel.bindQueue(queue.queue, 'booking_events', 'room.release');
    
    // Consume events
    channel.consume(queue.queue, handleEvent, { noAck: false });
    
    console.log('Connected to RabbitMQ');
  } catch (error) {
    console.error('RabbitMQ connection error:', error);
    setTimeout(connectRabbitMQ, 5000);
  }
}

// Handle incoming events
async function handleEvent(msg) {
  if (msg) {
    try {
      const event = JSON.parse(msg.content.toString());
      console.log('Received event:', event.eventType);
      
      switch (event.eventType) {
        case 'room.reserve':
          await handleRoomReservation(event.data);
          break;
        case 'room.release':
          await handleRoomRelease(event.data);
          break;
      }
      
      channel.ack(msg);
    } catch (error) {
      console.error('Event handling error:', error);
      channel.nack(msg, false, true);
    }
  }
}

// Handle room reservation
async function handleRoomReservation(data) {
  try {
    const { roomId, bookingId } = data;
    
    const room = await Room.findById(roomId);
    if (!room || room.status !== 'available') {
      await publishEvent('room.reservation_failed', {
        roomId,
        bookingId,
        reason: 'Room not available'
      });
      return;
    }
    
    room.status = 'reserved';
    room.updatedAt = new Date();
    await room.save();
    
    await publishEvent('room.reserved', {
      roomId,
      bookingId,
      hotelId: room.hotelId,
      pricePerNight: room.pricePerNight
    });
  } catch (error) {
    console.error('Room reservation error:', error);
    await publishEvent('room.reservation_failed', {
      roomId: data.roomId,
      bookingId: data.bookingId,
      reason: 'Internal error'
    });
  }
}

// Handle room release
async function handleRoomRelease(data) {
  try {
    const { roomId, bookingId } = data;
    
    const room = await Room.findById(roomId);
    if (room) {
      room.status = 'available';
      room.updatedAt = new Date();
      await room.save();
      
      await publishEvent('room.released', {
        roomId,
        bookingId,
        hotelId: room.hotelId
      });
    }
  } catch (error) {
    console.error('Room release error:', error);
  }
}

// Publish event
async function publishEvent(eventType, data) {
  if (channel) {
    const message = JSON.stringify({
      eventType,
      data,
      timestamp: new Date().toISOString(),
      service: 'room-service'
    });
    
    channel.publish('room_events', eventType, Buffer.from(message));
    console.log(`Published event: ${eventType}`);
  }
}

// Routes

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'room-service' });
});

// Get rooms by hotel
app.get('/api/hotels/:hotelId/rooms', async (req, res) => {
  try {
    const { hotelId } = req.params;
    const { type, minPrice, maxPrice, available, page = 1, limit = 10 } = req.query;
    
    const query = { hotelId, isActive: true };
    
    if (type) {
      query.type = type;
    }
    
    if (minPrice || maxPrice) {
      query.pricePerNight = {};
      if (minPrice) query.pricePerNight.$gte = parseFloat(minPrice);
      if (maxPrice) query.pricePerNight.$lte = parseFloat(maxPrice);
    }
    
    if (available === 'true') {
      query.status = 'available';
    }

    const rooms = await Room.find(query)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ pricePerNight: 1 });

    const total = await Room.countDocuments(query);

    res.json({
      rooms,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Rooms fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get room by ID
app.get('/api/rooms/:roomId', async (req, res) => {
  try {
    const room = await Room.findById(req.params.roomId);
    if (!room || !room.isActive) {
      return res.status(404).json({ error: 'Room not found' });
    }

    res.json({ room });
  } catch (error) {
    console.error('Room fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create room
app.post('/api/hotels/:hotelId/rooms', async (req, res) => {
  try {
    const { hotelId } = req.params;
    const {
      roomNumber,
      type,
      capacity,
      pricePerNight,
      description,
      amenities,
      images
    } = req.body;

    const room = new Room({
      hotelId,
      roomNumber,
      type,
      capacity,
      pricePerNight,
      description,
      amenities: amenities || [],
      images: images || []
    });

    await room.save();

    // Publish room created event
    await publishEvent('room.created', {
      roomId: room._id,
      hotelId: room.hotelId,
      roomNumber: room.roomNumber,
      type: room.type,
      pricePerNight: room.pricePerNight
    });

    res.status(201).json({
      message: 'Room created successfully',
      room
    });
  } catch (error) {
    console.error('Room creation error:', error);
    if (error.code === 11000) {
      res.status(400).json({ error: 'Room number already exists for this hotel' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Update room
app.put('/api/rooms/:roomId', async (req, res) => {
  try {
    const {
      roomNumber,
      type,
      capacity,
      pricePerNight,
      description,
      amenities,
      images,
      status
    } = req.body;

    const room = await Room.findByIdAndUpdate(
      req.params.roomId,
      {
        roomNumber,
        type,
        capacity,
        pricePerNight,
        description,
        amenities,
        images,
        status,
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Publish room updated event
    await publishEvent('room.updated', {
      roomId: room._id,
      hotelId: room.hotelId,
      status: room.status,
      pricePerNight: room.pricePerNight
    });

    res.json({
      message: 'Room updated successfully',
      room
    });
  } catch (error) {
    console.error('Room update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete room (soft delete)
app.delete('/api/rooms/:roomId', async (req, res) => {
  try {
    const room = await Room.findByIdAndUpdate(
      req.params.roomId,
      { isActive: false, updatedAt: new Date() },
      { new: true }
    );

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Publish room deleted event
    await publishEvent('room.deleted', {
      roomId: room._id,
      hotelId: room.hotelId,
      roomNumber: room.roomNumber
    });

    res.json({ message: 'Room deleted successfully' });
  } catch (error) {
    console.error('Room deletion error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Check room availability
app.get('/api/rooms/:roomId/availability', async (req, res) => {
  try {
    const { checkIn, checkOut } = req.query;
    
    if (!checkIn || !checkOut) {
      return res.status(400).json({ error: 'Check-in and check-out dates are required' });
    }

    const room = await Room.findById(req.params.roomId);
    if (!room || !room.isActive) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // For simplicity, we're just checking the current status
    // In a real system, you'd check against booking dates
    const isAvailable = room.status === 'available';

    res.json({
      roomId: room._id,
      available: isAvailable,
      status: room.status,
      pricePerNight: room.pricePerNight
    });
  } catch (error) {
    console.error('Availability check error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start server
app.listen(PORT, '0.0.0.0', async () => {
  console.log(`Room Service running on port ${PORT}`);
  await connectRabbitMQ();
});

module.exports = app;

