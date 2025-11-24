/**
 * Simple 3D Cube Grid Visualization
 * A cube is represented by 6 faces, each face is a grid
 */

// Three.js setup
let scene, camera, renderer, controls;
let cubeGroup;

// Configuration
let config = {
    gridDensity: 10,      // Grid points per side
    cubeSize: 300,        // Size of the cube
    lineOpacity: 0.8,
    showFront: true,
    showBack: true,
    showLeft: true,
    showRight: true,
    showTop: true,
    showBottom: true,
    showFloor: true,
    showCloth: true,      // Show cloth draping
    floorSize: 800,       // Size of the floor plane
    floorOpacity: 0.3,    // Floor grid opacity (density auto-calculated to match cube)
    clothStiffness: 0.5,  // 0 = very soft (gradual drop), 1 = very stiff (steep drop)
    clothOpacity: 0.6,    // Cloth grid opacity
    clothExtension: 3     // How many grid steps the cloth extends from cube edge (0 = clings to cube)
};

// Initialize Three.js scene
function init() {
    const container = document.getElementById('canvas-container');
    
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf5f5f5);
    
    // Camera
    camera = new THREE.PerspectiveCamera(
        60,
        window.innerWidth / window.innerHeight,
        1,
        10000
    );
    camera.position.set(500, 400, 500);
    camera.lookAt(0, 0, 0);
    
    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);
    
    // Controls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    
    // Cube group
    cubeGroup = new THREE.Group();
    scene.add(cubeGroup);
    
    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);
    
    // Handle window resize
    window.addEventListener('resize', onWindowResize, false);
    
    // Initial render
    createCube();
    createFloor();
    createCloth();
    animate();
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

/**
 * Create a grid face
 * @param {Array} corners - 4 corner points defining the face [topLeft, topRight, bottomRight, bottomLeft]
 * @param {number} density - Number of grid divisions
 * @returns {THREE.Group} - Group containing the grid lines
 */
function createGridFace(corners, density) {
    const group = new THREE.Group();
    const material = new THREE.LineBasicMaterial({
        color: 0x333333,
        transparent: true,
        opacity: config.lineOpacity
    });
    
    const [topLeft, topRight, bottomRight, bottomLeft] = corners;
    
    // Create horizontal lines
    for (let i = 0; i <= density; i++) {
        const t = i / density;
        
        // Interpolate left edge
        const leftPoint = new THREE.Vector3(
            topLeft.x + t * (bottomLeft.x - topLeft.x),
            topLeft.y + t * (bottomLeft.y - topLeft.y),
            topLeft.z + t * (bottomLeft.z - topLeft.z)
        );
        
        // Interpolate right edge
        const rightPoint = new THREE.Vector3(
            topRight.x + t * (bottomRight.x - topRight.x),
            topRight.y + t * (bottomRight.y - topRight.y),
            topRight.z + t * (bottomRight.z - topRight.z)
        );
        
        const geometry = new THREE.BufferGeometry().setFromPoints([leftPoint, rightPoint]);
        const line = new THREE.Line(geometry, material);
        group.add(line);
    }
    
    // Create vertical lines
    for (let i = 0; i <= density; i++) {
        const t = i / density;
        
        // Interpolate top edge
        const topPoint = new THREE.Vector3(
            topLeft.x + t * (topRight.x - topLeft.x),
            topLeft.y + t * (topRight.y - topLeft.y),
            topLeft.z + t * (topRight.z - topLeft.z)
        );
        
        // Interpolate bottom edge
        const bottomPoint = new THREE.Vector3(
            bottomLeft.x + t * (bottomRight.x - bottomLeft.x),
            bottomLeft.y + t * (bottomRight.y - bottomLeft.y),
            bottomLeft.z + t * (bottomRight.z - bottomLeft.z)
        );
        
        const geometry = new THREE.BufferGeometry().setFromPoints([topPoint, bottomPoint]);
        const line = new THREE.Line(geometry, material);
        group.add(line);
    }
    
    return group;
}

