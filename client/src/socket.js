import io from 'socket.io-client';

// Connect to the backend
// Assuming backend is on localhost:3000 for local dev
// In production, this would be dynamic
const socket = io('http://localhost:3001');

export default socket;
