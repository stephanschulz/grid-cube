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
    drapeOpacity: 1.0, // Renamed from gridOpacity
    shapeOpacity: 1.0,
    backGridOpacity: 0.5, // New separate opacity for back grid
    drapeLineWidth: 1.5,
    shapeLineWidth: 1.5,
    backGridLineWidth: 0.75,
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

// Custom ShaderMaterial for Sketchy Lines
// Supports vertex colors with alpha and varying thickness (via mesh)
const SketchMaterial = new THREE.ShaderMaterial({
    uniforms: {
        opacity: { value: 1.0 }
    },
    vertexShader: `
        attribute float alpha;
        varying vec3 vColor;
        varying float vAlpha;
        #include <clipping_planes_pars_vertex>
        void main() {
            vColor = color;
            vAlpha = alpha;
            #include <begin_vertex>
            #include <project_vertex>
            #include <clipping_planes_vertex>
        }
    `,
    fragmentShader: `
        uniform float opacity;
        varying vec3 vColor;
        varying float vAlpha;
        #include <clipping_planes_pars_fragment>
        void main() {
            #include <clipping_planes_fragment>
            gl_FragColor = vec4(vColor, vAlpha * opacity);
        }
    `,
    transparent: true,
    vertexColors: true,
    side: THREE.DoubleSide,
    depthWrite: false, // Fix blending noise
    clipping: false // Disable clipping support by default (enable only for shape)
});

