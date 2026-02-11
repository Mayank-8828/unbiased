import React, { useState, useEffect } from 'react';
import socket from '../socket';

export default function ConnectionStatus() {
    const [connected, setConnected] = useState(socket.connected);

    useEffect(() => {
        function onConnect() {
            setConnected(true);
        }

        function onDisconnect() {
            setConnected(false);
        }

        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);

        return () => {
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
        };
    }, []);

    if (connected) return null;

    return (
        <div className="connection-status">
            <span className="pulse-dot"></span>
            Reconnecting...
        </div>
    );
}
