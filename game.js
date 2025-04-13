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
        isBarraging: false,
        globalCooldown: 1000, // 1 second global cooldown
        lastBarrageEndTime: 0, // Track when the last barrage ended
        // For hero2's contact damage
        hasContactDamage: false,
        contactDamageActive: false,
        contactDamageStartTime: 0,
        contactDamageDuration: 500, // 0.5 seconds of contact damage effect
        contactDamageCooldown: 1500, // 1.5 seconds cooldown
        lastContactDamageTime: 0
    },
    gravity: 0.8,
    ground: {
        y: 550, // Bottom of the canvas - player height
    },
    worldBoundaries: {
        left: 0, // Left boundary
        right: 3000 // Right boundary
    },
    keys: {
        right: false,
        left: false,
        up: false,
        space: false
    },
    gameObjects: [],
    projectiles: [],
    platforms: [], // Added platforms array
    camera: {
        x: 0
    },
    enemies: [] // We'll add some octo-style enemies
};

// Character sprites
const characterSprites = {
    hero1: {
        src: 'assets/game-modes-char.png',
        canShoot: true,
        canCharge: false,
        canSplat: false,
        hasContactDamage: false
    },
    hero2: {
        src: 'assets/splatoon-inline2.jpg',
        canShoot: false,
        canCharge: false,
        canSplat: true,
        hasContactDamage: true
    },
    hero3: {
        src: 'assets/Splatoon_2_-_Inkling_with_Splatlings.png',
        canShoot: false,
        canCharge: true,
        canSplat: false,
        hasContactDamage: false
    }
};

// Enemy sprites and properties
const enemyTypes = {
    octoSlob: {
        width: 50,
        height: 50,
        color: '#FF4500', // Fallback color
        health: 100,
        name: 'OctoSlob',
        src: 'assets/octoslob.jpg',
        shootCooldown: 3000, // Increased from 1000ms to 3000ms (3 seconds)
        projectileSpeed: 7,
        projectileSize: 12,
        projectileDamage: 10,
        detectionRange: 400 // Range to detect player and start shooting
    }
};

// Preload images
const preloadedImages = {};
for (const character in characterSprites) {
    preloadedImages[character] = new Image();
    preloadedImages[character].src = characterSprites[character].src;
}

// Preload enemy images
const enemyImages = {};
for (const enemyType in enemyTypes) {
    if (enemyTypes[enemyType].src) {
        enemyImages[enemyType] = new Image();
        enemyImages[enemyType].src = enemyTypes[enemyType].src;
    }
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
    gameState.player.hasContactDamage = characterSprites[characterType].hasContactDamage;
    
    // Set hero1-specific attributes
    if (characterType === 'hero1') {
        gameState.player.shootCooldown = 350; // Faster fire rate for hero1
    } else {
        gameState.player.shootCooldown = 500; // Default for other heroes
    }
    
    // Generate some enemies for testing contact damage
    generateEnemies();
    
    // Generate platforms
    generatePlatforms();
}

