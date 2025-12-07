import React, { forwardRef } from 'react';
import DatePicker from 'react-datepicker';
import { format, parseISO, isValid } from 'date-fns';

const DateTimePicker = forwardRef(({
    label,
    value,
    onChange,
    showTime = true,
    error,
    required = false,
    className = '',
    placeholder = "Select date...",
    ...props
}, ref) => {

    // Parse the incoming value (ISO string or Date object) into a Date object
    const getSelectedDate = () => {
        if (!value) return null;
        if (value instanceof Date) return value;
        const parsed = parseISO(value);
        return isValid(parsed) ? parsed : null;
    };

    // Handle change: Convert Date object back to ISO string for parent compatibility
    const handleChange = (date) => {
        // Create a synthetic event to match standard input behavior if needed, 
        // or just pass the ISO string.
        // Existing inputs generated e.target.value as ISO string.
        // Let's emulate that structure.

        let isoString = '';
        if (date && isValid(date)) {
            // If showTime is false, we might want just YYYY-MM-DD, but standardizing on ISO is safer for backend using Date objects.
            // However, for native date input compatibility, datetime-local uses YYYY-MM-DDTHH:mm
            // Let's use standard ISO string.
            isoString = date.toISOString();
        }

        if (onChange) {
            onChange({
                target: {
                    value: isoString,
                    name: props.name
                }
            });
        }
    };

    return (
        <div className="form-control w-full">
            {label && (
                <label className="label">
                    <span className="label-text font-bold text-slate-700">
                        {label} {required && <span className="text-red-500">*</span>}
                    </span>
                </label>
            )}
            <div className={`w-full ${className}`}>
                <DatePicker
                    selected={getSelectedDate()}
                    onChange={handleChange}
                    showTimeSelect={showTime}
                    timeFormat="HH:mm"
                    timeIntervals={15}
                    dateFormat={showTime ? "MMMM d, yyyy h:mm aa" : "MMMM d, yyyy"}
                    className={`input w-full bg-white border border-slate-300 text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition-all ${error ? 'input-error' : ''}`}
                    placeholderText={placeholder}
                    wrapperClassName="w-full"
                    {...props}
                />
            </div>
            {error && (
                <label className="label">
                    <span className="label-text-alt text-red-500">{error}</span>
                </label>
            )}
        </div>
    );
});

DateTimePicker.displayName = 'DateTimePicker';

export default DateTimePicker;
