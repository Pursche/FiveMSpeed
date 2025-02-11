
let _speedTriggered = false;
let _gameOver = false;
let _score = 0;
let _notifications = [];

on("speedmode:SetSpeedTriggered", () => {
    _speedTriggered = true;
    _showScore = false;
    _gameOver = false;
    _score = 0;
});

on("speedmode:GameOver", () => {
    _gameOver = true;
    _speedTriggered = false;

    exports.speedmode.AddXP(_score);
    _notifications = [];
});

on("speedmode:AddScore", (score, name, seconds) => {
    _score += score;

    if (name !== null && typeof name === "string" && name.length > 0) {
        let notification = {};
        notification.name = name;
        notification.score = score;
        
        let secondsToDisplay = 2;
        if (seconds !== null && typeof seconds === "number") {
            secondsToDisplay = seconds;
        }

        notification.deleteTime = GetGameTimer() + secondsToDisplay * 1000;
        _notifications.push(notification);
    }
});

setTick(() => {
    HandleNotifications();
    if (_gameOver) {
        DrawGameOver();
    } else {
        DrawScore();
    }
});

function HandleNotifications() {
    const time = GetGameTimer();

    for(let i = _notifications.length-1; i >= 0; i--)
    {
        const notification = _notifications[i];
        if (time > notification.deleteTime)
        {
            _notifications.splice(i, 1); // Remove at index
        }
    }
}

function DrawScore() {
    let scoreText = "Exceed 90km/h and maintain SPEED to score";

    if (_speedTriggered) {
        scoreText = `${_score.toFixed(0)}`;
    }

    exports.speedmode.SetDefaultStyle();

    let textPosY = 0.1;
    textPosY = exports.speedmode.DrawCenteredText(scoreText, 0.5, textPosY);

    // Draw notifications
    for(let i = 0; i < _notifications.length; i++)
    {
        const notification = _notifications[i];
        const notificationText = `+${notification.score} ${notification.name}`;

        exports.speedmode.SetDefaultStyle();

        textPosY = exports.speedmode.DrawCenteredText(notificationText, 0.5, textPosY);
    }
}

function DrawGameOver() {
    exports.speedmode.SetDefaultStyle();

    let textPosY = 0.1;
    textPosY = exports.speedmode.DrawCenteredText("You dropped below 80km/h and exploded!", 0.5, textPosY);
    exports.speedmode.SetDefaultStyle();
    textPosY = exports.speedmode.DrawCenteredText(`Final Score: ${_score.toFixed(0)}`, 0.5, textPosY);
}