// Generate some enemies to demonstrate contact damage
function generateEnemies() {
    gameState.enemies = [];
    
    // Generate platforms first if they don't exist yet
    if (gameState.platforms.length === 0) {
        generatePlatforms();
    }
    
    // Reduced number of octoslob enemies (5 instead of 10)
    const enemyCount = 5;
    
    // Keep track of occupied positions to prevent overlap
    const occupiedPositions = [];
    
    for (let i = 0; i < enemyCount; i++) {
        // Create a pool of possible spawn positions
        const possiblePositions = [];
        
        // Add ground positions (spaced out)
        possiblePositions.push({
            x: 400 + i * 600 + Math.random() * 200, // More random spacing
            y: gameState.ground.y - enemyTypes.octoSlob.height, // On the ground
            onPlatform: false
        });
        
        // Add platform positions
        gameState.platforms.forEach(platform => {
            // Only add as spawn point if platform is wide enough
            if (platform.width >= enemyTypes.octoSlob.width + 20) {
                possiblePositions.push({
                    x: platform.x + Math.random() * (platform.width - enemyTypes.octoSlob.width),
                    y: platform.y - enemyTypes.octoSlob.height, // On top of platform
                    onPlatform: true
                });
            }
        });
        
        // Filter out positions that would overlap with existing enemies
        const nonOverlappingPositions = possiblePositions.filter(pos => {
            return !isPositionOverlapping(pos, occupiedPositions);
        });
        
        // If no non-overlapping positions, skip this enemy
        if (nonOverlappingPositions.length === 0) {
            continue;
        }
        
        // Choose a random position from the filtered pool
        const randomPositionIndex = Math.floor(Math.random() * nonOverlappingPositions.length);
        const spawnPosition = nonOverlappingPositions[randomPositionIndex];
        
        // Mark this position as occupied for future enemies
        occupiedPositions.push({
            x: spawnPosition.x,
            y: spawnPosition.y,
            width: enemyTypes.octoSlob.width,
            height: enemyTypes.octoSlob.height
        });
        
        // Create the enemy at the selected position
        gameState.enemies.push({
            x: spawnPosition.x,
            y: spawnPosition.y,
            width: enemyTypes.octoSlob.width,
            height: enemyTypes.octoSlob.height,
            health: enemyTypes.octoSlob.health,
            damaged: false,
            damageTime: 0,
            type: 'octoSlob',
            color: enemyTypes.octoSlob.color,
            animationFrame: Math.floor(Math.random() * 4), // Random starting frame
            animationSpeed: 0.1,
            animationCounter: 0,
            direction: Math.random() > 0.5 ? 1 : -1, // Random initial direction
            tentaclePhase: Math.random() * Math.PI * 2, // Random tentacle phase
            lastShotTime: Date.now() - Math.random() * 3000, // Stagger initial shooting times
            facingRight: true, // Direction enemy is facing
            onPlatform: spawnPosition.onPlatform // Track if enemy is on a platform
        });
    }
}

// Check if a position would overlap with existing enemies
function isPositionOverlapping(position, occupiedPositions) {
    const buffer = 20; // Extra space around enemies to ensure they're not too close
    
    for (const occupied of occupiedPositions) {
        // Check for overlap using rectangle collision detection with buffer
        if (position.x < occupied.x + occupied.width + buffer &&
            position.x + enemyTypes.octoSlob.width + buffer > occupied.x &&
            position.y < occupied.y + occupied.height + buffer &&
            position.y + enemyTypes.octoSlob.height + buffer > occupied.y) {
            return true; // Overlap detected
        }
    }
    
    return false; // No overlap
}

// Generate platforms for the game
function generatePlatforms() {
    gameState.platforms = [
        // Format: {x, y, width, height, color}
        {x: 200, y: 450, width: 150, height: 20, color: '#8B4513'},
        {x: 450, y: 380, width: 120, height: 20, color: '#8B4513'},
        {x: 700, y: 320, width: 180, height: 20, color: '#8B4513'},
        {x: 1000, y: 400, width: 150, height: 20, color: '#8B4513'},
        {x: 1250, y: 300, width: 120, height: 20, color: '#8B4513'},
        {x: 1500, y: 380, width: 200, height: 20, color: '#8B4513'},
        {x: 1800, y: 320, width: 150, height: 20, color: '#8B4513'},
        {x: 2100, y: 400, width: 180, height: 20, color: '#8B4513'},
        {x: 2400, y: 350, width: 150, height: 20, color: '#8B4513'},
        {x: 2700, y: 300, width: 200, height: 20, color: '#8B4513'}
    ];
    
    // Update right boundary based on furthest platform
    let furthestPoint = 0;
    gameState.platforms.forEach(platform => {
        const platformEnd = platform.x + platform.width;
        if (platformEnd > furthestPoint) {
            furthestPoint = platformEnd;
        }
    });
    
    // Set the right boundary to be a bit beyond the last platform
    gameState.worldBoundaries.right = furthestPoint + 200;
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
        // Apply boundary check for the right edge
        if (gameState.player.x + gameState.player.width + gameState.player.speed <= gameState.worldBoundaries.right) {
            gameState.player.x += gameState.player.speed;
        } else {
            gameState.player.x = gameState.worldBoundaries.right - gameState.player.width;
        }
        gameState.player.facingRight = true;
    }
    if (gameState.keys.left) {
        // Apply boundary check for the left edge
        if (gameState.player.x - gameState.player.speed >= gameState.worldBoundaries.left) {
            gameState.player.x -= gameState.player.speed;
        } else {
            gameState.player.x = gameState.worldBoundaries.left;
        }
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
    
    // Contact damage for hero2
    if (gameState.player.hasContactDamage) {
        handleContactDamage();
    }
    
    // Apply gravity
    gameState.player.velocityY += gameState.gravity;
    gameState.player.y += gameState.player.velocityY;
    
    // Check for platform collisions
    checkPlatformCollisions();
    
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
    
    // Update enemies
    updateEnemies();
}

