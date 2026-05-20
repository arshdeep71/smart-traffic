const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// In-memory state
const activeEmergencies = new Map(); // emergencyId -> { acceptedBy: null/driverId }
const connectedDrivers = new Map(); // socketId -> { driverId, location: [lat, lng] }

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // DRIVER LOGS IN
  socket.on('register-driver', (data) => {
    connectedDrivers.set(socket.id, {
      driverId: data.driverId,
      hospitalId: data.hospitalId,
      location: data.location || null
    });
    socket.join('drivers'); // broadcast room
    socket.join(`hospital_${data.hospitalId}`); // specific hospital room
    console.log(`Driver registered: ${data.driverId} for hospital ${data.hospitalId}`);
    
    // SEND ACTIVE UNACCEPTED EMERGENCIES TO THE NEWLY REGISTERED DRIVER
    activeEmergencies.forEach((emergency, emergencyId) => {
      if (emergency.acceptedBy === null) {
        socket.emit('emergency-broadcast', {
          emergencyId,
          ...emergency.data
        });
      }
    });
  });

  // ADMIN/HOSPITAL ADMIN LOGS IN
  socket.on('register-admin', (data) => {
    socket.join('admins');
    if (data.hospitalId) {
      socket.join(`hospital_admin_${data.hospitalId}`);
    }
    console.log('Admin registered');
    
    // SEND ACTIVE EMERGENCIES TO ADMIN
    activeEmergencies.forEach((emergency, emergencyId) => {
      socket.emit('emergency-created', {
        emergencyId,
        ...emergency.data
      });
    });
  });
  
  // CITIZEN LOGS IN FOR TRACKING
  socket.on('register-citizen', (data) => {
      if (data.emergencyId) {
          socket.join(`emergency_${data.emergencyId}`);
      }
  });

  // NEW EMERGENCY REPORTED (From Citizen/AI)
  socket.on('new-emergency', (data) => {
    const emergencyId = data.emergencyId || Date.now().toString();
    activeEmergencies.set(emergencyId, {
      acceptedBy: null,
      data: data
    });
    
    console.log('Broadcasting new emergency to drivers:', emergencyId);
    // Broadcast to all drivers for now (Uber style)
    io.to('drivers').emit('emergency-broadcast', {
      emergencyId,
      ...data
    });
    // Also notify admins
    io.to('admins').emit('emergency-created', { emergencyId, ...data });
  });

  // DRIVER ATTEMPTS TO ACCEPT
  socket.on('accept-emergency', (data, callback) => {
    const { emergencyId, driverId, hospitalId, driverName } = data;
    
    if (!activeEmergencies.has(emergencyId)) {
      if (callback) callback({ success: false, reason: 'Emergency not found or already resolved.' });
      return;
    }

    const emergency = activeEmergencies.get(emergencyId);

    // RACE CONDITION LOCKING
    if (emergency.acceptedBy !== null) {
      console.log(`Driver ${driverId} failed to accept. Already locked by ${emergency.acceptedBy}`);
      if (callback) callback({ success: false, reason: 'Already accepted by another unit.' });
      return;
    }

    // Lock it!
    emergency.acceptedBy = driverId;
    emergency.hospitalId = hospitalId;
    activeEmergencies.set(emergencyId, emergency);

    console.log(`Emergency ${emergencyId} LOCKED by ${driverId}`);

    // Confirm to the winner
    if (callback) callback({ success: true });

    // Notify everyone else it's taken
    io.to('drivers').emit('emergency-taken', { emergencyId, acceptedBy: driverId });
    io.to('admins').emit('emergency-assigned', { emergencyId, driverId, hospitalId });
    
    // Notify the citizen room that an ambulance is assigned
    io.to(`emergency_${emergencyId}`).emit('ambulance-assigned', {
        driverId, driverName, hospitalId, ...data
    });
  });

  // LIVE GPS UPDATES
  socket.on('gps-update', (data) => {
    const { driverId, emergencyId, lat, lng, speed, heading } = data;
    
    // Relay to admins and the specific hospital
    io.to('admins').emit('live-gps', data);
    if (data.hospitalId) {
        io.to(`hospital_admin_${data.hospitalId}`).emit('live-gps', data);
    }
    
    // Relay to the citizen waiting for this emergency
    if (emergencyId) {
      io.to(`emergency_${emergencyId}`).emit('ambulance-gps', data);
    }
  });

  // LIVE STATUS UPDATES (e.g. PATIENT PICKED UP, REACHED HOSPITAL)
  socket.on('update-emergency-status', (data) => {
    const { emergencyId, status, timestamp } = data;
    // Relay to admins
    io.to('admins').emit('emergency-status-updated', data);
    // Relay to citizen
    if (emergencyId) {
      io.to(`emergency_${emergencyId}`).emit('emergency-status-updated', data);
    }
  });

  socket.on('disconnect', () => {
    connectedDrivers.delete(socket.id);
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Socket.IO Emergency Engine running on port ${PORT}`);
});
