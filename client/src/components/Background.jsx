import React from 'react';
import { motion } from 'framer-motion';

export default function Background() {
    return (
        <div className="background-container">
            <div className="mesh-orb orb-1"></div>
            <div className="mesh-orb orb-2"></div>
            <div className="mesh-orb orb-3"></div>
            <div className="mesh-orb orb-4"></div>
            <div className="noise-overlay"></div>
        </div>
    );
}