// Function to handle charge attack for hero3
function handleChargeAttack() {
    const currentTime = Date.now();
    
    // Check if in global cooldown
    const isInCooldown = currentTime - gameState.player.lastBarrageEndTime < gameState.player.globalCooldown;
    
    // Already in barrage mode
    if (gameState.player.isBarraging) {
        // Check if barrage duration has ended
        if (currentTime - gameState.player.barrageStartTime > gameState.player.barrageDuration) {
            gameState.player.isBarraging = false;
            gameState.player.chargeLevel = 0;
            gameState.player.lastBarrageEndTime = currentTime; // Set the end time
        } else {
            // Shoot rapidly during barrage
            if (currentTime - gameState.player.lastShotTime > 100) { // Rapid fire every 100ms
                // Calculate damage multiplier based on charge level when barrage started
                const chargeDuration = gameState.player.barrageDuration;
                let damageMultiplier = 1;
                
                if (chargeDuration >= 1500) { // Full charge (1.5s)
                    damageMultiplier = 2.0;
                } else if (chargeDuration >= 750) { // Half charge (0.75s)
                    damageMultiplier = 1.5;
                } else if (chargeDuration >= 500) { // Quarter charge (0.5s)
                    damageMultiplier = 1.2;
                }
                
                // Shoot with enhanced damage
                shootChargedInk(damageMultiplier);
                gameState.player.lastShotTime = currentTime;
            }
        }
        return;
    }
    
    // Can't start charging if in cooldown
    if (isInCooldown && !gameState.player.isCharging) {
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

// Function to shoot charged ink for hero3
function shootChargedInk(damageMultiplier) {
    const direction = gameState.player.facingRight ? 1 : -1;
    const offsetX = gameState.player.facingRight ? gameState.player.width : 0;
    
    // Charged shots are larger and more powerful
    gameState.projectiles.push({
        x: gameState.player.x + offsetX,
        y: gameState.player.y + gameState.player.height / 2,
        width: 18, // Larger projectile
        height: 18,
        speed: 12 * direction, // Faster projectile
        color: '#800080', // Purple ink color for charged shots
        damage: 20 * damageMultiplier, // High damage, multiplied by charge level
        canDamage: true
    });
}

// Function to shoot ink
function shootInk() {
    const direction = gameState.player.facingRight ? 1 : -1;
    const offsetX = gameState.player.facingRight ? gameState.player.width : 0;
    
    // For hero3 barrage mode, use charged shots instead
    if (gameState.player.isBarraging) {
        shootChargedInk(1.0); // Default multiplier
        return;
    }
    
    // Regular ink shot for hero1
    gameState.projectiles.push({
        x: gameState.player.x + offsetX,
        y: gameState.player.y + gameState.player.height / 2,
        width: 15,
        height: 15,
        speed: 10 * direction,
        color: '#4B0082', // Indigo ink color
        damage: 15, // Damage for hero1 projectiles
        canDamage: true
    });
}

// Function to create close-range ink splat for hero2
function createInkSplat() {
    const direction = gameState.player.facingRight ? 1 : -1;
    const offsetX = gameState.player.facingRight ? gameState.player.width + 10 : -50;
    
    // Determine if player is jumping - increase range and speed when in the air
    const isJumping = gameState.player.isJumping;
    const speedMultiplier = isJumping ? 1.75 : 1; // 75% faster when jumping
    const particleCount = isJumping ? 15 : 12; // More particles when jumping
    const damageMultiplier = isJumping ? 1.5 : 1; // More damage when jumping
    
    // Add multiple small ink particles to create a splat effect
    for (let i = 0; i < particleCount; i++) {
        const angle = Math.random() * Math.PI / 2 - Math.PI / 4; // Random angle between -45 and 45 degrees
        const speed = (3 + Math.random() * 5) * speedMultiplier; // Random speed, increased when jumping
        
        gameState.projectiles.push({
            x: gameState.player.x + offsetX,
            y: gameState.player.y + gameState.player.height / 2,
            width: 10 + Math.random() * 10, // Random size
            height: 10 + Math.random() * 10,
            speedX: speed * Math.cos(angle) * direction,
            speedY: speed * Math.sin(angle) - (isJumping ? 3 : 2), // More upward bias when jumping
            gravity: 0.2,
            lifespan: 30 + Math.random() * (isJumping ? 45 : 30), // Longer lifespan when jumping
            age: -5 * Math.random(), // Stagger the start times slightly
            color: isJumping ? '#00FFFF' : '#00BFFF', // Slightly different color for jump shots
            isSplat: true,
            damage: 5 * damageMultiplier, // Individual splat particle damage (5 normal, 7.5 when jumping)
            canDamage: true
        });
    }
}

// Function to handle hero2's contact damage
function handleContactDamage() {
    const currentTime = Date.now();
    
    // Auto-activate contact damage if not in cooldown
    if (!gameState.player.contactDamageActive && 
        currentTime - gameState.player.lastContactDamageTime > gameState.player.contactDamageCooldown) {
        gameState.player.contactDamageActive = true;
        gameState.player.contactDamageStartTime = currentTime;
    }
    
    // Check if contact damage duration is over
    if (gameState.player.contactDamageActive && 
        currentTime - gameState.player.contactDamageStartTime > gameState.player.contactDamageDuration) {
        gameState.player.contactDamageActive = false;
        gameState.player.lastContactDamageTime = currentTime;
    }
    
    // Apply contact damage to enemies
    if (gameState.player.contactDamageActive) {
        checkContactDamage();
    }
}

// Check for contact damage with enemies
function checkContactDamage() {
    const player = gameState.player;
    
    // Use standard for loop to safely handle removal during iteration
    for (let i = gameState.enemies.length - 1; i >= 0; i--) {
        const enemy = gameState.enemies[i];
        
        // Simple collision detection
        if (player.x < enemy.x + enemy.width &&
            player.x + player.width > enemy.x &&
            player.y < enemy.y + enemy.height &&
            player.y + player.height > enemy.y) {
            
            // Apply damage (prevent negative health)
            enemy.health = Math.max(0, enemy.health - 10);
            enemy.damaged = true;
            enemy.damageTime = Date.now();
            
            // Create ink splat effect at contact point
            createContactDamageSplat(enemy);
        }
    }
}

// Create ink splash effect for contact damage
function createContactDamageSplat(enemy) {
    const contactPoint = {
        x: (gameState.player.x + gameState.player.width/2 + enemy.x + enemy.width/2) / 2,
        y: (gameState.player.y + gameState.player.height/2 + enemy.y + enemy.height/2) / 2
    };
    
    // Add multiple small ink particles to create a splat effect
    for (let i = 0; i < 8; i++) {
        const angle = Math.random() * Math.PI * 2; // Random angle in all directions
        const speed = 2 + Math.random() * 3; // Random speed
        
        gameState.projectiles.push({
            x: contactPoint.x,
            y: contactPoint.y,
            width: 8 + Math.random() * 8, // Random size
            height: 8 + Math.random() * 8,
            speedX: speed * Math.cos(angle),
            speedY: speed * Math.sin(angle),
            gravity: 0.2,
            lifespan: 15 + Math.random() * 20, // Short lifespan
            age: 0,
            color: '#FF00FF', // Bright purple ink for contact damage
            isSplat: true,
            canDamage: false // Visual effect only, damage already applied by contact
        });
    }
}

// Check for projectile collisions with enemies
function checkProjectileCollisions(projectile) {
    for (let j = gameState.enemies.length - 1; j >= 0; j--) {
        const enemy = gameState.enemies[j];
        
        // Simple collision detection
        if (projectile.x < enemy.x + enemy.width &&
            projectile.x + projectile.width > enemy.x &&
            projectile.y < enemy.y + enemy.height &&
            projectile.y + projectile.height > enemy.y) {
            
            // Apply damage
            enemy.health = Math.max(0, enemy.health - (projectile.damage || 15)); // Prevent negative health
            enemy.damaged = true;
            enemy.damageTime = Date.now();
            
            // Non-splat projectiles are removed on impact
            if (!projectile.isSplat) {
                projectile.canDamage = false;
                return true; // Signal to remove this projectile
            }
            
            return true; // Hit detected
        }
    }
    return false; // No hit
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
            
            // Check for collisions with enemies if it can damage
            if (projectile.canDamage) {
                const hitEnemy = checkProjectileCollisions(projectile);
                if (hitEnemy) {
                    gameState.projectiles.splice(i, 1);
                    continue;
                }
            }
            
            // Remove if too old
            if (projectile.age > projectile.lifespan) {
                gameState.projectiles.splice(i, 1);
            }
        } else {
            // Normal projectile movement
            projectile.x += projectile.speed;
            
            // Check for collisions based on projectile type
            if (projectile.canDamage) {
                if (projectile.isEnemyProjectile) {
                    // Check for collision with player
                    if (checkPlayerProjectileCollision(projectile)) {
                        gameState.projectiles.splice(i, 1);
                        continue;
                    }
                } else {
                    // Check for collision with enemies
                    const hitEnemy = checkProjectileCollisions(projectile);
                    if (hitEnemy) {
                        gameState.projectiles.splice(i, 1);
                        continue;
                    }
                }
            }
            
            // Remove projectile if off screen (either direction)
            if (projectile.x > gameState.camera.x + canvas.width + 100 || 
                projectile.x < gameState.camera.x - 100) {
                gameState.projectiles.splice(i, 1);
            }
        }
    }
}

