// ==========================================
// DOM Elements & Canvas Setup
// ==========================================
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const directionInput = document.getElementById('direction');
const kickBtn = document.getElementById('kickBtn');
const contactMap = document.getElementById('contact-map');
const contactPoint = document.getElementById('contact-point');
const powerCursor = document.getElementById('power-cursor');
const windArrow = document.getElementById('wind-arrow');
const scoreDisplay = document.getElementById('score-display');
const livesDisplay = document.getElementById('lives-display');

// ==========================================
// Game Constants & State
// ==========================================
const GRAVITY = 0.2;        
const DRAG = 0.985;
const MAGNUS_COEF = 0.006;  
const BOUNCE_DECAY = 0.5;

const GOAL_HEIGHT = 45;
const WALL_HEIGHT = 45; 
const GK_HEIGHT = 45;   
const GK_WIDTH = 30;

let isKicking = false;
let isAnimating = false;
let playDead = false;
let animProgress = 0;
let trail = [];
let score = 0;
let lives = 3;

// NEW: Radial Aiming Base Angle
let baseAngle = 0; 

let ball = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, targetVx: 0, targetVy: 0, targetVz: 0, baseRadius: 6, renderRadius: 6 };
let playerStart = { x: 0, y: 0 };
let wallPlayers = [];

// Placed at the top-right corner to match your Diamond Pitch image
let goal = { x: 440, y: 70, width: 90, height: 25 }; 
let wind = { x: 0, y: 0 };
let gk = { x: 0, y: 0, z: 0, vx: 0, vz: 0, speed: 2.5 };

let strikeCurve = 0;
let strikeDip = 0;
let currentPower = 20;
let powerDirection = 1;
const powerSpeed = 1; 

// ==========================================
// Asset Loader (Pitch is back!)
// ==========================================
const assets = {
    pitch: new Image(),
    szoboszlai: new Image(),
    defender: new Image(),
    goal: new Image(),
    ball: new Image(),
    goalkeeper: new Image()
};

assets.pitch.src = 'assets/pitch_isometric.png';
assets.szoboszlai.src = 'assets/szobo_kick.png';
assets.defender.src = 'assets/defender_wall.png';
assets.goal.src = 'assets/goal_net.png';
assets.ball.src = 'assets/ball_sprite.png';
assets.goalkeeper.src = 'assets/gk_sprite.png';

let imagesLoaded = 0;
const totalImages = Object.keys(assets).length;

for (let key in assets) {
    assets[key].onload = () => {
        imagesLoaded++;
        if (imagesLoaded === totalImages) {
            resetGame();
            loop(); 
        }
    };
}

// ==========================================
// Core Game Logic
// ==========================================
function updateScoreboard() {
    scoreDisplay.innerText = score;
    let livesText = "";
    for (let i = 0; i < lives; i++) { livesText += "⚽"; }
    livesDisplay.innerText = livesText;
}

function handleGoal() {
    score++;
    updateScoreboard();
    alert("GOAL! Sensational Strike!");
    setupScenario();
}

function handleMiss(message) {
    lives--;
    updateScoreboard();
    if (lives <= 0) {
        alert(`${message}\n\nGAME OVER! Final Score: ${score}\nClick OK to play again.`);
        resetGame();
    } else {
        alert(message);
        setupScenario();
    }
}

function resetGame() {
    score = 0;
    lives = 3;
    isKicking = false;
    isAnimating = false;
    playDead = false;
    trail = [];
    updateScoreboard();
    setupScenario();
}

function setupScenario() {
    isKicking = false;
    isAnimating = false;
    playDead = false;
    trail = [];
    
    // Spawn ball bottom-left of the diamond
    ball.x = Math.random() * 80 + 180; 
    ball.y = Math.random() * 80 + 320; 
    ball.z = 0;
    ball.vx = 0; ball.vy = 0; ball.vz = 0;

    // --- NEW RADIAL AIMING MATH ---
    // Calculate the exact angle from the ball to the center of the goal
    const goalCenterX = goal.x + goal.width / 2;
    const dy = goal.y - ball.y;
    const dx = goalCenterX - ball.x;
    baseAngle = Math.atan2(dy, dx); 

    // Dynamically angle the wall to face the kick
    const numPlayers = Math.floor(Math.random() * 4) + 3;
    wallPlayers = [];
    
    const distanceToGoal = Math.sqrt(dx*dx + dy*dy);
    const wallDistance = distanceToGoal * 0.35; 
    
    const wallCenterX = ball.x + Math.cos(baseAngle) * wallDistance;
    const wallCenterY = ball.y + Math.sin(baseAngle) * wallDistance;
    
    // The wall stands on a line exactly perpendicular to the ball's path
    const perpAngle = baseAngle + (Math.PI / 2);
    const SPACING = 16; 
    
    for(let i = 0; i < numPlayers; i++) {
        const offset = (i - (numPlayers - 1) / 2) * SPACING;
        wallPlayers.push({ 
            x: wallCenterX + Math.cos(perpAngle) * offset, 
            y: wallCenterY + Math.sin(perpAngle) * offset, 
            width: 20, height: 45 
        });
    }

    gk.x = goal.x + (goal.width / 2) - (GK_WIDTH / 2);
    gk.y = goal.y + 5; 
    gk.z = 0;
    gk.vx = 0;
    gk.vz = 0;

    wind.x = (Math.random() * 0.06) - 0.03; 
    wind.y = (Math.random() * 0.06) - 0.03; 
    const windAngle = Math.atan2(wind.y, wind.x) * (180 / Math.PI);
    windArrow.style.transform = `rotate(${windAngle + 90}deg)`; 
}

