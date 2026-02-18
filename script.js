const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const bgm = document.getElementById('bgm'); // <--- ADD THIS
bgm.volume = 0.3; // Set volume to 30% (optional, so it's not too loud) 

// UI References
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const scoreEl = document.getElementById('score');
const highScoreEl = document.getElementById('high-score');
const finalScoreEl = document.getElementById('final-score');
const finalBestEl = document.getElementById('final-best');
const flashLayer = document.getElementById('flash-layer');

// Game Variables
let frames = 0;
let score = 0;
let highScore = localStorage.getItem('flappyHighScore') || 0; // UX LESSON: Persistence
highScoreEl.innerText = highScore;

let gameState = 'START'; 
let speed = 2.5; // Slightly slower for better feel

function resize() {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
}
window.addEventListener('resize', resize);
resize();

// --- 1. THE BIRD (With Rotation) ---
const bird = {
    x: 50,
    y: 150,
    w: 34,
    h: 24,
    velocity: 0,
    gravity: 0.20, // Tuned for "heavy" feel
    jump: -4.6,
    rotation: 0,
    
    draw: function() {
        // UX LESSON: Rotation Logic
        // We tilt the bird based on velocity.
        if (this.velocity < 0) this.rotation = -25 * Math.PI / 180; // Tilt Up
        else if (this.velocity > 0) {
            this.rotation += 2 * Math.PI / 180; // Slowly tilt down
            if (this.rotation > 90 * Math.PI / 180) this.rotation = 90 * Math.PI / 180;
        }

        ctx.save(); // Save current canvas state
        ctx.translate(this.x, this.y); // Move origin to bird center
        ctx.rotate(this.rotation); // Rotate the canvas

        // Draw Bird Body (Pixel Art Style Rectangle)
        ctx.fillStyle = '#f4ce42';
        ctx.fillRect(-this.w/2, -this.h/2, this.w, this.h);
        
        // Draw Wing
        ctx.fillStyle = '#fff';
        ctx.fillRect(-5, -5, 15, 10);
        
        // Draw Eye
        ctx.fillStyle = '#fff';
        ctx.fillRect(5, -10, 10, 10);
        ctx.fillStyle = '#000';
        ctx.fillRect(10, -8, 4, 4);

        // Draw Beak
        ctx.fillStyle = '#f76a26';
        ctx.fillRect(10, 2, 12, 8);

        ctx.restore(); // Restore canvas to normal
    },
    
    update: function() {
        this.velocity += this.gravity;
        this.y += this.velocity;
        
        // Floor Collision
        if (this.y + this.h/2 >= canvas.height - ground.h) {
            this.y = canvas.height - ground.h - this.h/2;
            gameOver();
        }
        
        if (this.y < 0) this.y = 0;
    },
    
    flap: function() {
        this.velocity = this.jump;
        this.rotation = -25 * Math.PI / 180;
    },
    
    reset: function() {
        this.y = canvas.height / 2;
        this.velocity = 0;
        this.rotation = 0;
    }
};

// --- 2. SCROLLING GROUND (Parallax) ---
const ground = {
    h: 50, // Height of floor
    x: 0,
    
    draw: function() {
        ctx.fillStyle = '#ded895';
        ctx.fillRect(0, canvas.height - this.h, canvas.width, this.h);
        
        // Draw "grass" top
        ctx.fillStyle = '#73bf2e';
        ctx.fillRect(0, canvas.height - this.h, canvas.width, 10);
        
        // Draw scrolling pattern
        ctx.strokeStyle = '#cbb968';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for(let i = this.x; i < canvas.width; i+=20) {
            ctx.moveTo(i, canvas.height - this.h + 10);
            ctx.lineTo(i - 10, canvas.height);
        }
        ctx.stroke();
    },
    
    update: function() {
        // UX LESSON: Endless Scroll
        // Move left, if pattern goes off screen, reset it
        this.x -= speed;
        if (this.x <= -20) this.x = 0;
    }
};