// Check if enemy projectile hit player
function checkPlayerProjectileCollision(projectile) {
    const player = gameState.player;
    
    // Simple collision detection
    if (projectile.x < player.x + player.width &&
        projectile.x + projectile.width > player.x &&
        projectile.y < player.y + player.height &&
        projectile.y + projectile.height > player.y) {
        
        // Create a splash effect
        createPlayerHitEffect(projectile);
        
        // In a real game, you would apply damage to the player here
        // For this demo, we'll just show the hit effect
        
        return true; // Hit detected
    }
    
    return false; // No hit
}

// Create splash effect when player is hit
function createPlayerHitEffect(projectile) {
    // Add multiple small ink particles to create a splat effect
    for (let i = 0; i < 10; i++) {
        const angle = Math.random() * Math.PI * 2; // Random angle in all directions
        const speed = 2 + Math.random() * 3; // Random speed
        
        gameState.projectiles.push({
            x: projectile.x,
            y: projectile.y,
            width: 8 + Math.random() * 8, // Random size
            height: 8 + Math.random() * 8,
            speedX: speed * Math.cos(angle),
            speedY: speed * Math.sin(angle),
            gravity: 0.2,
            lifespan: 15 + Math.random() * 20, // Short lifespan
            age: 0,
            color: projectile.color, // Same color as the projectile
            isSplat: true,
            canDamage: false // Visual effect only
        });
    }
}

