
exports('DebugLog', (message) => {
    emit("chat:addMessage", {
        args: [message]
    });
});

exports('SetDefaultStyle', () => {
    // Set the text style
    SetTextFont(0);
    SetTextScale(0.5, 0.5);
    SetTextColour(255, 255, 255, 255);
    SetTextOutline();
});

exports('DrawText', (string, textPosX, textPosY) => {
    BeginTextCommandDisplayText("STRING");
    AddTextComponentSubstringPlayerName(string);
    EndTextCommandDisplayText(textPosX, textPosY);
});

exports('DrawCenteredText', (string, textPosX, textPosY) => {
    // Calculate text width
    BeginTextCommandGetWidth("STRING");
    AddTextComponentSubstringPlayerName(string);
    let width = EndTextCommandGetWidth(1);
    textPosX = textPosX - (width * 0.5);

    exports.speedmode.DrawText(string, textPosX, textPosY);

    return textPosY + 0.025;
});

exports('NormalizeVector', (vec) => {
    const [x, y, z] = vec;
    const mag = Math.sqrt(x * x + y * y + z * z);
    if (mag === 0) return [0, 0, 0];
    return [x / mag, y / mag, z / mag];
});

exports('DotProduct', (vec1, vec2) => {
    return vec1[0] * vec2[0] + vec1[1] * vec2[1] + vec1[2] * vec2[2];
});