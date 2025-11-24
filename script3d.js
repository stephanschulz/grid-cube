// Three.js setup
let scene, camera, renderer, controls;
let backGridGroup, frontGridGroup, cubeWallsGroup, interiorSlicesGroup;

// Configuration
let config = loadConfig();

// Load configuration from localStorage or use defaults
function loadConfig() {
    const defaults = {
        gridDensity: 20,
        selectedPointX: 10,
        selectedPointY: 10,
        zSeparation: 200,
        cubeSize: 5,
        influenceRadius: 60,
        clothAlpha: 0.5,
        shapeShellAlpha: 0.8,
        insideShapeAlpha: 0.6,
        shapeType: 'cube',
        renderMode: 'lines',
        pointSize: 3.0
    };
    
    const saved = localStorage.getItem('gridCubeConfig');
    if (saved) {
        return { ...defaults, ...JSON.parse(saved) };
    }
    return defaults;
}

// Save configuration to localStorage
function saveConfig() {
    localStorage.setItem('gridCubeConfig', JSON.stringify(config));
}

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
    camera.position.set(0, 0, 1200);
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
    controls.screenSpacePanning = false;
    controls.minDistance = 200;
    controls.maxDistance = 3000;
    
    // Groups for organized rendering
    backGridGroup = new THREE.Group();
    frontGridGroup = new THREE.Group();
    cubeWallsGroup = new THREE.Group();
    interiorSlicesGroup = new THREE.Group();
    
    scene.add(backGridGroup);
    scene.add(frontGridGroup);
    scene.add(cubeWallsGroup);
    scene.add(interiorSlicesGroup);
    
    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.3);
    directionalLight.position.set(1, 1, 1);
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

// Shape abstraction functions
function isInsideCube(i, j, cubeSize) {
    const dx = Math.abs(i - config.selectedPointX);
    const dy = Math.abs(j - config.selectedPointY);
    const gridDistance = Math.max(dx, dy);
    return gridDistance <= cubeSize - 1;
}

function isOnCubeEdge(i, j, cubeSize) {
    const dx = Math.abs(i - config.selectedPointX);
    const dy = Math.abs(j - config.selectedPointY);
    const maxDist = Math.max(dx, dy);
    return maxDist === cubeSize - 1;
}

function isInsideSphere(i, j, sphereRadius) {
    const dx = i - config.selectedPointX;
    const dy = j - config.selectedPointY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance <= sphereRadius - 1;
}

function isOnSphereSurface(i, j, sphereRadius) {
    const dx = i - config.selectedPointX;
    const dy = j - config.selectedPointY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    // Surface is within 0.5 grid units of the radius
    return Math.abs(distance - (sphereRadius - 1)) <= 0.7;
}

function isInsideShape(i, j, shapeType, size) {
    if (shapeType === 'cube') return isInsideCube(i, j, size);
    if (shapeType === 'sphere') return isInsideSphere(i, j, size);
    return false;
}

function isOnShapeShell(i, j, shapeType, size) {
    if (shapeType === 'cube') return isOnCubeEdge(i, j, size);
    if (shapeType === 'sphere') return isOnSphereSurface(i, j, size);
    return false;
}

// Grid point classification system
// Returns: 'cloth', 'shape-shell', 'inside-shape'
function classifyGridPoint(i, j, z, frontPoints, backZ) {
    const frontZ = frontPoints[i][j].z;
    const isInShape = isInsideShape(i, j, config.shapeType, config.cubeSize);
    const isOnShell = isOnShapeShell(i, j, config.shapeType, config.cubeSize);
    
    // Check if on shape shell (boundary)
    if (isOnShell) {
        return 'shape-shell';
    }
    
    // Check if inside shape volume
    if (isInShape) {
        return 'inside-shape';
    }
    
    // Everything else is cloth (outside shape with displacement)
    return 'cloth';
}

// Map classification to alpha value
function getPointAlpha(classification) {
    switch(classification) {
        case 'cloth':
            return config.clothAlpha;
        case 'shape-shell':
            return config.shapeShellAlpha;
        case 'inside-shape':
            return config.insideShapeAlpha;
        default:
            return 0.5;
    }
}

