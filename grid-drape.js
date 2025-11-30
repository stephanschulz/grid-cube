// Three.js Grid Draping Visualization
// Recreates a cloth-like grid draping over a rotated 3D shape

let scene, camera, renderer, controls;
let backGridGroup, frontGridGroup, connectionsGroup;
let colliderMesh; // Invisible mesh for raycasting
let raycaster;

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
    showBackGrid: true,
    rotationX: 0,
    rotationY: 0,
    rotationZ: 0
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

    // Raycaster
    raycaster = new THREE.Raycaster();

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

// Update the hidden collider mesh based on config
function updateColliderMesh(spacing, backZ) {
    if (colliderMesh) {
        scene.remove(colliderMesh);
        colliderMesh.geometry.dispose();
        colliderMesh.material.dispose();
    }

    const size = config.cubeSize * spacing; // Scale size by grid spacing

    let geometry;
    if (config.shapeType === 'cube') {
        geometry = new THREE.BoxGeometry(size * 2, size * 2, config.zSeparation);
    } else {
        geometry = new THREE.SphereGeometry(size * 1.2, 32, 32);
    }

    const material = new THREE.MeshBasicMaterial({ visible: false }); // Invisible
    colliderMesh = new THREE.Mesh(geometry, material);

    // Position
    const x = (config.cubeX - config.gridDensity / 2) * spacing;
    const y = (config.cubeY - config.gridDensity / 2) * spacing;

    // The mesh should be positioned so its "bottom" (or center) relates to backZ
    // We want it to protrude from backZ towards +Z
    // For a box of height H, center should be at backZ + H/2

    if (config.shapeType === 'cube') {
        colliderMesh.position.set(x, y, backZ + config.zSeparation / 2);
    } else {
        colliderMesh.position.set(x, y, backZ + size * 1.2);
    }

    // Rotation (convert degrees to radians)
    colliderMesh.rotation.x = config.rotationX * Math.PI / 180;
    colliderMesh.rotation.y = config.rotationY * Math.PI / 180;
    colliderMesh.rotation.z = config.rotationZ * Math.PI / 180;

    colliderMesh.updateMatrixWorld();
    scene.add(colliderMesh);
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

    // Update the invisible collider mesh
    updateColliderMesh(spacing, backZ);

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

    // Calculate Collision Zs using Raycasting
    const collisionZ = [];
    const rayOrigin = new THREE.Vector3();
    const rayDirection = new THREE.Vector3(0, 0, -1); // Raycast downwards

    for (let i = 0; i <= config.gridDensity; i++) {
        collisionZ[i] = [];
        for (let j = 0; j <= config.gridDensity; j++) {
            const x = backPoints[i][j].x;
            const y = backPoints[i][j].y;

            // Start ray from high up
            rayOrigin.set(x, y, 1000);
            raycaster.set(rayOrigin, rayDirection);

            const intersects = raycaster.intersectObject(colliderMesh);

            if (intersects.length > 0) {
                // We hit the object, store the Z
                // Ensure we don't go below backZ
                collisionZ[i][j] = Math.max(intersects[0].point.z, backZ);
            } else {
                collisionZ[i][j] = backZ;
            }
        }
    }

    // Apply Relaxation / Smoothing to simulate cloth
    // We start with the collision Zs and then "relax" the non-colliding points
    // to create a smooth drape.

    // Initialize current Zs
    let currentZ = [];
    for (let i = 0; i <= config.gridDensity; i++) {
        currentZ[i] = [];
        for (let j = 0; j <= config.gridDensity; j++) {
            currentZ[i][j] = collisionZ[i][j];
        }
    }

    // Relaxation iterations
    // The number of iterations determines how "stiff" or "loose" the cloth feels
    // and how far the influence propagates.
    const iterations = Math.floor(config.influenceRadius / 2) + 1;

    for (let iter = 0; iter < iterations; iter++) {
        const nextZ = [];

        for (let i = 0; i <= config.gridDensity; i++) {
            nextZ[i] = [];
            for (let j = 0; j <= config.gridDensity; j++) {

                // If this point is colliding with the mesh, it's fixed (or pushed up)
                // We only relax points that are "floating" or can be pulled up by neighbors
                // But wait, even colliding points could be pulled HIGHER by neighbors?
                // No, usually the object pushes up.

                // Simple Laplacian smoothing
                let sum = 0;
                let count = 0;

                // Neighbors
                if (i > 0) { sum += currentZ[i - 1][j]; count++; }
                if (i < config.gridDensity) { sum += currentZ[i + 1][j]; count++; }
                if (j > 0) { sum += currentZ[i][j - 1]; count++; }
                if (j < config.gridDensity) { sum += currentZ[i][j + 1]; count++; }

                let average = count > 0 ? sum / count : currentZ[i][j];

                // The cloth tries to be at the average of its neighbors (tension)
                // But it cannot go inside the object (collision constraint)
                // And it cannot go below backZ (floor constraint)

                // Apply a "stiffness" factor? 
                // Let's just take the average but ensure it's >= collisionZ

                nextZ[i][j] = Math.max(average, collisionZ[i][j]);
            }
        }
        currentZ = nextZ;
    }

    // Create final front points
    const frontPoints = [];
    for (let i = 0; i <= config.gridDensity; i++) {
        frontPoints[i] = [];
        for (let j = 0; j <= config.gridDensity; j++) {
            frontPoints[i][j] = {
                x: backPoints[i][j].x,
                y: backPoints[i][j].y,
                z: currentZ[i][j]
            };
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

    document.getElementById('rotationXSlider').value = config.rotationX;
    document.getElementById('rotationXValue').textContent = config.rotationX + '°';

    document.getElementById('rotationYSlider').value = config.rotationY;
    document.getElementById('rotationYValue').textContent = config.rotationY + '°';

    document.getElementById('rotationZSlider').value = config.rotationZ;
    document.getElementById('rotationZValue').textContent = config.rotationZ + '°';

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

    document.getElementById('rotationXSlider').addEventListener('input', (e) => {
        config.rotationX = parseInt(e.target.value);
        document.getElementById('rotationXValue').textContent = config.rotationX + '°';
        updateVisualization();
    });

    document.getElementById('rotationYSlider').addEventListener('input', (e) => {
        config.rotationY = parseInt(e.target.value);
        document.getElementById('rotationYValue').textContent = config.rotationY + '°';
        updateVisualization();
    });

    document.getElementById('rotationZSlider').addEventListener('input', (e) => {
        config.rotationZ = parseInt(e.target.value);
        document.getElementById('rotationZValue').textContent = config.rotationZ + '°';
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
