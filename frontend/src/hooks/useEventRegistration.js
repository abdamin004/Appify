import { useState } from 'react';
import { registerForEvent } from '../services/eventService';
import { checkEventOverlap } from '../utils/overlapDetection';
import { showOverlapWarning } from '../components/UI/OverlapWarningDialog';
import { showToast } from '../utils/toast';

export function useEventRegistration(event, onRegisterSuccess) {
    const [registering, setRegistering] = useState(false);

    // Helper: Check if user is logged in
    const isLoggedIn = (() => {
        try {
            return !!(typeof localStorage !== 'undefined' && localStorage.getItem('token'));
        } catch { return false; }
    })();

    // Helper: Check if already registered
    const isRegistered = (() => {
        if (!event) return false;
        try {
            const raw = localStorage.getItem('user');
            if (!raw) return false;
            const u = JSON.parse(raw);
            const uid = u._id || u.id;
            if (!uid) return false;

            const list = event.registeredUsers || [];
            if (!Array.isArray(list)) return false;
            return list.some(u => String(u._id || u.id || u) === String(uid));
        } catch { return false; }
    })();

    const handleRegister = async (e) => {
        if (e) e.stopPropagation();

        const eventId = event?._id || event?.id;
        if (!eventId) {
            showToast.error('Invalid event ID');
            return;
        }

        if (!isLoggedIn) {
            showToast.warning('Please log in to register');
            return;
        }

        if (isRegistered) {
            showToast.info('Already registered');
            return;
        }

        // Overlap Check
        try {
            const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/events/registered`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });

            if (res.ok) {
                const registeredEvents = await res.json();
                const events = Array.isArray(registeredEvents) ? registeredEvents : [];
                const conflicts = checkEventOverlap(event, events);

                if (conflicts.length > 0) {
                    const proceed = await showOverlapWarning(conflicts, event.title || 'Event', event.startDate);
                    if (!proceed) return;
                }
            }
        } catch (err) {
            console.error('Overlap check failed', err);
            // Verify if we should block or proceed. Usually proceed with warning log if check fails.
        }

        setRegistering(true);
        try {
            await registerForEvent(eventId);
            showToast.success('Successfully registered!');
            if (onRegisterSuccess) onRegisterSuccess(eventId);
            // Note: Caller might need to refresh event data to reflect isRegistered update
        } catch (err) {
            showToast.error(err.message || 'Registration failed');
        } finally {
            setRegistering(false);
        }
    };

    return {
        isRegistered,
        isLoggedIn,
        registering,
        handleRegister
    };
}
