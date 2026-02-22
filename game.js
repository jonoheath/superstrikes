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
// Physics (Tweaked for slower, visible ball flight)
const GRAVITY = 0.2;        // Was 0.4. Lowered so the slower ball stays in the air
const DRAG = 0.985;
const MAGNUS_COEF = 0.006;  // Adjusted for slower speed
const BOUNCE_DECAY = 0.5;

// Perspective and Hitboxes (Scaled down to make pitch feel larger)
const GOAL_HEIGHT = 45;
const WALL_HEIGHT = 35;
const GK_HEIGHT = 35;       // Was 40
const GK_WIDTH = 25;        // Was 30

// Game State
let isKicking = false;
let isAnimating = false;
let playDead = false;
let animProgress = 0;
let trail = [];

// Arcade State
let score = 0;
let lives = 3;

// Objects
let ball = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, targetVx: 0, targetVy: 0, targetVz: 0, baseRadius: 5, renderRadius: 5 };
let playerStart = { x: 0, y: 0 };
let wallPlayers = [];

// Goal is statically positioned (Fits a top-right isometric pitch view)
let goal = { x: 450, y: 60, width: 140, height: 25 }; 
let wind = { x: 0, y: 0 };
let gk = { x: 0, y: 0, z: 0, vx: 0, vz: 0, speed: 2.5 };

// Pro UI State
let strikeCurve = 0;
let strikeDip = 0;
let currentPower = 20;
let powerDirection = 1;
const powerSpeed = 1; // Slowed down from 2 for easier clicking