// Helper to generate a sketchy ribbon mesh for a grid
function createSketchyGridMesh(points, color, opacity, baseWidth, cullBelowZ = null) {
    const group = new THREE.Group();

    const vertices = [];
    const colors = [];
    const alphas = [];
    const indices = [];
    let vertexIndex = 0;

    const width = points.length;
    const height = points[0].length;
    const BASE_COLOR = new THREE.Color(color);

    // Helper to add a ribbon segment
    // p1, p2: start and end points
    // normal: surface normal at this segment (approximate)
    const addRibbon = (p1, p2, normal) => {
        // Subdivide segment for variable thickness
        const dist = new THREE.Vector3(p1.x - p2.x, p1.y - p2.y, p1.z - p2.z).length();
        const segments = Math.max(2, Math.ceil(dist / 10)); // Segment every ~10 units

        const dir = new THREE.Vector3().subVectors(p2, p1).normalize();
        // Calculate "side" vector perpendicular to direction and normal
        const side = new THREE.Vector3().crossVectors(dir, normal).normalize();

        for (let k = 0; k < segments; k++) {
            const t1 = k / segments;
            const t2 = (k + 1) / segments;

            const pos1 = new THREE.Vector3().lerpVectors(p1, p2, t1);
            const pos2 = new THREE.Vector3().lerpVectors(p1, p2, t2);

            // Variable thickness and opacity
            // Use noise-like randomness based on position
            // Variable thickness and opacity
            // Use noise-like randomness based on position
            const noise1 = Math.sin(pos1.x * 0.1) * Math.cos(pos1.y * 0.1) * Math.sin(pos1.z * 0.1);
            const noise2 = Math.sin(pos2.x * 0.1) * Math.cos(pos2.y * 0.1) * Math.sin(pos2.z * 0.1);

            const w1 = baseWidth * (0.5 + 0.5 * Math.abs(noise1) + 0.5 * Math.random());
            const w2 = baseWidth * (0.5 + 0.5 * Math.abs(noise2) + 0.5 * Math.random());

            const a1 = 0.4 + 0.6 * Math.abs(noise1); // Opacity 0.4 - 1.0
            const a2 = 0.4 + 0.6 * Math.abs(noise2);

            // Vertices for the quad (strip)
            // v1 --- v2
            // |      |
            // v3 --- v4

            const v1 = pos1.clone().addScaledVector(side, w1 / 2);
            const v3 = pos1.clone().addScaledVector(side, -w1 / 2);
            const v2 = pos2.clone().addScaledVector(side, w2 / 2);
            const v4 = pos2.clone().addScaledVector(side, -w2 / 2);

            vertices.push(v1.x, v1.y, v1.z);
            vertices.push(v2.x, v2.y, v2.z);
            vertices.push(v3.x, v3.y, v3.z);
            vertices.push(v4.x, v4.y, v4.z);

            // Colors (constant for now)
            colors.push(BASE_COLOR.r, BASE_COLOR.g, BASE_COLOR.b);
            colors.push(BASE_COLOR.r, BASE_COLOR.g, BASE_COLOR.b);
            colors.push(BASE_COLOR.r, BASE_COLOR.g, BASE_COLOR.b);
            colors.push(BASE_COLOR.r, BASE_COLOR.g, BASE_COLOR.b);

            // Alphas
            alphas.push(a1, a2, a1, a2);

            // Indices (Two triangles)
            // 0, 2, 1
            // 1, 2, 3
            indices.push(vertexIndex, vertexIndex + 2, vertexIndex + 1);
            indices.push(vertexIndex + 1, vertexIndex + 2, vertexIndex + 3);

            vertexIndex += 4;
        }
    };

    const isShapePoint = (p) => {
        if (cullBelowZ === null) return true;
        return p.z > cullBelowZ + 5;
    };

    // Horizontal lines (i-direction)
    for (let j = 0; j < height; j++) {
        for (let i = 0; i < width - 1; i++) {
            const p1 = points[i][j];
            const p2 = points[i + 1][j];

            if (isShapePoint(p1) && isShapePoint(p2)) {
                // Calculate approximate normal
                // For horizontal line, look at vertical neighbors to get slope
                // Or just use Up vector (0,0,1) for simplicity if slope is small
                // Better: use cross product of (p2-p1) and (p_up - p_down)

                let v_up, v_down;
                if (j < height - 1) v_up = points[i][j + 1];
                else v_up = points[i][j]; // Boundary

                if (j > 0) v_down = points[i][j - 1];
                else v_down = points[i][j]; // Boundary

                const vecH = new THREE.Vector3(p2.x - p1.x, p2.y - p1.y, p2.z - p1.z);
                const vecV = new THREE.Vector3(v_up.x - v_down.x, v_up.y - v_down.y, v_up.z - v_down.z);

                // Normal is cross product
                const normal = new THREE.Vector3().crossVectors(vecH, vecV).normalize();
                if (normal.lengthSq() < 0.1) normal.set(0, 0, 1); // Fallback

                addRibbon(p1, p2, normal);
            }
        }
    }

    // Vertical lines (j-direction)
    for (let i = 0; i < width; i++) {
        for (let j = 0; j < height - 1; j++) {
            const p1 = points[i][j];
            const p2 = points[i][j + 1];

            if (isShapePoint(p1) && isShapePoint(p2)) {
                // Calculate approximate normal
                let v_right, v_left;
                if (i < width - 1) v_right = points[i + 1][j];
                else v_right = points[i][j];

                if (i > 0) v_left = points[i - 1][j];
                else v_left = points[i][j];

                const vecV = new THREE.Vector3(p2.x - p1.x, p2.y - p1.y, p2.z - p1.z);
                const vecH = new THREE.Vector3(v_right.x - v_left.x, v_right.y - v_left.y, v_right.z - v_left.z);

                // Normal is cross product (vecH x vecV)
                const normal = new THREE.Vector3().crossVectors(vecH, vecV).normalize();
                if (normal.lengthSq() < 0.1) normal.set(0, 0, 1);

                addRibbon(p1, p2, normal);
            }
        }
    }

    if (vertices.length > 0) {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        geometry.setAttribute('alpha', new THREE.Float32BufferAttribute(alphas, 1));
        geometry.setIndex(indices);

        // Clone material to allow independent opacity control
        const mat = SketchMaterial.clone();
        mat.uniforms.opacity.value = opacity;

        const mesh = new THREE.Mesh(geometry, mat);
        group.add(mesh);
    }

    return group;
}

// Wrapper to replace createGrid
function createGrid(points, color, opacity, lineWidth = 1, cullBelowZ = null) {
    return createSketchyGridMesh(points, color, opacity, lineWidth, cullBelowZ);
}

