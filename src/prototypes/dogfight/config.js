// All primary encounter tuning lives here. Units: meters, seconds, radians.
export const CONFIG = {
  flight: { minSpeed: 26, cruiseSpeed: 54, maxSpeed: 88, throttleRate: 22, acceleration: 36, turnRate: 1.28, pitchRate: 1.05, steeringResponse: 6.5, bankAngle: 1.02, bankResponse: 5, momentumResponse: 5.5 },
  boost: { speed: 148, capacity: 4.5, rechargeRate: .58, rechargeDelay: 1.3, restartThreshold: .9 },
  evasion: { capacity: 100, rollCost: 40, breakCost: 25, rechargeRate: 18, rechargeDelay: 1.8 },
  roll: { duration: 1.05, radius: 2.6, cooldown: .35 },
  breakTurn: { duration: .85, cooldown: .5, turnMultiplier: 2.3, speedFactor: .7, bankAngle: 1.45, steeringResponse: 12, deceleration: 90, momentumResponse: 9 },
  aim: { speed: .9, horizontalLimit: 1, verticalLimit: 1, distance: 450 },
  camera: { distance: 11.5, height: 4.2, lookAhead: 42, lookHeight: 1.4, followResponse: 9, aimResponse: 11, fov: 61, fastFov: 66, boostFov: 74, fastSetback: .8, boostSetback: 2, zoomFov: 40, zoomResponse: 7 },
  dragon: { wingEnergy: 100, hitRadius: 3.3, invulnerability: .65 },
  weapon: { interval: .19, damage: 8, projectileSpeed: 330, lifetime: 2.5, hitRadius: 3.3, assistAngle: .135, assistRange: 650, assistStrength: .82 },
  enemy: { count: 3, health: 216, turnRate: 1.45, hitRadius: 5, damage: 7, projectileSpeed: 210, projectileLife: 4.8, fireInterval: 4.4, fireRange: 650,
    stationSpeed: 20, stationGain: .45, stationResponse: 2.8, stationAcceleration: 24, avoidRadius: 220, minSeparation: 150, strafeWidth: 28, strafeHeight: 12,
    burstCount: 3, burstSpacing: .14, trackingAcquire: 1.15, trackingLose: 2.2, trackingHoldoff: 1.2, fireTelegraph: .75 },
  visuals: { maxPixelRatio: 1.6, exposure: 1.1, sceneSamples: 2 }
};
