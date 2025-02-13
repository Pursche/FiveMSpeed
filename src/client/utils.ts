/// <reference types="@citizenfx/client" />

exports('DebugLog', (message: string): void => {
    emit("chat:addMessage", {
        args: [message]
    });
});

exports('SetDefaultStyle', (): void => {
    // Set the text style
    SetTextFont(0);
    SetTextScale(0.5, 0.5);
    SetTextColour(255, 255, 255, 255);
    SetTextOutline();
});

exports('DrawText', (string: string, textPosX: number, textPosY: number): void => {
    BeginTextCommandDisplayText("STRING");
    AddTextComponentSubstringPlayerName(string);
    EndTextCommandDisplayText(textPosX, textPosY);
});

exports('DrawCenteredText', (string: string, textPosX: number, textPosY: number): number => {
    // Calculate text width
    BeginTextCommandGetWidth("STRING");
    AddTextComponentSubstringPlayerName(string);
    const width: number = EndTextCommandGetWidth(1);
    textPosX = textPosX - (width * 0.5);

    exports.roadrage.DrawText(string, textPosX, textPosY);

    return textPosY + 0.025;
});

exports('NormalizeVector', (vec: [number, number, number]): [number, number, number] => {
    const [x, y, z] = vec;
    const mag: number = Math.sqrt(x * x + y * y + z * z);
    if (mag === 0) return [0, 0, 0];
    return [x / mag, y / mag, z / mag];
});

exports('DotProduct', (vec1: [number, number, number], vec2: [number, number, number]): number => {
    return vec1[0] * vec2[0] + vec1[1] * vec2[1] + vec1[2] * vec2[2];
}); 