// Draw gridded walls on the 3D shape itself (cube or sphere faces)
function createShapeWalls(spacing, backZ) {
    const group = new THREE.Group();
    // Clipping plane to cut off geometry below backZ
    // Offset slightly (0.1) to avoid z-fighting with bottom face
    const clippingPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -backZ + 0.1);

    // We use the same SketchMaterial but we need to clone it to apply clipping planes
    // and specific opacity
    const material = SketchMaterial.clone();
    material.uniforms.opacity.value = config.shapeOpacity;
    material.clippingPlanes = [clippingPlane];
    material.clipping = true; // Enable clipping explicitly for shape

    const vertices = [];
    const colors = [];
    const alphas = [];
    const indices = [];
    let vertexIndex = 0;

    const BASE_COLOR = new THREE.Color(0x333333);
    const baseWidth = config.shapeLineWidth; // Use specific shape line width

    // Helper to add a ribbon segment
    const addRibbon = (p1, p2, normal) => {
        const dist = new THREE.Vector3(p1.x - p2.x, p1.y - p2.y, p1.z - p2.z).length();
        const segments = Math.max(2, Math.ceil(dist / 10));

        const dir = new THREE.Vector3().subVectors(p2, p1).normalize();
        const side = new THREE.Vector3().crossVectors(dir, normal).normalize();

        for (let k = 0; k < segments; k++) {
            const t1 = k / segments;
            const t2 = (k + 1) / segments;

            const pos1 = new THREE.Vector3().lerpVectors(p1, p2, t1);
            const pos2 = new THREE.Vector3().lerpVectors(p1, p2, t2);

            const noise1 = Math.sin(pos1.x * 0.1) * Math.cos(pos1.y * 0.1) * Math.sin(pos1.z * 0.1);
            const noise2 = Math.sin(pos2.x * 0.1) * Math.cos(pos2.y * 0.1) * Math.sin(pos2.z * 0.1);

            const w1 = baseWidth * (0.5 + 0.5 * Math.abs(noise1) + 0.5 * Math.random());
            const w2 = baseWidth * (0.5 + 0.5 * Math.abs(noise2) + 0.5 * Math.random());

            const a1 = 0.4 + 0.6 * Math.abs(noise1);
            const a2 = 0.4 + 0.6 * Math.abs(noise2);

            const v1 = pos1.clone().addScaledVector(side, w1 / 2);
            const v3 = pos1.clone().addScaledVector(side, -w1 / 2);
            const v2 = pos2.clone().addScaledVector(side, w2 / 2);
            const v4 = pos2.clone().addScaledVector(side, -w2 / 2);

            vertices.push(v1.x, v1.y, v1.z);
            vertices.push(v2.x, v2.y, v2.z);
            vertices.push(v3.x, v3.y, v3.z);
            vertices.push(v4.x, v4.y, v4.z);

            colors.push(BASE_COLOR.r, BASE_COLOR.g, BASE_COLOR.b);
            colors.push(BASE_COLOR.r, BASE_COLOR.g, BASE_COLOR.b);
            colors.push(BASE_COLOR.r, BASE_COLOR.g, BASE_COLOR.b);
            colors.push(BASE_COLOR.r, BASE_COLOR.g, BASE_COLOR.b);

            alphas.push(a1, a2, a1, a2);

            indices.push(vertexIndex, vertexIndex + 2, vertexIndex + 1);
            indices.push(vertexIndex + 1, vertexIndex + 2, vertexIndex + 3);

            vertexIndex += 4;
        }
    };

    const gridDivisions = config.cubeSize;
    const size = spacing;

    const shapeCenterX = config.cubeX * spacing;
    const shapeCenterY = config.cubeY * spacing;
    let shapeCenterZ;

    if (config.shapeType === 'cube') {
        const cubeDepth = gridDivisions * size;
        shapeCenterZ = backZ + cubeDepth / 2;
    } else {
        shapeCenterZ = backZ + gridDivisions * size * 0.6;
    }

    const localX = 0;
    const localY = 0;
    const localZ = 0;

    if (config.shapeType === 'cube') {
        const cubeWidth = gridDivisions * size;
        const cubeHeight = gridDivisions * size;
        const cubeDepth = gridDivisions * size;
        const halfWidth = cubeWidth / 2;
        const halfHeight = cubeHeight / 2;
        const halfDepth = cubeDepth / 2;
        const gridLines = gridDivisions;

        // Front face (Z+)
        const frontZ = localZ + halfDepth;
        const frontNormal = new THREE.Vector3(0, 0, 1);
        for (let i = 0; i <= gridLines; i++) {
            const t = i / gridLines;
            const y = localY - halfHeight + t * cubeHeight;
            addRibbon(new THREE.Vector3(localX - halfWidth, y, frontZ), new THREE.Vector3(localX + halfWidth, y, frontZ), frontNormal);
            const x = localX - halfWidth + t * cubeWidth;
            addRibbon(new THREE.Vector3(x, localY - halfHeight, frontZ), new THREE.Vector3(x, localY + halfHeight, frontZ), frontNormal);
        }

        // Back face (Z-)
        const backFaceZ = localZ - halfDepth;
        const backNormal = new THREE.Vector3(0, 0, -1);
        for (let i = 0; i <= gridLines; i++) {
            const t = i / gridLines;
            const y = localY - halfHeight + t * cubeHeight;
            addRibbon(new THREE.Vector3(localX - halfWidth, y, backFaceZ), new THREE.Vector3(localX + halfWidth, y, backFaceZ), backNormal);
            const x = localX - halfWidth + t * cubeWidth;
            addRibbon(new THREE.Vector3(x, localY - halfHeight, backFaceZ), new THREE.Vector3(x, localY + halfHeight, backFaceZ), backNormal);
        }

        // Left face (X-)
        const leftX = localX - halfWidth;
        const leftNormal = new THREE.Vector3(-1, 0, 0);
        for (let i = 0; i <= gridLines; i++) {
            const t = i / gridLines;
            const y = localY - halfHeight + t * cubeHeight;
            addRibbon(new THREE.Vector3(leftX, y, localZ - halfDepth), new THREE.Vector3(leftX, y, localZ + halfDepth), leftNormal);
            const z = localZ - halfDepth + t * cubeDepth;
            addRibbon(new THREE.Vector3(leftX, localY - halfHeight, z), new THREE.Vector3(leftX, localY + halfHeight, z), leftNormal);
        }

        // Right face (X+)
        const rightX = localX + halfWidth;
        const rightNormal = new THREE.Vector3(1, 0, 0);
        for (let i = 0; i <= gridLines; i++) {
            const t = i / gridLines;
            const y = localY - halfHeight + t * cubeHeight;
            addRibbon(new THREE.Vector3(rightX, y, localZ - halfDepth), new THREE.Vector3(rightX, y, localZ + halfDepth), rightNormal);
            const z = localZ - halfDepth + t * cubeDepth;
            addRibbon(new THREE.Vector3(rightX, localY - halfHeight, z), new THREE.Vector3(rightX, localY + halfHeight, z), rightNormal);
        }

        // Bottom face (Y-)
        const bottomY = localY - halfHeight;
        const bottomNormal = new THREE.Vector3(0, -1, 0);
        for (let i = 0; i <= gridLines; i++) {
            const t = i / gridLines;
            const x = localX - halfWidth + t * cubeWidth;
            addRibbon(new THREE.Vector3(x, bottomY, localZ - halfDepth), new THREE.Vector3(x, bottomY, localZ + halfDepth), bottomNormal);
            const z = localZ - halfDepth + t * cubeDepth;
            addRibbon(new THREE.Vector3(localX - halfWidth, bottomY, z), new THREE.Vector3(localX + halfWidth, bottomY, z), bottomNormal);
        }



        // Top face (Y+)
        const topY = localY + halfHeight;
        const topNormal = new THREE.Vector3(0, 1, 0);
        for (let i = 0; i <= gridLines; i++) {
            const t = i / gridLines;
            const x = localX - halfWidth + t * cubeWidth;
            addRibbon(new THREE.Vector3(x, topY, localZ - halfDepth), new THREE.Vector3(x, topY, localZ + halfDepth), topNormal);
            const z = localZ - halfDepth + t * cubeDepth;
            addRibbon(new THREE.Vector3(localX - halfWidth, topY, z), new THREE.Vector3(localX + halfWidth, topY, z), topNormal);
        }
    } else {
        // Sphere
        const radius = gridDivisions * size * 0.6;
        shapeCenterZ = backZ + radius;
        const latLines = gridDivisions;
        const lonLines = gridDivisions * 1.5;

        // Helper to get radial normal
        const getRadialNormal = (p) => {
            return new THREE.Vector3(p.x - localX, p.y - localY, p.z - localZ).normalize();
        };

        // Latitude lines
        for (let lat = 0; lat <= latLines; lat++) {
            const theta = (lat * Math.PI) / latLines;
            const sinTheta = Math.sin(theta);
            const cosTheta = Math.cos(theta);

            for (let lon = 0; lon < lonLines; lon++) {
                const phi1 = (lon * 2 * Math.PI) / lonLines;
                const phi2 = ((lon + 1) * 2 * Math.PI) / lonLines;

                const p1 = new THREE.Vector3(
                    localX + radius * sinTheta * Math.cos(phi1),
                    localY + radius * cosTheta,
                    localZ + radius * sinTheta * Math.sin(phi1)
                );
                const p2 = new THREE.Vector3(
                    localX + radius * sinTheta * Math.cos(phi2),
                    localY + radius * cosTheta,
                    localZ + radius * sinTheta * Math.sin(phi2)
                );

                // Use average normal for the segment
                const mid = new THREE.Vector3().lerpVectors(p1, p2, 0.5);
                addRibbon(p1, p2, getRadialNormal(mid));
            }
        }

        // Longitude lines
        for (let lon = 0; lon < lonLines; lon++) {
            const phi = (lon * 2 * Math.PI) / lonLines;

            for (let lat = 0; lat < latLines; lat++) {
                const theta1 = (lat * Math.PI) / latLines;
                const theta2 = ((lat + 1) * Math.PI) / latLines;

                const p1 = new THREE.Vector3(
                    localX + radius * Math.sin(theta1) * Math.cos(phi),
                    localY + radius * Math.cos(theta1),
                    localZ + radius * Math.sin(theta1) * Math.sin(phi)
                );
                const p2 = new THREE.Vector3(
                    localX + radius * Math.sin(theta2) * Math.cos(phi),
                    localY + radius * Math.cos(theta2),
                    localZ + radius * Math.sin(theta2) * Math.sin(phi)
                );

                const mid = new THREE.Vector3().lerpVectors(p1, p2, 0.5);
                addRibbon(p1, p2, getRadialNormal(mid));
            }
        }
    }

    if (vertices.length > 0) {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        geometry.setAttribute('alpha', new THREE.Float32BufferAttribute(alphas, 1));
        geometry.setIndex(indices);

        const mesh = new THREE.Mesh(geometry, material);

        mesh.position.set(shapeCenterX, shapeCenterY, shapeCenterZ);
        mesh.rotation.x = config.rotationX * Math.PI / 180;
        mesh.rotation.y = config.rotationY * Math.PI / 180;
        mesh.rotation.z = config.rotationZ * Math.PI / 180;

        group.add(mesh);
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
    const VIEWPORT_SIZE = 1500; // Grid coverage area

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
    // Let's modify createGrid    // Render the full drape surface (including flat parts)
    // Render the full drape surface (including flat parts)
    const frontGrid = createGrid(frontPoints, 0x333333, config.drapeOpacity, config.drapeLineWidth, null);
    frontGrid.renderOrder = 2; // Draw last (on top)
    frontGridGroup.add(frontGrid);

    // Render back grid (flat floor grid)
    if (config.showBackGrid) {
        // Darker color and higher opacity for better visibility
        const backGrid = createGrid(backPoints, 0x888888, config.backGridOpacity, config.backGridLineWidth, null);
        backGrid.renderOrder = 0; // Draw first (background)
        backGridGroup.add(backGrid);
    }

    // Render the 3D shape's walls with grids
    const shapeWalls = createShapeWalls(spacing, backZ);
    shapeWalls.renderOrder = 1; // Draw middle
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

    appearanceFolder.add(config, 'drapeLineWidth', 0.5, 5, 0.1).name('Drape Width').onChange(updateVisualization);
    appearanceFolder.add(config, 'shapeLineWidth', 0.5, 5, 0.1).name('Shape Width').onChange(updateVisualization);
    appearanceFolder.add(config, 'backGridLineWidth', 0.5, 5, 0.1).name('Back Grid Width').onChange(updateVisualization);

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
