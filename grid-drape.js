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
    cubeSize: 5, // Must be odd to align with grid
    influenceRadius: 70,
    influenceRadius: 70,
    drapeOpacity: 1.0, // Renamed from gridOpacity
    shapeOpacity: 1.0,
    backGridOpacity: 1.0, // New separate opacity for back grid
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
    camera.position.set(0, 0, 300); // Start at minDistance (300) and bird's eye view
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

    // Size
    let geometry;
    if (config.shapeType === 'cube') {
        // Cube size is now based on gridDivisions * spacing for all dimensions
        const cubeWidth = config.cubeSize * spacing;
        const cubeHeight = config.cubeSize * spacing;
        const cubeDepth = config.cubeSize * spacing; // Use cubeSize for depth too
        geometry = new THREE.BoxGeometry(cubeWidth, cubeHeight, cubeDepth);
    } else {
        const radius = config.cubeSize * spacing * 0.6;
        geometry = new THREE.SphereGeometry(radius, 32, 32);
    }

    const material = new THREE.MeshBasicMaterial({ visible: false }); // Invisible
    colliderMesh = new THREE.Mesh(geometry, material);

    // Position
    // cubeX and cubeY are now relative to center (0,0)
    const x = config.cubeX * spacing;
    const y = config.cubeY * spacing;

    // Rotation (convert degrees to radians)
    colliderMesh.rotation.x = config.rotationX * Math.PI / 180;
    colliderMesh.rotation.y = config.rotationY * Math.PI / 180;
    colliderMesh.rotation.z = config.rotationZ * Math.PI / 180;

    // Position - center of cube
    const cubeDepth = config.cubeSize * spacing;
    if (config.shapeType === 'cube') {
        colliderMesh.position.set(x, y, backZ + cubeDepth / 2);
    } else {
        // For sphere, its center is at backZ + radius
        const radius = config.cubeSize * spacing * 0.6;
        colliderMesh.position.set(x, y, backZ + radius);
    }

    colliderMesh.updateMatrixWorld();
    scene.add(colliderMesh);
}

