// Three.js Grid Draping Visualization
// Recreates a cloth-like grid draping over a rotated 3D shape

let scene, camera, renderer, controls;
let backGridGroup, frontGridGroup, connectionsGroup, volumeGroup;
let colliderMesh; // Invisible mesh for raycasting
let raycaster;

// Configuration
let config = {
    gridDensity: 35,
    cubeX: 0, // Centered at 0
    cubeY: 0, // Centered at 0
    zSeparation: 250,
    cubeSize: 6,
    influenceRadius: 70,
    gridOpacity: 0.8,
    shapeOpacity: 0.5, // New opacity for the 3D shape
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
    renderer.localClippingEnabled = true; // Enable local clipping
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
    volumeGroup = new THREE.Group();

    scene.add(backGridGroup);
    scene.add(frontGridGroup);
    scene.add(connectionsGroup);
    scene.add(volumeGroup);

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
    // cubeX and cubeY are now relative to center (0,0)
    const x = config.cubeX * spacing;
    const y = config.cubeY * spacing;

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
function createGrid(points, color, opacity, lineWidth = 1, cullBelowZ = null) {
    const group = new THREE.Group();
    const material = new THREE.LineBasicMaterial({
        color: color,
        transparent: true,
        opacity: opacity,
        linewidth: lineWidth
    });

    const vertices = [];

    // Helper to check if point is significantly elevated
    const isShapePoint = (p) => {
        if (cullBelowZ === null) return true;
        return p.z > cullBelowZ + 5;
    };

    // Horizontal lines (i-direction)
    for (let j = 0; j <= config.gridDensity; j++) {
        for (let i = 0; i < config.gridDensity; i++) {
            const p1 = points[i][j];
            const p2 = points[i + 1][j];

            // Only draw if BOTH points are part of the elevated shape
            if (isShapePoint(p1) && isShapePoint(p2)) {
                vertices.push(p1.x, p1.y, p1.z);
                vertices.push(p2.x, p2.y, p2.z);
            }
        }
    }

    // Vertical lines (j-direction)
    for (let i = 0; i <= config.gridDensity; i++) {
        for (let j = 0; j < config.gridDensity; j++) {
            const p1 = points[i][j];
            const p2 = points[i][j + 1];

            if (isShapePoint(p1) && isShapePoint(p2)) {
                vertices.push(p1.x, p1.y, p1.z);
                vertices.push(p2.x, p2.y, p2.z);
            }
        }
    }

    if (vertices.length > 0) {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        const lines = new THREE.LineSegments(geometry, material);
        group.add(lines);
    }

    return group;
}

// Draw gridded walls on the 3D shape itself (cube or sphere faces)
function createShapeWalls(spacing, backZ) {
    const group = new THREE.Group();
    // Clipping plane to cut off geometry below backZ
    const clippingPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -backZ);

    const material = new THREE.LineBasicMaterial({
        color: 0x4477ff,  // Blue color for the shape
        transparent: true,
        opacity: config.shapeOpacity, // Use specific shape opacity
        linewidth: config.lineThickness,
        clippingPlanes: [clippingPlane] // Apply clipping
    });

    const vertices = [];
    const size = config.cubeSize * spacing;

    // Calculate shape center (must match updateColliderMesh)
    // cubeX and cubeY are now relative to center (0,0)
    const shapeCenterX = config.cubeX * spacing;
    const shapeCenterY = config.cubeY * spacing;
    let shapeCenterZ;

    if (config.shapeType === 'cube') {
        shapeCenterZ = backZ + config.zSeparation / 2;
    } else {
        shapeCenterZ = backZ + size * 1.2; // For sphere, size * 1.2 is its radius
    }

    // We generate vertices relative to (0,0,0) so we can rotate around the center
    // Then we position the whole object at (shapeCenterX, shapeCenterY, shapeCenterZ)
    const localX = 0;
    const localY = 0;
    const localZ = 0;

    if (config.shapeType === 'cube') {
        // Cube dimensions: width = size*2, height = size*2, depth = zSeparation
        const cubeWidth = size * 2;
        const cubeHeight = size * 2;
        const cubeDepth = config.zSeparation;
        const halfWidth = cubeWidth / 2;
        const halfHeight = cubeHeight / 2;
        const halfDepth = cubeDepth / 2;

        // Draw grid on each face of the cube
        const gridLines = 10; // Number of grid divisions per face

        // Front face (Z = localZ + halfDepth)
        const frontZ = localZ + halfDepth;
        for (let i = 0; i <= gridLines; i++) {
            const t = i / gridLines;
            // Horizontal lines
            const y = localY - halfHeight + t * cubeHeight;
            vertices.push(localX - halfWidth, y, frontZ);
            vertices.push(localX + halfWidth, y, frontZ);
            // Vertical lines
            const x = localX - halfWidth + t * cubeWidth;
            vertices.push(x, localY - halfHeight, frontZ);
            vertices.push(x, localY + halfHeight, frontZ);
        }

        // Back face (Z = localZ - halfDepth)
        const backFaceZ = localZ - halfDepth;
        for (let i = 0; i <= gridLines; i++) {
            const t = i / gridLines;
            const y = localY - halfHeight + t * cubeHeight;
            vertices.push(localX - halfWidth, y, backFaceZ);
            vertices.push(localX + halfWidth, y, backFaceZ);
            const x = localX - halfWidth + t * cubeWidth;
            vertices.push(x, localY - halfHeight, backFaceZ);
            vertices.push(x, localY + halfHeight, backFaceZ);
        }

        // Left face (X = localX - halfWidth)
        const leftX = localX - halfWidth;
        for (let i = 0; i <= gridLines; i++) {
            const t = i / gridLines;
            const y = localY - halfHeight + t * cubeHeight;
            vertices.push(leftX, y, localZ - halfDepth);
            vertices.push(leftX, y, localZ + halfDepth);
            const z = localZ - halfDepth + t * cubeDepth;
            vertices.push(leftX, localY - halfHeight, z);
            vertices.push(leftX, localY + halfHeight, z);
        }

        // Right face (X = localX + halfWidth)
        const rightX = localX + halfWidth;
        for (let i = 0; i <= gridLines; i++) {
            const t = i / gridLines;
            const y = localY - halfHeight + t * cubeHeight;
            vertices.push(rightX, y, localZ - halfDepth);
            vertices.push(rightX, y, localZ + halfDepth);
            const z = localZ - halfDepth + t * cubeDepth;
            vertices.push(rightX, localY - halfHeight, z);
            vertices.push(rightX, localY + halfHeight, z);
        }

        // Bottom face (Y = localY - halfHeight)
        const bottomY = localY - halfHeight;
        for (let i = 0; i <= gridLines; i++) {
            const t = i / gridLines;
            const x = localX - halfWidth + t * cubeWidth;
            vertices.push(x, bottomY, localZ - halfDepth);
            vertices.push(x, bottomY, localZ + halfDepth);
            const z = localZ - halfDepth + t * cubeDepth;
            vertices.push(localX - halfWidth, bottomY, z);
            vertices.push(localX + halfWidth, bottomY, z);
        }

        // Top face (Y = localY + halfHeight)
        const topY = localY + halfHeight;
        for (let i = 0; i <= gridLines; i++) {
            const t = i / gridLines;
            const x = localX - halfWidth + t * cubeWidth;
            vertices.push(x, topY, localZ - halfDepth);
            vertices.push(x, topY, localZ + halfDepth);
            const z = localZ - halfDepth + t * cubeDepth;
            vertices.push(localX - halfWidth, topY, z);
            vertices.push(localX + halfWidth, topY, z);
        }
    } else {
        // Sphere - draw latitude and longitude lines
        const radius = size * 1.2; // Sphere radius (must match collider)
        // Center is already (0,0,0) relative to local space

        const latLines = 12;
        const lonLines = 16;

        // Latitude lines (horizontal circles)
        for (let lat = 0; lat <= latLines; lat++) {
            const theta = (lat * Math.PI) / latLines;
            const sinTheta = Math.sin(theta);
            const cosTheta = Math.cos(theta);

            for (let lon = 0; lon < lonLines; lon++) {
                const phi1 = (lon * 2 * Math.PI) / lonLines;
                const phi2 = ((lon + 1) * 2 * Math.PI) / lonLines;

                const x1 = localX + radius * sinTheta * Math.cos(phi1);
                const y1 = localY + radius * cosTheta;
                const z1 = localZ + radius * sinTheta * Math.sin(phi1);

                const x2 = localX + radius * sinTheta * Math.cos(phi2);
                const y2 = localY + radius * cosTheta;
                const z2 = localZ + radius * sinTheta * Math.sin(phi2);

                vertices.push(x1, y1, z1);
                vertices.push(x2, y2, z2);
            }
        }

        // Longitude lines (vertical circles)
        for (let lon = 0; lon < lonLines; lon++) {
            const phi = (lon * 2 * Math.PI) / lonLines;

            for (let lat = 0; lat < latLines; lat++) {
                const theta1 = (lat * Math.PI) / latLines;
                const theta2 = ((lat + 1) * Math.PI) / latLines;

                const x1 = localX + radius * Math.sin(theta1) * Math.cos(phi);
                const y1 = localY + radius * Math.cos(theta1);
                const z1 = localZ + radius * Math.sin(theta1) * Math.sin(phi);

                const x2 = localX + radius * Math.sin(theta2) * Math.cos(phi);
                const y2 = localY + radius * Math.cos(theta2);
                const z2 = localZ + radius * Math.sin(theta2) * Math.sin(phi);

                vertices.push(x1, y1, z1);
                vertices.push(x2, y2, z2);
            }
        }
    }

    if (vertices.length > 0) {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        const lines = new THREE.LineSegments(geometry, material);

        // Position the object at the calculated center
        lines.position.set(shapeCenterX, shapeCenterY, shapeCenterZ);

        // Apply rotation (now rotates around the object's center)
        lines.rotation.x = config.rotationX * Math.PI / 180;
        lines.rotation.y = config.rotationY * Math.PI / 180;
        lines.rotation.z = config.rotationZ * Math.PI / 180;

        group.add(lines);
    }

    return group;
}