/**
 * Create a cube made of 6 grid faces
 */
function createCube() {
    cubeGroup.clear();
    
    const d = config.gridDensity;
    
    // Calculate grid spacing
    const gridSpacing = config.cubeSize / config.gridDensity;
    
    // Snap cube to grid - ensure cube corners sit on grid intersection points
    // The cube should be centered, with its size being an exact multiple of grid spacing
    const s = config.cubeSize / 2; // Half size for centering
    
    // Bottom Y should align with floor
    const bottomY = -s;
    const topY = s;
    
    // Define the 8 corners of the cube
    // These will sit exactly on grid intersection points
    const corners = {
        // Front face corners
        ftl: new THREE.Vector3(-s, topY, s),      // front top left
        ftr: new THREE.Vector3(s, topY, s),       // front top right
        fbr: new THREE.Vector3(s, bottomY, s),    // front bottom right
        fbl: new THREE.Vector3(-s, bottomY, s),   // front bottom left
        
        // Back face corners
        btl: new THREE.Vector3(-s, topY, -s),     // back top left
        btr: new THREE.Vector3(s, topY, -s),      // back top right
        bbr: new THREE.Vector3(s, bottomY, -s),   // back bottom right
        bbl: new THREE.Vector3(-s, bottomY, -s)   // back bottom left
    };
    
    // Create 6 faces
    if (config.showFront) {
        const frontFace = createGridFace([corners.ftl, corners.ftr, corners.fbr, corners.fbl], d);
        cubeGroup.add(frontFace);
    }
    
    if (config.showBack) {
        const backFace = createGridFace([corners.btr, corners.btl, corners.bbl, corners.bbr], d);
        cubeGroup.add(backFace);
    }
    
    if (config.showLeft) {
        const leftFace = createGridFace([corners.btl, corners.ftl, corners.fbl, corners.bbl], d);
        cubeGroup.add(leftFace);
    }
    
    if (config.showRight) {
        const rightFace = createGridFace([corners.ftr, corners.btr, corners.bbr, corners.fbr], d);
        cubeGroup.add(rightFace);
    }
    
    if (config.showTop) {
        const topFace = createGridFace([corners.btl, corners.btr, corners.ftr, corners.ftl], d);
        cubeGroup.add(topFace);
    }
    
    if (config.showBottom) {
        const bottomFace = createGridFace([corners.fbl, corners.fbr, corners.bbr, corners.bbl], d);
        cubeGroup.add(bottomFace);
    }
}

/**
 * Create a floor plane grid behind the cube
 */
function createFloor() {
    // Remove existing floor if any
    const existingFloor = scene.getObjectByName('floorGrid');
    if (existingFloor) {
        scene.remove(existingFloor);
    }
    
    if (!config.showFloor) return;
    
    const floorGroup = new THREE.Group();
    floorGroup.name = 'floorGrid';
    
    const material = new THREE.LineBasicMaterial({
        color: 0x666666,
        transparent: true,
        opacity: config.floorOpacity
    });
    
    // Calculate grid spacing from cube (this is the key - same spacing!)
    const gridSpacing = config.cubeSize / config.gridDensity;
    
    // Position floor at the bottom of the cube
    const floorY = -config.cubeSize / 2;
    
    // Calculate how many grid cells fit in the floor
    // Round to ensure we have complete grid cells
    const numCellsX = Math.floor(config.floorSize / gridSpacing);
    const numCellsZ = Math.floor(config.floorSize / gridSpacing);
    
    // Calculate actual floor size to be exact multiple of grid spacing
    const actualFloorSizeX = numCellsX * gridSpacing;
    const actualFloorSizeZ = numCellsZ * gridSpacing;
    
    // Center the floor around origin
    const halfX = actualFloorSizeX / 2;
    const halfZ = actualFloorSizeZ / 2;
    
    // Create grid lines using exact grid spacing
    // Lines parallel to Z axis (running front to back)
    for (let i = 0; i <= numCellsX; i++) {
        const x = -halfX + (i * gridSpacing);
        
        const backPoint = new THREE.Vector3(x, floorY, -halfZ);
        const frontPoint = new THREE.Vector3(x, floorY, halfZ);
        
        const geometry = new THREE.BufferGeometry().setFromPoints([backPoint, frontPoint]);
        const line = new THREE.Line(geometry, material);
        floorGroup.add(line);
    }
    
    // Lines parallel to X axis (running left to right)
    for (let i = 0; i <= numCellsZ; i++) {
        const z = -halfZ + (i * gridSpacing);
        
        const leftPoint = new THREE.Vector3(-halfX, floorY, z);
        const rightPoint = new THREE.Vector3(halfX, floorY, z);
        
        const geometry = new THREE.BufferGeometry().setFromPoints([leftPoint, rightPoint]);
        const line = new THREE.Line(geometry, material);
        floorGroup.add(line);
    }
    
    scene.add(floorGroup);
}

