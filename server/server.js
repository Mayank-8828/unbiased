const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const pollManager = require('./pollManager');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all origins for now
        methods: ["GET", "POST"]
    },
    maxHttpBufferSize: 1e7 // Increase to 10MB for images
});

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Host creates a poll
    socket.on('create_poll', (data, callback) => {
        console.log('Creating poll with data:', { ...data, questionImage: data.questionImage ? 'data...' : null });
        try {
            const poll = pollManager.createPoll({ ...data, hostId: socket.id });
            socket.join(poll.id);
            console.log('Poll created successfully:', poll.id);
            callback({ success: true, pollId: poll.id });
        } catch (e) {
            console.error('Error creating poll:', e.message);
            callback({ success: false, error: e.message });
        }
    });

    // Participant joins a poll
    socket.on('join_poll', (data, callback) => {
        // Handle both string (legacy) and object payload
        const pollId = typeof data === 'string' ? data : data.pollId;
        const voterId = typeof data === 'object' ? data.voterId : null;

        const poll = pollManager.getPoll(pollId);
        if (!poll) {
            return callback({ success: false, error: 'Poll not found' });
        }
        socket.join(pollId);

        // If voterId is provided, we might want to log it or use it, 
        // but primarily we just need to return the poll state.
        // The client will check if its voterId is in poll.votes.

        callback({ success: true, poll: getPublicPollState(poll) });
    });

    // Participant votes
    socket.on('submit_vote', ({ pollId, vote }) => {
        // Use provided voterId (persistent) or fallback to socket.id
        const finalVote = { ...vote, voterId: vote.voterId || socket.id };
        const poll = pollManager.addVote(pollId, finalVote);
        if (poll) {
            // Notify everyone that a vote happened (update counts if we wanted, but we want to keep it blind)
            // Actually, we just want to tell the Host (or everyone) that X people have voted
            io.to(pollId).emit('poll_updated', getPublicPollState(poll));
        }
    });

    // Host reveals poll
    socket.on('reveal_poll', (pollId) => {
        const poll = pollManager.revealPoll(pollId);
        if (poll) {
            io.to(pollId).emit('poll_updated', getPublicPollState(poll));
        }
    });

    // Host ends/wipes poll
    socket.on('end_poll', (pollId) => {
        const poll = pollManager.getPoll(pollId);
        if (poll && poll.hostId === socket.id) {
            pollManager.removePoll(pollId);
            io.to(pollId).emit('poll_ended');
            io.in(pollId).socketsLeave(pollId); // Kick everyone out
        }
    });

    // Host plays again (re-roll)
    socket.on('play_again', (pollId, callback) => {
        const newId = pollManager.copyPoll(pollId);
        if (newId) {
            callback(newId);
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

// Helper to sanitize poll data based on status
function getPublicPollState(poll) {
    if (poll.status === 'revealed') {
        return poll; // Send everything
    }
    // Blind mode: Hide specific votes
    return {
        ...poll,
        votes: poll.votes.map(v => ({ voterId: v.voterId })), // Only send WHO voted (ids), not WHAT they voted
        // Or maybe just sending count is enough?
        // User wants "Waiting for others...", so they need to know if they themselves voted.
        voteCount: poll.votes.length
    };
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