// --- 3. PIPES (With 3D Gradients) ---
const pipes = {
    position: [],
    w: 52,
    h: 400, // Max height
    gap: 130, // Easier gap
    dx: speed,
    
    draw: function() {
        for(let i = 0; i < this.position.length; i++) {
            let p = this.position[i];
            let topY = p.y;
            let bottomY = p.y + this.gap;
            
            // UX LESSON: Gradients
            // Makes pipes look round instead of flat
            let gradient = ctx.createLinearGradient(p.x, 0, p.x + this.w, 0);
            gradient.addColorStop(0, '#73bf2e');
            gradient.addColorStop(0.5, '#9ce659'); // Highlight in middle
            gradient.addColorStop(1, '#73bf2e');
            
            ctx.fillStyle = gradient;
            ctx.strokeStyle = '#543847';
            ctx.lineWidth = 2;

            // Top Pipe
            ctx.fillRect(p.x, 0, this.w, topY);
            ctx.strokeRect(p.x, 0, this.w, topY);
            // Cap
            ctx.fillRect(p.x - 2, topY - 20, this.w + 4, 20);
            ctx.strokeRect(p.x - 2, topY - 20, this.w + 4, 20);
            
            // Bottom Pipe
            ctx.fillRect(p.x, bottomY, this.w, canvas.height - bottomY - ground.h);
            ctx.strokeRect(p.x, bottomY, this.w, canvas.height - bottomY - ground.h);
            // Cap
            ctx.fillRect(p.x - 2, bottomY, this.w + 4, 20);
            ctx.strokeRect(p.x - 2, bottomY, this.w + 4, 20);
        }
    },
    
    update: function() {
        if (frames % 120 === 0) {
            let min = 50;
            let max = canvas.height - ground.h - this.gap - min;
            let y = Math.floor(Math.random() * (max - min + 1) + min);
            this.position.push({ x: canvas.width, y: y, passed: false });
        }
        
        for(let i = 0; i < this.position.length; i++) {
            let p = this.position[i];
            p.x -= this.dx;
            
            // Collision Logic
            let birdLeft = bird.x - bird.w/2;
            let birdRight = bird.x + bird.w/2;
            let birdTop = bird.y - bird.h/2;
            let birdBottom = bird.y + bird.h/2;
            
            let pipeLeft = p.x;
            let pipeRight = p.x + this.w;
            let pipeTop = p.y;
            let pipeBottom = p.y + this.gap;
            
            if (birdRight > pipeLeft && birdLeft < pipeRight) {
                if (birdTop < pipeTop || birdBottom > pipeBottom) {
                    gameOver();
                }
            }
            
            if (p.x + this.w < birdLeft && !p.passed) {
                score++;
                scoreEl.innerText = score;
                p.passed = true;
                // High Score Check
                if (score > highScore) {
                    highScore = score;
                    highScoreEl.innerText = highScore;
                    localStorage.setItem('flappyHighScore', highScore);
                }
            }
            
            if (p.x + this.w <= 0) this.position.shift();
        }
    },
    reset: function() { this.position = []; }
};

function loop() {
    if (gameState === 'PLAYING') {
        // Draw Sky
        ctx.fillStyle = '#70c5ce';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw distant clouds (static)
        ctx.fillStyle = '#effcff';
        ctx.beginPath();
        ctx.arc(100, canvas.height - 100, 40, 0, Math.PI * 2);
        ctx.arc(150, canvas.height - 80, 50, 0, Math.PI * 2);
        ctx.fill();

        pipes.update();
        pipes.draw();
        
        ground.update();
        ground.draw();
        
        bird.update();
        bird.draw();
        
        frames++;
        requestAnimationFrame(loop);
    }
}

function gameOver() {
    if (gameState === 'GAMEOVER') return; // Prevent double trigger
    gameState = 'GAMEOVER';

    bgm.pause(); // <--- ADD THIS: Stops the music
    
    // UX LESSON: Flash Effect
    // White flash creates impact on death
    flashLayer.style.opacity = '0.5';
    setTimeout(() => { flashLayer.style.opacity = '0'; }, 100);
    
    finalScoreEl.innerText = score;
    finalBestEl.innerText = highScore;
    gameOverScreen.classList.remove('hidden');
}

function resetGame() {
    bird.reset();
    pipes.reset();
    score = 0;
    frames = 0;

    bgm.currentTime = 0; // <--- ADD THIS: Rewinds song to start
    
    scoreEl.innerText = 0;
    gameOverScreen.classList.add('hidden');
    gameState = 'START';
    startScreen.classList.remove('hidden');
    
    // Clear canvas
    ctx.clearRect(0,0,canvas.width, canvas.height);
}

function startGame() {
    if (gameState === 'START') {
        gameState = 'PLAYING';
        startScreen.classList.add('hidden');

        bgm.play(); // <--- ADD THIS: Plays music on first tap

        loop();
        bird.flap();
    } else if (gameState === 'PLAYING') {
        bird.flap();
    }
}

// Controls
window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') startGame();
});
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    startGame();
}, {passive: false});

document.getElementById('restart-btn').addEventListener('click', resetGame);