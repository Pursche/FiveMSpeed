// Import types from CitizenFX
/// <reference types="@citizenfx/client" />

// We only need to define our custom interfaces
interface SpawnConfig {
  x: number;
  y: number;
  z: number;
  heading: number;
  model: string;
}

interface ChatMessage {
  args: string[];
}

const SPAWN_POS: [number, number, number] = [-2072.689, -361.769, 12.0];
const SPAWN_HEADING: number = 89.84;

// Try multiple events to see which ones fire
AddEventHandler('onClientResourceStart', (resourceName: string): void => {
    if (GetCurrentResourceName() !== resourceName) return;
    InitializeSpawn();
});

function InitializeSpawn(): void {
    exports.spawnmanager.setAutoSpawnCallback((): void => {
        exports.spawnmanager.spawnPlayer({
            x: SPAWN_POS[0],
            y: SPAWN_POS[1],
            z: SPAWN_POS[2],
            heading: SPAWN_HEADING,
            model: 'a_m_m_skater_01'
        }, () => {
            GiveCar();
            let player = GetPlayerPed();
            SetPlayerWantedLevel(player, 5, true);
        });
    });

    exports.spawnmanager.setAutoSpawn(true);
    exports.spawnmanager.forceRespawn();
}

const Delay = (ms: number): Promise<void> => new Promise(res => setTimeout(res, ms));

async function GiveCar(): Promise<void> {
    const model: string = exports.roadrage.GetCarName().toLowerCase();
    
    // Check if the model actually exists
    const hash: number = GetHashKey(model);
    if (!IsModelInCdimage(hash) || !IsModelAVehicle(hash)) {
        emit('chat:addMessage', {
            args: [`Tried and failed to spawn a ${model}`]
        } as ChatMessage);
        return;   
    }

    // Request the model and wait until the game has loaded it
    RequestModel(hash);
    while (!HasModelLoaded(hash)) {
        await Delay(500);
    }

    // Get the coordinates of the player
    const ped: number = PlayerPedId();
    const coords: number[] = GetEntityCoords(ped, true);

    // Create a vehicle at the player's position
    const vehicle: number = CreateVehicle(hash, coords[0], coords[1], coords[2], GetEntityHeading(ped), true, false);
    SetVehicleNumberPlateText(vehicle, "SPEED");
    SetVehicleMod(vehicle, 17, 1, false);
    FullyChargeNitrous(vehicle);
    SetVehicleUseHornButtonForNitrous(vehicle, true);

    // Set the player into the drivers seat of the vehicle
    SetPedIntoVehicle(ped, vehicle, -1);
    
    // Allow the game engine to clean up the vehicle and model if needed
    SetEntityAsNoLongerNeeded(vehicle);
    SetModelAsNoLongerNeeded(model);

    exports.roadrage.DebugLog('You are speed with nitrous!');
}

RegisterCommand('respawn', (source: number, args: string[], raw: string): void => {
    emit("roadrage:respawn");
}, false);

onNet("roadrage:respawn", (): void => {
    exports.spawnmanager.forceRespawn();
    exports.roadrage.DebugLog('Respawned!');
});
