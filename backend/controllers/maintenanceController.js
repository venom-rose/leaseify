// backend/controllers/maintenanceController.js - Predictive Maintenance & Telemetry Intelligence
const { db } = require('../config/database');

function getPredictiveMaintenanceSuggestions() {
  const products = db.prepare('SELECT * FROM products').all();

  const results = products.map(p => {
    // Fetch or initialize telemetry record
    let tel = db.prepare('SELECT * FROM vehicle_telemetry WHERE product_id = ?').get(p.id);
    if (!tel) {
      // Deterministic fallback based on product ID to simulate realistic supercars
      const baseKm = 8000 + (p.id * 3420);
      const brakeWear = Math.min(88, 15 + (p.id * 11) % 75);
      const tireTread = Math.max(2.1, 7.5 - ((p.id * 0.9) % 5.0));
      const oilLife = Math.max(12, 95 - ((p.id * 14) % 80));

      db.prepare(`
        INSERT INTO vehicle_telemetry (product_id, odometer_km, engine_hours, tire_tread_depth_mm, brake_pad_wear_pct, oil_life_pct, last_service_date)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(p.id, baseKm, Math.round(baseKm / 35), tireTread, brakeWear, oilLife, '2026-06-15');

      tel = db.prepare('SELECT * FROM vehicle_telemetry WHERE product_id = ?').get(p.id);
    }

    // Inspection & Repair history
    const openRepairsRow = db.prepare("SELECT COUNT(*) as count FROM repair_orders WHERE product_id = ? AND status != 'COMPLETED'").get(p.id);
    const openRepairs = openRepairsRow ? openRepairsRow.count : 0;

    const severeInspectionsRow = db.prepare(`
      SELECT COUNT(*) as count
      FROM return_inspections ri
      JOIN rentals r ON ri.rental_id = r.id
      WHERE r.product_id = ? AND ri.requires_repair = 1
    `).get(p.id);
    const severeInspections = severeInspectionsRow ? severeInspectionsRow.count : 0;


    // Calculate Risk Rating & Score
    let riskPoints = 0;
    const recommendations = [];

    if (tel.brake_pad_wear_pct >= 75) {
      riskPoints += 40;
      recommendations.push(`Replace Brembo Carbon-Ceramic Brake Pads (${tel.brake_pad_wear_pct}% Worn)`);
    } else if (tel.brake_pad_wear_pct >= 55) {
      riskPoints += 20;
      recommendations.push(`Inspect Ceramic Brake Rotors & Caliper Fluid (${tel.brake_pad_wear_pct}% Worn)`);
    }

    if (tel.tire_tread_depth_mm <= 3.0) {
      riskPoints += 45;
      recommendations.push(`CRITICAL: Replace Pirelli P-Zero / Michelin Pilot Sport Cup Tires (${tel.tire_tread_depth_mm}mm Tread)`);
    } else if (tel.tire_tread_depth_mm <= 4.2) {
      riskPoints += 20;
      recommendations.push(`Schedule High-Speed Wheel Balancing & Alignment (${tel.tire_tread_depth_mm}mm Tread)`);
    }

    if (tel.oil_life_pct <= 20) {
      riskPoints += 30;
      recommendations.push(`Flush Synthetic Racing Oil & Filter Service (${tel.oil_life_pct}% Life Remaining)`);
    }

    if (severeInspections > 0) {
      riskPoints += 15 * severeInspections;
      recommendations.push(`Inspect Structural Carbon Chassis & Splitters (${severeInspections} Recorded Damage Incident(s))`);
    }

    if (tel.odometer_km > 20000) {
      riskPoints += 15;
      recommendations.push(`Perform Major 20,000 km Transmission & Twin-Turbo Service`);
    }

    let riskLevel = 'OPTIMAL';
    let riskBadgeClass = 'badge-emerald';
    if (riskPoints >= 50 || tel.tire_tread_depth_mm <= 3.0 || openRepairs > 0) {
      riskLevel = 'CRITICAL';
      riskBadgeClass = 'badge-rose';
    } else if (riskPoints >= 25) {
      riskLevel = 'ELEVATED';
      riskBadgeClass = 'badge-amber';
    }

    if (recommendations.length === 0) {
      recommendations.push('Routine Fleet Inspection (All Systems Nominal)');
    }

    return {
      product_id: p.id,
      product_name: p.name,
      product_brand: p.brand,
      product_image: p.image,
      product_serial: p.serial_number || `VIN-VEH-${p.id}`,
      condition_status: p.condition_status,
      odometer_km: tel.odometer_km,
      engine_hours: tel.engine_hours,
      tire_tread_depth_mm: tel.tire_tread_depth_mm,
      brake_pad_wear_pct: tel.brake_pad_wear_pct,
      oil_life_pct: tel.oil_life_pct,
      last_service_date: tel.last_service_date || '2026-06-15',
      open_repairs: openRepairs,
      risk_score: Math.min(100, riskPoints),
      risk_level: riskLevel,
      risk_badge_class: riskBadgeClass,
      recommended_service: recommendations[0],
      all_recommendations: recommendations,
      estimated_service_cost: riskLevel === 'CRITICAL' ? 2450.0 : (riskLevel === 'ELEVATED' ? 850.0 : 350.0)
    };
  });

  const criticalCount = results.filter(r => r.risk_level === 'CRITICAL').length;
  const elevatedCount = results.filter(r => r.risk_level === 'ELEVATED').length;
  const optimalCount = results.filter(r => r.risk_level === 'OPTIMAL').length;

  return {
    status: 200,
    data: {
      summary: {
        total_vehicles: results.length,
        critical_risk: criticalCount,
        elevated_risk: elevatedCount,
        optimal_health: optimalCount
      },
      suggestions: results.sort((a, b) => b.risk_score - a.risk_score)
    }
  };
}

function updateVehicleTelemetry(productId, data) {
  const existing = db.prepare('SELECT id FROM vehicle_telemetry WHERE product_id = ?').get(productId);

  if (existing) {
    db.prepare(`
      UPDATE vehicle_telemetry
      SET odometer_km = COALESCE(?, odometer_km),
          engine_hours = COALESCE(?, engine_hours),
          tire_tread_depth_mm = COALESCE(?, tire_tread_depth_mm),
          brake_pad_wear_pct = COALESCE(?, brake_pad_wear_pct),
          oil_life_pct = COALESCE(?, oil_life_pct),
          last_service_date = COALESCE(?, last_service_date),
          updated_at = CURRENT_TIMESTAMP
      WHERE product_id = ?
    `).run(data.odometer_km, data.engine_hours, data.tire_tread_depth_mm, data.brake_pad_wear_pct, data.oil_life_pct, data.last_service_date, productId);
  } else {
    db.prepare(`
      INSERT INTO vehicle_telemetry (product_id, odometer_km, engine_hours, tire_tread_depth_mm, brake_pad_wear_pct, oil_life_pct, last_service_date)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(productId, data.odometer_km || 12000, data.engine_hours || 350, data.tire_tread_depth_mm || 6.0, data.brake_pad_wear_pct || 20, data.oil_life_pct || 85, data.last_service_date || '2026-07-01');
  }

  return {
    status: 200,
    data: { message: `Telemetry updated for product #${productId}` }
  };
}

module.exports = {
  getPredictiveMaintenanceSuggestions,
  updateVehicleTelemetry
};