// Update enemies
function updateEnemies() {
    // Current time for cooldowns
    const currentTime = Date.now();
    
    // Check for and remove enemies with zero health
    for (let i = gameState.enemies.length - 1; i >= 0; i--) {
        const enemy = gameState.enemies[i];
        
        // Remove enemy if health is zero
        if (enemy.health <= 0) {
            gameState.enemies.splice(i, 1);
            continue;
        }
        
        // Reset damaged state after 200ms
        if (enemy.damaged && Date.now() - enemy.damageTime > 200) {
            enemy.damaged = false;
        }
        
        // Update animation
        enemy.animationCounter += enemy.animationSpeed;
        if (enemy.animationCounter >= 1) {
            enemy.animationCounter = 0;
            enemy.animationFrame = (enemy.animationFrame + 1) % 4;
        }
        
        // Update tentacle phase
        enemy.tentaclePhase += 0.05;
        if (enemy.tentaclePhase > Math.PI * 2) {
            enemy.tentaclePhase -= Math.PI * 2;
        }
        
        // Enemy AI and shooting for octoslobs
        if (enemy.type === 'octoSlob') {
            // Determine if player is in range
            const distanceToPlayer = Math.abs(enemy.x - gameState.player.x);
            const inRange = distanceToPlayer < enemyTypes.octoSlob.detectionRange;
            
            // Update facing direction
            enemy.facingRight = gameState.player.x > enemy.x;
            
            // Shoot if in range and cooldown has passed
            if (inRange && currentTime - enemy.lastShotTime > enemyTypes.octoSlob.shootCooldown) {
                enemyShootInk(enemy);
                enemy.lastShotTime = currentTime;
            }
        }
    }
}