// Create a gradient line with alpha interpolation
function createGradientLine(p1, p2, alpha1, alpha2) {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array([
        p1.x, p1.y, p1.z,
        p2.x, p2.y, p2.z
    ]);
    const alphas = new Float32Array([alpha1, alpha2]);
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));
    
    const material = new THREE.ShaderMaterial({
        uniforms: {},
        vertexShader: `
            attribute float alpha;
            varying float vAlpha;
            
            void main() {
                vAlpha = alpha;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            varying float vAlpha;
            
            void main() {
                gl_FragColor = vec4(0.0, 0.0, 0.0, vAlpha);
            }
        `,
        transparent: true,
        depthTest: true,
        depthWrite: false
    });
    
    return new THREE.Line(geometry, material);
}

// Create multiple gradient lines at once
function createGradientLines(lineData) {
    // lineData is array of {p1, p2, alpha1, alpha2}
    const group = new THREE.Group();
    
    for (const data of lineData) {
        const line = createGradientLine(data.p1, data.p2, data.alpha1, data.alpha2);
        group.add(line);
    }
    
    return group;
}

function calculateZPull(i, j) {
    const dx = i - config.selectedPointX;
    const dy = j - config.selectedPointY;
    
    let gridDistance;
    let shapeRadius;
    
    if (config.shapeType === 'cube') {
        // Chebyshev distance for cube
        gridDistance = Math.max(Math.abs(dx), Math.abs(dy));
        shapeRadius = config.cubeSize;
    } else {
        // Euclidean distance for sphere
        gridDistance = Math.sqrt(dx * dx + dy * dy);
        shapeRadius = config.cubeSize;
    }
    
    const influenceDistance = config.gridDensity * (config.influenceRadius / 100);
    
    if (gridDistance <= shapeRadius - 1) {
        return config.zSeparation;
    } else if (influenceDistance > 0 && gridDistance <= shapeRadius - 1 + influenceDistance) {
        const distanceFromShape = gridDistance - (shapeRadius - 1);
        const normalizedDist = distanceFromShape / influenceDistance;
        const falloff = (Math.cos(normalizedDist * Math.PI) + 1) / 2;
        return config.zSeparation * falloff;
    }
    return 0;
}

// Create grid geometry
function createGridLines(points, alpha, color = 0x333333) {
    const material = new THREE.LineBasicMaterial({
        color: color,
        transparent: true,
        opacity: alpha
    });
    
    const group = new THREE.Group();
    
    // Vertical lines
    for (let i = 0; i <= config.gridDensity; i++) {
        const geometry = new THREE.BufferGeometry();
        const vertices = [];
        
        for (let j = 0; j <= config.gridDensity; j++) {
            const point = points[i][j];
            if (point) {
                vertices.push(point.x, point.y, point.z);
            }
        }
        
        if (vertices.length > 0) {
            geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
            const line = new THREE.Line(geometry, material);
            group.add(line);
        }
    }
    
    // Horizontal lines
    for (let j = 0; j <= config.gridDensity; j++) {
        const geometry = new THREE.BufferGeometry();
        const vertices = [];
        
        for (let i = 0; i <= config.gridDensity; i++) {
            const point = points[i][j];
            if (point) {
                vertices.push(point.x, point.y, point.z);
            }
        }
        
        if (vertices.length > 0) {
            geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
            const line = new THREE.Line(geometry, material);
            group.add(line);
        }
    }
    
    return group;
}

