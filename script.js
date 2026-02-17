const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// UI Elements
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const scoreEl = document.getElementById('score');
const finalScoreEl = document.getElementById('final-score');
const restartBtn = document.getElementById('restart-btn');

// Game State
let frames = 0;
let score = 0;
let gameState = 'START'; // START, PLAYING, GAMEOVER
let speed = 3; // Game scroll speed

// Resize handling
function resize() {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
}
window.addEventListener('resize', resize);
resize();

// Bird Object
const bird = {
    x: 50,
    y: 150,
    w: 30,
    h: 30,
    radius: 15,
    velocity: 0,
    gravity: 0.25,
    jump: -5.5,
    
    draw: function() {
        ctx.fillStyle = '#ffeb3b';
        ctx.beginPath();
        ctx.arc(this.x + this.w/2, this.y + this.h/2, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#000';
        ctx.stroke();
        
        // Eye
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(this.x + this.w/2 + 8, this.y + 5, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(this.x + this.w/2 + 10, this.y + 5, 2, 0, Math.PI * 2);
        ctx.fill();
    },
    
    update: function() {
        this.velocity += this.gravity;
        this.y += this.velocity;
        
        // Floor Collision
        if (this.y + this.h >= canvas.height) {
            this.y = canvas.height - this.h;
            gameOver();
        }
        
        // Ceiling Collision
        if (this.y < 0) {
            this.y = 0;
            this.velocity = 0;
        }
    },
    
    flap: function() {
        this.velocity = this.jump;
    },
    
    reset: function() {
        this.y = canvas.height / 2;
        this.velocity = 0;
    }
};

// Pipes
const pipes = {
    position: [],
    w: 50,
    h: 150, // Min height
    gap: 170, // Gap size
    dx: 3,
    
    draw: function() {
        for(let i = 0; i < this.position.length; i++) {
            let p = this.position[i];
            
            ctx.fillStyle = '#73bf2e';
            ctx.strokeStyle = '#000';
            
            // Top Pipe
            ctx.fillRect(p.x, 0, this.w, p.y);
            ctx.strokeRect(p.x, 0, this.w, p.y);
            
            // Bottom Pipe
            ctx.fillRect(p.x, p.y + this.gap, this.w, canvas.height - p.y - this.gap);
            ctx.strokeRect(p.x, p.y + this.gap, this.w, canvas.height - p.y - this.gap);
        }
    },
    
    update: function() {
        // Add new pipe
        if (frames % 100 === 0) { // Frequency
            let maxTop = canvas.height - 150 - this.gap; // Leave room for ground
            let topHeight = Math.floor(Math.random() * (maxTop - 50 + 1) + 50);
            
            this.position.push({
                x: canvas.width,
                y: topHeight,
                passed: false
            });
        }
        
        for(let i = 0; i < this.position.length; i++) {
            let p = this.position[i];
            p.x -= this.dx;
            
            // Collision Detection
            // 1. Horizontal hit
            if (bird.x + bird.w > p.x && bird.x < p.x + this.w) {
                // 2. Vertical hit (Top pipe OR Bottom pipe)
                if (bird.y < p.y || bird.y + bird.h > p.y + this.gap) {
                    gameOver();
                }
            }
            
            // Score update
            if (p.x + this.w < bird.x && !p.passed) {
                score++;
                scoreEl.innerText = score;
                p.passed = true;
            }
            
            // Remove off-screen pipes
            if (p.x + this.w <= 0) {
                this.position.shift();
                scoreEl.innerText = score;
            }
        }
    },
    
    reset: function() {
        this.position = [];
    }
};

// Game Loop
function loop() {
    if (gameState === 'PLAYING') {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        pipes.update();
        pipes.draw();
        
        bird.update();
        bird.draw();
        
        frames++;
        requestAnimationFrame(loop);
    }
}

// Controls
function action() {
    switch (gameState) {
        case 'START':
            gameState = 'PLAYING';
            startScreen.classList.add('hidden');
            loop();
            bird.flap();
            break;
        case 'PLAYING':
            bird.flap();
            break;
        case 'GAMEOVER':
            // Handled by restart button
            break;
    }
}

function gameOver() {
    gameState = 'GAMEOVER';
    finalScoreEl.innerText = score;
    gameOverScreen.classList.remove('hidden');
}

function resetGame() {
    bird.reset();
    pipes.reset();
    score = 0;
    frames = 0;
    scoreEl.innerText = score;
    gameOverScreen.classList.add('hidden');
    gameState = 'START';
    startScreen.classList.remove('hidden');
    
    // Draw initial state
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    bird.draw();
}

// Event Listeners
window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') action();
});

// Touch/Click listeners
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault(); // Stop scrolling
    action();
});
canvas.addEventListener('mousedown', action);

restartBtn.addEventListener('click', resetGame);

// Initial Draw
bird.reset();
bird.draw();