import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaStar, FaHeart } from 'react-icons/fa';
import { useVendorRequest } from '../../hooks/useVendorRequest.jsx';
import { useEventRegistration } from '../../hooks/useEventRegistration';
import { createCheckoutSession } from '../../services/paymentService'; // Import payment service
import { showToast, confirmDialog } from '../../utils/toast';

/**
 * Standard EventCard component for consistent UI across browsing and managing events.
 */
export default function EventCard({
    event,
    isRegistered,
    canRate,
    rating,
    onRate,
    onAttendedToggle,
    isAttended,
    canEdit,
    onEdit,
    canRefund,
    onRefund,
    canUseWallet,
    onPayCard,
    onPayWallet,
    processingPayment,
    isPayable,
    showRefundButton,
    isPaid,
    customActions,
    isFavorite,
    onToggleFavorite,
    vendorRequestStatus // 'pending', 'approved', 'rejected'
}) {
    const navigate = useNavigate();
    const id = event._id || event.id;
    const type = event.type || 'Event';
    const title = event.title || event.name || 'Untitled Event';
    const desc = event.shortDescription || event.description || 'No description available';
    const start = event.startDate || event.date;
    const location = event.location || 'TBA';
    const price = event.ticketPrice || event.price || 0;
    const currency = event.currency || 'EGP';
    const hasEnded = start ? new Date(start) < new Date() : false;
    const hasStarted = start ? new Date(start) <= new Date() : false;
    const spotsLeft = event.capacity - (event.registeredCount || 0);
    const isFull = event.capacity > 0 && spotsLeft <= 0;

    // Hooks
    const {
        canRequest: canVendorRequest,
        openRequestModal: openVendorModal,
        RequestModal: VendorRequestModal,
        requestStatus: hookRequestStatus,
        paymentStatus,
        applicationId
    } = useVendorRequest(event);

    // Use prop status if available (optimization from list), otherwise fallback to hook's internal check
    const effectiveVendorStatus = vendorRequestStatus || hookRequestStatus;

    // Explicit Vendor Check for Button Safety
    const isVendor = (() => {
        try {
            const u = JSON.parse(localStorage.getItem('user'));
            return u && (u.role === 'vendor' || u.role === 'Vendor');
        } catch { return false; }
    })();

    const handleVendorPayment = async () => {
        if (!applicationId) return;
        try {
            const confirmed = await confirmDialog(
                `Pay participation fee for ${title}?`,
                'Confirm Payment'
            );
            if (!confirmed) return;

            const res = await createCheckoutSession(null, applicationId);
            if (res && res.url) {
                window.location.href = res.url;
            } else {
                showToast.error('Failed to initialize payment gateway');
            }
        } catch (err) {
            console.error("Vendor payment failed", err);
            showToast.error(err.message || 'Payment processing failed');
        }
    };
    const { isRegistered: hookIsRegistered, registering, handleRegister } = useEventRegistration(event, customActions ? null : () => window.location.reload());
    // ^ Reload if using card standalone, but standard lists might handle refresh differently. 
    // Ideally we callback to parent. For now, simple reload or UI update is key.

    // Prefer props if passed (e.g. from Detail page), else use hook
    const effectiveIsRegistered = isRegistered !== undefined ? isRegistered : hookIsRegistered;


    // Helper for colors
    const getEventColor = (t) => {
        switch (String(t || '').toLowerCase()) {
            case 'workshop': return 'from-emerald-400 to-teal-500';
            case 'course': return 'from-blue-400 to-indigo-500';
            case 'hackathon': return 'from-violet-400 to-purple-500';
            case 'seminar': return 'from-amber-400 to-orange-500';
            default: return 'from-slate-400 to-slate-500';
        }
    };

    const getEventIcon = (t) => {
        switch (String(t || '').toLowerCase()) {
            case 'workshop': return '🛠️';
            case 'course': return '📚';
            case 'hackathon': return '🚀';
            case 'seminar': return '🎤';
            default: return '📅';
        }
    };

    return (
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all duration-300 flex flex-col group relative border border-slate-200 h-full">
            {/* Header */}
            <div className={`h-40 bg-gradient-to-r ${getEventColor(type)} relative p-6 flex flex-col justify-between`}>
                {onToggleFavorite && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleFavorite(id);
                        }}
                        className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/40 transition-all shadow-sm"
                    >
                        <FaHeart className={`w-4 h-4 ${isFavorite ? 'text-red-500' : 'text-white'}`} />
                    </button>
                )}


                <div className="text-4xl filter drop-shadow-md">
                    {getEventIcon(type)}
                </div>

                <div className="flex justify-between items-end">
                    <span className="px-3 py-1 bg-white/20 text-white text-xs font-bold uppercase tracking-wider rounded-full backdrop-blur-sm">
                        {type}
                    </span>
                    {price > 0 && (
                        <span className="bg-white/20 px-3 py-1 rounded-full text-white font-bold backdrop-blur-sm text-sm">
                            {price} {currency}
                        </span>
                    )}
                    {effectiveVendorStatus && (
                        <span className={`px-3 py-1 rounded-full text-white font-bold backdrop-blur-sm text-xs uppercase ${effectiveVendorStatus === 'approved' ? 'bg-emerald-500/80' :
                            effectiveVendorStatus === 'rejected' ? 'bg-red-500/80' :
                                'bg-amber-500/80'
                            }`}>
                            {effectiveVendorStatus}
                        </span>
                    )}
                </div>
            </div>

            <div className="p-6 flex-1 flex flex-col">
                <h3 className="text-xl font-bold text-slate-800 mb-2 line-clamp-1 group-hover:text-emerald-600 transition-colors">
                    {title}
                </h3>
                <p className="text-slate-500 text-sm mb-6 line-clamp-2">
                    {desc}
                </p>

                <div className="space-y-3 mt-auto mb-6">
                    {start && (
                        <div className="flex items-center gap-3 text-slate-600 text-sm">
                            <span className="text-lg w-6 flex justify-center">📅</span>
                            <span className="font-medium">
                                {new Date(start).toLocaleDateString()} • {new Date(start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    )}
                    {location && (
                        <div className="flex items-center gap-3 text-slate-600 text-sm">
                            <span className="text-lg w-6 flex justify-center">📍</span>
                            <span className="font-medium">{location}</span>
                        </div>
                    )}
                </div>

                {/* Payment Buttons */}
                {isPayable && (
                    <div className="mb-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-2">
                        <button
                            onClick={() => onPayCard(event)}
                            disabled={processingPayment}
                            className="btn btn-primary btn-sm bg-gradient-to-r from-emerald-500 to-teal-600 border-none text-white shadow-lg shadow-emerald-900/20"
                        >
                            {processingPayment ? '...' : 'Pay Card'}
                        </button>
                        {canUseWallet && (
                            <button
                                onClick={() => onPayWallet(event)}
                                disabled={processingPayment}
                                className="btn btn-secondary btn-sm bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"
                            >
                                Wallet
                            </button>
                        )}
                    </div>
                )}

                {/* Registration Status Button */}
                {(() => {
                    const userData = typeof localStorage !== 'undefined' ? localStorage.getItem('user') : null;
                    const user = userData ? JSON.parse(userData) : {};
                    const role = (user.role || '').toLowerCase();
                    const isStaffOrStudentOnly = !['admin', 'eventoffice'].includes(role);

                    // If Registered (Green Button)
                    if (effectiveIsRegistered && isStaffOrStudentOnly && !hasEnded) {
                        return (
                            <div className="mb-4 pt-4 border-t border-slate-100">
                                <button className="btn btn-sm bg-emerald-100 text-emerald-700 border-emerald-200 w-full gap-2 opacity-100 hover:bg-emerald-100 cursor-default pointer-events-none">
                                    ✓ Registered
                                </button>
                            </div>
                        );
                    }

                    // If Not Registered and Eligible
                    // Professors, Staff, and TA cannot register for Bazaars or Booths
                    // Vendors should use "Request Spot", not "Register"
                    const isRoleRestricted = ['professor', 'staff', 'ta', 'vendor'].includes(role) && ['Bazaar', 'Booth'].includes(type);

                    return !isPayable && !canVendorRequest && !hasEnded && !isPaid && !effectiveIsRegistered && isStaffOrStudentOnly && !isRoleRestricted && !(role === 'student' && ['Bazaar', 'Booth'].includes(type)) && (
                        <div className="mb-4 pt-4 border-t border-slate-100">
                            {isFull ? (
                                <button disabled className="btn btn-sm btn-disabled w-full">Full</button>
                            ) : (
                                <button
                                    onClick={handleRegister}
                                    disabled={registering}
                                    className="btn btn-primary btn-sm w-full gap-2"
                                >
                                    {registering ? '...' : 'Register Now'}
                                </button>
                            )}
                        </div>
                    );
                })()}

                <div className="pt-4 border-t border-slate-100 flex flex-col gap-4">
                    {/* Actions Row */}
                    <div className="flex items-center justify-between gap-4">
                        {onRate && (
                            <RatingStars
                                value={rating}
                                onChange={(v) => onRate(id, v)}
                                disabled={!canRate}
                            />
                        )}

                        {/* Mark Attended (Moved to standard button) */}
                        {hasStarted && isRegistered && onAttendedToggle && (
                            <button
                                onClick={() => onAttendedToggle(id)}
                                className={`btn btn-sm gap-2 ${isAttended
                                    ? 'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200'
                                    : 'btn-outline border-slate-300 text-slate-600 hover:bg-slate-50'}`}
                            >
                                {isAttended ? '✓ Attended' : 'Mark Attended'}
                            </button>
                        )}

                        <button
                            onClick={() => navigate(`/events/${id}`)}
                            className="btn btn-ghost btn-sm text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 ml-auto"
                        >
                            Details →
                        </button>
                    </div>

                    {/* Vendor Request Button */}
                    {canVendorRequest && isVendor && !effectiveVendorStatus && (
                        <button
                            onClick={(e) => { e.stopPropagation(); openVendorModal(); }}
                            className="w-full btn btn-primary btn-sm bg-gradient-to-r from-emerald-500 to-teal-600 border-none text-white shadow-md mb-2"
                        >
                            📝 Request Spot
                        </button>
                    )}

                    {/* Vendor Status / Payment Buttons */}
                    {isVendor && effectiveVendorStatus && (
                        <div className="w-full mb-2">
                            {(effectiveVendorStatus === 'pending' || effectiveVendorStatus === 'rejected') && (
                                <div className={`w-full btn btn-sm border-none opacity-100 cursor-default pointer-events-none ${effectiveVendorStatus === 'pending' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'}`}>
                                    {effectiveVendorStatus === 'pending' ? '⏳ Request Pending' : '❌ Request Rejected'}
                                </div>
                            )}

                            {effectiveVendorStatus === 'approved' && paymentStatus === 'unpaid' && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleVendorPayment(); }}
                                    className="w-full btn btn-sm bg-gradient-to-r from-amber-500 to-orange-500 text-white border-none shadow-md hover:scale-[1.02] transition-transform"
                                >
                                    💳 Pay Booth Fee
                                </button>
                            )}

                            {effectiveVendorStatus === 'approved' && paymentStatus === 'paid' && (
                                <div className="w-full btn btn-sm bg-emerald-100 text-emerald-700 border-emerald-200 opacity-100 font-bold cursor-default pointer-events-none">
                                    ✓ Spot Confirmed (PAID)
                                </div>
                            )}
                        </div>
                    )}

                    {/* Secondary Actions */}
                    {customActions}
                </div>

                {/* Refund Closed Message */}
                {showRefundButton && isPaid && !canRefund && !hasEnded && (
                    <div className="text-center">
                        <span className="text-[10px] text-slate-400 italic">
                            Cancellation only available ≥ 14 days before start.
                        </span>
                    </div>
                )}
            </div>

            {VendorRequestModal}
        </div >
    );
}

function RatingStars({ value = 0, onChange, disabled = false }) {
    const [hover, setHover] = useState(0);
    const active = hover || value || 0;
    const stars = [1, 2, 3, 4, 5];

    return (
        <div className="flex items-center gap-1">
            {stars.map((s) => (
                <button
                    key={s}
                    type="button"
                    onClick={() => !disabled && onChange && onChange(s)}
                    onMouseEnter={() => !disabled && setHover(s)}
                    onMouseLeave={() => !disabled && setHover(0)}
                    disabled={disabled}
                    className={`p-1 bg-transparent border-none ${disabled ? "cursor-default opacity-60" : "cursor-pointer hover:scale-110 transition-transform"}`}
                >
                    <FaStar size={18} color={s <= active ? "#fbbf24" : "#e2e8f0"} />
                </button>
            ))}
        </div>
    );
}
