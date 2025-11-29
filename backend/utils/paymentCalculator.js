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
 * 
 * Pricing Assumptions:
 * - Base fee: $500 per week
 * - Location tiers:
 *   - Premium (ZB): +25% (high-traffic areas)
 *   - Standard (ZA): Base rate
 *   - Economy (ZC): -15% (less visible areas)
 *   - Outdoor: -20% (outdoor spaces)
 */
function calculateBoothFee(application, event) {
  const durationWeeks = application.setupDurationWeeks || 1;
  const location = application.setupLocation || event.location || 'default';
  
  // Base fee per week
  const baseFeePerWeek = 500; // $500 per week
  
  // Location multipliers (more comprehensive)
  const locationMultipliers = {
    'ZB': 1.25,   // Premium location (25% more) - high-traffic areas
    'ZA': 1.0,    // Standard location (base rate)
    'ZC': 0.85,   // Economy location (15% less) - less visible areas
    'OUTDOOR': 0.8, // Outdoor location (20% less)
    'default': 1.0
  };
  
  // Extract location prefix (e.g., "ZB-04" -> "ZB")
  // Also check for "outdoor" in location name
  const locationUpper = location.toUpperCase();
  let multiplier = locationMultipliers['default'];
  
  if (locationUpper.includes('OUTDOOR')) {
    multiplier = locationMultipliers['OUTDOOR'];
  } else {
    const locationPrefix = location.split('-')[0].toUpperCase();
    multiplier = locationMultipliers[locationPrefix] || locationMultipliers['default'];
  }
  
  // Calculate fee: base fee * duration * location multiplier
  const fee = baseFeePerWeek * durationWeeks * multiplier;
  
  return Math.round(fee * 100) / 100; // Round to 2 decimal places
}

/**
 * Calculate fee for Bazaar events
 * Based on location and booth size
 * 
 * Pricing Assumptions:
 * - 2x2 booth: $350 base fee
 * - 4x4 booth: $700 base fee (double the 2x2)
 * - Location tiers:
 *   - Main Hall/Central: +35% (premium high-traffic)
 *   - Exhibition Area: +15% (standard premium)
 *   - Standard: Base rate
 *   - Outdoor/Peripheral: -25% (economy)
 */
function calculateBazaarFee(application, event) {
  const boothSize = application.boothSize || '2x2';
  const location = event.location || 'default';
  
  // Base fees by booth size
  const boothSizeFees = {
    '2x2': 350,  // $350 for 2x2 booth
    '4x4': 700   // $700 for 4x4 booth (double the 2x2)
  };
  
  // Location multipliers (more comprehensive)
  const locationMultipliers = {
    'Main Hall': 1.35,           // Premium location (35% more) - central, high-traffic
    'Central': 1.35,             // Same as Main Hall
    'Exhibition Area': 1.15,      // Standard premium (15% more)
    'Exhibition': 1.15,          // Same as Exhibition Area
    'Outdoor': 0.75,             // Economy location (25% less)
    'Outdoor Area': 0.75,        // Same as Outdoor
    'Peripheral': 0.75,         // Same as Outdoor
    'default': 1.0              // Standard location (base rate)
  };
  
  // Find matching location multiplier (case-insensitive partial match)
  let multiplier = locationMultipliers['default'];
  const locationLower = location.toLowerCase();
  
  for (const [key, value] of Object.entries(locationMultipliers)) {
    if (key !== 'default' && locationLower.includes(key.toLowerCase())) {
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


