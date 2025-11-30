// Three.js Grid Draping Visualization
// Recreates a cloth-like grid draping over a half-sunken cube

let scene, camera, renderer, controls;
let backGridGroup, frontGridGroup, connectionsGroup;

// Configuration
let config = {
    gridDensity: 25,
    cubeX: 12,
    cubeY: 12,
    zSeparation: 250,
    cubeSize: 6,
    influenceRadius: 70,
    gridOpacity: 0.8,
    lineThickness: 1.5,
    shapeType: 'cube',
    showBackGrid: true
};

// Initialize Three.js scene
function init() {
    const container = document.getElementById('canvas-container');

    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8f9fa);

    // Camera
    camera = new THREE.PerspectiveCamera(
        50,
        window.innerWidth / window.innerHeight,
        1,
        5000
    );
    camera.position.set(600, 400, 800);
    camera.lookAt(0, 0, 0);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Controls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 300;
    controls.maxDistance = 2000;
    controls.maxPolarAngle = Math.PI * 0.9;

    // Groups for organized rendering
    backGridGroup = new THREE.Group();
    frontGridGroup = new THREE.Group();
    connectionsGroup = new THREE.Group();

    scene.add(backGridGroup);
    scene.add(frontGridGroup);
    scene.add(connectionsGroup);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.4);
    directionalLight.position.set(5, 10, 7);
    scene.add(directionalLight);

    // Handle window resize
    window.addEventListener('resize', onWindowResize, false);

    // Initialize UI
    initializeUI();

    // Initial render
    updateVisualization();
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

// Calculate Z displacement for cloth draping effect
function calculateZDisplacement(i, j) {
    const dx = i - config.cubeX;
    const dy = j - config.cubeY;

    let distance;
    let shapeRadius = config.cubeSize;

    if (config.shapeType === 'cube') {
        // Chebyshev distance for cube (max of absolute differences)
        distance = Math.max(Math.abs(dx), Math.abs(dy));
    } else {
        // Euclidean distance for sphere
        distance = Math.sqrt(dx * dx + dy * dy);
    }

    // Calculate influence zone
    const influenceDistance = config.gridDensity * (config.influenceRadius / 100);

    // Inside the shape - full displacement
    if (distance <= shapeRadius) {
        return config.zSeparation;
    }

    // In the influence zone - smooth falloff
    if (influenceDistance > 0 && distance <= shapeRadius + influenceDistance) {
        const distanceFromShape = distance - shapeRadius;
        const normalizedDist = distanceFromShape / influenceDistance;

        // Smooth cosine interpolation for natural draping
        const falloff = (Math.cos(normalizedDist * Math.PI) + 1) / 2;
        return config.zSeparation * falloff;
    }

    // Outside influence zone - no displacement
    return 0;
}

// Create grid with smooth lines
function createGrid(points, color, opacity, lineWidth = 1) {
    const group = new THREE.Group();
    const material = new THREE.LineBasicMaterial({
        color: color,
        transparent: true,
        opacity: opacity,
        linewidth: lineWidth
    });

    // Horizontal lines
    for (let j = 0; j <= config.gridDensity; j++) {
        const geometry = new THREE.BufferGeometry();
        const vertices = [];

        for (let i = 0; i <= config.gridDensity; i++) {
            const point = points[i][j];
            vertices.push(point.x, point.y, point.z);
        }

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        const line = new THREE.Line(geometry, material);
        group.add(line);
    }

    // Vertical lines
    for (let i = 0; i <= config.gridDensity; i++) {
        const geometry = new THREE.BufferGeometry();
        const vertices = [];

        for (let j = 0; j <= config.gridDensity; j++) {
            const point = points[i][j];
            vertices.push(point.x, point.y, point.z);
        }

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        const line = new THREE.Line(geometry, material);
        group.add(line);
    }

    return group;
}

// Create connection lines between back and front grids
function createConnections(backPoints, frontPoints) {
    const group = new THREE.Group();
    const material = new THREE.LineBasicMaterial({
        color: 0x667eea,
        transparent: true,
        opacity: config.gridOpacity * 0.3,
        linewidth: config.lineThickness * 0.5
    });

    // Only draw connections where there's significant displacement
    for (let i = 0; i <= config.gridDensity; i++) {
        for (let j = 0; j <= config.gridDensity; j++) {
            const back = backPoints[i][j];
            const front = frontPoints[i][j];

            // Only show connections with noticeable displacement
            if (Math.abs(front.z - back.z) > 10) {
                const geometry = new THREE.BufferGeometry();
                const vertices = [
                    back.x, back.y, back.z,
                    front.x, front.y, front.z
                ];
                geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
                const line = new THREE.Line(geometry, material);
                group.add(line);
            }
        }
    }

    return group;
}