// Update the entire visualization
function updateVisualization() {
    // Clear existing geometry
    backGridGroup.clear();
    frontGridGroup.clear();
    cubeWallsGroup.clear();
    interiorSlicesGroup.clear();
    
    const spacing = 700 / config.gridDensity;
    const backZ = -400;
    
    // Create front grid points (with Z displacement)
    const frontPoints = [];
    for (let i = 0; i <= config.gridDensity; i++) {
        frontPoints[i] = [];
        for (let j = 0; j <= config.gridDensity; j++) {
            const x = (i - config.gridDensity / 2) * spacing;
            const y = (j - config.gridDensity / 2) * spacing;
            const zPull = calculateZPull(i, j);
            frontPoints[i][j] = { x, y, z: backZ + zPull, pull: zPull };
        }
    }
    
    // Points-only mode for performance
    if (config.renderMode === 'points') {
        const pointsGeometry = new THREE.BufferGeometry();
        const positions = [];
        const alphas = [];
        
        // Back layer points (all classified as cloth since they're not displaced)
        for (let i = 0; i <= config.gridDensity; i++) {
            for (let j = 0; j <= config.gridDensity; j++) {
                const x = (i - config.gridDensity / 2) * spacing;
                const y = (j - config.gridDensity / 2) * spacing;
                positions.push(x, y, backZ);
                alphas.push(config.clothAlpha);
            }
        }
        
        // Front layer points
        for (let i = 0; i <= config.gridDensity; i++) {
            for (let j = 0; j <= config.gridDensity; j++) {
                const p = frontPoints[i][j];
                if (Math.abs(p.pull) > 0.1) {
                    const classification = classifyGridPoint(i, j, p.z, frontPoints, backZ);
                    const alpha = getPointAlpha(classification);
                    positions.push(p.x, p.y, p.z);
                    alphas.push(alpha);
                }
            }
        }
        
        // Intermediate slice points
        if (Math.abs(config.zSeparation) > spacing) {
            const maxZDisplacement = Math.abs(config.zSeparation);
            const numSlices = Math.floor(maxZDisplacement / spacing);
            
            for (let slice = 1; slice <= numSlices; slice++) {
                const sliceZ = backZ + (slice * spacing * Math.sign(config.zSeparation));
                
                for (let i = 0; i <= config.gridDensity; i++) {
                    for (let j = 0; j <= config.gridDensity; j++) {
                        const frontZ = frontPoints[i][j].z;
                        const isInFootprint = (config.zSeparation > 0 && sliceZ > backZ && sliceZ < frontZ) ||
                                             (config.zSeparation < 0 && sliceZ < backZ && sliceZ > frontZ);
                        
                        if (isInFootprint) {
                            const x = (i - config.gridDensity / 2) * spacing;
                            const y = (j - config.gridDensity / 2) * spacing;
                            const classification = classifyGridPoint(i, j, sliceZ, frontPoints, backZ);
                            const alpha = getPointAlpha(classification);
                            positions.push(x, y, sliceZ);
                            alphas.push(alpha);
                        }
                    }
                }
            }
        }
        
        pointsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        pointsGeometry.setAttribute('alpha', new THREE.Float32BufferAttribute(alphas, 1));
        
        const pointsMaterial = new THREE.ShaderMaterial({
            uniforms: {
                pointSize: { value: config.pointSize }
            },
            vertexShader: `
                attribute float alpha;
                varying float vAlpha;
                uniform float pointSize;
                
                void main() {
                    vAlpha = alpha;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                    gl_PointSize = pointSize;
                }
            `,
            fragmentShader: `
                varying float vAlpha;
                
                void main() {
                    // Circular point shape
                    vec2 coord = gl_PointCoord - vec2(0.5);
                    if (length(coord) > 0.5) discard;
                    
                    gl_FragColor = vec4(0.0, 0.0, 0.0, vAlpha);
                }
            `,
            transparent: true,
            depthTest: true,
            depthWrite: false
        });
        
        const pointsCloud = new THREE.Points(pointsGeometry, pointsMaterial);
        backGridGroup.add(pointsCloud);
        
        return;
    }
    
    // Storage for all lines categorized
    const horizontalLinesBack = [];
    const horizontalLinesFront = [];
    const verticalLinesBack = [];
    const verticalLinesFront = [];
    const zConnections = [];
    const sliceLines = [];
    
    // Build back layer horizontal and vertical grid lines
    for (let i = 0; i <= config.gridDensity; i++) {
        for (let j = 0; j <= config.gridDensity; j++) {
            const x = (i - config.gridDensity / 2) * spacing;
            const y = (j - config.gridDensity / 2) * spacing;
            const p1 = { x, y, z: backZ };
            const alpha1 = config.backGridAlpha;
            
            // Horizontal connection (i to i+1)
            if (i < config.gridDensity) {
                const x2 = (i + 1 - config.gridDensity / 2) * spacing;
                const p2 = { x: x2, y, z: backZ };
                const alpha2 = config.backGridAlpha;
                horizontalLinesBack.push({ p1, p2, alpha1, alpha2 });
            }
            
            // Vertical connection (j to j+1)
            if (j < config.gridDensity) {
                const y2 = (j + 1 - config.gridDensity / 2) * spacing;
                const p2 = { x, y: y2, z: backZ };
                const alpha2 = config.backGridAlpha;
                verticalLinesBack.push({ p1, p2, alpha1, alpha2 });
            }
        }
    }
    
    // Build front layer horizontal and vertical grid lines with classifications
    for (let i = 0; i <= config.gridDensity; i++) {
        for (let j = 0; j <= config.gridDensity; j++) {
            const p1 = frontPoints[i][j];
            const class1 = classifyGridPoint(i, j, p1.z, frontPoints, backZ);
            const alpha1 = getPointAlpha(class1);
            
            // Horizontal connection (i to i+1)
            if (i < config.gridDensity) {
                const p2 = frontPoints[i + 1][j];
                const class2 = classifyGridPoint(i + 1, j, p2.z, frontPoints, backZ);
                const alpha2 = getPointAlpha(class2);
                horizontalLinesFront.push({ p1, p2, alpha1, alpha2 });
            }
            
            // Vertical connection (j to j+1)
            if (j < config.gridDensity) {
                const p2 = frontPoints[i][j + 1];
                const class2 = classifyGridPoint(i, j + 1, p2.z, frontPoints, backZ);
                const alpha2 = getPointAlpha(class2);
                verticalLinesFront.push({ p1, p2, alpha1, alpha2 });
            }
        }
    }
    
    // Build Z-direction connecting lines from back to front
    for (let i = 0; i <= config.gridDensity; i++) {
        for (let j = 0; j <= config.gridDensity; j++) {
            const frontPoint = frontPoints[i][j];
            
            // Only draw Z connection if there's displacement
            if (Math.abs(frontPoint.pull) > 0.1) {
                const x = (i - config.gridDensity / 2) * spacing;
                const y = (j - config.gridDensity / 2) * spacing;
                const backPoint = { x, y, z: backZ };
                
                const backClass = 'back';
                const frontClass = classifyGridPoint(i, j, frontPoint.z, frontPoints, backZ);
                
                const alpha1 = config.backGridAlpha;
                const alpha2 = getPointAlpha(frontClass);
                
                zConnections.push({ p1: backPoint, p2: frontPoint, alpha1, alpha2 });
            }
        }
    }
    
    // Build intermediate horizontal slices
    if (Math.abs(config.zSeparation) > spacing) {
        const maxZDisplacement = Math.abs(config.zSeparation);
        const numSlices = Math.floor(maxZDisplacement / spacing);
        
        for (let slice = 1; slice <= numSlices; slice++) {
            const sliceZ = backZ + (slice * spacing * Math.sign(config.zSeparation));
            
            for (let i = 0; i <= config.gridDensity; i++) {
                for (let j = 0; j <= config.gridDensity; j++) {
                    const frontZ = frontPoints[i][j].z;
                    
                    // Check if this slice Z is between back and front for this point
                    const isInFootprint = (config.zSeparation > 0 && sliceZ > backZ && sliceZ < frontZ) ||
                                         (config.zSeparation < 0 && sliceZ < backZ && sliceZ > frontZ);
                    
                    if (isInFootprint) {
                        const x = (i - config.gridDensity / 2) * spacing;
                        const y = (j - config.gridDensity / 2) * spacing;
                        const p1 = { x, y, z: sliceZ };
                        const class1 = classifyGridPoint(i, j, sliceZ, frontPoints, backZ);
                        const alpha1 = getPointAlpha(class1);
                        
                        // Horizontal connection (i to i+1)
                        if (i < config.gridDensity) {
                            const frontZ2 = frontPoints[i + 1][j].z;
                            const isInFootprint2 = (config.zSeparation > 0 && sliceZ > backZ && sliceZ < frontZ2) ||
                                                   (config.zSeparation < 0 && sliceZ < backZ && sliceZ > frontZ2);
                            
                            if (isInFootprint2) {
                                const x2 = (i + 1 - config.gridDensity / 2) * spacing;
                                const p2 = { x: x2, y, z: sliceZ };
                                const class2 = classifyGridPoint(i + 1, j, sliceZ, frontPoints, backZ);
                                const alpha2 = getPointAlpha(class2);
                                sliceLines.push({ p1, p2, alpha1, alpha2 });
                            }
                        }
                        
                        // Vertical connection (j to j+1)
                        if (j < config.gridDensity) {
                            const frontZ2 = frontPoints[i][j + 1].z;
                            const isInFootprint2 = (config.zSeparation > 0 && sliceZ > backZ && sliceZ < frontZ2) ||
                                                   (config.zSeparation < 0 && sliceZ < backZ && sliceZ > frontZ2);
                            
                            if (isInFootprint2) {
                                const y2 = (j + 1 - config.gridDensity / 2) * spacing;
                                const p2 = { x, y: y2, z: sliceZ };
                                const class2 = classifyGridPoint(i, j + 1, sliceZ, frontPoints, backZ);
                                const alpha2 = getPointAlpha(class2);
                                sliceLines.push({ p1, p2, alpha1, alpha2 });
                            }
                        }
                    }
                }
            }
        }
    }
    
    // Render all lines with gradient alphas
    const backHLines = createGradientLines(horizontalLinesBack);
    const backVLines = createGradientLines(verticalLinesBack);
    const frontHLines = createGradientLines(horizontalLinesFront);
    const frontVLines = createGradientLines(verticalLinesFront);
    const zLines = createGradientLines(zConnections);
    const sliceGridLines = createGradientLines(sliceLines);
    
    backGridGroup.add(backHLines);
    backGridGroup.add(backVLines);
    frontGridGroup.add(frontHLines);
    frontGridGroup.add(frontVLines);
    cubeWallsGroup.add(zLines);
    interiorSlicesGroup.add(sliceGridLines);
}

