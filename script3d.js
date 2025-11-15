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
        backGridAlpha: 0.5,
        frontGridAlpha: 1.0,
        connectionAlpha: 0.4,
        interiorAlpha: 0.3
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

// Helper functions
function isInsideCube(i, j) {
    const dx = Math.abs(i - config.selectedPointX);
    const dy = Math.abs(j - config.selectedPointY);
    const gridDistance = Math.max(dx, dy);
    return gridDistance <= config.cubeSize - 1;
}

function isOnCubeEdge(i, j) {
    const dx = Math.abs(i - config.selectedPointX);
    const dy = Math.abs(j - config.selectedPointY);
    const maxDist = Math.max(dx, dy);
    return maxDist === config.cubeSize - 1;
}

function calculateZPull(i, j) {
    const dx = Math.abs(i - config.selectedPointX);
    const dy = Math.abs(j - config.selectedPointY);
    const gridDistance = Math.max(dx, dy);
    
    const cubeSize = config.cubeSize;
    const influenceDistance = config.gridDensity * (config.influenceRadius / 100);
    
    if (gridDistance <= cubeSize - 1) {
        return config.zSeparation;
    } else if (influenceDistance > 0 && gridDistance <= cubeSize - 1 + influenceDistance) {
        const distanceFromCube = gridDistance - (cubeSize - 1);
        const normalizedDist = distanceFromCube / influenceDistance;
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
    
    // Create back grid points
    const backPoints = [];
    for (let i = 0; i <= config.gridDensity; i++) {
        backPoints[i] = [];
        for (let j = 0; j <= config.gridDensity; j++) {
            const x = (i - config.gridDensity / 2) * spacing;
            const y = (j - config.gridDensity / 2) * spacing;
            backPoints[i][j] = { x, y, z: backZ };
        }
    }
    
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
    
    // Draw back grid
    const backGrid = createGridLines(backPoints, config.backGridAlpha);
    backGridGroup.add(backGrid);
    
    // Draw front grid - cube face only
    const cubeFacePoints = [];
    for (let i = 0; i <= config.gridDensity; i++) {
        cubeFacePoints[i] = [];
        for (let j = 0; j <= config.gridDensity; j++) {
            cubeFacePoints[i][j] = isInsideCube(i, j) ? frontPoints[i][j] : null;
        }
    }
    const frontGrid = createGridLines(cubeFacePoints, config.frontGridAlpha);
    frontGridGroup.add(frontGrid);
    
    // Draw stretched cloth region
    if (config.influenceRadius > 0) {
        const stretchedPoints = [];
        for (let i = 0; i <= config.gridDensity; i++) {
            stretchedPoints[i] = [];
            for (let j = 0; j <= config.gridDensity; j++) {
                const isInStretched = !isInsideCube(i, j) && Math.abs(frontPoints[i][j].pull) > 0.1;
                stretchedPoints[i][j] = isInStretched ? frontPoints[i][j] : null;
            }
        }
        const stretchedGrid = createGridLines(stretchedPoints, config.backGridAlpha);
        frontGridGroup.add(stretchedGrid);
    }
    
    // Draw cube walls (Z-direction lines) and stretched cloth connecting lines
    if (config.connectionAlpha > 0) {
        const wallMaterial = new THREE.LineBasicMaterial({
            color: 0x333333,
            transparent: true,
            opacity: config.connectionAlpha
        });
        
        // Draw cube wall edges
        for (let i = 0; i <= config.gridDensity; i++) {
            for (let j = 0; j <= config.gridDensity; j++) {
                if (isOnCubeEdge(i, j)) {
                    const backPoint = backPoints[i][j];
                    const frontPoint = frontPoints[i][j];
                    
                    const geometry = new THREE.BufferGeometry();
                    const vertices = [
                        backPoint.x, backPoint.y, backPoint.z,
                        frontPoint.x, frontPoint.y, frontPoint.z
                    ];
                    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
                    const line = new THREE.Line(geometry, wallMaterial);
                    cubeWallsGroup.add(line);
                }
            }
        }
    }
    
    // Draw stretched cloth Z-direction connecting lines
    if (config.influenceRadius > 0 && config.backGridAlpha > 0) {
        const clothMaterial = new THREE.LineBasicMaterial({
            color: 0x333333,
            transparent: true,
            opacity: config.backGridAlpha * 0.5
        });
        
        for (let i = 0; i <= config.gridDensity; i++) {
            for (let j = 0; j <= config.gridDensity; j++) {
                const isInStretched = !isInsideCube(i, j) && Math.abs(frontPoints[i][j].pull) > 0.1;
                if (isInStretched) {
                    const backPoint = backPoints[i][j];
                    const frontPoint = frontPoints[i][j];
                    
                    const geometry = new THREE.BufferGeometry();
                    const vertices = [
                        backPoint.x, backPoint.y, backPoint.z,
                        frontPoint.x, frontPoint.y, frontPoint.z
                    ];
                    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
                    const line = new THREE.Line(geometry, clothMaterial);
                    cubeWallsGroup.add(line);
                }
            }
        }
    }
    
    // Draw interior slices
    if (config.interiorAlpha > 0 && Math.abs(config.zSeparation) > spacing) {
        const maxZDisplacement = Math.abs(config.zSeparation);
        const numSlices = Math.floor(maxZDisplacement / spacing);
        
        for (let slice = 1; slice <= numSlices; slice++) {
            const sliceZ = backZ + (slice * spacing * Math.sign(config.zSeparation));
            const slicePoints = [];
            
            for (let i = 0; i <= config.gridDensity; i++) {
                slicePoints[i] = [];
                for (let j = 0; j <= config.gridDensity; j++) {
                    const backPointZ = backZ;
                    const frontZ = frontPoints[i][j].z;
                    
                    // Check if this slice Z is between back and front for this point
                    const isInFootprint = (config.zSeparation > 0 && sliceZ > backPointZ && sliceZ < frontZ) ||
                                         (config.zSeparation < 0 && sliceZ < backPointZ && sliceZ > frontZ);
                    
                    if (isInFootprint) {
                        const x = (i - config.gridDensity / 2) * spacing;
                        const y = (j - config.gridDensity / 2) * spacing;
                        slicePoints[i][j] = { x, y, z: sliceZ };
                    } else {
                        slicePoints[i][j] = null;
                    }
                }
            }
            
            const sliceGrid = createGridLines(slicePoints, config.interiorAlpha * 0.6);
            interiorSlicesGroup.add(sliceGrid);
        }
    }
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
    
    document.getElementById('backGridAlphaSlider').value = config.backGridAlpha;
    document.getElementById('backGridAlphaValue').textContent = config.backGridAlpha.toFixed(1);
    
    document.getElementById('frontGridAlphaSlider').value = config.frontGridAlpha;
    document.getElementById('frontGridAlphaValue').textContent = config.frontGridAlpha.toFixed(1);
    
    document.getElementById('connectionAlphaSlider').value = config.connectionAlpha;
    document.getElementById('connectionAlphaValue').textContent = config.connectionAlpha.toFixed(1);
    
    document.getElementById('interiorAlphaSlider').value = config.interiorAlpha;
    document.getElementById('interiorAlphaValue').textContent = config.interiorAlpha.toFixed(1);
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

document.getElementById('backGridAlphaSlider').addEventListener('input', (e) => {
    config.backGridAlpha = parseFloat(e.target.value);
    document.getElementById('backGridAlphaValue').textContent = config.backGridAlpha.toFixed(1);
    updateVisualization();
    saveConfig();
});

document.getElementById('frontGridAlphaSlider').addEventListener('input', (e) => {
    config.frontGridAlpha = parseFloat(e.target.value);
    document.getElementById('frontGridAlphaValue').textContent = config.frontGridAlpha.toFixed(1);
    updateVisualization();
    saveConfig();
});

document.getElementById('connectionAlphaSlider').addEventListener('input', (e) => {
    config.connectionAlpha = parseFloat(e.target.value);
    document.getElementById('connectionAlphaValue').textContent = config.connectionAlpha.toFixed(1);
    updateVisualization();
    saveConfig();
});

document.getElementById('interiorAlphaSlider').addEventListener('input', (e) => {
    config.interiorAlpha = parseFloat(e.target.value);
    document.getElementById('interiorAlphaValue').textContent = config.interiorAlpha.toFixed(1);
    updateVisualization();
    saveConfig();
});

document.getElementById('resetCameraBtn').addEventListener('click', () => {
    resetCamera();
});

// Initialize on load
init();