function updatePowerMeter() {
    if (!isKicking && !isAnimating) {
        currentPower += (powerSpeed * powerDirection);
        if (currentPower >= 100) { currentPower = 100; powerDirection = -1; } 
        else if (currentPower <= 20) { currentPower = 20; powerDirection = 1; }
        
        const percent = ((currentPower - 20) / 80) * 100;
        powerCursor.style.left = `${percent}%`;
    }
}

function update() {
    if (isAnimating) {
        animProgress += 8; 
        if (animProgress >= 100) {
            isAnimating = false;
            isKicking = true;
            ball.vx = ball.targetVx;
            ball.vy = ball.targetVy;
            ball.vz = ball.targetVz;
            ball.z = 0;
        }
    } else if (isKicking) {
        ball.x += ball.vx;
        ball.y += ball.vy;
        ball.z += ball.vz;
        
        ball.vz -= (GRAVITY + (strikeDip * 0.02));
        
        // Upgraded 2D Vector Magnus Effect
        const magX = -ball.vy * strikeCurve * MAGNUS_COEF;
        const magY = ball.vx * strikeCurve * MAGNUS_COEF;
        ball.vx += magX;
        ball.vy += magY;

        ball.vx += wind.x;
        ball.vy += wind.y;
        ball.vx *= DRAG;
        ball.vy *= DRAG;
        ball.vz *= DRAG;

        ball.renderRadius = ball.baseRadius + (ball.z * 0.12);
        if (ball.renderRadius < ball.baseRadius) ball.renderRadius = ball.baseRadius;

        const currentVisualY = ball.y - (ball.z * 0.5);
        trail.push({ x: ball.x, y: currentVisualY });
        if (trail.length > 20) trail.shift();

        if (ball.z <= 0) {
            ball.z = 0;
            if (Math.abs(ball.vz) > 1) { ball.vz *= -BOUNCE_DECAY; } 
            else { ball.vz = 0; }
            ball.vx *= 0.85;
            ball.vy *= 0.85;
        }

        if (ball.y < wallPlayers[0].y + 30 && !playDead) {
            const gkCenterX = gk.x + (GK_WIDTH / 2);
            if (ball.x > gkCenterX + 5) { gk.vx = gk.speed; } 
            else if (ball.x < gkCenterX - 5) { gk.vx = -gk.speed; } 
            else { gk.vx = 0; }
            
            if (ball.y < goal.y + 60 && ball.z > 10 && gk.z === 0) { gk.vz = 3.5; }
        }

        gk.x += gk.vx;
        gk.z += gk.vz;
        if (gk.z > 0) { gk.vz -= GRAVITY; } 
        else { gk.z = 0; gk.vz = 0; }
        
        if (gk.x < goal.x) gk.x = goal.x;
        if (gk.x + GK_WIDTH > goal.x + goal.width) gk.x = goal.x + goal.width - GK_WIDTH;

        if (!playDead) {
            for (let p of wallPlayers) {
                if (ball.x > p.x && ball.x < p.x + p.width && ball.y > p.y && ball.y < p.y + p.height) {
                    if (ball.z < WALL_HEIGHT) {
                        ball.vx *= -0.3; ball.vy *= -0.3; ball.vz = 2; 
                        playDead = true;
                        setTimeout(() => handleMiss("Blocked by the wall!"), 800);
                    }
                }
            }

            if (ball.x > gk.x && ball.x < gk.x + GK_WIDTH && ball.y > gk.y - 10 && ball.y < gk.y + 10) {
                if (ball.z < gk.z + GK_HEIGHT) {
                    ball.vx *= -0.4; ball.vy *= -0.2; 
                    playDead = true;
                    setTimeout(() => handleMiss("What a save by the keeper!"), 800);
                }
            }

            const goalLine = goal.y + goal.height;
            if (ball.y <= goalLine && (ball.y - ball.vy) > goalLine) {
                playDead = true; 
                if (ball.x > goal.x && ball.x < goal.x + goal.width) {
                    if (ball.z <= GOAL_HEIGHT) { setTimeout(() => handleGoal(), 500); } 
                    else { setTimeout(() => handleMiss("Over the bar! Needed more dip."), 500); }
                } else { setTimeout(() => handleMiss("Wide of the mark."), 500); }
            }

            if (Math.abs(ball.vy) < 0.1 && ball.z === 0) {
                playDead = true;
                setTimeout(() => handleMiss("Weak effort. The keeper scoops it up."), 500);
            }
        }
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Draw your image!
    ctx.drawImage(assets.pitch, 0, 0, canvas.width, canvas.height);

    // 2. Goal Net
    ctx.drawImage(assets.goal, goal.x, goal.y - 30, goal.width, goal.height + 30);

    // 3. Goalkeeper
    const gkVisualY = gk.y - gk.z;
    ctx.drawImage(assets.goalkeeper, gk.x, gkVisualY - GK_HEIGHT, GK_WIDTH, GK_HEIGHT * 1.5);

    // 4. Wall (Sorted by Y so players in front render properly)
    wallPlayers.sort((a, b) => a.y - b.y).forEach(p => {
        ctx.drawImage(assets.defender, p.x, p.y - p.height, p.width, p.height * 2);
    });

    // 5. Predictive Trajectory Simulator (Radial Vector Updated!)
    if (!isKicking && !isAnimating) {
        let simX = ball.x;
        let simY = ball.y;
        let simZ = ball.z;
        
        const direction = parseFloat(directionInput.value);
        const rad = direction * (Math.PI / 180);
        const totalAngle = baseAngle + rad; 
        
        let simVx = Math.cos(totalAngle) * currentPower * 0.15;
        let simVy = Math.sin(totalAngle) * currentPower * 0.15;
        let simVz = (currentPower * 0.04) + 1;

        ctx.beginPath();
        ctx.moveTo(simX, simY);

        for (let i = 0; i < 60; i++) {
            simX += simVx; simY += simVy; simZ += simVz;
            simVz -= (GRAVITY + (strikeDip * 0.02));
            
            const magX = -simVy * strikeCurve * MAGNUS_COEF;
            const magY = simVx * strikeCurve * MAGNUS_COEF;
            simVx += magX; simVy += magY;

            simVx += wind.x; simVy += wind.y;
            simVx *= DRAG; simVy *= DRAG; simVz *= DRAG;

            if (simZ < 0) { simZ = 0; ctx.lineTo(simX, simY); break; }
            const visualY = simY - (simZ * 0.5);
            ctx.lineTo(simX, visualY);
        }

        ctx.strokeStyle = 'rgba(255, 255, 0, 0.8)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]);
        
        ctx.beginPath();
        ctx.arc(simX, simY - (simZ * 0.5), 4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 0, 0, 0.9)'; 
        ctx.fill();
    }

    // 6. Szoboszlai 
    if (isAnimating) {
        const currentX = playerStart.x + ((ball.x - 20 - playerStart.x) * (animProgress / 100));
        const currentY = playerStart.y + ((ball.y - 10 - playerStart.y) * (animProgress / 100));
        ctx.drawImage(assets.szoboszlai, currentX, currentY, 45, 70);
    } else if (!isKicking) {
        ctx.drawImage(assets.szoboszlai, ball.x - 25, ball.y - 60, 45, 70);
    } else {
        ctx.drawImage(assets.szoboszlai, ball.x - 20, ball.y - 20, 45, 70);
    }

    // 7. Trail
    if (trail.length > 1) {
        ctx.beginPath();
        ctx.moveTo(trail[0].x, trail[0].y);
        for (let i = 1; i < trail.length; i++) { ctx.lineTo(trail[i].x, trail[i].y); }
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = ball.renderRadius * 0.8;
        ctx.lineCap = 'round';
        ctx.stroke();
    }

    // 8. Ball
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.baseRadius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(0, 0, 0, ${Math.max(0.1, 0.5 - (ball.z * 0.01))})`;
    ctx.fill();

    const visualY = ball.y - (ball.z * 0.5); 
    const spriteSize = ball.renderRadius * 2;
    ctx.drawImage(assets.ball, ball.x - ball.renderRadius, visualY - ball.renderRadius, spriteSize, spriteSize);
}

function loop() {
    updatePowerMeter();
    update();
    draw();
    requestAnimationFrame(loop);
}

// ==========================================
// Event Listeners
// ==========================================
contactMap.addEventListener('click', (e) => {
    const rect = contactMap.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    contactPoint.style.left = `${x - 6}px`; 
    contactPoint.style.top = `${y - 6}px`;

    strikeCurve = -(((x / 100) * 10) - 5); 
    strikeDip = -(((y / 100) * 10) - 5);   
});

kickBtn.addEventListener('click', () => {
    if (!isKicking && !isAnimating) {
        const direction = parseFloat(directionInput.value);
        const rad = direction * (Math.PI / 180);
        const totalAngle = baseAngle + rad; 
        
        ball.targetVx = Math.cos(totalAngle) * currentPower * 0.15;
        ball.targetVy = Math.sin(totalAngle) * currentPower * 0.15;
        ball.targetVz = (currentPower * 0.04) + 1; 
        
        isAnimating = true;
        animProgress = 0;
        playerStart = { x: ball.x - 30, y: ball.y + 30 };
    }
});