// Reset camera to front view
function resetCamera() {
    camera.position.set(0, 0, 300);
    camera.lookAt(0, 0, 0);
    controls.target.set(0, 0, 0);
    controls.update();
}

// UI initialization
function initializeUI() {
    document.getElementById('densitySlider').value = config.gridDensity;
    document.getElementById('densityValue').textContent = config.gridDensity;
    
    document.getElementById('pointXSlider').value = config.selectedPointX;
    document.getElementById('pointXValue').textContent = config.selectedPointX;
    
    document.getElementById('pointYSlider').value = config.selectedPointY;
    document.getElementById('pointYValue').textContent = config.selectedPointY;
    
    document.getElementById('zSeparationSlider').value = config.zSeparation;
    document.getElementById('zSeparationValue').textContent = config.zSeparation;
    
    document.getElementById('cubeSizeSlider').value = config.cubeSize;
    document.getElementById('cubeSizeValue').textContent = config.cubeSize;
    
    document.getElementById('influenceRadiusSlider').value = config.influenceRadius;
    document.getElementById('influenceRadiusValue').textContent = config.influenceRadius + '%';
    
    document.getElementById('clothAlphaSlider').value = config.clothAlpha;
    document.getElementById('clothAlphaValue').textContent = config.clothAlpha.toFixed(1);
    
    document.getElementById('shapeShellAlphaSlider').value = config.shapeShellAlpha;
    document.getElementById('shapeShellAlphaValue').textContent = config.shapeShellAlpha.toFixed(1);
    
    document.getElementById('insideShapeAlphaSlider').value = config.insideShapeAlpha;
    document.getElementById('insideShapeAlphaValue').textContent = config.insideShapeAlpha.toFixed(1);
    
    document.getElementById('pointSizeSlider').value = config.pointSize;
    document.getElementById('pointSizeValue').textContent = config.pointSize.toFixed(1);
    
    const shapeBtn = document.getElementById('shapeTypeBtn');
    shapeBtn.textContent = config.shapeType === 'cube' ? 'Switch to Sphere' : 'Switch to Cube';
    
    const renderBtn = document.getElementById('renderModeBtn');
    renderBtn.textContent = config.renderMode === 'lines' ? 'Switch to Points Only' : 'Switch to Lines';
}

