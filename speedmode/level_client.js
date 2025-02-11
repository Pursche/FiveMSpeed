
let _level = 1;
let _xp = 0;
let _xpToNextLevel = 8000;

const CARS = [
    "Mesa",
    "Panto",
    "Habanero",
    "Stratum",
    "Sentinel",
    "Monroe",
    "Pariah"
]

exports('AddXP', (xp) => {
    _xp += xp;

    if (_xp >= _xpToNextLevel) {
        _level += 1;
        _xp -= _xpToNextLevel;
        _xpToNextLevel *= 1.8;
    }
});

setTick(() => {
    DrawLevel();
});

function SetLevelStyle() {
    // Set the text style
    SetTextFont(0);
    SetTextScale(0.7, 0.7);
    SetTextColour(255, 255, 255, 255);
    SetTextOutline();
};

function DrawXPBar(posX, posY, width, height) {
    let progress = _xp /_xpToNextLevel;

    // Background
    DrawRect(posX, posY, width, height, 100, 100, 100, 255);

    // Fill
    let fillWidth = width * progress;
    let fillPosX = posX - (width / 2) + (fillWidth / 2);
    DrawRect(fillPosX, posY, fillWidth, height, 200, 200, 200, 255);

    // Text
    exports.speedmode.SetDefaultStyle();
    const xpText = `${_xp.toFixed(0)} / ${_xpToNextLevel.toFixed(0)} XP`;
    exports.speedmode.DrawCenteredText(xpText, 0.5, posY-0.017);
}

function DrawLevel() {

    // Draw level text on the left
    SetLevelStyle();
    const levelText = `${_level.toFixed(0)}`;
    exports.speedmode.DrawCenteredText(levelText, 0.4, 0.03);

    DrawXPBar(0.5, 0.055, 0.18, 0.03);

    // Draw next level text on the right
    SetLevelStyle();
    const nextLevelText = `${(_level+1).toFixed(0)}`;
    exports.speedmode.DrawCenteredText(nextLevelText, 0.6, 0.03);

    // Draw car name under bar
    exports.speedmode.SetDefaultStyle();
    const carNameText = exports.speedmode.GetCarName();
    exports.speedmode.DrawCenteredText(carNameText, 0.5, 0.07);
}

exports('GetCarName', () => {
    let cappedLevel = Math.min(_level, CARS.length) - 1;
    return CARS[cappedLevel];
});