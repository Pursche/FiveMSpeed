/// <reference types="@citizenfx/client" />

interface NearMissRecord {
    vehicle: number;
    startTime: number;
}

let _speedTrapTriggered: boolean = false;
const TRIGGER_SPEED: number = 90;
const EXPLODE_SPEED: number = 80;

const SPEED_SCORE_MODIFIER: number = 3.5;

const NEAR_MISS_DISTANCE: number = 3.0;
const NEAR_MISS_COOLDOWN: number = 1000;
const NEAR_MISS_DELAY: number = 500;
const MOTORCYCLE_HIT_COOLDOWN: number = 1000;
const OBJECT_HIT_COOLDOWN: number = 1000;

// New constants for ped collisions
const HUMAN_HIT_COOLDOWN: number = 1000;
const ANIMAL_HIT_COOLDOWN: number = 1000;
const NEAR_MISS_SCORE: number = 250;
const MOTORCYCLE_HIT_SCORE: number = 500;
const OBJECT_HIT_SCORE: number = 10;
const HUMAN_HIT_SCORE: number = 500;
const ANIMAL_HIT_SCORE: number = 1000;
const OPPOSITE_DIRECTION_MULTIPLIER: number = 1.5;

const NEAR_MISS_LABEL: string = "Near Miss";
const NEAR_MISS_OPPOSITE_LABEL: string = "Near Miss (Opposite)";
const MOTORCYCLE_HIT_LABEL: string = "Motorcycle Hit";
const OBJECT_HIT_LABEL: string = "Object Hit";
const HUMAN_HIT_LABEL: string = "FATALITY";
const ANIMAL_HIT_LABEL: string = "Monster!";

let _nearMisses: NearMissRecord[] = [];
let _nearMissCooldown: Map<number, number> = new Map();
let _motorcycleHitCooldown: Map<number, number> = new Map();
let _objectHitCooldown: Map<number, number> = new Map();
// New cooldown maps for ped collisions
let _humanHitCooldown: Map<number, number> = new Map();
let _animalHitCooldown: Map<number, number> = new Map();

function GetVehicle(): number {
    const ped: number = GetPlayerPed(-1);
    return GetVehiclePedIsUsing(ped);
}

function GetSpeed(vehicle: number): number {
    const speed: number = GetEntitySpeed(vehicle);
    return (speed * 3.6);
}

let lastTime: number = 0.0;
setTick((): void => {
    const time: number = GetGameTimer();
    const deltaTime: number = (time - lastTime) * 0.001;

    const vehicle: number = GetVehicle();
    const speed: number = GetSpeed(vehicle);
    CheckSpeed(deltaTime, vehicle, speed);
    HandleCollisions(vehicle);
    DrawSpeed(speed);
    //DrawDebug(vehicle);

    lastTime = time;
});

function CheckSpeed(deltaTime: number, vehicle: number, speed: number): void {
    if (!_speedTrapTriggered && speed > TRIGGER_SPEED) {
        _speedTrapTriggered = true;
        exports.roadrage.DebugLog("You hear a click as the speed trap engages");
        emit("roadrage:SetSpeedTriggered");
        emit("roadrage:AddScore", 1000, "Bomb Active");
        PlaySoundFrontend(0, "ERROR", "HUD_FRONTEND_DEFAULT_SOUNDSET", false);
    }

    if (!_speedTrapTriggered) {
        return;
    }

    const speedDiff: number = speed - EXPLODE_SPEED;
    const score: number = speedDiff * SPEED_SCORE_MODIFIER * deltaTime;
    emit("roadrage:AddScore", score);

    if (speedDiff < 0.0) {
        NetworkRequestControlOfEntity(vehicle);
        SetEntityAsMissionEntity(vehicle, true, true);

        const ped: number = GetPlayerPed(-1);
        if (GetVehiclePedIsIn(ped, false) === vehicle) {
            TaskLeaveVehicle(ped, vehicle, 0);
        }

        setTimeout(() => {
            SetVehicleEngineHealth(vehicle, -4000);
            ExplodeVehicle(vehicle, true, false);

            const coords: number[] = GetEntityCoords(vehicle);
            AddExplosion(coords[0], coords[1], coords[2], 2, 1.0, true, false, 1.0);
            emit("roadrage:GameOver");
        }, 1000);

        _speedTrapTriggered = false;
    }
}

function DrawSpeed(speed: number): void {
    const speedText: string = `${speed.toFixed(0)} km/h`;
    
    SetTextFont(0);
    SetTextScale(0.5, 0.5);
    if (_speedTrapTriggered) {
        SetTextColour(139, 0, 0, 255);
    } else {
        SetTextColour(255, 255, 255, 255);
    }
    
    SetTextOutline();
    
    BeginTextCommandDisplayText("STRING");
    AddTextComponentSubstringPlayerName(speedText);
    EndTextCommandDisplayText(0.90, 0.90);
}

function DrawDebug(vehicle: number): void {
    const pos: number[] = GetEntityCoords(vehicle);
    const x: string = pos[0].toFixed(3);
    const y: string = pos[1].toFixed(3);
    const z: string = pos[2].toFixed(3);
    const heading: string = GetEntityHeading(vehicle).toFixed(2);

    const posText: string = `${x}\n ${y}\n ${z}\n ${heading}`;

    exports.roadrage.SetDefaultStyle();
    
    BeginTextCommandDisplayText("STRING");
    AddTextComponentSubstringPlayerName(posText);
    EndTextCommandDisplayText(0.90, 0.50);
}

