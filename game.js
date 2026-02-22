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

// Radial Aiming Base Angle
let baseAngle = 0; 

let ball = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, targetVx: 0, targetVy: 0, targetVz: 0, baseRadius: 6, renderRadius: 6 };
let playerStart = { x: 0, y: 0 };
let wallPlayers = [];

// Placed on the top-right edge of the diamond pitch
let goal = { x: 500, y: 13
