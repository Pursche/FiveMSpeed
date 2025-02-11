
let _speedTrapTriggered = false;
const TRIGGER_SPEED = 90;
const EXPLODE_SPEED = 80;

const SPEED_SCORE_MODIFIER = 3.5;

const NEAR_MISS_DISTANCE = 3.0; // distance in meters to consider a near miss
const NEAR_MISS_COOLDOWN = 1000;     // cooldown in milliseconds per vehicle for near misses
const NEAR_MISS_DELAY = 500;     // delay (in ms) before awarding the near miss bonus
const MOTORCYCLE_HIT_COOLDOWN = 1000; // cooldown for awarding motorcycle hit bonus
const OBJECT_HIT_COOLDOWN = 1000;     // cooldown for awarding object hit bonus

const NEAR_MISS_SCORE = 250;
const MOTORCYCLE_HIT_SCORE = 500;
const OBJECT_HIT_SCORE = 10;
const OPPOSITE_DIRECTION_MULTIPLIER = 1.5;

const NEAR_MISS_LABEL = "Near Miss";
const NEAR_MISS_OPPOSITE_LABEL = "Near Miss (Opposite)";
const MOTORCYCLE_HIT_LABEL = "Motorcycle Hit";
const OBJECT_HIT_LABEL = "Object Hit";

let _nearMisses = [];  // Array to track active near miss records
let _nearMissCooldown = new Map();      // Map to track near miss cooldowns keyed by vehicle
let _motorcycleHitCooldown = new Map();   // Map to track motorcycle hit cooldowns keyed by vehicle
let _objectHitCooldown = new Map();       // Map to track object hit cooldowns keyed by object

function GetVehicle() {
    let ped = GetPlayerPed(-1);
    return GetVehiclePedIsUsing(ped);
}

function GetSpeed(vehicle) {
    let speed = GetEntitySpeed(vehicle);
    return (speed * 3.6);
}

let lastTime = 0.0;
setTick(() => {
    const time = GetGameTimer();
    const deltaTime = (time - lastTime) * 0.001; // Converting from milliseconds to seconds

    const vehicle = GetVehicle();
    const speed = GetSpeed(vehicle);
    CheckSpeed(deltaTime, vehicle, speed);
    HandleCollisions(vehicle);
    DrawSpeed(speed);
    //DrawDebug(vehicle);

    lastTime = time;
});

function CheckSpeed(deltaTime, vehicle, speed) {
    if (!_speedTrapTriggered && speed > TRIGGER_SPEED) {
        _speedTrapTriggered = true;
        exports.speedmode.DebugLog("You hear a click as the speed trap engages");
        emit("speedmode:SetSpeedTriggered");
        emit("speedmode:AddScore", 1000, "Bomb Active");
        PlaySoundFrontend(0, "ERROR", "HUD_FRONTEND_DEFAULT_SOUNDSET", false);
    }

    if (!_speedTrapTriggered) {
        return;
    }

    const speedDiff = speed - EXPLODE_SPEED;
    const score = speedDiff * SPEED_SCORE_MODIFIER * deltaTime;
    emit("speedmode:AddScore", score);

    if (speedDiff < 0.0) {
        // Request control and mark the vehicle as a mission entity
        NetworkRequestControlOfEntity(vehicle);
        SetEntityAsMissionEntity(vehicle, true, true);

        // If the player is still in the vehicle, make them leave it.
        let ped = GetPlayerPed(-1);
        if (GetVehiclePedIsIn(ped, false) === vehicle) {
            TaskLeaveVehicle(ped, vehicle, 0);
        }

        // After a delay, force the vehicle to "die"
        setTimeout(() => {
            // Even with control, some vehicles won't visibly explode
            // unless their engine health is very low.
            SetVehicleEngineHealth(vehicle, -4000);
            ExplodeVehicle(vehicle, true, false);

            // Alternative: If ExplodeVehicle still doesn't show an effect,
            // you can create an explosion at the vehicle's location:
            let coords = GetEntityCoords(vehicle);
            AddExplosion(coords[0], coords[1], coords[2], 2, 1.0, true, false, 1.0);
            emit("speedmode:GameOver");
        }, 1000);

        _speedTrapTriggered = false;
    }
}

function DrawSpeed(speed) {
    const speedText = `${speed.toFixed(0)} km/h`;
    
    // Set the text style
    SetTextFont(0);
    SetTextScale(0.5, 0.5);
    if (_speedTrapTriggered) {
        SetTextColour(139, 0, 0, 255);
    } else {
        SetTextColour(255, 255, 255, 255);
    }
    
    SetTextOutline();
    
    // Begin drawing the text
    BeginTextCommandDisplayText("STRING");
    AddTextComponentSubstringPlayerName(speedText);
    
    // Position the text on screen (0.05, 0.95) is near the bottom left; adjust as needed.
    EndTextCommandDisplayText(0.90, 0.90);
}

