export const registerSocketHandlers = (io) => {
  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Join clinic room for updates
    socket.on('join_clinic', (clinicId) => {
      if (clinicId) {
        const roomId = `clinic:${clinicId}`;
        socket.join(roomId);
        console.log(`Socket ${socket.id} joined room: ${roomId}`);
      }
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
};