// Function for enemies to shoot ink
function enemyShootInk(enemy) {
    // Determine direction to player
    const direction = enemy.facingRight ? 1 : -1;
    const offsetX = enemy.facingRight ? enemy.width : 0;
    
    // Create enemy ink projectile
    gameState.projectiles.push({
        x: enemy.x + offsetX,
        y: enemy.y + enemy.height / 2,
        width: enemyTypes.octoSlob.projectileSize,
        height: enemyTypes.octoSlob.projectileSize,
        speed: enemyTypes.octoSlob.projectileSpeed * direction,
        color: '#FF4500', // Orange-red ink color for enemies
        damage: enemyTypes.octoSlob.projectileDamage,
        canDamage: true,
        isEnemyProjectile: true // Flag to identify enemy projectiles
    });
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
    
    // Draw platforms
    drawPlatforms();
    
    // Draw enemies
    drawEnemies();
    
    // Draw projectiles
    drawProjectiles();
    
    // Draw charge meter if charging
    if (gameState.player.isCharging || gameState.player.isBarraging) {
        drawChargeMeter();
    }
    
    // Draw contact damage effect if active for hero2
    if (gameState.player.hasContactDamage) {
        drawContactDamageEffect();
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
    
    // Optionally, visualize the boundaries for debugging
    if (false) { // Set to true to see the boundaries
        // Left boundary
        ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
        ctx.fillRect(
            gameState.worldBoundaries.left - gameState.camera.x,
            0,
            10,
            canvas.height
        );
        
        // Right boundary
        ctx.fillRect(
            gameState.worldBoundaries.right - gameState.camera.x,
            0,
            10,
            canvas.height
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

// Draw enemies
function drawEnemies() {
    gameState.enemies.forEach(enemy => {
        const drawX = enemy.x - gameState.camera.x;
        
        // Skip rendering if off screen
        if (drawX < -100 || drawX > canvas.width + 100) {
            return;
        }
        
        // Draw octoslob
        if (enemy.type === 'octoSlob') {
            drawOctoSlob(enemy, drawX);
        }
    });
}

// Draw an octoslob enemy
function drawOctoSlob(enemy, drawX) {
    // Save context
    ctx.save();
    
    // Draw the octoslob image if loaded
    if (enemyImages.octoSlob && enemyImages.octoSlob.complete) {
        // If damaged, draw white overlay
        if (enemy.damaged) {
            ctx.globalAlpha = 0.7;
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(drawX, enemy.y, enemy.width, enemy.height);
            ctx.globalAlpha = 1.0;
        }
        
        // Draw with slight pulsating scale
        const pulseScale = 0.95 + Math.sin(Date.now() / 300) * 0.05;
        const centerX = drawX + enemy.width/2;
        const centerY = enemy.y + enemy.height/2;
        const scaledWidth = enemy.width * pulseScale;
        const scaledHeight = enemy.height * pulseScale;
        
        // Position for drawing
        let drawPosX = centerX - scaledWidth/2;
        
        // Flip image if facing left
        if (!enemy.facingRight) {
            ctx.save();
            ctx.translate(centerX * 2, 0);
            ctx.scale(-1, 1);
            drawPosX = centerX - scaledWidth/2;
        }
        
        // Draw from center point with pulsing scale
        ctx.drawImage(
            enemyImages.octoSlob,
            drawPosX, 
            centerY - scaledHeight/2,
            scaledWidth,
            scaledHeight
        );
        
        // Restore if flipped
        if (!enemy.facingRight) {
            ctx.restore();
        }
    } else {
        // Fallback to the original drawing method if image fails to load
        // Base color (flash white if damaged)
        const baseColor = enemy.damaged ? '#FFFFFF' : enemy.color;
        
        // Draw simple octoslob placeholder
        ctx.fillStyle = baseColor;
        ctx.beginPath();
        ctx.arc(
            drawX + enemy.width/2,
            enemy.y + enemy.height/2,
            enemy.width/2,
            0,
            Math.PI * 2
        );
        ctx.fill();
        
        // Draw eyes
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(
            drawX + enemy.width/3,
            enemy.y + enemy.height/3,
            enemy.width/8,
            0,
            Math.PI * 2
        );
        ctx.arc(
            drawX + enemy.width*2/3,
            enemy.y + enemy.height/3,
            enemy.width/8,
            0,
            Math.PI * 2
        );
        ctx.fill();
    }
    
    // Draw shooting cooldown indicator
    const cooldownRemaining = enemyTypes.octoSlob.shootCooldown - (Date.now() - enemy.lastShotTime);
    if (cooldownRemaining > 0 && cooldownRemaining < enemyTypes.octoSlob.shootCooldown) {
        const cooldownWidth = enemy.width * 0.8;
        const cooldownHeight = 3;
        const cooldownX = drawX + enemy.width/2 - cooldownWidth/2;
        const cooldownY = enemy.y - 8;
        
        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(cooldownX, cooldownY, cooldownWidth, cooldownHeight);
        
        // Fill based on cooldown progress
        const progress = 1 - (cooldownRemaining / enemyTypes.octoSlob.shootCooldown);
        ctx.fillStyle = 'rgba(255, 120, 0, 0.7)';
        ctx.fillRect(cooldownX, cooldownY, cooldownWidth * progress, cooldownHeight);
    }
    
    // Draw health bar
    const healthBarWidth = enemy.width;
    const healthBarHeight = 5;
    
    // Health bar background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(
        drawX,
        enemy.y - 15,
        healthBarWidth,
        healthBarHeight
    );
    
    // Health bar fill
    ctx.fillStyle = 'rgba(0, 255, 0, 0.7)';
    ctx.fillRect(
        drawX,
        enemy.y - 15,
        (enemy.health / enemyTypes.octoSlob.health) * healthBarWidth,
        healthBarHeight
    );
    
    // Restore context
    ctx.restore();
}

// Draw contact damage effect
function drawContactDamageEffect() {
    if (gameState.player.contactDamageActive) {
        // Draw aura around player
        ctx.save();
        
        // Pulsating effect
        const pulseSize = 1 + Math.sin(Date.now() / 50) * 0.1;
        const drawX = gameState.player.x - gameState.camera.x;
        
        // Create gradient
        const gradient = ctx.createRadialGradient(
            drawX + gameState.player.width/2, 
            gameState.player.y + gameState.player.height/2,
            gameState.player.width/2 * 0.8,
            drawX + gameState.player.width/2, 
            gameState.player.y + gameState.player.height/2,
            gameState.player.width/2 * 1.2 * pulseSize
        );
        
        gradient.addColorStop(0, 'rgba(255, 0, 255, 0)');
        gradient.addColorStop(0.7, 'rgba(255, 0, 255, 0.5)');
        gradient.addColorStop(1, 'rgba(255, 0, 255, 0)');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(
            drawX + gameState.player.width/2,
            gameState.player.y + gameState.player.height/2,
            gameState.player.width/2 * 1.5 * pulseSize,
            0,
            Math.PI * 2
        );
        ctx.fill();
        
        ctx.restore();
    }
    // Cooldown bar removed - no visual indicator for cooldown now
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
    
    // Check if in cooldown
    const currentTime = Date.now();
    const isInCooldown = currentTime - gameState.player.lastBarrageEndTime < gameState.player.globalCooldown;
    
    // Draw charge level
    let fillColor = 'yellow';
    if (isInCooldown) {
        // During cooldown, show gray depleting bar
        fillColor = '#555555';
        const cooldownProgress = 1 - ((currentTime - gameState.player.lastBarrageEndTime) / gameState.player.globalCooldown);
        ctx.fillStyle = fillColor;
        ctx.fillRect(meterX, meterY, meterWidth * cooldownProgress, meterHeight);
        return;
    }
    
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
    
    // Draw marker at 1/4 charge
    ctx.fillStyle = 'white';
    ctx.fillRect(meterX + (meterWidth * 0.25) - 1, meterY - 2, 2, meterHeight + 4);
    
    // Draw marker at 1/2 charge
    ctx.fillStyle = 'white';
    ctx.fillRect(meterX + (meterWidth * 0.5) - 1, meterY - 2, 2, meterHeight + 4);
}

// Draw platforms
function drawPlatforms() {
    for (const platform of gameState.platforms) {
        // Skip if platform is off screen
        if (platform.x + platform.width < gameState.camera.x || 
            platform.x > gameState.camera.x + canvas.width) {
            continue;
        }
        
        // Draw platform
        ctx.fillStyle = platform.color;
        ctx.fillRect(
            platform.x - gameState.camera.x,
            platform.y,
            platform.width,
            platform.height
        );
        
        // Add wood grain texture
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.lineWidth = 1;
        
        // Draw horizontal lines for wood grain
        for (let i = 3; i < platform.height; i += 4) {
            ctx.beginPath();
            ctx.moveTo(platform.x - gameState.camera.x, platform.y + i);
            ctx.lineTo(platform.x - gameState.camera.x + platform.width, platform.y + i);
            ctx.stroke();
        }
    }
}

// Check for collisions with platforms
function checkPlatformCollisions() {
    const player = gameState.player;
    
    // Only check for platform collisions if the player is falling
    if (player.velocityY < 0) {
        return;
    }
    
    // Get player's bottom edge
    const playerBottom = player.y + player.height;
    const playerLeft = player.x;
    const playerRight = player.x + player.width;
    
    // Check each platform
    for (const platform of gameState.platforms) {
        // Check if player's bottom edge is at or slightly above the platform's top edge
        const wasAbovePlatform = playerBottom - player.velocityY <= platform.y;
        
        // Check if player is now colliding with platform
        if (wasAbovePlatform &&
            playerBottom >= platform.y &&
            playerBottom <= platform.y + platform.height/2 &&
            playerRight > platform.x &&
            playerLeft < platform.x + platform.width) {
            
            // Place player on top of platform
            player.y = platform.y - player.height;
            player.velocityY = 0;
            player.isJumping = false;
            break; // Exit after first platform collision
        }
    }
} 