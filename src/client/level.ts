/// <reference types="@citizenfx/client" />

let _level: number = 1;
let _xp: number = 0;
let _xpToNextLevel: number = 8000;

const XP_TABLE: number[] = [
    0,
    8000,
    16000,
    32000,
    64000,
    128000
];

const CARS: string[] = [
    "Mesa",
    "Panto",
    "Habanero",
    "Stratum",
    "Sentinel",
    "Monroe",
    "Pariah"
];

exports('AddXP', (xp: number): void => {
    _xp += xp;

    while (_xp >= _xpToNextLevel) {
        _level += 1;
        _xp -= _xpToNextLevel;
        _xpToNextLevel = XP_TABLE[_level];
    }
});

setTick((): void => {
    DrawLevel();
});

function SetLevelStyle(): void {
    SetTextFont(0);
    SetTextScale(0.7, 0.7);
    SetTextColour(255, 255, 255, 255);
    SetTextOutline();
}

function DrawXPBar(posX: number, posY: number, width: number, height: number): void {
    let progress: number = _xp / _xpToNextLevel;

    // Background
    DrawRect(posX, posY, width, height, 100, 100, 100, 255);

    // Fill
    let fillWidth: number = width * progress;
    let fillPosX: number = posX - (width / 2) + (fillWidth / 2);
    DrawRect(fillPosX, posY, fillWidth, height, 200, 200, 200, 255);

    // Text
    exports.roadrage.SetDefaultStyle();
    const xpText: string = `${_xp.toFixed(0)} / ${_xpToNextLevel.toFixed(0)} XP`;
    exports.roadrage.DrawCenteredText(xpText, 0.5, posY-0.017);
}

function DrawLevel(): void {
    // Draw level text on the left
    SetLevelStyle();
    const levelText: string = `${_level.toFixed(0)}`;
    exports.roadrage.DrawCenteredText(levelText, 0.4, 0.03);

    DrawXPBar(0.5, 0.055, 0.18, 0.03);

    // Draw next level text on the right
    SetLevelStyle();
    const nextLevelText: string = `${(_level+1).toFixed(0)}`;
    exports.roadrage.DrawCenteredText(nextLevelText, 0.6, 0.03);

    // Draw car name under bar
    exports.roadrage.SetDefaultStyle();
    const carNameText: string = exports.roadrage.GetCarName();
    exports.roadrage.DrawCenteredText(carNameText, 0.5, 0.07);
}

exports('GetCarName', (): string => {
    let cappedLevel: number = Math.min(_level, CARS.length) - 1;
    return CARS[cappedLevel];
});

onNet("roadrage:onLoad", (level: number, xp: number) => {
    _level = level;
    _xp = xp;
    _xpToNextLevel = XP_TABLE[_level];
    exports.roadrage.DebugLog(`Loaded level: ${_level}, xp: ${_xp}`);
    emit("roadrage:respawn");
});

RegisterCommand('save', (source: number, args: string[], raw: string): void => {
    emitNet("roadrage:save", _level, _xp);
    exports.roadrage.DebugLog(`Saving level: ${_level}, xp: ${_xp}`);
}, false);

RegisterCommand('load', (source: number, args: string[], raw: string): void => {
    emitNet("roadrage:load");
    exports.roadrage.DebugLog(`Loading level`);
}, false);

// Listen for state changes
AddStateBagChangeHandler('roadrage', `player:${GetPlayerServerId(PlayerId())}`, (bagName: string, key: string, value: any, reserved: number, replicated: boolean) => {
    if (value) {
        const { level, xp } = value;
        // Update your UI or handle the new values
        exports.roadrage.DebugLog(`Level: ${level}, XP: ${xp}`);
    }
});