// Create grid with smooth lines
function createGrid(points, color, opacity, lineWidth = 1, cullBelowZ = null) {
    const group = new THREE.Group();

    // Use vertex colors for the fading/pressure effect
    const material = new THREE.LineBasicMaterial({
        vertexColors: true, // Enable vertex colors
        transparent: true,
        opacity: opacity,
        linewidth: lineWidth
    });

    const vertices = [];
    const colors = [];
    const width = points.length;
    const height = points[0].length;

    // Pencil effect parameters
    const JITTER_AMOUNT = 1.5; // Max offset in units
    const PASSES = 2; // Draw each line twice
    const BASE_COLOR = new THREE.Color(color);
    const BG_COLOR = new THREE.Color(0xf8f9fa); // Match scene background

    // Helper to add a sketchy line segment
    const addSketchySegment = (p1, p2) => {
        for (let k = 0; k < PASSES; k++) {
            // Randomly skip some segments for "gaps"
            if (Math.random() > 0.9) continue;

            // Calculate pressure (opacity/darkness)
            const pressure = 0.3 + Math.random() * 0.7;

            // Mix color based on pressure
            const segmentColor = BASE_COLOR.clone().lerp(BG_COLOR, 1 - pressure);

            // Add jitter to start and end points
            const j1 = {
                x: p1.x + (Math.random() - 0.5) * JITTER_AMOUNT,
                y: p1.y + (Math.random() - 0.5) * JITTER_AMOUNT,
                z: p1.z + (Math.random() - 0.5) * JITTER_AMOUNT * 0.2 // Less Z jitter
            };
            const j2 = {
                x: p2.x + (Math.random() - 0.5) * JITTER_AMOUNT,
                y: p2.y + (Math.random() - 0.5) * JITTER_AMOUNT,
                z: p2.z + (Math.random() - 0.5) * JITTER_AMOUNT * 0.2
            };

            vertices.push(j1.x, j1.y, j1.z);
            vertices.push(j2.x, j2.y, j2.z);

            colors.push(segmentColor.r, segmentColor.g, segmentColor.b);
            colors.push(segmentColor.r, segmentColor.g, segmentColor.b);
        }
    };

    // Helper to check if point is significantly elevated
    const isShapePoint = (p) => {
        if (cullBelowZ === null) return true;
        return p.z > cullBelowZ + 5;
    };

    // Horizontal lines (i-direction)
    for (let j = 0; j < height; j++) {
        for (let i = 0; i < width - 1; i++) {
            const p1 = points[i][j];
            const p2 = points[i + 1][j];

            // Only draw if BOTH points are part of the elevated shape
            if (isShapePoint(p1) && isShapePoint(p2)) {
                addSketchySegment(p1, p2);
            }
        }
    }

    // Vertical lines (j-direction)
    for (let i = 0; i < width; i++) {
        for (let j = 0; j < height - 1; j++) {
            const p1 = points[i][j];
            const p2 = points[i][j + 1];

            if (isShapePoint(p1) && isShapePoint(p2)) {
                addSketchySegment(p1, p2);
            }
        }
    }

    if (vertices.length > 0) {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
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
        vertexColors: true, // Enable vertex colors
        transparent: true,
        opacity: config.shapeOpacity, // Use specific shape opacity
        linewidth: config.lineThickness,
        clippingPlanes: [clippingPlane] // Apply clipping
    });

    const vertices = [];
    const colors = [];

    // Pencil effect parameters
    const JITTER_AMOUNT = 1.5;
    const PASSES = 2;
    const BASE_COLOR = new THREE.Color(0x333333);
    const BG_COLOR = new THREE.Color(0xf8f9fa);

    // Helper to add a sketchy line segment
    const addSketchySegment = (p1, p2) => {
        for (let k = 0; k < PASSES; k++) {
            if (Math.random() > 0.9) continue;

            const pressure = 0.3 + Math.random() * 0.7;
            const segmentColor = BASE_COLOR.clone().lerp(BG_COLOR, 1 - pressure);

            const j1 = {
                x: p1.x + (Math.random() - 0.5) * JITTER_AMOUNT,
                y: p1.y + (Math.random() - 0.5) * JITTER_AMOUNT,
                z: p1.z + (Math.random() - 0.5) * JITTER_AMOUNT * 0.2
            };
            const j2 = {
                x: p2.x + (Math.random() - 0.5) * JITTER_AMOUNT,
                y: p2.y + (Math.random() - 0.5) * JITTER_AMOUNT,
                z: p2.z + (Math.random() - 0.5) * JITTER_AMOUNT * 0.2
            };

            vertices.push(j1.x, j1.y, j1.z);
            vertices.push(j2.x, j2.y, j2.z);

            colors.push(segmentColor.r, segmentColor.g, segmentColor.b);
            colors.push(segmentColor.r, segmentColor.g, segmentColor.b);
        }
    };

    // cubeSize now controls the number of grid divisions, not the physical size
    // Physical size is determined by spacing to match the main grid
    const gridDivisions = config.cubeSize; // Use cubeSize for grid divisions
    const size = spacing; // Use the same spacing as the main grid

    // Calculate shape center (must match updateColliderMesh)
    // cubeX and cubeY are now relative to center (0,0)
    const shapeCenterX = config.cubeX * spacing;
    const shapeCenterY = config.cubeY * spacing;
    let shapeCenterZ;

    if (config.shapeType === 'cube') {
        const cubeDepth = gridDivisions * size;
        shapeCenterZ = backZ + cubeDepth / 2;
    } else {
        shapeCenterZ = backZ + gridDivisions * size * 0.6;
    }

    // We generate vertices relative to (0,0,0) so we can rotate around the center
    // Then we position the whole object at (shapeCenterX, shapeCenterY, shapeCenterZ)
    const localX = 0;
    const localY = 0;
    const localZ = 0;

    if (config.shapeType === 'cube') {
        // Cube dimensions: all based on gridDivisions for a true cube
        const cubeWidth = gridDivisions * size;
        const cubeHeight = gridDivisions * size;
        const cubeDepth = gridDivisions * size; // Same as width and height
        const halfWidth = cubeWidth / 2;
        const halfHeight = cubeHeight / 2;
        const halfDepth = cubeDepth / 2;

        // Draw grid on each face of the cube
        const gridLines = gridDivisions; // Number of grid divisions per face

        // Helper to add segment from coords
        const addSeg = (x1, y1, z1, x2, y2, z2) => {
            addSketchySegment({ x: x1, y: y1, z: z1 }, { x: x2, y: y2, z: z2 });
        };

        // Front face (Z = localZ + halfDepth)
        const frontZ = localZ + halfDepth;
        for (let i = 0; i <= gridLines; i++) {
            const t = i / gridLines;
            // Horizontal lines
            const y = localY - halfHeight + t * cubeHeight;
            addSeg(localX - halfWidth, y, frontZ, localX + halfWidth, y, frontZ);
            // Vertical lines
            const x = localX - halfWidth + t * cubeWidth;
            addSeg(x, localY - halfHeight, frontZ, x, localY + halfHeight, frontZ);
        }

        // Back face (Z = localZ - halfDepth)
        const backFaceZ = localZ - halfDepth;
        for (let i = 0; i <= gridLines; i++) {
            const t = i / gridLines;
            const y = localY - halfHeight + t * cubeHeight;
            addSeg(localX - halfWidth, y, backFaceZ, localX + halfWidth, y, backFaceZ);
            const x = localX - halfWidth + t * cubeWidth;
            addSeg(x, localY - halfHeight, backFaceZ, x, localY + halfHeight, backFaceZ);
        }

        // Left face (X = localX - halfWidth)
        const leftX = localX - halfWidth;
        for (let i = 0; i <= gridLines; i++) {
            const t = i / gridLines;
            const y = localY - halfHeight + t * cubeHeight;
            addSeg(leftX, y, localZ - halfDepth, leftX, y, localZ + halfDepth);
            const z = localZ - halfDepth + t * cubeDepth;
            addSeg(leftX, localY - halfHeight, z, leftX, localY + halfHeight, z);
        }

        // Right face (X = localX + halfWidth)
        const rightX = localX + halfWidth;
        for (let i = 0; i <= gridLines; i++) {
            const t = i / gridLines;
            const y = localY - halfHeight + t * cubeHeight;
            addSeg(rightX, y, localZ - halfDepth, rightX, y, localZ + halfDepth);
            const z = localZ - halfDepth + t * cubeDepth;
            addSeg(rightX, localY - halfHeight, z, rightX, localY + halfHeight, z);
        }

        // Bottom face (Y = localY - halfHeight)
        const bottomY = localY - halfHeight;
        for (let i = 0; i <= gridLines; i++) {
            const t = i / gridLines;
            const x = localX - halfWidth + t * cubeWidth;
            addSeg(x, bottomY, localZ - halfDepth, x, bottomY, localZ + halfDepth);
            const z = localZ - halfDepth + t * cubeDepth;
            addSeg(localX - halfWidth, bottomY, z, localX + halfWidth, bottomY, z);
        }

        // Top face (Y = localY + halfHeight)
        const topY = localY + halfHeight;
        for (let i = 0; i <= gridLines; i++) {
            const t = i / gridLines;
            const x = localX - halfWidth + t * cubeWidth;
            addSeg(x, topY, localZ - halfDepth, x, topY, localZ + halfDepth);
            const z = localZ - halfDepth + t * cubeDepth;
            addSeg(localX - halfWidth, topY, z, localX + halfWidth, topY, z);
        }
    } else {
        // Sphere - draw latitude and longitude lines
        const radius = gridDivisions * size * 0.6; // Sphere radius based on grid divisions
        shapeCenterZ = backZ + radius;
        // Center is already (0,0,0) relative to local        
        const latLines = gridDivisions;
        const lonLines = gridDivisions * 1.5;

        const addSeg = (x1, y1, z1, x2, y2, z2) => {
            addSketchySegment({ x: x1, y: y1, z: z1 }, { x: x2, y: y2, z: z2 });
        };

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

                addSeg(x1, y1, z1, x2, y2, z2);
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

                addSeg(x1, y1, z1, x2, y2, z2);
            }
        }
    }

    if (vertices.length > 0) {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
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

    // Viewport coverage configuration
    const VIEWPORT_SIZE = 5000; // Large enough to cover screen

    // Calculate grid size (number of cells) to cover the viewport
    // Force it to be ODD to match the shape's alignment (which has odd divisions)
    let gridSize = Math.ceil(VIEWPORT_SIZE / spacing);
    if (gridSize % 2 === 0) gridSize++;

    // Update the invisible collider mesh
    updateColliderMesh(spacing, backZ);

    // Create back grid points
    // We map indices [0, gridSize] to world coordinates centered at 0
    const backPoints = [];
    const halfGridSize = gridSize / 2;

    for (let i = 0; i <= gridSize; i++) {
        backPoints[i] = [];
        for (let j = 0; j <= gridSize; j++) {
            // Calculate actual world coordinates
            // i goes from 0 to gridSize. 
            // Center (0,0) corresponds to i = halfGridSize
            const x = (i - halfGridSize) * spacing;
            const y = (j - halfGridSize) * spacing;
            backPoints[i][j] = { x, y, z: backZ };
        }
    }

    // Calculate Collision Zs using Multi-Ray Raycasting
    // Optimization: Only raycast near the object
    const collisionZ = [];
    const rayOrigin = new THREE.Vector3();
    const rayDirection = new THREE.Vector3(0, 0, -1); // Raycast downwards

    const raysPerPoint = 7;
    const sampleRadius = spacing * 0.8;

    // Calculate object bounds for optimization
    const objectX = config.cubeX * spacing;
    const objectY = config.cubeY * spacing;
    // Calculate max dimension of the object (cube or sphere)
    let objectRadius;
    if (config.shapeType === 'cube') {
        // Diagonal of the cube is the max reach
        const cubeSize = config.cubeSize * spacing;
        // A rough bounding sphere radius for the cube
        objectRadius = Math.sqrt(3 * (cubeSize / 2) ** 2);
    } else {
        objectRadius = config.cubeSize * spacing * 0.6;
    }

    // Add influence radius and a buffer to the bounds
    const checkRadius = objectRadius + config.influenceRadius + spacing * 2;

    for (let i = 0; i <= gridSize; i++) {
        collisionZ[i] = [];
        for (let j = 0; j <= gridSize; j++) {
            const centerX = backPoints[i][j].x;
            const centerY = backPoints[i][j].y;

            // Optimization: Distance check
            const dx = centerX - objectX;
            const dy = centerY - objectY;
            const distSq = dx * dx + dy * dy;

            if (distSq > checkRadius * checkRadius) {
                // Too far from object, just use floor height
                collisionZ[i][j] = backZ;
                continue;
            }

            let maxZ = backZ; // Start with floor height

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
                    }
                }
            }

            // Store the maximum Z found across all rays (no offset)
            collisionZ[i][j] = maxZ;
        }
    }

    // Apply Relaxation / Smoothing to simulate cloth
    // IMPORTANT: Ensure drape never goes below collision surface

    // Initialize current Zs
    let currentZ = [];
    for (let i = 0; i <= gridSize; i++) {
        currentZ[i] = [];
        for (let j = 0; j <= gridSize; j++) {
            currentZ[i][j] = collisionZ[i][j];
        }
    }

    // Relaxation iterations
    // Optimization: Only relax points that might be affected? 
    // For now, we'll iterate all, but we could optimize this too if needed.
    // Given the grid size increase, we should probably limit relaxation to the area of interest too.

    const iterations = Math.floor(config.influenceRadius / 2) + 1;

    // Calculate bounds indices for relaxation loop to avoid iterating the whole massive grid
    // We convert world bounds to indices
    const minIndexX = Math.max(1, Math.floor((objectX - checkRadius) / spacing + halfGridSize));
    const maxIndexX = Math.min(gridSize - 1, Math.ceil((objectX + checkRadius) / spacing + halfGridSize));
    const minIndexY = Math.max(1, Math.floor((objectY - checkRadius) / spacing + halfGridSize));
    const maxIndexY = Math.min(gridSize - 1, Math.ceil((objectY + checkRadius) / spacing + halfGridSize));

    for (let iter = 0; iter < iterations; iter++) {
        const nextZ = [];
        // Initialize nextZ with current values for the whole grid first (or just handle the active region)
        // To be safe and simple, we can just copy the array structure or use a sparse approach.
        // But since we need to read neighbors, let's just create the structure.
        // Actually, we only need to update the active region. The rest stays as collisionZ (which is backZ).

        // Let's just iterate the active region.
        // We need to be careful about the boundary of the active region. 
        // Points outside the active region are static (backZ).

        for (let i = minIndexX; i <= maxIndexX; i++) {
            if (!nextZ[i]) nextZ[i] = []; // We might need to initialize rows if we were sparse, but we are dense.
            for (let j = minIndexY; j <= maxIndexY; j++) {

                // Simple Laplacian smoothing
                let sum = 0;
                let count = 0;

                // Neighbors
                sum += currentZ[i - 1][j]; count++;
                sum += currentZ[i + 1][j]; count++;
                sum += currentZ[i][j - 1]; count++;
                sum += currentZ[i][j + 1]; count++;

                let average = count > 0 ? sum / count : currentZ[i][j];

                // CRITICAL: The cloth MUST stay at or above the collision surface
                nextZ[i][j] = Math.max(average, collisionZ[i][j]);
            }
        }

        // Update currentZ with nextZ values for the active region
        for (let i = minIndexX; i <= maxIndexX; i++) {
            for (let j = minIndexY; j <= maxIndexY; j++) {
                if (nextZ[i] && nextZ[i][j] !== undefined) {
                    currentZ[i][j] = nextZ[i][j];
                }
            }
        }
    }

    // Create final front points
    const frontPoints = [];
    for (let i = 0; i <= gridSize; i++) {
        frontPoints[i] = [];
        for (let j = 0; j <= gridSize; j++) {
            frontPoints[i][j] = {
                x: backPoints[i][j].x,
                y: backPoints[i][j].y,
                z: currentZ[i][j]
            };
        }
    }

    // Render the full drape surface (including flat parts)
    // Pass gridSize instead of config.gridDensity to createGrid if it uses it?
    // createGrid uses config.gridDensity. We need to update createGrid to accept dimensions or infer them.
    // Let's modify createGrid to infer dimensions from the points array.
    const frontGrid = createGrid(frontPoints, 0x333333, config.drapeOpacity, config.lineThickness, null);
    frontGridGroup.add(frontGrid);

    // Render back grid (flat floor grid)
    if (config.showBackGrid) {
        // Darker color and higher opacity for better visibility
        const backGrid = createGrid(backPoints, 0x888888, config.backGridOpacity, config.lineThickness * 0.5, null);
        backGridGroup.add(backGrid);
    }

    // Render the 3D shape's walls with grids
    const shapeWalls = createShapeWalls(spacing, backZ);
    volumeGroup.add(shapeWalls);
}

