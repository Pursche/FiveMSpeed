/// <reference types="@citizenfx/server" />

interface PlayerState {
    level: number;
    xp: number;
}

onNet("roadrage:save", (level: number, xp: number): void => {
    const src = source;
    const stateBag = Player(src).state;
    stateBag.set('roadrage', { level, xp }, true); // true makes it replicated to clients
    console.log(`Player ${src} saved their progress: level ${level}, xp ${xp}`);
});

onNet("roadrage:load", (): void => {
    const src = source;
    const stateBag = Player(src).state;
    const data = stateBag.roadrage as PlayerState ?? { level: 1, xp: 0 };
    emitNet("roadrage:onLoad", src, data.level, data.xp);
    console.log(`Player ${src} loaded their progress: level ${data.level}, xp ${data.xp}`);
});