/**
 * Create a single continuous cloth grid layer
 * The cube "pushes" the grid forward (in Z), creating displacement
 * Points closer to the cube have more Z displacement, creating a deformation effect
 */
function createCloth() {
    // Remove existing cloth if any
    const existingCloth = scene.getObjectByName('clothGrid');
    if (existingCloth) {
        scene.remove(existingCloth);
    }
    
    if (!config.showCloth) return;
    
    const clothGroup = new THREE.Group();
    clothGroup.name = 'clothGrid';
    
    const material = new THREE.LineBasicMaterial({
        color: 0x4444ff,
        transparent: true,
        opacity: config.clothOpacity
    });
    
    // Calculate grid spacing
    const gridSpacing = config.cubeSize / config.gridDensity;
    const s = config.cubeSize / 2;
    
    // Floor is at Y = -s, same as floor grid
    const floorY = -s;
    
    // Calculate grid dimensions to match floor
    const numCellsX = Math.floor(config.floorSize / gridSpacing);
    const numCellsZ = Math.floor(config.floorSize / gridSpacing);
    const halfX = (numCellsX * gridSpacing) / 2;
    const halfZ = (numCellsZ * gridSpacing) / 2;
    
    /**
     * Calculate Y displacement (height) for a point based on its distance from the cube
     * Points inside or on the cube get full displacement (lifted up)
     * Points outside get displacement based on distance (with falloff)
     */
    function calculateYDisplacement(x, z) {
        // Calculate distance from cube center in XZ plane
        const dx = Math.abs(x);
        const dz = Math.abs(z);
        
        // Use Chebyshev distance (max of absolute differences) for cube
        const distanceFromCenter = Math.max(dx, dz);
        const cubeRadius = s;
        
        // If inside or on cube boundary, full displacement
        if (distanceFromCenter <= cubeRadius) {
            return config.cubeSize; // Full upward displacement
        }
        
        // Outside cube: calculate falloff based on distance
        const distanceFromCube = distanceFromCenter - cubeRadius;
        
        // Influence distance is based on clothExtension (in grid steps)
        const influenceDistance = config.clothExtension * gridSpacing;
        
        if (influenceDistance === 0 || distanceFromCube > influenceDistance) {
            return 0; // No displacement beyond influence distance
        }
        
        // Exponential falloff
        const normalizedDistance = distanceFromCube / influenceDistance;
        const exponent = 1 + (config.clothStiffness * 4);
        const falloff = 1 - Math.pow(normalizedDistance, exponent);
        
        return config.cubeSize * falloff;
    }
    
    // Create a 2D grid of points with Y displacement (height)
    const clothPoints = [];
    for (let i = 0; i <= numCellsX; i++) {
        clothPoints[i] = [];
        const x = -halfX + (i * gridSpacing);
        
        for (let j = 0; j <= numCellsZ; j++) {
            const z = -halfZ + (j * gridSpacing);
            
            // Calculate Y displacement (height) based on distance from cube
            const yDisplacement = calculateYDisplacement(x, z);
            
            // Position: floor level, but lifted up in Y by displacement
            clothPoints[i][j] = new THREE.Vector3(x, floorY + yDisplacement, z);
        }
    }
    
    // Create horizontal lines (constant j, varying i)
    for (let j = 0; j <= numCellsZ; j++) {
        const points = [];
        for (let i = 0; i <= numCellsX; i++) {
            points.push(clothPoints[i][j]);
        }
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geometry, material);
        clothGroup.add(line);
    }
    
    // Create vertical lines (constant i, varying j)
    for (let i = 0; i <= numCellsX; i++) {
        const points = [];
        for (let j = 0; j <= numCellsZ; j++) {
            points.push(clothPoints[i][j]);
        }
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geometry, material);
        clothGroup.add(line);
    }
    
    scene.add(clothGroup);
}

