const crypto = require('crypto');

class PollManager {
    constructor() {
        this.polls = new Map();
    }

    createPoll({ question, type, options, revealTrigger, hostId, hostName, sliderConfig, questionImage, optionsImages }) {
        const pollId = crypto.randomBytes(3).toString('hex'); // 6 char random ID
        const poll = {
            id: pollId,
            hostId,
            hostName, // Name of the creator
            question,
            questionImage, // Base64 image for the question
            type, // 'multiple', 'slider', 'text'
            options: options || [],
            optionsImages: optionsImages || [], // Array of Base64 images for options
            sliderConfig: sliderConfig || { min: 1, max: 10, step: 1 },
            revealTrigger,
            votes: [], // [{ voter: 'Rahul', answer: 'Pizza' }]
            status: 'waiting', // 'waiting' | 'revealed'
            createdAt: Date.now()
        };
        this.polls.set(pollId, poll);
        return poll;
    }

    getPoll(pollId) {
        return this.polls.get(pollId);
    }

    addVote(pollId, vote) {
        const poll = this.getPoll(pollId);
        if (!poll || poll.status === 'revealed') return null;

        // Check if user already voted (by socket ID or temp session ID)
        const existingVoteIndex = poll.votes.findIndex(v => v.voterId === vote.voterId);
        if (existingVoteIndex !== -1) {
            // Update vote
            poll.votes[existingVoteIndex] = vote;
        } else {
            poll.votes.push(vote);
        }

        this.checkRevealTrigger(pollId);
        return poll;
    }

    checkRevealTrigger(pollId) {
        const poll = this.getPoll(pollId);
        if (!poll) return;

        if (poll.revealTrigger.type === 'count' && poll.votes.length >= poll.revealTrigger.value) {
            this.revealPoll(pollId);
        }
    }

    revealPoll(pollId) {
        const poll = this.getPoll(pollId);
        if (poll) {
            poll.status = 'revealed';
        }
        return poll;
    }

    removePoll(pollId) {
        this.polls.delete(pollId);
    }
}

module.exports = new PollManager();
