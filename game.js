// Game state
const gameState = {
    currentScreen: 'start-screen',
    selectedCharacter: null,
    player: {
        x: 100,
        y: 300,
        width: 70,
        height: 70,
        speed: 5,
        jumpForce: 15,
        velocityY: 0,
        isJumping: false,
        sprite: null,
        canShoot: false,
        lastShotTime: 0,
        shootCooldown: 350, // reduced from 500ms to 350ms for faster firing
        facingRight: true,
        // For hero3's charge attack
        isCharging: false,
        chargeStartTime: 0,
        chargeLevel: 0,
        maxChargeTime: 3000, // 3 seconds to fully charge
        barrageDuration: 1500, // 1.5 seconds of barrage
        barrageStartTime: 0,
        isBarraging: false
    },
    gravity: 0.8,
    ground: {
        y: 550, // Bottom of the canvas - player height
    },
    keys: {
        right: false,
        left: false,
        up: false,
        space: false
    },
    gameObjects: [],
    projectiles: [],
    camera: {
        x: 0
    }
};

// Character sprites
const characterSprites = {
    hero1: {
        src: 'assets/game-modes-char.png',
        canShoot: true,
        canCharge: false,
        canSplat: false
    },
    hero2: {
        src: 'assets/splatoon-inline2.jpg',
        canShoot: false,
        canCharge: false,
        canSplat: true
    },
    hero3: {
        src: 'assets/Splatoon_2_-_Inkling_with_Splatlings.png',
        canShoot: false,
        canCharge: true,
        canSplat: false
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
            gameState.keys.up = true;
            break;
        case ' ': // Spacebar
            gameState.keys.space = true;
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
            gameState.keys.up = false;
            break;
        case ' ': // Spacebar
            gameState.keys.space = false;
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
    gameState.player.canShoot = characterSprites[characterType].canShoot;
    gameState.player.canCharge = characterSprites[characterType].canCharge;
    gameState.player.canSplat = characterSprites[characterType].canSplat;
    
    // Set hero1-specific attributes
    if (characterType === 'hero1') {
        gameState.player.shootCooldown = 350; // Faster fire rate for hero1
    } else {
        gameState.player.shootCooldown = 500; // Default for other heroes
    }
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
    // Player movement and direction facing
    if (gameState.keys.right) {
        gameState.player.x += gameState.player.speed;
        gameState.player.facingRight = true;
    }
    if (gameState.keys.left) {
        gameState.player.x -= gameState.player.speed;
        gameState.player.facingRight = false;
    }
    
    // Player jump
    if (gameState.keys.up && !gameState.player.isJumping) {
        gameState.player.velocityY = -gameState.player.jumpForce;
        gameState.player.isJumping = true;
    }
    
    // Shooting for hero1
    if (gameState.keys.space && gameState.player.canShoot) {
        const currentTime = Date.now();
        if (currentTime - gameState.player.lastShotTime > gameState.player.shootCooldown) {
            shootInk();
            gameState.player.lastShotTime = currentTime;
        }
    }
    
    // Close-range splat for hero2
    if (gameState.keys.space && gameState.player.canSplat) {
        const currentTime = Date.now();
        if (currentTime - gameState.player.lastShotTime > 800) { // Longer cooldown for splat
            createInkSplat();
            gameState.player.lastShotTime = currentTime;
        }
    }
    
    // Charging for hero3
    if (gameState.player.canCharge) {
        handleChargeAttack();
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
    
    // Update projectiles
    updateProjectiles();
}

// Function to handle charge attack for hero3
function handleChargeAttack() {
    const currentTime = Date.now();
    
    // Already in barrage mode
    if (gameState.player.isBarraging) {
        // Check if barrage duration has ended
        if (currentTime - gameState.player.barrageStartTime > gameState.player.barrageDuration) {
            gameState.player.isBarraging = false;
            gameState.player.chargeLevel = 0;
        } else {
            // Shoot rapidly during barrage
            if (currentTime - gameState.player.lastShotTime > 100) { // Rapid fire every 100ms
                shootInk();
                gameState.player.lastShotTime = currentTime;
            }
        }
        return;
    }
    
    // Start or continue charging
    if (gameState.keys.space && !gameState.player.isBarraging) {
        if (!gameState.player.isCharging) {
            gameState.player.isCharging = true;
            gameState.player.chargeStartTime = currentTime;
        } else {
            // Calculate charge level (0 to 1)
            const elapsedChargeTime = currentTime - gameState.player.chargeStartTime;
            gameState.player.chargeLevel = Math.min(elapsedChargeTime / gameState.player.maxChargeTime, 1);
            
            // If fully charged, display visual cue
            if (gameState.player.chargeLevel >= 1) {
                // Visual feedback is handled in the draw function
            }
        }
    } else if (gameState.player.isCharging) {
        // Release charge
        gameState.player.isCharging = false;
        
        // Determine barrage duration based on charge level
        let barrageDuration = 0;
        
        if (gameState.player.chargeLevel >= 1) {
            // Fully charged - 1.5 seconds
            barrageDuration = 1500;
        } else if (gameState.player.chargeLevel >= 0.5) {
            // Half charged - 0.75 seconds
            barrageDuration = 750;
        } else if (gameState.player.chargeLevel >= 0.25) {
            // Quarter charged - 0.5 seconds
            barrageDuration = 500;
        } else if (gameState.player.chargeLevel > 0) {
            // Any charge - minimum duration
            barrageDuration = 250;
        }
        
        // Start barrage if there's any charge
        if (barrageDuration > 0) {
            gameState.player.isBarraging = true;
            gameState.player.barrageStartTime = currentTime;
            gameState.player.barrageDuration = barrageDuration;
        }
        
        gameState.player.chargeLevel = 0;
    }
}

// Function to shoot ink
function shootInk() {
    const direction = gameState.player.facingRight ? 1 : -1;
    const offsetX = gameState.player.facingRight ? gameState.player.width : 0;
    
    gameState.projectiles.push({
        x: gameState.player.x + offsetX,
        y: gameState.player.y + gameState.player.height / 2,
        width: 15,
        height: 15,
        speed: 10 * direction,
        color: '#4B0082' // Indigo ink color
    });
}

// Function to create close-range ink splat for hero2
function createInkSplat() {
    const direction = gameState.player.facingRight ? 1 : -1;
    const offsetX = gameState.player.facingRight ? gameState.player.width + 10 : -50;
    
    // Add multiple small ink particles to create a splat effect
    for (let i = 0; i < 12; i++) {
        const angle = Math.random() * Math.PI / 2 - Math.PI / 4; // Random angle between -45 and 45 degrees
        const speed = 3 + Math.random() * 5; // Random speed
        
        gameState.projectiles.push({
            x: gameState.player.x + offsetX,
            y: gameState.player.y + gameState.player.height / 2,
            width: 10 + Math.random() * 10, // Random size
            height: 10 + Math.random() * 10,
            speedX: speed * Math.cos(angle) * direction,
            speedY: speed * Math.sin(angle) - 2, // Slight upward bias
            gravity: 0.2,
            lifespan: 30 + Math.random() * 30, // Random lifespan in frames
            age: 0,
            color: '#00BFFF', // Light blue ink color for hero2
            isSplat: true
        });
    }
}

// Update projectiles
function updateProjectiles() {
    for (let i = gameState.projectiles.length - 1; i >= 0; i--) {
        const projectile = gameState.projectiles[i];
        
        if (projectile.isSplat) {
            // Update splat projectile with gravity and age
            projectile.speedY += projectile.gravity;
            projectile.x += projectile.speedX;
            projectile.y += projectile.speedY;
            projectile.age++;
            
            // Remove if too old
            if (projectile.age > projectile.lifespan) {
                gameState.projectiles.splice(i, 1);
            }
        } else {
            // Normal projectile movement
            projectile.x += projectile.speed;
            
            // Remove projectile if off screen (either direction)
            if (projectile.x > gameState.camera.x + canvas.width + 100 || 
                projectile.x < gameState.camera.x - 100) {
                gameState.projectiles.splice(i, 1);
            }
        }
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
    
    // Draw projectiles
    drawProjectiles();
    
    // Draw charge meter if charging
    if (gameState.player.isCharging || gameState.player.isBarraging) {
        drawChargeMeter();
    }
    
    // Draw player
    if (gameState.player.sprite) {
        // Save the current context state
        ctx.save();
        
        // Position of player accounting for camera
        const drawX = gameState.player.x - gameState.camera.x;
        
        // Set up for flipping if needed
        if (!gameState.player.facingRight) {
            // Flip horizontally
            ctx.translate(drawX + gameState.player.width, gameState.player.y);
            ctx.scale(-1, 1);
            ctx.drawImage(
                gameState.player.sprite,
                0,
                0,
                gameState.player.width,
                gameState.player.height
            );
        } else {
            // Normal drawing (facing right)
            ctx.drawImage(
                gameState.player.sprite,
                drawX,
                gameState.player.y,
                gameState.player.width,
                gameState.player.height
            );
        }
        
        // Restore the context state
        ctx.restore();
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

// Draw projectiles
function drawProjectiles() {
    gameState.projectiles.forEach(projectile => {
        if (projectile.isSplat) {
            // Draw splat with decreasing opacity as it ages
            const opacity = 1 - (projectile.age / projectile.lifespan);
            ctx.fillStyle = projectile.color + Math.floor(opacity * 255).toString(16).padStart(2, '0');
            
            ctx.beginPath();
            ctx.arc(
                projectile.x - gameState.camera.x,
                projectile.y,
                projectile.width / 2,
                0,
                Math.PI * 2
            );
            ctx.fill();
        } else {
            // Normal projectile
            ctx.fillStyle = projectile.color;
            ctx.beginPath();
            ctx.arc(
                projectile.x - gameState.camera.x,
                projectile.y,
                projectile.width / 2,
                0,
                Math.PI * 2
            );
            ctx.fill();
        }
    });
}

// Draw charge meter
function drawChargeMeter() {
    const meterWidth = 50;
    const meterHeight = 5;
    const meterX = gameState.player.x - gameState.camera.x + gameState.player.width/2 - meterWidth/2;
    const meterY = gameState.player.y - 15;
    
    // Draw meter background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(meterX, meterY, meterWidth, meterHeight);
    
    // Draw charge level
    let fillColor = 'yellow';
    if (gameState.player.chargeLevel >= 1) {
        fillColor = 'red'; // Fully charged
    } else if (gameState.player.isBarraging) {
        // Blink during barrage
        fillColor = Math.floor(Date.now() / 100) % 2 === 0 ? 'orange' : 'red';
    }
    
    ctx.fillStyle = fillColor;
    let fillWidth = gameState.player.isBarraging 
        ? meterWidth * (1 - (Date.now() - gameState.player.barrageStartTime) / gameState.player.barrageDuration)
        : meterWidth * gameState.player.chargeLevel;
    
    ctx.fillRect(meterX, meterY, fillWidth, meterHeight);
} 