// Reset camera to bird's eye view
function resetCamera() {
    camera.position.set(0, 0, 300); // Looking down the Z axis from above, zoomed in
    camera.lookAt(0, 0, 0);
    controls.target.set(0, 0, 0);
    controls.update();
}

// UI initialization using dat.GUI
function initializeUI() {
    const gui = new dat.GUI({ width: 300 });

    // Position folder
    const positionFolder = gui.addFolder('Position');
    positionFolder.add(config, 'gridDensity', 15, 40, 5).name('Grid Density').onChange(() => {
        updatePointSliderRanges();
        updateVisualization();
    });
    positionFolder.add(config, 'cubeX', -17, 17, 1).name('Cube Center X').onChange(updateVisualization);
    positionFolder.add(config, 'cubeY', -17, 17, 1).name('Cube Center Y').onChange(updateVisualization);
    positionFolder.add(config, 'cubeSize', 3, 15, 1).name('Cube Size').onChange((value) => {
        // Force to nearest odd number
        const rounded = Math.round(value);
        config.cubeSize = rounded % 2 === 0 ? rounded + 1 : rounded;
        updateVisualization();
    });
    positionFolder.open();

    // Appearance folder
    const appearanceFolder = gui.addFolder('Appearance');
    appearanceFolder.add(config, 'influenceRadius', 0, 100, 5).name('Drape Influence %').onChange(updateVisualization);
    appearanceFolder.add(config, 'drapeOpacity', 0, 1, 0.1).name('Drape Opacity').onChange(updateVisualization);
    appearanceFolder.add(config, 'shapeOpacity', 0, 1, 0.1).name('Shape Opacity').onChange(updateVisualization);
    appearanceFolder.add(config, 'backGridOpacity', 0, 1, 0.1).name('Back Grid Opacity').onChange(updateVisualization);
    appearanceFolder.add(config, 'lineThickness', 0.5, 5, 0.5).name('Line Thickness').onChange(updateVisualization);
    appearanceFolder.open();

    // Rotation folder
    const rotationFolder = gui.addFolder('Rotation');
    rotationFolder.add(config, 'rotationX', 0, 360, 5).name('Rotation X (°)').onChange(updateVisualization);
    rotationFolder.add(config, 'rotationY', 0, 360, 5).name('Rotation Y (°)').onChange(updateVisualization);
    rotationFolder.add(config, 'rotationZ', 0, 360, 5).name('Rotation Z (°)').onChange(updateVisualization);
    rotationFolder.open();

    // Actions folder
    const actionsFolder = gui.addFolder('Actions');
    const actions = {
        toggleShape: function () {
            config.shapeType = config.shapeType === 'cube' ? 'sphere' : 'cube';
            updateVisualization();
        },
        resetCamera: function () {
            resetCamera();
        }
    };
    actionsFolder.add(actions, 'toggleShape').name('Toggle Shape Type');
    actionsFolder.add(actions, 'resetCamera').name('Bird\'s Eye View');
    actionsFolder.open();

    // Store GUI reference for potential updates
    window.gui = gui;
}

// Update point slider ranges when density changes
function updatePointSliderRanges() {
    const range = config.gridDensity / 2;

    // Clamp values if out of new range
    if (Math.abs(config.cubeX) > range) {
        config.cubeX = Math.sign(config.cubeX) * range;
    }
    if (Math.abs(config.cubeY) > range) {
        config.cubeY = Math.sign(config.cubeY) * range;
    }

    // Update GUI controllers
    if (window.gui) {
        window.gui.__folders['Position'].__controllers.forEach(controller => {
            if (controller.property === 'cubeX' || controller.property === 'cubeY') {
                controller.min(-range);
                controller.max(range);
                controller.updateDisplay();
            }
        });
    }
}

// Initialize on load
init();