function HandleCollisions(playerVehicle: number): void {
    if (!_speedTrapTriggered) {
        return;
    }

    const vehicles: number[] = GetGamePool("CVehicle");
    HandleMotorcycleHits(playerVehicle, vehicles);
    HandleNearMisses(playerVehicle, vehicles);

    const objects: number[] = GetGamePool("CObject");
    HandleObjectHits(playerVehicle, objects);

    // Handle collisions with peds (humans and animals)
    const peds: number[] = GetGamePool("CPed");
    HandlePedHits(playerVehicle, peds);
}

function HandleMotorcycleHits(playerVehicle: number, vehicles: number[]): void {
    const currentTime: number = GetGameTimer();

    for (const vehicle of vehicles) {
        if (vehicle !== playerVehicle && IsEntityTouchingEntity(playerVehicle, vehicle)) {
            if (IsThisModelABike(GetEntityModel(vehicle))) {
                if (!_motorcycleHitCooldown.has(vehicle) || (currentTime - _motorcycleHitCooldown.get(vehicle)!) > MOTORCYCLE_HIT_COOLDOWN) {
                    _motorcycleHitCooldown.set(vehicle, currentTime);
                    emit("roadrage:AddScore", MOTORCYCLE_HIT_SCORE, MOTORCYCLE_HIT_LABEL, 5.0, 1.0);
                }
            }
            _nearMisses = _nearMisses.filter(nm => nm.vehicle !== vehicle);
        }
    }
}

function HandleNearMisses(playerVehicle: number, vehicles: number[]): void {
    const playerCoords: number[] = GetEntityCoords(playerVehicle);
    const currentTime: number = GetGameTimer();

    for (const vehicle of vehicles) {
        if (vehicle !== playerVehicle) {
            const vehCoords: number[] = GetEntityCoords(vehicle);
            const distance: number = Vdist(
                playerCoords[0], playerCoords[1], playerCoords[2],
                vehCoords[0], vehCoords[1], vehCoords[2]
            );

            if (distance < NEAR_MISS_DISTANCE && _speedTrapTriggered) {
                if (!IsEntityTouchingEntity(playerVehicle, vehicle)) {
                    if (!_nearMissCooldown.has(vehicle) || (currentTime - _nearMissCooldown.get(vehicle)!) > NEAR_MISS_COOLDOWN) {
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

    _nearMisses = _nearMisses.filter(nm => {
        if ((currentTime - nm.startTime) >= NEAR_MISS_DELAY) {
            const playerVel: number[] = GetEntityVelocity(playerVehicle);
            const otherVel: number[] = GetEntityVelocity(nm.vehicle);
            const playerNorm: number[] = exports.roadrage.NormalizeVector(playerVel);
            const otherNorm: number[] = exports.roadrage.NormalizeVector(otherVel);
            const dot: number = exports.roadrage.DotProduct(playerNorm, otherNorm);

            let score: number = NEAR_MISS_SCORE;
            let label: string = NEAR_MISS_LABEL;
            if (dot < -0.5) {
                score *= OPPOSITE_DIRECTION_MULTIPLIER;
                label = NEAR_MISS_OPPOSITE_LABEL;
            }
            emit("roadrage:AddScore", score, label, 5.0, 3.0);
            return false;
        }
        return true;
    });
}

function HandleObjectHits(playerVehicle: number, objects: number[]): void {
    const currentTime: number = GetGameTimer();

    for (const object of objects) {
        if (IsEntityTouchingEntity(playerVehicle, object)) {
            if (!_objectHitCooldown.has(object) || (currentTime - _objectHitCooldown.get(object)!) > OBJECT_HIT_COOLDOWN) {
                _objectHitCooldown.set(object, currentTime);
                emit("roadrage:AddScore", OBJECT_HIT_SCORE, OBJECT_HIT_LABEL);
            }
        }
    }
}

function HandlePedHits(playerVehicle: number, peds: number[]): void {
    const currentTime: number = GetGameTimer();
    const playerPed = GetPlayerPed(-1);

    for (const ped of peds) {
        // Skip the player's own ped.
        if (ped === playerPed) continue;

        // Skip peds that are in a vehicle.
        if (IsPedInAnyVehicle(ped, false)) continue;

        if (IsEntityTouchingEntity(playerVehicle, ped)) {
            // Determine ped type using GetPedType.
            const pedType: number = GetPedType(ped);

            // Typically, pedType 28 is used for animals.
            if (pedType === 28) {
                // Handle animal hit.
                if (
                    !_animalHitCooldown.has(ped) ||
                    (currentTime - _animalHitCooldown.get(ped)!) > ANIMAL_HIT_COOLDOWN
                ) {
                    _animalHitCooldown.set(ped, currentTime);
                    emit("roadrage:AddScore", ANIMAL_HIT_SCORE, ANIMAL_HIT_LABEL);
                }
            } else {
                // Handle human hit.
                if (
                    !_humanHitCooldown.has(ped) ||
                    (currentTime - _humanHitCooldown.get(ped)!) > HUMAN_HIT_COOLDOWN
                ) {
                    _humanHitCooldown.set(ped, currentTime);
                    emit("roadrage:AddScore", HUMAN_HIT_SCORE, HUMAN_HIT_LABEL);
                }
            }
        }
    }
}
