import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import socket from '../socket';

const STEPS = ['mode', 'reveal', 'question', 'options'];

const slideVariants = {
    enter: { x: 60, opacity: 0 },
    center: { x: 0, opacity: 1 },
    exit: { x: -60, opacity: 0 },
};

// Fun reactions based on user choices
const FUN_REACTIONS = {
    couple: [
        "Aww, couple goals! 💕 No more fighting over dinner!",
        "Date night decision time! 🌹",
        "Let's settle this like adults… secretly 😏",
    ],
    group: [
        "Squad assemble! 🦸‍♂️ Time for democracy.",
        "May the best option win! 🏆",
        "No more 'I don't mind, you choose' 😤",
    ],
    manual: [
        "You like the drama of a big reveal! 🎭",
        "Power move. You control the suspense 🎬",
    ],
    count: [
        "Efficient! Auto-pilot reveal 🤖",
        "Set it and forget it ⚡",
    ],
};

function getReaction(key) {
    const reactions = FUN_REACTIONS[key];
    if (!reactions) return null;
    return reactions[Math.floor(Math.random() * reactions.length)];
}

export default function LandingPage() {
    const navigate = useNavigate();
    const [step, setStep] = useState(-1); // -1 = intro/how-it-works
    const [reaction, setReaction] = useState('');
    const [userName, setUserName] = useState('');

    // Form state
    const [mode, setMode] = useState('');
    const [revealType, setRevealType] = useState('');
    const [revealCount, setRevealCount] = useState(2);
    const [question, setQuestion] = useState('');
    const [questionType, setQuestionType] = useState('multiple');
    const [options, setOptions] = useState(['', '']);
    const [questionImage, setQuestionImage] = useState(null);
    const [optionsImages, setOptionsImages] = useState([]);
    const [sliderMin, setSliderMin] = useState(1);
    const [sliderMax, setSliderMax] = useState(10);
    const [sliderStep, setSliderStep] = useState(1);
    const [creating, setCreating] = useState(false);

    const next = () => setStep(s => Math.min(s + 1, STEPS.length - 1));
    const back = () => setStep(s => Math.max(s - 1, -1));

    const selectMode = (m) => {
        setMode(m);
        setReaction(getReaction(m));
    };

    const selectReveal = (r) => {
        setRevealType(r);
        setReaction(getReaction(r));
    };

    const handleImageUpload = (e, callback) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => {
            callback(reader.result);
        };
        reader.readAsDataURL(file);
    };

    const addOption = () => {
        setOptions([...options, '']);
        setOptionsImages([...optionsImages, null]);
    };
    const updateOption = (i, val) => {
        const copy = [...options];
        copy[i] = val;
        setOptions(copy);
    };
    const removeOption = (i) => {
        setOptions(options.filter((_, idx) => idx !== i));
        setOptionsImages(optionsImages.filter((_, idx) => idx !== i));
    };

    const updateOptionImage = (i, val) => {
        const copy = [...optionsImages];
        copy[i] = val;
        setOptionsImages(copy);
    };

    const createPoll = () => {
        if (!question.trim()) return;
        const validOptions = options.filter(o => o.trim());
        if (questionType === 'multiple' && validOptions.length < 2) return;

        setCreating(true);
        const revealTrigger = revealType === 'manual'
            ? { type: 'manual' }
            : { type: 'count', value: mode === 'couple' ? 2 : parseInt(revealCount) };

        // Map optionsImages to match only valid (non-empty) options
        const filteredOptionsImages = options
            .map((opt, i) => opt.trim() ? optionsImages[i] : null)
            .filter((_, i) => options[i].trim());

        socket.emit('create_poll', {
            question,
            questionImage,
            hostName: userName,
            type: questionType,
            options: validOptions,
            optionsImages: filteredOptionsImages,
            revealTrigger,
            mode,
            sliderConfig: questionType === 'slider' ? { min: Number(sliderMin), max: Number(sliderMax), step: Number(sliderStep) } : undefined,
        }, (res) => {
            setCreating(false);
            if (res.success) {
                localStorage.setItem('unbiased_name', userName);
                navigate(`/vote/${res.pollId}?host=true`);
            }
        });
    };

    const canProceed = () => {
        if (step === 0) return !!mode;
        if (step === 1) return !!revealType;
        if (step === 2) return question.trim().length > 0;
        return true;
    };

    return (
        <div className="card">
            <AnimatePresence mode="wait">
                {/* ====== INTRO / HOW IT WORKS ====== */}
                {step === -1 && (
                    <motion.div key="intro" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.2 }}>
                        <div className="text-center mb-3">
                            <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>🤫</div>
                            <h1 style={{ fontSize: '1.8rem' }}>Unbiased</h1>
                            <p className="text-dim mt-1">Group decisions without the bias</p>
                        </div>

                        <div className="how-it-works">
                            <div className="how-step">
                                <div className="how-step-num">1</div>
                                <div className="how-step-text"><strong>Create a question</strong> — pick options your group can vote on</div>
                            </div>
                            <div className="how-step">
                                <div className="how-step-num">2</div>
                                <div className="how-step-text"><strong>Share the link</strong> — everyone votes secretly, no peeking 🙈</div>
                            </div>
                            <div className="how-step">
                                <div className="how-step-num">3</div>
                                <div className="how-step-text"><strong>Reveal together</strong> — results appear for everyone at the same time!</div>
                            </div>
                            <div className="how-step" style={{ marginBottom: 0 }}>
                                <div className="how-step-num">4</div>
                                <div className="how-step-text"><strong>Decide fairly</strong> — no one influences anyone. Ties? Spin the wheel! 🎰</div>
                            </div>
                        </div>

                        <div className="mt-3">
                            <label>Your Name</label>
                            <input
                                type="text"
                                placeholder="Enter your name"
                                value={userName}
                                onChange={(e) => setUserName(e.target.value)}
                                style={{ marginBottom: 0 }}
                            />
                        </div>

                        <button className="btn-primary mt-3" onClick={() => setStep(0)} disabled={!userName.trim()}>
                            Let's decide! →
                        </button>
                    </motion.div>
                )}

                {/* ====== STEP 0: MODE ====== */}
                {step === 0 && (
                    <motion.div key="mode" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.2 }}>
                        <div className="step-indicator">
                            {STEPS.map((_, i) => (
                                <div key={i} className={`step-dot ${i === step ? 'active' : i < step ? 'done' : ''}`} />
                            ))}
                        </div>

                        <h1 className="mb-1">👋 Who's deciding?</h1>
                        <p className="text-dim mb-3">Pick your group size</p>

                        <div className="choice-grid">
                            <div className={`choice-card ${mode === 'couple' ? 'selected' : ''}`} onClick={() => selectMode('couple')}>
                                <span className="emoji">💑</span>
                                <span className="label">Couple</span>
                                <span className="desc">Just 2 people</span>
                            </div>
                            <div className={`choice-card ${mode === 'group' ? 'selected' : ''}`} onClick={() => selectMode('group')}>
                                <span className="emoji">👥</span>
                                <span className="label">Group</span>
                                <span className="desc">3 or more</span>
                            </div>
                        </div>

                        {reaction && (
                            <motion.div className="fun-reaction" initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}>
                                {reaction}
                            </motion.div>
                        )}

                        <div className="flex-row gap-sm w-full">
                            <button className="btn-ghost" onClick={back}>← Back</button>
                            <button className="btn-primary" disabled={!canProceed()} onClick={next}>Continue →</button>
                        </div>
                    </motion.div>
                )}

                {/* ====== STEP 1: REVEAL TYPE ====== */}
                {step === 1 && (
                    <motion.div key="reveal" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.2 }}>
                        <div className="step-indicator">
                            {STEPS.map((_, i) => (
                                <div key={i} className={`step-dot ${i === step ? 'active' : i < step ? 'done' : ''}`} />
                            ))}
                        </div>

                        <h1 className="mb-1">⏱️ When to reveal?</h1>
                        <p className="text-dim mb-3">Choose when answers become visible</p>

                        <div className="choice-grid">
                            <div className={`choice-card ${revealType === 'manual' ? 'selected' : ''}`} onClick={() => selectReveal('manual')}>
                                <span className="emoji">🎯</span>
                                <span className="label">Manual</span>
                                <span className="desc">You click reveal</span>
                            </div>
                            <div className={`choice-card ${revealType === 'count' ? 'selected' : ''}`} onClick={() => selectReveal('count')}>
                                <span className="emoji">🔢</span>
                                <span className="label">Auto</span>
                                <span className="desc">After X votes</span>
                            </div>
                        </div>

                        {reaction && (
                            <motion.div className="fun-reaction" initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} key={reaction}>
                                {reaction}
                            </motion.div>
                        )}

                        {revealType === 'count' && mode === 'group' && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}>
                                <label>How many voters?</label>
                                <input type="number" min="2" max="50" value={revealCount} onChange={e => setRevealCount(e.target.value)} />
                            </motion.div>
                        )}

                        <div className="flex-row gap-sm w-full">
                            <button className="btn-ghost" onClick={back}>← Back</button>
                            <button className="btn-primary" disabled={!canProceed()} onClick={next}>Continue →</button>
                        </div>
                    </motion.div>
                )}

                {/* ====== STEP 2: QUESTION ====== */}
                {step === 2 && (
                    <motion.div key="question" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.2 }}>
                        <div className="step-indicator">
                            {STEPS.map((_, i) => (
                                <div key={i} className={`step-dot ${i === step ? 'active' : i < step ? 'done' : ''}`} />
                            ))}
                        </div>

                        <h1 className="mb-1">❓ Your question</h1>
                        <p className="text-dim mb-3">What do you want to decide?</p>

                        <input
                            type="text"
                            placeholder={mode === 'couple' ? "e.g. Where should we go for dinner?" : "e.g. What movie should we watch?"}
                            value={question}
                            onChange={e => setQuestion(e.target.value)}
                            autoFocus
                        />

                        <div className="image-upload-wrapper">
                            {questionImage ? (
                                <div className="image-preview-container">
                                    <img src={questionImage} alt="Question" className="image-preview" />
                                    <button className="remove-image-btn" onClick={() => setQuestionImage(null)}>✕</button>
                                </div>
                            ) : (
                                <label className="image-input-label">
                                    🖼️ Add an image for context
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => handleImageUpload(e, setQuestionImage)}
                                        hidden
                                    />
                                </label>
                            )}
                        </div>

                        <label>Answer type</label>
                        <div className="choice-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', marginBottom: '0' }}>
                            <div className={`choice-card ${questionType === 'multiple' ? 'selected' : ''}`} onClick={() => setQuestionType('multiple')} style={{ padding: '12px 8px' }}>
                                <span className="emoji" style={{ fontSize: '1.3rem' }}>📋</span>
                                <span className="label" style={{ fontSize: '0.75rem' }}>Choices</span>
                            </div>
                            <div className={`choice-card ${questionType === 'slider' ? 'selected' : ''}`} onClick={() => setQuestionType('slider')} style={{ padding: '12px 8px' }}>
                                <span className="emoji" style={{ fontSize: '1.3rem' }}>🔢</span>
                                <span className="label" style={{ fontSize: '0.75rem' }}>Number</span>
                            </div>
                            <div className={`choice-card ${questionType === 'text' ? 'selected' : ''}`} onClick={() => setQuestionType('text')} style={{ padding: '12px 8px' }}>
                                <span className="emoji" style={{ fontSize: '1.3rem' }}>💬</span>
                                <span className="label" style={{ fontSize: '0.75rem' }}>Text</span>
                            </div>
                        </div>

                        <motion.div
                            key={questionType}
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="fun-reaction mt-2"
                            style={{ textAlign: 'left' }}
                        >
                            {questionType === 'multiple' && '📋 Give fixed options to pick from — e.g. "Pizza, Sushi, Burger"'}
                            {questionType === 'slider' && '🔢 Everyone enters a number — you see the group average. e.g. "Rate 1-10"'}
                            {questionType === 'text' && '💬 Everyone types a free answer — great for open-ended ideas!'}
                        </motion.div>

                        <div className="flex-row gap-sm w-full mt-3">
                            <button className="btn-ghost" onClick={back}>← Back</button>
                            <button className="btn-primary" disabled={!canProceed()} onClick={next}>Continue →</button>
                        </div>
                    </motion.div>
                )}

                {/* ====== STEP 3: OPTIONS / CREATE ====== */}
                {step === 3 && (
                    <motion.div key="options" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.2 }}>
                        <div className="step-indicator">
                            {STEPS.map((_, i) => (
                                <div key={i} className={`step-dot ${i === step ? 'active' : i < step ? 'done' : ''}`} />
                            ))}
                        </div>

                        <h1 className="mb-1">
                            {questionType === 'multiple' ? '📝 Add choices' : questionType === 'slider' ? '🔢 Number input' : '💬 Open answers'}
                        </h1>
                        <p className="text-dim mb-3">
                            {questionType === 'multiple' ? 'What can people pick from?' : questionType === 'slider' ? 'Participants will type a number. You\'ll see the average.' : 'Everyone types their own answer freely.'}
                        </p>

                        {questionType === 'multiple' && (
                            <div className="mb-2">
                                {options.map((opt, i) => (
                                    <div key={i} className="flex-col mb-2" style={{ border: '1px solid var(--border)', padding: '12px', borderRadius: 'var(--radius-sm)', background: 'rgba(255,255,255,0.02)' }}>
                                        <div className="flex-row gap-sm mb-2">
                                            <input
                                                type="text"
                                                placeholder={`Option ${i + 1}`}
                                                value={opt}
                                                onChange={e => updateOption(i, e.target.value)}
                                                style={{ marginBottom: 0 }}
                                            />
                                            {options.length > 2 && (
                                                <button onClick={() => removeOption(i)} style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', padding: '10px 14px', flexShrink: 0 }}>✕</button>
                                            )}
                                        </div>

                                        <div className="image-upload-wrapper" style={{ marginBottom: 0 }}>
                                            {optionsImages[i] ? (
                                                <div className="image-preview-container" style={{ maxHeight: '100px' }}>
                                                    <img src={optionsImages[i]} alt={`Option ${i + 1}`} className="image-preview" />
                                                    <button className="remove-image-btn" onClick={() => updateOptionImage(i, null)}>✕</button>
                                                </div>
                                            ) : (
                                                <label className="image-input-label" style={{ padding: '6px 12px', fontSize: '0.75rem' }}>
                                                    🖼️ Add image
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={(e) => handleImageUpload(e, (data) => updateOptionImage(i, data))}
                                                        hidden
                                                    />
                                                </label>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                <button onClick={addOption} className="btn-ghost w-full mt-1" style={{ border: '1px dashed var(--border)', justifyContent: 'center' }}>+ Add option</button>
                            </div>
                        )}

                        {questionType === 'slider' && (
                            <div className="mb-2">
                                <div className="flex-row gap-sm mb-1">
                                    <div style={{ flex: 1 }}>
                                        <label>Min</label>
                                        <input type="number" value={sliderMin} onChange={e => setSliderMin(e.target.value)} style={{ marginBottom: 0 }} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <label>Max</label>
                                        <input type="number" value={sliderMax} onChange={e => setSliderMax(e.target.value)} style={{ marginBottom: 0 }} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <label>Step</label>
                                        <input type="number" value={sliderStep} onChange={e => setSliderStep(e.target.value)} min="1" style={{ marginBottom: 0 }} />
                                    </div>
                                </div>
                                <p className="text-dim mt-1" style={{ fontSize: '0.8rem' }}>Voters will pick a number between {sliderMin} and {sliderMax}</p>
                            </div>
                        )}
                        {questionType === 'text' && (
                            <div className="text-center text-dim mb-3" style={{ fontSize: '3rem' }}>💬</div>
                        )}

                        <div className="flex-row gap-sm w-full">
                            <button className="btn-ghost" onClick={back}>← Back</button>
                            <button className="btn-primary" onClick={createPoll} disabled={creating}>
                                {creating ? 'Creating...' : '🚀 Create & Share'}
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