// Update the entire visualization
function updateVisualization() {
    // Clear existing geometry
    backGridGroup.clear();
    frontGridGroup.clear();
    connectionsGroup.clear();

    const spacing = 600 / config.gridDensity;
    const backZ = -200;

    // Create back grid points (flat, no displacement)
    const backPoints = [];
    for (let i = 0; i <= config.gridDensity; i++) {
        backPoints[i] = [];
        for (let j = 0; j <= config.gridDensity; j++) {
            const x = (i - config.gridDensity / 2) * spacing;
            const y = (j - config.gridDensity / 2) * spacing;
            backPoints[i][j] = { x, y, z: backZ };
        }
    }

    // Create front grid points (with Z displacement for draping)
    const frontPoints = [];
    for (let i = 0; i <= config.gridDensity; i++) {
        frontPoints[i] = [];
        for (let j = 0; j <= config.gridDensity; j++) {
            const x = (i - config.gridDensity / 2) * spacing;
            const y = (j - config.gridDensity / 2) * spacing;
            const zDisplacement = calculateZDisplacement(i, j);
            frontPoints[i][j] = { x, y, z: backZ + zDisplacement };
        }
    }

    // Render back grid (subtle, behind)
    if (config.showBackGrid) {
        const backGrid = createGrid(backPoints, 0xaaaaaa, config.gridOpacity * 0.25, config.lineThickness * 0.7);
        backGridGroup.add(backGrid);
    }

    // Render front grid (main cloth layer)
    const frontGrid = createGrid(frontPoints, 0x333333, config.gridOpacity, config.lineThickness);
    frontGridGroup.add(frontGrid);

    // Render connections between layers
    const connections = createConnections(backPoints, frontPoints);
    connectionsGroup.add(connections);
}

// Reset camera to default view
function resetCamera() {
    camera.position.set(600, 400, 800);
    camera.lookAt(0, 0, 0);
    controls.target.set(0, 0, 0);
    controls.update();
}

// UI initialization
function initializeUI() {
    // Set initial values
    document.getElementById('densitySlider').value = config.gridDensity;
    document.getElementById('densityValue').textContent = config.gridDensity;

    document.getElementById('pointXSlider').value = config.cubeX;
    document.getElementById('pointXValue').textContent = config.cubeX;

    document.getElementById('pointYSlider').value = config.cubeY;
    document.getElementById('pointYValue').textContent = config.cubeY;

    document.getElementById('zSeparationSlider').value = config.zSeparation;
    document.getElementById('zSeparationValue').textContent = config.zSeparation;

    document.getElementById('cubeSizeSlider').value = config.cubeSize;
    document.getElementById('cubeSizeValue').textContent = config.cubeSize;

    document.getElementById('influenceRadiusSlider').value = config.influenceRadius;
    document.getElementById('influenceRadiusValue').textContent = config.influenceRadius + '%';

    document.getElementById('gridOpacitySlider').value = config.gridOpacity;
    document.getElementById('gridOpacityValue').textContent = config.gridOpacity.toFixed(1);

    document.getElementById('lineThicknessSlider').value = config.lineThickness;
    document.getElementById('lineThicknessValue').textContent = config.lineThickness.toFixed(1);

    // Event listeners
    document.getElementById('densitySlider').addEventListener('input', (e) => {
        config.gridDensity = parseInt(e.target.value);
        document.getElementById('densityValue').textContent = config.gridDensity;
        updatePointSliderMax();
        updateVisualization();
    });

    document.getElementById('pointXSlider').addEventListener('input', (e) => {
        config.cubeX = parseInt(e.target.value);
        document.getElementById('pointXValue').textContent = config.cubeX;
        updateVisualization();
    });

    document.getElementById('pointYSlider').addEventListener('input', (e) => {
        config.cubeY = parseInt(e.target.value);
        document.getElementById('pointYValue').textContent = config.cubeY;
        updateVisualization();
    });

    document.getElementById('zSeparationSlider').addEventListener('input', (e) => {
        config.zSeparation = parseInt(e.target.value);
        document.getElementById('zSeparationValue').textContent = config.zSeparation;
        updateVisualization();
    });

    document.getElementById('cubeSizeSlider').addEventListener('input', (e) => {
        config.cubeSize = parseInt(e.target.value);
        document.getElementById('cubeSizeValue').textContent = config.cubeSize;
        updateVisualization();
    });

    document.getElementById('influenceRadiusSlider').addEventListener('input', (e) => {
        config.influenceRadius = parseInt(e.target.value);
        document.getElementById('influenceRadiusValue').textContent = config.influenceRadius + '%';
        updateVisualization();
    });

    document.getElementById('gridOpacitySlider').addEventListener('input', (e) => {
        config.gridOpacity = parseFloat(e.target.value);
        document.getElementById('gridOpacityValue').textContent = config.gridOpacity.toFixed(1);
        updateVisualization();
    });

    document.getElementById('lineThicknessSlider').addEventListener('input', (e) => {
        config.lineThickness = parseFloat(e.target.value);
        document.getElementById('lineThicknessValue').textContent = config.lineThickness.toFixed(1);
        updateVisualization();
    });

    document.getElementById('shapeTypeBtn').addEventListener('click', () => {
        config.shapeType = config.shapeType === 'cube' ? 'sphere' : 'cube';
        const btn = document.getElementById('shapeTypeBtn');
        btn.textContent = config.shapeType === 'cube' ? 'Switch to Sphere' : 'Switch to Cube';
        updateVisualization();
    });

    document.getElementById('toggleBackGridBtn').addEventListener('click', () => {
        config.showBackGrid = !config.showBackGrid;
        updateVisualization();
    });

    document.getElementById('resetCameraBtn').addEventListener('click', () => {
        resetCamera();
    });
}

// Update point slider max values when density changes
function updatePointSliderMax() {
    const density = config.gridDensity;
    document.getElementById('pointXSlider').max = density;
    document.getElementById('pointYSlider').max = density;

    if (config.cubeX > density) {
        config.cubeX = Math.floor(density / 2);
        document.getElementById('pointXSlider').value = config.cubeX;
        document.getElementById('pointXValue').textContent = config.cubeX;
    }
    if (config.cubeY > density) {
        config.cubeY = Math.floor(density / 2);
        document.getElementById('pointYSlider').value = config.cubeY;
        document.getElementById('pointYValue').textContent = config.cubeY;
    }
}

// Initialize on load
init();
