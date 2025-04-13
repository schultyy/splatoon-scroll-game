// Game state
const gameState = {
    currentScreen: 'start-screen',
    selectedCharacter: null,
    player: {
        x: 100,
        y: 300,
        width: 50,
        height: 50,
        speed: 5,
        jumpForce: 15,
        velocityY: 0,
        isJumping: false,
        sprite: null
    },
    gravity: 0.8,
    ground: {
        y: 550, // Bottom of the canvas - player height
    },
    keys: {
        right: false,
        left: false,
        up: false
    },
    gameObjects: [],
    camera: {
        x: 0
    }
};

// Character sprites
const characterSprites = {
    hero1: {
        src: 'assets/game-modes-char.png'
    },
    hero2: {
        src: 'assets/splatoon-inline2.jpg'
    },
    hero3: {
        src: 'assets/Splatoon_2_-_Inkling_with_Splatlings.png'
    }
};

// Preload images
const preloadedImages = {};
for (const character in characterSprites) {
    preloadedImages[character] = new Image();
    preloadedImages[character].src = characterSprites[character].src;
}

// DOM Elements
const startScreen = document.getElementById('start-screen');
const characterSelectScreen = document.getElementById('character-select-screen');
const gameScreen = document.getElementById('game-screen');
const startButton = document.getElementById('start-button');
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const characters = document.querySelectorAll('.character');

// Set canvas dimensions
canvas.width = 800;
canvas.height = 600;

// Event Listeners
startButton.addEventListener('click', goToCharacterSelect);

characters.forEach(character => {
    character.addEventListener('click', () => {
        // Remove selected class from all characters
        characters.forEach(c => c.classList.remove('selected'));
        
        // Add selected class to clicked character
        character.classList.add('selected');
        
        // Set selected character
        const characterType = character.getAttribute('data-character');
        selectCharacter(characterType);
        
        // After a short delay, go to game screen
        setTimeout(startGame, 500);
    });
});

// Key event listeners
window.addEventListener('keydown', (e) => {
    switch(e.key) {
        case 'ArrowRight':
            gameState.keys.right = true;
            break;
        case 'ArrowLeft':
            gameState.keys.left = true;
            break;
        case 'ArrowUp':
        case ' ': // Spacebar
            gameState.keys.up = true;
            break;
    }
});

window.addEventListener('keyup', (e) => {
    switch(e.key) {
        case 'ArrowRight':
            gameState.keys.right = false;
            break;
        case 'ArrowLeft':
            gameState.keys.left = false;
            break;
        case 'ArrowUp':
        case ' ': // Spacebar
            gameState.keys.up = false;
            break;
    }
});

// Screen Navigation Functions
function goToCharacterSelect() {
    changeScreen('character-select-screen');
}

function startGame() {
    changeScreen('game-screen');
    // Start the game loop
    gameLoop();
}

function changeScreen(screenId) {
    // Hide all screens
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    
    // Show the requested screen
    document.getElementById(screenId).classList.add('active');
    gameState.currentScreen = screenId;
}

// Character Selection
function selectCharacter(characterType) {
    gameState.selectedCharacter = characterType;
    gameState.player.sprite = preloadedImages[characterType];
}

// Game Functions
function gameLoop() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Update game state
    update();
    
    // Draw everything
    draw();
    
    // Continue the game loop
    requestAnimationFrame(gameLoop);
}

function update() {
    // Player movement
    if (gameState.keys.right) {
        gameState.player.x += gameState.player.speed;
    }
    if (gameState.keys.left) {
        gameState.player.x -= gameState.player.speed;
    }
    
    // Player jump
    if (gameState.keys.up && !gameState.player.isJumping) {
        gameState.player.velocityY = -gameState.player.jumpForce;
        gameState.player.isJumping = true;
    }
    
    // Apply gravity
    gameState.player.velocityY += gameState.gravity;
    gameState.player.y += gameState.player.velocityY;
    
    // Ground collision
    if (gameState.player.y + gameState.player.height > gameState.ground.y) {
        gameState.player.y = gameState.ground.y - gameState.player.height;
        gameState.player.velocityY = 0;
        gameState.player.isJumping = false;
    }
    
    // Camera follow player (simple side-scrolling)
    if (gameState.player.x > 400) {
        gameState.camera.x = gameState.player.x - 400;
    }
}

function draw() {
    // Draw sky background
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw ground
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(0 - gameState.camera.x, gameState.ground.y, canvas.width + 1000, canvas.height - gameState.ground.y);
    
    // Draw some background elements (clouds, mountains, etc.)
    drawBackgroundElements();
    
    // Draw player
    if (gameState.player.sprite) {
        ctx.drawImage(
            gameState.player.sprite,
            gameState.player.x - gameState.camera.x,
            gameState.player.y,
            gameState.player.width,
            gameState.player.height
        );
    } else {
        // Fallback if sprite isn't loaded
        ctx.fillStyle = 'purple';
        ctx.fillRect(
            gameState.player.x - gameState.camera.x,
            gameState.player.y,
            gameState.player.width,
            gameState.player.height
        );
    }
}

function drawBackgroundElements() {
    // Draw clouds (example)
    ctx.fillStyle = 'white';
    ctx.fillRect(100 - gameState.camera.x * 0.2, 100, 60, 30);
    ctx.fillRect(300 - gameState.camera.x * 0.2, 80, 80, 40);
    ctx.fillRect(600 - gameState.camera.x * 0.2, 120, 70, 35);
    
    // Draw mountains (example)
    ctx.fillStyle = '#6b8e23';
    ctx.beginPath();
    ctx.moveTo(0 - gameState.camera.x * 0.5, gameState.ground.y);
    ctx.lineTo(200 - gameState.camera.x * 0.5, 300);
    ctx.lineTo(400 - gameState.camera.x * 0.5, gameState.ground.y);
    ctx.fill();
    
    ctx.beginPath();
    ctx.moveTo(350 - gameState.camera.x * 0.5, gameState.ground.y);
    ctx.lineTo(550 - gameState.camera.x * 0.5, 250);
    ctx.lineTo(750 - gameState.camera.x * 0.5, gameState.ground.y);
    ctx.fill();
} 