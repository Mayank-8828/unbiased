import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import socket from '../socket';
import ResultView from './ResultView';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import soundManager from '../utils/SoundManager';

export default function VotePage() {
    const { pollId } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const isHost = searchParams.get('host') === 'true';

    const [poll, setPoll] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [vote, setVote] = useState('');
    const [voterName, setVoterName] = useState(localStorage.getItem('secretboom_name') || '');
    const [hasVoted, setHasVoted] = useState(false);
    const [copied, setCopied] = useState(false);

    // Persistent Voter ID
    const [voterId] = useState(() => {
        let id = localStorage.getItem('secretboom_voterId');
        if (!id) {
            id = Math.random().toString(36).substr(2, 9);
            localStorage.setItem('secretboom_voterId', id);
        }
        return id;
    });

    useEffect(() => {
        // Send voterId when joining to check if we already voted
        socket.emit('join_poll', { pollId, voterId }, (response) => {
            if (response.success) {
                setPoll(response.poll);
                // Check if I already voted in this poll
                const myVote = response.poll.votes.find(v => v.voterId === voterId);
                if (myVote) {
                    setVote(myVote.answer);
                    setVoterName(myVote.voterName); // Restore name too
                    setHasVoted(true);
                }
            } else {
                setError(response.error);
            }
            setLoading(false);
        });

        socket.on('poll_updated', (updatedPoll) => {
            setPoll(updatedPoll);
            // Play sound if vote count increased (simple check)
            if (poll && updatedPoll.voteCount > poll.voteCount) {
                soundManager.play('ding');
            }
            // Check for reveal
            if (poll && poll.status !== 'revealed' && updatedPoll.status === 'revealed') {
                soundManager.play('tada');
                soundManager.play('tada');
                try {
                    confetti({
                        particleCount: 150,
                        spread: 70,
                        origin: { y: 0.6 }
                    });
                } catch (e) {
                    console.error('Confetti error:', e);
                }
            }
        });
        socket.on('poll_ended', () => {
            navigate('/');
        });

        return () => {
            socket.off('poll_updated');
            socket.off('poll_ended');
        };
    }, [pollId]);

    const submitVote = () => {
        if (!vote || !voterName.trim()) return;
        soundManager.play('pop');
        localStorage.setItem('secretboom_name', voterName);
        // Include voterId in the vote payload
        socket.emit('submit_vote', { pollId, vote: { answer: vote, voterName, voterId } });
        setHasVoted(true);
    };

    const reveal = () => socket.emit('reveal_poll', pollId);

    const endPoll = () => {
        socket.emit('end_poll', pollId);
        navigate('/');
    };

    const copyLink = () => {
        const link = `${window.location.origin}/vote/${pollId}`;
        navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // ===== LOADING =====
    if (loading) {
        return (
            <div className="card text-center" style={{ padding: '3rem 1.5rem' }}>
                <div className="waiting-pulse" style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>⏳</div>
                <p className="text-dim">Loading poll...</p>
            </div>
        );
    }

    // ===== ERROR =====
    if (error || !poll) {
        return (
            <div className="card text-center" style={{ padding: '3rem 1.5rem' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>❌</div>
                <h2 className="mb-1">Poll not found</h2>
                <p className="text-dim mb-3">This poll may have ended or the link is incorrect.</p>
                <button className="btn-primary" onClick={() => navigate('/')}>Create a new poll →</button>
            </div>
        );
    }

    // ===== RESULTS REVEALED =====
    if (poll.status === 'revealed') {
        return (
            <motion.div className="card" initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                <ResultView poll={poll} onPlayAgain={() => socket.emit('play_again', pollId, (newId) => navigate(`/vote/${newId}?host=true`))} />
                <div className="divider" />
                <button className="btn-primary" onClick={() => navigate('/')}>
                    🏠 Home
                </button>
                {isHost && (
                    <button className="btn-ghost w-full mt-1 text-center" onClick={endPoll} style={{ justifyContent: 'center', color: 'var(--danger)' }}>
                        End & wipe all data
                    </button>
                )}
            </motion.div>
        );
    }

    // ===== HOST: SHARE LINK FIRST =====
    if (isHost && !hasVoted) {
        return (
            <motion.div className="card" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <span className="badge badge-primary mb-2">You're the Host</span>

                <h2 className="mb-1">{poll.question}</h2>
                {poll.questionImage && <img src={poll.questionImage} alt="Question" className="question-image" />}
                <p className="text-dim mb-3">Share this code with your group:</p>

                <div className="poll-code-container">
                    <div className="poll-code" onClick={copyLink} style={{ margin: '0 auto' }}>
                        <div className="code">{pollId.toUpperCase()}</div>
                        <div className="hint">{copied ? '✅ Link copied!' : 'Tap to copy link'}</div>
                    </div>
                </div>

                <p className="text-dim text-center mb-3" style={{ fontSize: '0.85rem' }}>
                    Votes: <strong style={{ color: 'var(--primary)' }}>{poll.voteCount || 0}</strong>
                </p>

                <div className="divider" />

                {/* Host also votes */}
                <div className="mb-2">
                    <label style={{ fontSize: '0.85rem' }}>Your name:</label>
                    <input
                        type="text"
                        value={voterName}
                        onChange={e => setVoterName(e.target.value)}
                        placeholder="Who are you?"
                        style={{ padding: '8px 12px' }}
                    />
                </div>
                <p className="text-dim mb-2" style={{ fontSize: '0.85rem' }}>Your vote:</p>

                {poll.type === 'multiple' && poll.options.map((opt, i) => (
                    <button
                        key={i}
                        className={`vote-option ${vote === opt ? 'selected' : ''} ${poll.optionsImages?.[i] ? 'has-image' : ''}`}
                        onClick={() => setVote(opt)}
                    >
                        {poll.optionsImages?.[i] && <img src={poll.optionsImages[i]} alt={opt} className="option-image" />}
                        <span>{opt}</span>
                    </button>
                ))}

                {poll.type === 'slider' && (
                    <div>
                        <input type="number" value={vote} onChange={e => setVote(e.target.value)} min={poll.sliderConfig?.min} max={poll.sliderConfig?.max} step={poll.sliderConfig?.step} placeholder={`${poll.sliderConfig?.min || 1} - ${poll.sliderConfig?.max || 10}`} style={{ fontSize: '1.5rem', textAlign: 'center' }} />
                        <p className="text-dim text-center" style={{ fontSize: '0.8rem', marginTop: '-8px' }}>Range: {poll.sliderConfig?.min || 1} to {poll.sliderConfig?.max || 10} (step {poll.sliderConfig?.step || 1})</p>
                    </div>
                )}

                {poll.type === 'text' && (
                    <input type="text" value={vote} onChange={e => setVote(e.target.value)} placeholder="Type your answer..." />
                )}

                <button className="btn-primary mt-2" disabled={!vote} onClick={submitVote}>
                    Submit my vote
                </button>

                {poll.revealTrigger?.type === 'manual' && (
                    <button className="btn-secondary mt-2" onClick={reveal}>
                        🚀 Reveal Results Now
                    </button>
                )}
            </motion.div>
        );
    }

    // ===== HOST: WAITING AFTER VOTE =====
    if (isHost && hasVoted) {
        return (
            <motion.div className="card text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ padding: '2.5rem 1.5rem' }}>
                <span className="badge badge-primary mb-3">Host</span>

                <div className="waiting-pulse" style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
                <h2 className="mb-1">Vote locked in!</h2>
                <p className="text-dim mb-3">
                    Waiting for others... <strong style={{ color: 'var(--primary)' }}>{poll.voteCount || 0}</strong> voted so far
                </p>

                <div className="poll-code" onClick={copyLink}>
                    <div className="code">{pollId.toUpperCase()}</div>
                    <div className="hint">{copied ? '✅ Copied!' : 'Share this code'}</div>
                </div>

                <button className="btn-ghost" onClick={() => setHasVoted(false)} style={{ justifyContent: 'center', width: '100%' }}>
                    Changed my mind?
                </button>

                {poll.revealTrigger?.type === 'manual' && (
                    <button className="btn-secondary mt-2" onClick={reveal}>
                        🚀 Reveal Results Now
                    </button>
                )}
            </motion.div>
        );
    }

    // ===== PARTICIPANT: VOTING =====
    if (!hasVoted) {
        return (
            <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                {poll.hostName && !isHost && (
                    <div className="host-invite-banner">
                        <span className="emoji">🤝</span>
                        <span className="text"><strong>{poll.hostName}</strong> invited you to decide!</span>
                    </div>
                )}
                <span className="badge badge-secondary mb-2">Voting</span>

                <h2 className="mb-3">{poll.question}</h2>
                {poll.questionImage && <img src={poll.questionImage} alt="Question" className="question-image" />}

                <div className="mb-3">
                    <label>Your Name</label>
                    <input
                        type="text"
                        value={voterName}
                        onChange={e => setVoterName(e.target.value)}
                        placeholder="Enter your name"
                        autoFocus={!voterName}
                    />
                </div>

                {poll.type === 'multiple' && poll.options.map((opt, i) => (
                    <button
                        key={i}
                        className={`vote-option ${vote === opt ? 'selected' : ''} ${poll.optionsImages?.[i] ? 'has-image' : ''}`}
                        onClick={() => setVote(opt)}
                    >
                        {poll.optionsImages?.[i] && <img src={poll.optionsImages[i]} alt={opt} className="option-image" />}
                        <span>{opt}</span>
                    </button>
                ))}

                {poll.type === 'slider' && (
                    <div>
                        <input type="number" value={vote} onChange={e => setVote(e.target.value)} min={poll.sliderConfig?.min} max={poll.sliderConfig?.max} step={poll.sliderConfig?.step} placeholder={`${poll.sliderConfig?.min || 1} - ${poll.sliderConfig?.max || 10}`} autoFocus style={{ fontSize: '1.5rem', textAlign: 'center' }} />
                        <p className="text-dim text-center" style={{ fontSize: '0.8rem', marginTop: '-8px' }}>Range: {poll.sliderConfig?.min || 1} to {poll.sliderConfig?.max || 10} (step {poll.sliderConfig?.step || 1})</p>
                    </div>
                )}

                {poll.type === 'text' && (
                    <input type="text" value={vote} onChange={e => setVote(e.target.value)} placeholder="Type your answer..." autoFocus />
                )}

                <button className="btn-primary mt-2" disabled={!vote} onClick={submitVote}>
                    Submit Answer
                </button>
            </motion.div>
        );
    }

    // ===== PARTICIPANT: WAITING =====
    return (
        <motion.div className="card text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ padding: '3rem 1.5rem' }}>
            <div className="waiting-pulse" style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
            <h2 className="mb-1">Vote locked in!</h2>
            <p className="text-dim mb-3">Waiting for everyone else...</p>

            <button className="btn-ghost" onClick={() => setHasVoted(false)} style={{ justifyContent: 'center', width: '100%' }}>
                Changed my mind?
            </button>
        </motion.div>
    );
}
