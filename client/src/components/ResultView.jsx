import React, { useState } from 'react';
import { motion } from 'framer-motion';

export default function ResultView({ poll, onPlayAgain }) {
    const [winner, setWinner] = useState(null);
    const [spinning, setSpinning] = useState(false);

    // Calculate results
    const counts = {};
    let total = 0;
    let max = 0;
    let winners = [];

    if (!poll || !poll.votes) {
        return <div className="text-center p-3">No results data available</div>;
    }

    if (poll.type === 'multiple') {
        poll.votes.forEach(v => {
            counts[v.answer] = (counts[v.answer] || 0) + 1;
            total++;
        });
        Object.entries(counts).forEach(([k, v]) => {
            if (v > max) { max = v; winners = [k]; }
            else if (v === max) { winners.push(k); }
        });
    } else if (poll.type === 'slider') {
        total = poll.votes.length;
        const sum = poll.votes.reduce((acc, v) => acc + parseFloat(v.answer), 0);
        const avg = total ? (sum / total).toFixed(1) : 0;
        winners = [avg];
    }

    const isTie = winners.length > 1 && poll.type === 'multiple';

    const spinWheel = () => {
        setSpinning(true);
        let counter = 0;
        const cycles = 20;
        const interval = setInterval(() => {
            setWinner(winners[Math.floor(Math.random() * winners.length)]);
            counter++;
            if (counter > cycles) {
                clearInterval(interval);
                setWinner(winners[Math.floor(Math.random() * winners.length)]);
                setSpinning(false);
            }
        }, 100);
    };

    return (
        <div>
            <div className="text-center mb-3">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🎉</motion.div>
                <h2 className="mb-1">Results are in!</h2>
                <p className="text-dim">{poll.question}</p>
                {poll.questionImage && <img src={poll.questionImage} alt="Question" className="question-image mt-2" />}
            </div>

            {/* MULTIPLE CHOICE RESULTS */}
            {poll.type === 'multiple' && (
                <div className="mb-2">
                    {poll.options.map((opt, i) => {
                        const count = counts[opt] || 0;
                        const percent = total ? (count / total) * 100 : 0;
                        const isWinner = winners.includes(opt);

                        return (
                            <motion.div key={opt} className="result-bar-wrap" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.15 }}>
                                <div className="result-bar-label">
                                    {poll.optionsImages?.[i] && <img src={poll.optionsImages[i]} alt={opt} className="result-image" />}
                                    <span className="name" style={{ color: isWinner ? 'var(--primary)' : 'var(--text)' }}>
                                        {isWinner && '👑 '}{opt}
                                    </span>
                                    <span className="count">{count} vote{count !== 1 ? 's' : ''}</span>
                                </div>
                                <div className="result-bar-track">
                                    <motion.div
                                        className="result-bar-fill"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${percent}%` }}
                                        transition={{ duration: 0.8, delay: i * 0.15 }}
                                        style={{ background: isWinner ? 'var(--primary)' : 'var(--secondary)' }}
                                    />
                                </div>
                                <div className="mt-1 flex-row gap-xs flex-wrap">
                                    {poll.votes
                                        .filter(v => v.answer === opt)
                                        .map((v, idx) => (
                                            <span key={idx} className="badge badge-dim" style={{ fontSize: '0.65rem', textTransform: 'none' }}>
                                                {v.voterName || 'Anonymous'}
                                            </span>
                                        ))}
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}

            {/* NUMBER/SLIDER RESULTS */}
            {poll.type === 'slider' && (
                <div className="text-center mb-3">
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} style={{ fontSize: '3.5rem', fontWeight: 900, color: 'var(--primary)' }}>
                        {winners[0]}
                    </motion.div>
                    <p className="text-dim">Average of {total} response{total !== 1 ? 's' : ''}</p>
                    <div className="flex-row gap-xs flex-wrap justify-center mt-2">
                        {poll.votes.map((v, idx) => (
                            <span key={idx} className="badge badge-dim" style={{ fontSize: '0.65rem', textTransform: 'none' }}>
                                {v.voterName || 'Anon'}: {v.answer}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* TEXT RESULTS */}
            {poll.type === 'text' && (
                <div className="mb-2" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {poll.votes.map((v, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            style={{ background: 'var(--surface)', padding: '12px 16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
                        >
                            <div style={{ fontSize: '0.75rem', color: 'var(--primary)', marginBottom: '4px', fontWeight: 700 }}>{v.voterName || 'Anonymous'}</div>
                            "{v.answer}"
                        </motion.div>
                    ))}
                </div>
            )}

            {/* TIE BREAKER */}
            {isTie && (
                <div className="text-center mt-2" style={{ padding: '1rem', background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                    <p className="text-dim mb-2">It's a tie between: <strong style={{ color: 'var(--text)' }}>{winners.join(' & ')}</strong></p>

                    {!winner ? (
                        <button className="btn-primary" onClick={spinWheel} disabled={spinning}>
                            {spinning ? '🎰 Spinning...' : '🎰 Break the tie!'}
                        </button>
                    ) : (
                        <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 0.5 }}>
                            <p style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)', marginTop: '0.5rem' }}>
                                🏆 {winner}
                            </p>
                        </motion.div>
                    )}
                </div>
            )}

            {onPlayAgain && (
                <button
                    className="btn-secondary mt-3 mb-2"
                    onClick={onPlayAgain}
                    style={{ background: 'var(--surface)', border: '1px solid var(--border)', justifyContent: 'center' }}
                >
                    🔄 Play Again / Re-roll
                </button>
            )}

            <a
                href="https://buymeacoffee.com/mayankkariya"
                target="_blank"
                rel="noopener noreferrer"
                className="bmc-button"
            >
                <img src="https://cdn.buymeacoffee.com/buttons/bmc-new-btn-logo.svg" alt="Buy me a coffee" className="bmc-icon" style={{ width: 'auto', height: '24px' }} />
                <span>Buy me a coffee</span>
            </a>
        </div>
    );
}
