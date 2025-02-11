const SPAWN_POS = [-2072.689, -361.769, 12.0];
const SPAWN_HEADING = 89.84;

on('onClientGameTypeStart', () => {
  exports.spawnmanager.setAutoSpawnCallback(() => {
    exports.spawnmanager.spawnPlayer({
      x: SPAWN_POS[0],
      y: SPAWN_POS[1],
      z: SPAWN_POS[2],
      heading: SPAWN_HEADING,
      model: 'a_m_m_skater_01'
    }, () => {
     GiveCar();
    });
  });

  exports.spawnmanager.setAutoSpawn(true);
  exports.spawnmanager.forceRespawn();
});

Delay = (ms) => new Promise(res => setTimeout(res, ms));

async function GiveCar() {
  let model = exports.speedmode.GetCarName().toLowerCase();
  
  // Check if the model actually exists
  const hash = GetHashKey(model);
  if (!IsModelInCdimage(hash) || !IsModelAVehicle(hash))
  {
    emit('chat:addMessage', {
      args: [`Tried and failed to spawn a ${model}`]
    });
    return;   
  }

  // Request the model and wait until the game has loaded it
  RequestModel(hash);
  while (!HasModelLoaded(hash))
  {
    await Delay(500);
  }

  // Get the coordinates of the player
  const ped = PlayerPedId();
  const coords = GetEntityCoords(ped);

  // Create a vehicle at the player's position
  const vehicle = CreateVehicle(hash, coords[0], coords[1], coords[2], GetEntityHeading(ped), true, false);
  SetVehicleNumberPlateText(vehicle, "SPEED");

  // Set the player into the drivers seat of the vehicle
  SetPedIntoVehicle(ped, vehicle, -1);
  
  // Allow the game engine to clean up the vehicle and model if needed
  SetEntityAsNoLongerNeeded(vehicle);
  SetModelAsNoLongerNeeded(model);

  exports.speedmode.DebugLog('You are speed!');
}

RegisterCommand('respawn', (source, args, raw) => {
  exports.spawnmanager.forceRespawn();
}, false);