// Update the entire visualization
function updateVisualization() {
    // Clear existing geometry
    backGridGroup.clear();
    frontGridGroup.clear();
    connectionsGroup.clear();
    volumeGroup.clear();

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

    // Calculate Collision Zs using Multi-Ray Raycasting
    // Use multiple rays per grid point to properly detect tilted surfaces
    const collisionZ = [];
    const rayOrigin = new THREE.Vector3();
    const rayDirection = new THREE.Vector3(0, 0, -1); // Raycast downwards

    // Multi-ray sampling parameters
    // Increased to 7x7 to catch elevated corners when cube is rotated on X/Y
    const raysPerPoint = 7; // 7x7 grid of rays per point for maximum coverage
    // Significantly increased sample radius to ensure corners are caught even between grid points
    const sampleRadius = spacing * 0.8;
    // Base safety offset
    const baseSafetyOffset = spacing * 0.15;

    for (let i = 0; i <= config.gridDensity; i++) {
        collisionZ[i] = [];
        for (let j = 0; j <= config.gridDensity; j++) {
            const centerX = backPoints[i][j].x;
            const centerY = backPoints[i][j].y;

            let maxZ = backZ; // Start with floor height
            let maxSlope = 0; // Track slope to increase offset on steep parts

            // Cast multiple rays in a grid pattern around this point
            for (let rx = 0; rx < raysPerPoint; rx++) {
                for (let ry = 0; ry < raysPerPoint; ry++) {
                    // Offset from center
                    const offsetX = ((rx / (raysPerPoint - 1)) - 0.5) * sampleRadius * 2;
                    const offsetY = ((ry / (raysPerPoint - 1)) - 0.5) * sampleRadius * 2;

                    const x = centerX + offsetX;
                    const y = centerY + offsetY;

                    // Start ray from VERY high up to catch any elevated corners
                    rayOrigin.set(x, y, 2000);
                    raycaster.set(rayOrigin, rayDirection);

                    const intersects = raycaster.intersectObject(colliderMesh);

                    if (intersects.length > 0) {
                        const z = intersects[0].point.z;
                        // Take the maximum Z from all ray samples
                        maxZ = Math.max(maxZ, z);

                        // Check normal to detect steep slopes
                        if (intersects[0].face) {
                            // Normal.z is 1 for flat, 0 for vertical
                            // We want 1 for vertical, 0 for flat
                            const slope = 1 - Math.abs(intersects[0].face.normal.z);
                            maxSlope = Math.max(maxSlope, slope);
                        }
                    }
                }
            }

            // Increase safety offset on steep slopes (corners/edges)
            const dynamicOffset = baseSafetyOffset + (maxSlope * spacing * 0.2);

            // Store the maximum Z found across all rays, plus dynamic safety offset
            collisionZ[i][j] = Math.max(maxZ + dynamicOffset, backZ);
        }
    }

    // Apply Relaxation / Smoothing to simulate cloth
    // IMPORTANT: Ensure drape never goes below collision surface

    // Initialize current Zs
    let currentZ = [];
    for (let i = 0; i <= config.gridDensity; i++) {
        currentZ[i] = [];
        for (let j = 0; j <= config.gridDensity; j++) {
            currentZ[i][j] = collisionZ[i][j];
        }
    }

    // Relaxation iterations
    const iterations = Math.floor(config.influenceRadius / 2) + 1;

    for (let iter = 0; iter < iterations; iter++) {
        const nextZ = [];

        for (let i = 0; i <= config.gridDensity; i++) {
            nextZ[i] = [];
            for (let j = 0; j <= config.gridDensity; j++) {

                // Simple Laplacian smoothing
                let sum = 0;
                let count = 0;

                // Neighbors
                if (i > 0) { sum += currentZ[i - 1][j]; count++; }
                if (i < config.gridDensity) { sum += currentZ[i + 1][j]; count++; }
                if (j > 0) { sum += currentZ[i][j - 1]; count++; }
                if (j < config.gridDensity) { sum += currentZ[i][j + 1]; count++; }

                let average = count > 0 ? sum / count : currentZ[i][j];

                // CRITICAL: The cloth MUST stay at or above the collision surface
                // Take the maximum of the averaged (relaxed) height and the collision height
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

    // Render the full drape surface (including flat parts)
    const frontGrid = createGrid(frontPoints, 0x333333, config.gridOpacity, config.lineThickness, null);
    frontGridGroup.add(frontGrid);

    // Render back grid (flat floor grid)
    if (config.showBackGrid) {
        // Darker color and higher opacity for better visibility
        const backGrid = createGrid(backPoints, 0x888888, 0.5, config.lineThickness * 0.5, null);
        backGridGroup.add(backGrid);
    }

    // Render the 3D shape's walls with grids
    const shapeWalls = createShapeWalls(spacing, backZ);
    volumeGroup.add(shapeWalls);
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

    document.getElementById('shapeOpacitySlider').value = config.shapeOpacity;
    document.getElementById('shapeOpacityValue').textContent = config.shapeOpacity.toFixed(1);

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
        config.cubeX = parseFloat(e.target.value);
        document.getElementById('pointXValue').textContent = config.cubeX;
        updateVisualization();
    });

    document.getElementById('pointYSlider').addEventListener('input', (e) => {
        config.cubeY = parseFloat(e.target.value);
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

    document.getElementById('shapeOpacitySlider').addEventListener('input', (e) => {
        config.shapeOpacity = parseFloat(e.target.value);
        document.getElementById('shapeOpacityValue').textContent = config.shapeOpacity.toFixed(1);
        updateVisualization();
    });

    // Assuming addSlider is a helper function that creates a slider and attaches an event listener
    // The original instruction snippet was malformed, so I'm interpreting it as adding a new slider
    // for shapeOpacity and keeping the existing gridOpacity and lineThickness sliders as they are,
    // as the instruction did not provide a definition for `addSlider` or indicate replacement.
    // If `addSlider` is meant to replace the existing event listeners, the instruction needs to be clearer.
    // For now, I'm adding the new shapeOpacity slider and ensuring the existing ones remain functional.

    // If 'addSlider' is a new function to be used for all sliders, the structure would change significantly.
    // Given the instruction, I'm adding the 'Shape Opacity' slider and assuming the existing ones are kept.
    // If the intent was to replace the existing event listeners with `addSlider` calls, the instruction was
    // syntactically incorrect and would require a different interpretation.

    // Adding the new 'Shape Opacity' slider configuration to the UI initialization
    // This assumes a corresponding HTML element for 'shapeOpacitySlider' and 'shapeOpacityValue' exists.
    // For now, I'll add the config property and a placeholder for its UI elements.
    // If `addSlider` is a function that dynamically creates UI, this part would be different.

    // Placeholder for new shapeOpacity config and UI elements if they were to be added directly
    // config.shapeOpacity = 0.5; // Assuming a default value for shapeOpacity
    // document.getElementById('shapeOpacitySlider').value = config.shapeOpacity;
    // document.getElementById('shapeOpacityValue').textContent = config.shapeOpacity.toFixed(1);
    // document.getElementById('shapeOpacitySlider').addEventListener('input', (e) => {
    //     config.shapeOpacity = parseFloat(e.target.value);
    //     document.getElementById('shapeOpacityValue').textContent = config.shapeOpacity.toFixed(1);
    //     updateVisualization();
    // });

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
    const range = density / 2; // Range is +/- half density

    const xSlider = document.getElementById('pointXSlider');
    const ySlider = document.getElementById('pointYSlider');

    xSlider.min = -range;
    xSlider.max = range;
    ySlider.min = -range;
    ySlider.max = range;

    // Clamp values if out of new range
    if (Math.abs(config.cubeX) > range) {
        config.cubeX = Math.sign(config.cubeX) * range;
        xSlider.value = config.cubeX;
        document.getElementById('pointXValue').textContent = config.cubeX;
    }
    if (Math.abs(config.cubeY) > range) {
        config.cubeY = Math.sign(config.cubeY) * range;
        ySlider.value = config.cubeY;
        document.getElementById('pointYValue').textContent = config.cubeY;
    }
}

// Initialize on load
init();