function DrawDebug(vehicle) {
    const pos = GetEntityCoords(vehicle);
    const x = pos[0].toFixed(3);
    const y = pos[1].toFixed(3);
    const z = pos[2].toFixed(3);
    const heading = GetEntityHeading(vehicle).toFixed(2);

    const posText = `${x}\n ${y}\n ${z}\n ${heading}`;

    exports.speedmode.SetDefaultStyle();
    
    // Begin drawing the text
    BeginTextCommandDisplayText("STRING");
    AddTextComponentSubstringPlayerName(posText);
    
    // Position the text on screen (0.05, 0.95) is near the bottom left; adjust as needed.
    EndTextCommandDisplayText(0.90, 0.50);
}

function HandleCollisions(playerVehicle) {
    if (!_speedTrapTriggered) {
        return;
    }

    const vehicles = GetGamePool("CVehicle");
    HandleMotorcycleHits(playerVehicle, vehicles);
    Handle_nearMisses(playerVehicle, vehicles);

    // Process collisions with world objects like lamp posts, signs, cones, etc.
    const objects = GetGamePool("CObject");
    HandleObjectHits(playerVehicle, objects);
}

function HandleMotorcycleHits(playerVehicle, vehicles) {
    const currentTime = GetGameTimer();

    for (const vehicle of vehicles) {
        if (vehicle !== playerVehicle && IsEntityTouchingEntity(playerVehicle, vehicle)) {
            if (IsThisModelABike(GetEntityModel(vehicle))) {
                if (!_motorcycleHitCooldown.has(vehicle) || (currentTime - _motorcycleHitCooldown.get(vehicle)) > MOTORCYCLE_HIT_COOLDOWN) {
                    _motorcycleHitCooldown.set(vehicle, currentTime);
                    emit("speedmode:AddScore", MOTORCYCLE_HIT_SCORE, MOTORCYCLE_HIT_LABEL);
                }
            }
            // Remove any near miss record when a collision occurs with a vehicle
            _nearMisses = _nearMisses.filter(nm => nm.vehicle !== vehicle);
        }
    }
}

function Handle_nearMisses(playerVehicle, vehicles) {
    const playerCoords = GetEntityCoords(playerVehicle);
    const currentTime = GetGameTimer();

    for (const vehicle of vehicles) {
        if (vehicle !== playerVehicle) {
            const vehCoords = GetEntityCoords(vehicle);
            const distance = Vdist(
                playerCoords[0], playerCoords[1], playerCoords[2],
                vehCoords[0], vehCoords[1], vehCoords[2]
            );

            if (distance < NEAR_MISS_DISTANCE && _speedTrapTriggered) {
                if (!IsEntityTouchingEntity(playerVehicle, vehicle)) {
                    if (!_nearMissCooldown.has(vehicle) || (currentTime - _nearMissCooldown.get(vehicle)) > NEAR_MISS_COOLDOWN) {
                        _nearMissCooldown.set(vehicle, currentTime);
                        if (!_nearMisses.find(nm => nm.vehicle === vehicle)) {
                            _nearMisses.push({
                                vehicle: vehicle,
                                startTime: currentTime
                            });
                        }
                    }
                }
            }
        }
    }

    // Award near miss bonus if the record survives for the specified delay
    _nearMisses = _nearMisses.filter(nm => {
        if ((currentTime - nm.startTime) >= NEAR_MISS_DELAY) {
            // Check if the vehicles are traveling roughly in opposite directions
            const playerVel = GetEntityVelocity(playerVehicle);
            const otherVel = GetEntityVelocity(nm.vehicle);
            const playerNorm = exports.speedmode.NormalizeVector(playerVel);
            const otherNorm = exports.speedmode.NormalizeVector(otherVel);
            const dot = exports.speedmode.DotProduct(playerNorm, otherNorm);

            let score = NEAR_MISS_SCORE;
            let label = NEAR_MISS_LABEL;
            if (dot < -0.5) {
                score *= OPPOSITE_DIRECTION_MULTIPLIER;
                label = NEAR_MISS_OPPOSITE_LABEL;
            }
            emit("speedmode:AddScore", score, label);
            return false; // Remove the record after awarding bonus
        }
        return true;
    });
}

function HandleObjectHits(playerVehicle, objects) {
    const currentTime = GetGameTimer();

    for (const object of objects) {
        if (IsEntityTouchingEntity(playerVehicle, object)) {
            if (!_objectHitCooldown.has(object) || (currentTime - _objectHitCooldown.get(object)) > OBJECT_HIT_COOLDOWN) {
                _objectHitCooldown.set(object, currentTime);
                emit("speedmode:AddScore", OBJECT_HIT_SCORE, OBJECT_HIT_LABEL);
            }
        }
    }
}