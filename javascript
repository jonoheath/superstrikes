// Inside your update() function loop:

// --- Wall Collision ---
if (ball.z < WALL_HEIGHT) {
    ball.vx *= -0.3; 
    ball.vy *= -0.3;
    ball.vz = 2; 
    playDead = true;
    setTimeout(() => { 
        handleMiss("Blocked by the wall!"); // UPDATED
    }, 800); 
}

// --- Goalkeeper Collision ---
if (ball.z < gk.z + GK_HEIGHT) {
    ball.vx *= -0.4;
    ball.vy *= -0.2; 
    playDead = true;
    setTimeout(() => { 
        handleMiss("What a save by the keeper!"); // UPDATED
    }, 800);
}

// --- Goal Line Detection ---
if (!playDead && ball.y <= goalLine && (ball.y - ball.vy) > goalLine) {
    playDead = true; 
    
    if (ball.x > goal.x && ball.x < goal.x + goal.width) {
        if (ball.z <= GOAL_HEIGHT) {
            setTimeout(() => { 
                handleGoal(); // UPDATED
            }, 500);
        } else {
            setTimeout(() => { 
                handleMiss("Over the bar! He needed more dip on that."); // UPDATED
            }, 500);
        }
    } else {
        setTimeout(() => { 
            handleMiss("Wide of the mark."); // UPDATED
        }, 500);
    }
}

// --- Stop condition (Ball rolls to a halt) ---
if (!playDead && Math.abs(ball.vy) < 0.1 && ball.z === 0) {
    playDead = true;
    setTimeout(() => { 
        handleMiss("Weak effort. The keeper scoops it up."); // UPDATED
    }, 500);
}