// Update point slider max values
function updatePointSliderMax() {
    const density = config.gridDensity;
    document.getElementById('pointXSlider').max = density;
    document.getElementById('pointYSlider').max = density;
    
    if (config.selectedPointX > density) {
        config.selectedPointX = density;
        document.getElementById('pointXSlider').value = density;
        document.getElementById('pointXValue').textContent = density;
    }
    if (config.selectedPointY > density) {
        config.selectedPointY = density;
        document.getElementById('pointYSlider').value = density;
        document.getElementById('pointYValue').textContent = density;
    }
}

// Event listeners
document.getElementById('densitySlider').addEventListener('input', (e) => {
    config.gridDensity = parseInt(e.target.value);
    document.getElementById('densityValue').textContent = config.gridDensity;
    updatePointSliderMax();
    updateVisualization();
    saveConfig();
});

document.getElementById('pointXSlider').addEventListener('input', (e) => {
    config.selectedPointX = parseInt(e.target.value);
    document.getElementById('pointXValue').textContent = config.selectedPointX;
    updateVisualization();
    saveConfig();
});

document.getElementById('pointYSlider').addEventListener('input', (e) => {
    config.selectedPointY = parseInt(e.target.value);
    document.getElementById('pointYValue').textContent = config.selectedPointY;
    updateVisualization();
    saveConfig();
});

