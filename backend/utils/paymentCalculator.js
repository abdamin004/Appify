/**
 * Calculate participation fee for vendor applications
 * 
 * For Booth: Based on duration (setupDurationWeeks) and location (setupLocation)
 * For Bazaar: Based on location and booth size
 */

/**
 * Calculate participation fee for a vendor application
 * @param {Object} application - VendorApplication document
 * @param {Object} event - Event document (Bazaar or Booth)
 * @returns {Number} - Calculated participation fee
 */
function calculateParticipationFee(application, event) {
  if (!application || !event) {
    return 0;
  }

  const eventType = event.type;
  
  if (eventType === 'Booth') {
    return calculateBoothFee(application, event);
  } else if (eventType === 'Bazaar') {
    return calculateBazaarFee(application, event);
  }
  
  return 0;
}

/**
 * Calculate fee for Booth events
 * Based on setupDurationWeeks and setupLocation
 */
function calculateBoothFee(application, event) {
  const durationWeeks = application.setupDurationWeeks || 1;
  const location = application.setupLocation || event.location || 'default';
  
  // Base fee per week
  const baseFeePerWeek = 500; // $500 per week
  
  // Location multipliers
  const locationMultipliers = {
    'ZA': 1.0,   // Standard location
    'ZB': 1.2,   // Premium location (20% more)
    'ZC': 0.9,   // Economy location (10% less)
    'default': 1.0
  };
  
  // Extract location prefix (e.g., "ZB-04" -> "ZB")
  const locationPrefix = location.split('-')[0].toUpperCase();
  const multiplier = locationMultipliers[locationPrefix] || locationMultipliers['default'];
  
  // Calculate fee: base fee * duration * location multiplier
  const fee = baseFeePerWeek * durationWeeks * multiplier;
  
  return Math.round(fee * 100) / 100; // Round to 2 decimal places
}

/**
 * Calculate fee for Bazaar events
 * Based on location and booth size
 */
function calculateBazaarFee(application, event) {
  const boothSize = application.boothSize || '2x2';
  const location = event.location || 'default';
  
  // Base fees by booth size
  const boothSizeFees = {
    '2x2': 300,  // $300 for 2x2 booth
    '4x4': 600   // $600 for 4x4 booth
  };
  
  // Location multipliers
  const locationMultipliers = {
    'Main Hall': 1.3,      // Premium location (30% more)
    'Exhibition Area': 1.1, // Standard premium (10% more)
    'Outdoor Area': 0.8,   // Economy location (20% less)
    'default': 1.0
  };
  
  // Find matching location multiplier (case-insensitive partial match)
  let multiplier = locationMultipliers['default'];
  for (const [key, value] of Object.entries(locationMultipliers)) {
    if (key !== 'default' && location.toLowerCase().includes(key.toLowerCase())) {
      multiplier = value;
      break;
    }
  }
  
  // Calculate fee: base fee * location multiplier
  const baseFee = boothSizeFees[boothSize] || boothSizeFees['2x2'];
  const fee = baseFee * multiplier;
  
  return Math.round(fee * 100) / 100; // Round to 2 decimal places
}

module.exports = {
  calculateParticipationFee,
  calculateBoothFee,
  calculateBazaarFee
};


