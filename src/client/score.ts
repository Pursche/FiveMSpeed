/// <reference types="@citizenfx/client" />

interface Notification {
    name: string;
    score: number;
    deleteTime: number;
    boost: number | null;
}

let _speedTriggered: boolean = false;
let _gameOver: boolean = false;
let _score: number = 0;
let _notifications: Notification[] = [];
let _nitroEnabled : boolean = false;
let _soundId: number | null = null;
const MAX_NOTIFICATIONS: number = 5;

on("roadrage:SetSpeedTriggered", (): void => {
    _speedTriggered = true;
    _gameOver = false;
    _score = 0;
});

on("roadrage:GameOver", (): void => {
    _gameOver = true;
    _speedTriggered = false;

    exports.roadrage.AddXP(_score);
    _notifications = [];
});

on("roadrage:AddScore", (score: number, name: string | null, seconds: number | null, boost: number | null): void => {
    _score += score;

    if (name !== null && typeof name === "string" && name.length > 0) {
        const notification: Notification = {
            name,
            score,
            deleteTime: GetGameTimer() + (seconds ?? 2) * 1000,
            boost
        };
        _notifications.push(notification);
    }
});

setTick((): void => {
    // Ensure the particle asset is loaded
    if (!HasNamedPtfxAssetLoaded("veh_xs_vehicle_mods")) {
        RequestNamedPtfxAsset("veh_xs_vehicle_mods");
    }

    HandleNotifications();
    if (_gameOver) {
        DrawGameOver();
    } else {
        DrawScore();
    }
});

function HandleNotifications(): void {
    const time: number = GetGameTimer();
    let boost: number = 1.0;

    for(let i = _notifications.length-1; i >= 0; i--) {
        const notification = _notifications[i];
        if (notification.boost !== null && typeof notification.boost === "number" && notification.boost > 0) {
            boost = Math.max(boost, notification.boost);
        }
        if (time > notification.deleteTime) {
            _notifications.splice(i, 1); // Remove at index
        }
    }

    const playerPed = PlayerPedId();
    const vehicle = GetVehiclePedIsIn(playerPed, false);
    if (boost > 1.0) {
        if (!_nitroEnabled) {
            SetVehicleNitroEnabled(vehicle, true);
            StartScreenEffect("TinyRacerIntroCam", 0, true);
            _soundId = GetSoundId();
            PlaySoundFromEntity(_soundId, "Woosh_01", vehicle, "FBI_HEIST_ELEVATOR_SHAFT_DEBRIS_SOUNDS", false, 0);
            _nitroEnabled = true;
        }
        SetVehicleCheatPowerIncrease(vehicle, boost);
        
    } else {
        if (_nitroEnabled) {
            SetVehicleNitroEnabled(vehicle, false);
            StopScreenEffect("TinyRacerIntroCam");
            StopSound(_soundId);
            ReleaseSoundId(_soundId);
            _nitroEnabled = false;
        }
    }
}

function DrawScore(): void {
    let scoreText: string = "Exceed 90km/h and maintain SPEED to score";

    if (_speedTriggered) {
        scoreText = `${_score.toFixed(0)}`;
    }

    exports.roadrage.SetDefaultStyle();

    let textPosY: number = 0.1;
    textPosY = exports.roadrage.DrawCenteredText(scoreText, 0.5, textPosY);

    // Draw notifications
    let notificationsShown: number = 0;
    for(const notification of _notifications) {
        if (notificationsShown >= MAX_NOTIFICATIONS) {  
            break;
        }
        const notificationText: string = `+${notification.score} ${notification.name}`;
        exports.roadrage.SetDefaultStyle();
        textPosY = exports.roadrage.DrawCenteredText(notificationText, 0.5, textPosY);
        notificationsShown++;
    }
}

function DrawGameOver(): void {
    exports.roadrage.SetDefaultStyle();

    let textPosY: number = 0.1;
    textPosY = exports.roadrage.DrawCenteredText("You dropped below 80km/h and exploded!", 0.5, textPosY);
    exports.roadrage.SetDefaultStyle();
    textPosY = exports.roadrage.DrawCenteredText(`Final Score: ${_score.toFixed(0)}`, 0.5, textPosY);
} 