// UI Controls
function setupUI() {
    document.getElementById('densitySlider').addEventListener('input', (e) => {
        config.gridDensity = parseInt(e.target.value);
        document.getElementById('densityValue').textContent = config.gridDensity;
        createCube();
        createFloor(); // Update floor to match new grid spacing
        createCloth(); // Update cloth to match new grid spacing
    });
    
    document.getElementById('cubeSizeSlider').addEventListener('input', (e) => {
        config.cubeSize = parseInt(e.target.value);
        document.getElementById('cubeSizeValue').textContent = config.cubeSize;
        createCube();
        createFloor(); // Update floor position when cube size changes
        createCloth(); // Update cloth deformation when cube size changes
    });
    
    document.getElementById('opacitySlider').addEventListener('input', (e) => {
        config.lineOpacity = parseFloat(e.target.value);
        document.getElementById('opacityValue').textContent = config.lineOpacity.toFixed(1);
        createCube();
    });
    
    document.getElementById('floorSizeSlider').addEventListener('input', (e) => {
        config.floorSize = parseInt(e.target.value);
        document.getElementById('floorSizeValue').textContent = config.floorSize;
        createFloor();
    });
    
    document.getElementById('floorOpacitySlider').addEventListener('input', (e) => {
        config.floorOpacity = parseFloat(e.target.value);
        document.getElementById('floorOpacityValue').textContent = config.floorOpacity.toFixed(1);
        createFloor();
    });
    
    document.getElementById('clothStiffnessSlider').addEventListener('input', (e) => {
        config.clothStiffness = parseFloat(e.target.value);
        document.getElementById('clothStiffnessValue').textContent = config.clothStiffness.toFixed(2);
        createCloth();
    });
    
    document.getElementById('clothExtensionSlider').addEventListener('input', (e) => {
        config.clothExtension = parseInt(e.target.value);
        document.getElementById('clothExtensionValue').textContent = config.clothExtension;
        createCloth();
    });
    
    document.getElementById('clothOpacitySlider').addEventListener('input', (e) => {
        config.clothOpacity = parseFloat(e.target.value);
        document.getElementById('clothOpacityValue').textContent = config.clothOpacity.toFixed(1);
        createCloth();
    });
    
    // Face toggles
    ['Front', 'Back', 'Left', 'Right', 'Top', 'Bottom'].forEach(face => {
        const checkbox = document.getElementById(`show${face}`);
        checkbox.checked = config[`show${face}`];
        checkbox.addEventListener('change', (e) => {
            config[`show${face}`] = e.target.checked;
            createCube();
        });
    });
    
    // Floor toggle
    document.getElementById('showFloor').addEventListener('change', (e) => {
        config.showFloor = e.target.checked;
        createFloor();
    });
    
    // Cloth toggle
    document.getElementById('showCloth').addEventListener('change', (e) => {
        config.showCloth = e.target.checked;
        createCloth();
    });
    
    document.getElementById('resetCameraBtn').addEventListener('click', () => {
        camera.position.set(500, 400, 500);
        camera.lookAt(0, 0, 0);
        controls.target.set(0, 0, 0);
        controls.update();
    });
}

// Initialize on load
window.addEventListener('DOMContentLoaded', () => {
    init();
    setupUI();
});