// ==========================================
// Asset Loader
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
    
    // 1. Randomize Ball (Further back to fit the new goal position)
    ball.x = Math.random() * 300 + 150; 
    ball.y = Math.random() * 150 + 300; 
    ball.z = 0;
    ball.vx = 0; ball.vy = 0; ball.vz = 0;

    // 2. Randomize Wall (Tighter Spacing)
    const numPlayers = Math.floor(Math.random() * 4) + 3;
    wallPlayers = [];
    
    // Calculate wall position between ball and goal
    const goalCenterX = goal.x + goal.width / 2;
    const distanceToGoal = ball.y - goal.y;
    const wallY = ball.y - (distanceToGoal * 0.35); 
    
    // Tighter spacing: 14 pixels apart instead of 20
    const SPACING = 14; 
    const wallXStart = ball.x - ((numPlayers * SPACING) / 2) + ((goalCenterX - ball.x) * 0.3); 
    
    for(let i = 0; i < numPlayers; i++) {
        wallPlayers.push({ x: wallXStart + (i * SPACING), y: wallY, width: 16, height: 35 });
    }

    // 3. Reset GK
    gk.x = goal.x + (goal.width / 2) - (GK_WIDTH / 2);
    gk.y = goal.y + 5; 
    gk.z = 0;
    gk.vx = 0;
    gk.vz = 0;

    // 4. Randomize Wind
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
        animProgress += 8; // Faster run-up
        if (animProgress >= 100) {
            isAnimating = false;
            isKicking = true;
            ball.vx = ball.targetVx;
            ball.vy = ball.targetVy;
            ball.vz = ball.targetVz;
            ball.z = 0;
        }
    } else if (isKicking) {
        // Apply Physics
        ball.x += ball.vx;
        ball.y += ball.vy;
        ball.z += ball.vz;
        
        // Gravity + Dip
        ball.vz -= (GRAVITY + (strikeDip * 0.02));

        // Magnus Effect (Curve)
        ball.vx += (strikeCurve * ball.vy * MAGNUS_COEF);
        ball.vy -= Math.abs(strikeCurve * ball.vx * MAGNUS_COEF * 0.1);

        // Wind & Drag
        ball.vx += wind.x;
        ball.vy += wind.y;
        ball.vx *= DRAG;
        ball.vy *= DRAG;
        ball.vz *= DRAG;

        // Perspective
        ball.renderRadius = ball.baseRadius + (ball.z * 0.12);
        if (ball.renderRadius < ball.baseRadius) ball.renderRadius = ball.baseRadius;

        // Trail Record
        const currentVisualY = ball.y - (ball.z * 0.5);
        trail.push({ x: ball.x, y: currentVisualY });
        if (trail.length > 20) trail.shift();

        // Ground Bounce
        if (ball.z <= 0) {
            ball.z = 0;
            if (Math.abs(ball.vz) > 1) { ball.vz *= -BOUNCE_DECAY; } 
            else { ball.vz = 0; }
            ball.vx *= 0.85;
            ball.vy *= 0.85;
        }

        // --- Goalkeeper AI ---
        if (ball.y < wallPlayers[0].y + 30 && !playDead) {
            const gkCenterX = gk.x + (GK_WIDTH / 2);
            if (ball.x > gkCenterX + 5) { gk.vx = gk.speed; } 
            else if (ball.x < gkCenterX - 5) { gk.vx = -gk.speed; } 
            else { gk.vx = 0; }
            
            if (ball.y < goal.y + 60 && ball.z > 10 && gk.z === 0) {
                gk.vz = 3; // Jump
            }
        }

        gk.x += gk.vx;
        gk.z += gk.vz;
        if (gk.z > 0) { gk.vz -= GRAVITY; } 
        else { gk.z = 0; gk.vz = 0; }
        
        if (gk.x < goal.x) gk.x = goal.x;
        if (gk.x + GK_WIDTH > goal.x + goal.width) gk.x = goal.x + goal.width - GK_WIDTH;

        // --- Collisions ---
        if (!playDead) {
            // Wall Collision
            for (let p of wallPlayers) {
                if (ball.x > p.x && ball.x < p.x + p.width && ball.y > p.y && ball.y < p.y + p.height) {
                    if (ball.z < WALL_HEIGHT) {
                        ball.vx *= -0.3; ball.vy *= -0.3; ball.vz = 2; 
                        playDead = true;
                        setTimeout(() => handleMiss("Blocked by the wall!"), 800);
                    }
                }
            }

            // GK Collision
            if (ball.x > gk.x && ball.x < gk.x + GK_WIDTH && ball.y > gk.y - 10 && ball.y < gk.y + 10) {
                if (ball.z < gk.z + GK_HEIGHT) {
                    ball.vx *= -0.4; ball.vy *= -0.2; 
                    playDead = true;
                    setTimeout(() => handleMiss("What a save by the keeper!"), 800);
                }
            }

            // Goal Line Detection
            const goalLine = goal.y + goal.height;
            if (ball.y <= goalLine && (ball.y - ball.vy) > goalLine) {
                playDead = true; 
                if (ball.x > goal.x && ball.x < goal.x + goal.width) {
                    if (ball.z <= GOAL_HEIGHT) {
                        setTimeout(() => handleGoal(), 500);
                    } else {
                        setTimeout(() => handleMiss("Over the bar! Needed more dip."), 500);
                    }
                } else {
                    setTimeout(() => handleMiss("Wide of the mark."), 500);
                }
            }

            // Stop condition
            if (Math.abs(ball.vy) < 0.1 && ball.z === 0) {
                playDead = true;
                setTimeout(() => handleMiss("Weak effort. The keeper scoops it up."), 500);
            }
        }
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Pitch
    ctx.drawImage(assets.pitch, 0, 0, canvas.width, canvas.height);

    // 2. Goal
    ctx.drawImage(assets.goal, goal.x, goal.y - 30, goal.width, goal.height + 30);

    // 3. Goalkeeper
    const gkVisualY = gk.y - gk.z;
    ctx.drawImage(assets.goalkeeper, gk.x, gkVisualY - GK_HEIGHT, GK_WIDTH, GK_HEIGHT * 1.5);

    // 4. Wall
    wallPlayers.forEach(p => {
        ctx.drawImage(assets.defender, p.x, p.y - p.height, p.width, p.height * 2);
    });

    // 5. On-Pitch Targeting Arrow (NEW!)
    if (!isKicking && !isAnimating) {
        const direction = parseFloat(directionInput.value);
        const rad = direction * (Math.PI / 180);
        const lineLength = 70;
        
        // Calculate where the arrow points
        const endX = ball.x + Math.sin(rad) * lineLength;
        const endY = ball.y - Math.cos(rad) * lineLength;

        // Draw dashed line
        ctx.beginPath();
        ctx.moveTo(ball.x, ball.y);
        ctx.lineTo(endX, endY);
        ctx.strokeStyle = 'rgba(255, 255, 0, 0.7)'; // Yellow targeting line
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]); // Reset for other drawings

        // Draw arrowhead dot
        ctx.beginPath();
        ctx.arc(endX, endY, 4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 0, 0.9)';
        ctx.fill();
    }

    // 6. Szoboszlai
    if (isAnimating) {
        const currentX = playerStart.x + ((ball.x - 15 - playerStart.x) * (animProgress / 100));
        const currentY = playerStart.y + ((ball.y - 5 - playerStart.y) * (animProgress / 100));
        ctx.drawImage(assets.szoboszlai, currentX, currentY, 35, 55);
    } else if (!isKicking) {
        // Moved much closer! He stands right next to the ball now.
        ctx.drawImage(assets.szoboszlai, ball.x - 20, ball.y - 45, 35, 55);
    } else {
        ctx.drawImage(assets.szoboszlai, ball.x - 15, ball.y - 15, 35, 55);
    }

    // 7. Trail
    if (trail.length > 1) {
        ctx.beginPath();
        ctx.moveTo(trail[0].x, trail[0].y);
        for (let i = 1; i < trail.length; i++) { ctx.lineTo(trail[i].x, trail[i].y); }
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = ball.renderRadius * 0.8;
        ctx.lineCap = 'round';
        ctx.stroke();
    }

    // 8. Ball Shadow & Sprite
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

// Fixed Contact Map Math (Inverted so top=dip, left=right swerve)
contactMap.addEventListener('click', (e) => {
    const rect = contactMap.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    contactPoint.style.left = `${x - 6}px`; 
    contactPoint.style.top = `${y - 6}px`;

    // Added negatives to invert the axes to realistic physics
    strikeCurve = -(((x / 100) * 10) - 5); 
    strikeDip = -(((y / 100) * 10) - 5);   
});

kickBtn.addEventListener('click', () => {
    if (!isKicking && !isAnimating) {
        const direction = parseFloat(directionInput.value);
        const rad = direction * (Math.PI / 180);
        
        // Multipliers lowered from 0.25 to 0.15 for much smoother speed
        ball.targetVy = -currentPower * 0.15;
        ball.targetVx = Math.sin(rad) * currentPower * 0.15;
        
        // Fixed loft math: Weak power = weak lift, Strong power = high lift
        ball.targetVz = (currentPower * 0.04) + 1; 
        
        isAnimating = true;
        animProgress = 0;
        
        // Run-up starts closer now
        playerStart = { x: ball.x - 30, y: ball.y + 30 };
    }
});