document.getElementById('zSeparationSlider').addEventListener('input', (e) => {
    config.zSeparation = parseInt(e.target.value);
    document.getElementById('zSeparationValue').textContent = config.zSeparation;
    updateVisualization();
    saveConfig();
});

document.getElementById('cubeSizeSlider').addEventListener('input', (e) => {
    config.cubeSize = parseInt(e.target.value);
    document.getElementById('cubeSizeValue').textContent = config.cubeSize;
    updateVisualization();
    saveConfig();
});

document.getElementById('influenceRadiusSlider').addEventListener('input', (e) => {
    config.influenceRadius = parseInt(e.target.value);
    document.getElementById('influenceRadiusValue').textContent = config.influenceRadius + '%';
    updateVisualization();
    saveConfig();
});

document.getElementById('clothAlphaSlider').addEventListener('input', (e) => {
    config.clothAlpha = parseFloat(e.target.value);
    document.getElementById('clothAlphaValue').textContent = config.clothAlpha.toFixed(1);
    updateVisualization();
    saveConfig();
});

document.getElementById('shapeShellAlphaSlider').addEventListener('input', (e) => {
    config.shapeShellAlpha = parseFloat(e.target.value);
    document.getElementById('shapeShellAlphaValue').textContent = config.shapeShellAlpha.toFixed(1);
    updateVisualization();
    saveConfig();
});

document.getElementById('insideShapeAlphaSlider').addEventListener('input', (e) => {
    config.insideShapeAlpha = parseFloat(e.target.value);
    document.getElementById('insideShapeAlphaValue').textContent = config.insideShapeAlpha.toFixed(1);
    updateVisualization();
    saveConfig();
});

document.getElementById('pointSizeSlider').addEventListener('input', (e) => {
    config.pointSize = parseFloat(e.target.value);
    document.getElementById('pointSizeValue').textContent = config.pointSize.toFixed(1);
    updateVisualization();
    saveConfig();
});

document.getElementById('shapeTypeBtn').addEventListener('click', () => {
    config.shapeType = config.shapeType === 'cube' ? 'sphere' : 'cube';
    const shapeBtn = document.getElementById('shapeTypeBtn');
    shapeBtn.textContent = config.shapeType === 'cube' ? 'Switch to Sphere' : 'Switch to Cube';
    updateVisualization();
    saveConfig();
});

document.getElementById('renderModeBtn').addEventListener('click', () => {
    config.renderMode = config.renderMode === 'lines' ? 'points' : 'lines';
    const renderBtn = document.getElementById('renderModeBtn');
    renderBtn.textContent = config.renderMode === 'lines' ? 'Switch to Points Only' : 'Switch to Lines';
    updateVisualization();
    saveConfig();
});

document.getElementById('resetCameraBtn').addEventListener('click', () => {
    resetCamera();
});

// Initialize on load
init();

