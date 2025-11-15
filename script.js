const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// Set canvas size
canvas.width = 1000;
canvas.height = 1000;

// Load configuration from localStorage or use defaults
function loadConfig() {
    const defaults = {
        gridDensity: 20,
        selectedPointX: 10,
        selectedPointY: 10,
        zSeparation: 200,
        cubeSize: 5, // Size of cube in grid units
        influenceRadius: 60, // Percentage of grid density for falloff distance
        backGridAlpha: 0.5,
        frontGridAlpha: 1.0,
        connectionAlpha: 0.4,
        interiorAlpha: 0.3,
        usePerspective: true
    };
    
    const saved = localStorage.getItem('gridCubeConfig');
    if (saved) {
        // Merge saved config with defaults to handle new properties
        return { ...defaults, ...JSON.parse(saved) };
    }
    return defaults;
}

// Save configuration to localStorage
function saveConfig() {
    localStorage.setItem('gridCubeConfig', JSON.stringify(config));
}

// Configuration
let config = loadConfig();

// 3D to 2D projection
function project3D(x, y, z) {
    if (config.usePerspective) {
        // Perspective projection - straight on view
        const perspective = 800;
        const scale = perspective / (perspective + z);
        return {
            x: x * scale + canvas.width / 2,
            y: y * scale + canvas.height / 2,
            z: z,
            scale: scale
        };
    } else {
        // Orthographic projection - angled side view to show Z depth
        // Rotate the view to see the Z displacement
        const angleX = Math.PI / 6; // 30 degrees
        const angleY = Math.PI / 8; // 22.5 degrees
        
        // Apply rotation
        let x2 = x * Math.cos(angleY) + z * Math.sin(angleY);
        let z2 = -x * Math.sin(angleY) + z * Math.cos(angleY);
        
        let y2 = y * Math.cos(angleX) - z2 * Math.sin(angleX);
        let z3 = y * Math.sin(angleX) + z2 * Math.cos(angleX);
        
        return {
            x: x2 + canvas.width / 2,
            y: y2 + canvas.height / 2,
            z: z3,
            scale: 1
        };
    }
}

// Create grid points for both layers
function createGridLayers() {
    const spacing = 700 / config.gridDensity;
    const backZ = -400;
    
    const backGrid = [];
    const frontGrid = [];
    
    for (let i = 0; i <= config.gridDensity; i++) {
        backGrid[i] = [];
        frontGrid[i] = [];
        
        for (let j = 0; j <= config.gridDensity; j++) {
            const x = (i - config.gridDensity / 2) * spacing;
            const y = (j - config.gridDensity / 2) * spacing;
            
            // Back grid point (always fixed)
            const backPoint3D = { x, y, z: backZ };
            backGrid[i][j] = {
                pos3D: backPoint3D,
                pos2D: project3D(backPoint3D.x, backPoint3D.y, backPoint3D.z)
            };
            
            // Front grid point - calculate distance-based pull (cube with falloff)
            let zPull = 0;
            
            // Calculate grid distance from selected point using cube (Chebyshev distance)
            const dx = Math.abs(i - config.selectedPointX);
            const dy = Math.abs(j - config.selectedPointY);
            const gridDistance = Math.max(dx, dy);
            
            const cubeSize = config.cubeSize; // Actual cube size in grid units
            const influenceDistance = config.gridDensity * (config.influenceRadius / 100); // Additional falloff distance
            
            if (gridDistance < cubeSize) {
                // Inside the cube - full displacement
                zPull = config.zSeparation;
            } else if (gridDistance < cubeSize + influenceDistance) {
                // In the falloff zone - smooth transition
                const distanceFromCube = gridDistance - cubeSize;
                const normalizedDist = distanceFromCube / influenceDistance;
                const falloff = (Math.cos(normalizedDist * Math.PI) + 1) / 2;
                zPull = config.zSeparation * falloff;
            }
            
            const frontPoint3D = { x, y, z: backZ + zPull };
            frontGrid[i][j] = {
                pos3D: frontPoint3D,
                pos2D: project3D(frontPoint3D.x, frontPoint3D.y, frontPoint3D.z),
                pull: zPull
            };
        }
    }
    
    return { backGrid, frontGrid };
}

// Draw the dual-layer grid system
function drawDualGrid() {
    const { backGrid, frontGrid } = createGridLayers();
    
    // Draw back grid (black)
    ctx.strokeStyle = `rgba(51, 51, 51, ${config.backGridAlpha})`;
    ctx.lineWidth = 2;
    
    // Back grid vertical lines
    for (let i = 0; i <= config.gridDensity; i++) {
        ctx.beginPath();
        for (let j = 0; j <= config.gridDensity; j++) {
            const point = backGrid[i][j].pos2D;
            if (j === 0) {
                ctx.moveTo(point.x, point.y);
            } else {
                ctx.lineTo(point.x, point.y);
            }
        }
        ctx.stroke();
    }
    
    // Back grid horizontal lines
    for (let j = 0; j <= config.gridDensity; j++) {
        ctx.beginPath();
        for (let i = 0; i <= config.gridDensity; i++) {
            const point = backGrid[i][j].pos2D;
            if (i === 0) {
                ctx.moveTo(point.x, point.y);
            } else {
                ctx.lineTo(point.x, point.y);
            }
        }
        ctx.stroke();
    }
    
    // Draw back grid points
    ctx.fillStyle = `rgba(51, 51, 51, ${config.backGridAlpha * 0.8})`;
    for (let i = 0; i <= config.gridDensity; i++) {
        for (let j = 0; j <= config.gridDensity; j++) {
            const point = backGrid[i][j].pos2D;
            ctx.beginPath();
            ctx.arc(point.x, point.y, 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    // Helper function to check if a point is on the edge of the CUBE (not the displaced region)
    const isOnCubeEdge = (i, j) => {
        const dx = Math.abs(i - config.selectedPointX);
        const dy = Math.abs(j - config.selectedPointY);
        
        // Point is on cube edge if it's inside the cube AND on the perimeter
        // The perimeter is where max(dx, dy) === cubeSize - 1
        const maxDist = Math.max(dx, dy);
        return maxDist === config.cubeSize - 1;
    };
    
    // Helper function to check if a point is inside the cube
    const isInsideCube = (i, j) => {
        const dx = Math.abs(i - config.selectedPointX);
        const dy = Math.abs(j - config.selectedPointY);
        const gridDistance = Math.max(dx, dy);
        return gridDistance < config.cubeSize;
    };
    
    // Draw connecting lines for points with significant pull
    if (config.zSeparation !== 0) {
        const spacing = 700 / config.gridDensity;
        
        // Draw cube wall lines - only the actual cube edges
        if (config.connectionAlpha > 0) {
            ctx.strokeStyle = `rgba(51, 51, 51, ${config.connectionAlpha})`;
            ctx.lineWidth = 2;
            
            for (let i = 0; i <= config.gridDensity; i++) {
                for (let j = 0; j <= config.gridDensity; j++) {
                    if (isOnCubeEdge(i, j)) {
                        const backPoint = backGrid[i][j].pos2D;
                        const frontPoint = frontGrid[i][j].pos2D;
                        
                        ctx.beginPath();
                        ctx.moveTo(backPoint.x, backPoint.y);
                        ctx.lineTo(frontPoint.x, frontPoint.y);
                        ctx.stroke();
                    }
                }
            }
        }
        
        
        // Highlight the selected point with thicker line
        const i = config.selectedPointX;
        const j = config.selectedPointY;
        
        const backPoint = backGrid[i][j].pos2D;
        const frontPoint = frontGrid[i][j].pos2D;
        
        ctx.strokeStyle = `rgba(51, 51, 51, ${config.connectionAlpha * 1.5})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(backPoint.x, backPoint.y);
        ctx.lineTo(frontPoint.x, frontPoint.y);
        ctx.stroke();
        
        // Highlight the selected back point
        ctx.fillStyle = `rgba(51, 51, 51, ${config.backGridAlpha})`;
        ctx.beginPath();
        ctx.arc(backPoint.x, backPoint.y, 5, 0, Math.PI * 2);
        ctx.fill();
        
        // Highlight the pulled/pushed front point
        ctx.fillStyle = `rgba(51, 51, 51, ${config.frontGridAlpha})`;
        ctx.beginPath();
        ctx.arc(frontPoint.x, frontPoint.y, 7, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Helper to check if point is in stretched region (outside cube but has displacement)
    const isInStretchedRegion = (i, j) => {
        return !isInsideCube(i, j) && Math.abs(frontGrid[i][j].pull) > 5;
    };
    
    // Draw front grid - cube face only
    ctx.strokeStyle = `rgba(51, 51, 51, ${config.frontGridAlpha})`;
    ctx.lineWidth = 2;
    
    // Front grid vertical lines - only inside the cube
    for (let i = 0; i <= config.gridDensity; i++) {
        for (let j = 0; j < config.gridDensity; j++) {
            if (isInsideCube(i, j) && isInsideCube(i, j+1)) {
                const point1 = frontGrid[i][j].pos2D;
                const point2 = frontGrid[i][j+1].pos2D;
                
                ctx.beginPath();
                ctx.moveTo(point1.x, point1.y);
                ctx.lineTo(point2.x, point2.y);
                ctx.stroke();
            }
        }
    }
    
    // Front grid horizontal lines - only inside the cube
    for (let j = 0; j <= config.gridDensity; j++) {
        for (let i = 0; i < config.gridDensity; i++) {
            if (isInsideCube(i, j) && isInsideCube(i+1, j)) {
                const point1 = frontGrid[i][j].pos2D;
                const point2 = frontGrid[i+1][j].pos2D;
                
                ctx.beginPath();
                ctx.moveTo(point1.x, point1.y);
                ctx.lineTo(point2.x, point2.y);
                ctx.stroke();
            }
        }
    }
    
    // Draw front grid points - only inside the cube
    ctx.fillStyle = `rgba(51, 51, 51, ${config.frontGridAlpha})`;
    for (let i = 0; i <= config.gridDensity; i++) {
        for (let j = 0; j <= config.gridDensity; j++) {
            if (isInsideCube(i, j)) {
                const point = frontGrid[i][j].pos2D;
                ctx.beginPath();
                ctx.arc(point.x, point.y, 2.5, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }
    
    // Draw stretched cloth region (if influence distance > 0)
    if (config.influenceRadius > 0) {
        ctx.strokeStyle = `rgba(51, 51, 51, ${config.backGridAlpha})`;
        ctx.lineWidth = 2;
        
        // Stretched region vertical lines
        for (let i = 0; i <= config.gridDensity; i++) {
            for (let j = 0; j < config.gridDensity; j++) {
                if (isInStretchedRegion(i, j) || isInStretchedRegion(i, j+1)) {
                    const point1 = frontGrid[i][j].pos2D;
                    const point2 = frontGrid[i][j+1].pos2D;
                    
                    ctx.beginPath();
                    ctx.moveTo(point1.x, point1.y);
                    ctx.lineTo(point2.x, point2.y);
                    ctx.stroke();
                }
            }
        }
        
        // Stretched region horizontal lines
        for (let j = 0; j <= config.gridDensity; j++) {
            for (let i = 0; i < config.gridDensity; i++) {
                if (isInStretchedRegion(i, j) || isInStretchedRegion(i+1, j)) {
                    const point1 = frontGrid[i][j].pos2D;
                    const point2 = frontGrid[i+1][j].pos2D;
                    
                    ctx.beginPath();
                    ctx.moveTo(point1.x, point1.y);
                    ctx.lineTo(point2.x, point2.y);
                    ctx.stroke();
                }
            }
        }
        
        // Stretched region points
        ctx.fillStyle = `rgba(51, 51, 51, ${config.backGridAlpha})`;
        for (let i = 0; i <= config.gridDensity; i++) {
            for (let j = 0; j <= config.gridDensity; j++) {
                if (isInStretchedRegion(i, j)) {
                    const point = frontGrid[i][j].pos2D;
                    ctx.beginPath();
                    ctx.arc(point.x, point.y, 2.5, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }
    }
    
    // Draw 3D grid structure - intermediate horizontal slices at uniform spacing
    if (config.zSeparation !== 0 && config.interiorAlpha > 0) {
        const spacing = 700 / config.gridDensity; // This is the uniform grid spacing in X/Y
        
        // Find the maximum Z displacement to determine how many slices we need
        let maxZDisplacement = 0;
        for (let i = 0; i <= config.gridDensity; i++) {
            for (let j = 0; j <= config.gridDensity; j++) {
                maxZDisplacement = Math.max(maxZDisplacement, Math.abs(frontGrid[i][j].pull));
            }
        }
        
        const shouldDrawIntermediateSlices = maxZDisplacement > spacing;
        
        if (shouldDrawIntermediateSlices) {
            // Calculate how many intermediate Z slices we need based on max displacement
            const numSlices = Math.floor(maxZDisplacement / spacing);
            const backZ = -400;
            
            // Helper to get the cube footprint at a given Z height
            const getCubeFootprintAtZ = (targetZ, backZ) => {
                const zOffset = Math.abs(targetZ - backZ);
                
                // At each Z level, determine which XY points should be part of the cube/stretched region
                const footprint = [];
                for (let i = 0; i <= config.gridDensity; i++) {
                    footprint[i] = [];
                    for (let j = 0; j <= config.gridDensity; j++) {
                        const dx = Math.abs(i - config.selectedPointX);
                        const dy = Math.abs(j - config.selectedPointY);
                        const xyDist = Math.max(dx, dy);
                        
                        const cubeSize = config.cubeSize;
                        const influenceDistance = config.gridDensity * (config.influenceRadius / 100);
                        
                        let isInFootprint = false;
                        
                        if (xyDist < cubeSize) {
                            // Inside cube - always in footprint at full height
                            isInFootprint = zOffset <= Math.abs(config.zSeparation);
                        } else if (influenceDistance > 0 && xyDist < cubeSize + influenceDistance) {
                            // In stretched region - check if Z level is within this point's displacement
                            const distFromCube = xyDist - cubeSize;
                            const normalizedDist = distFromCube / influenceDistance;
                            const falloff = (Math.cos(normalizedDist * Math.PI) + 1) / 2;
                            const maxZForThisPoint = Math.abs(config.zSeparation) * falloff;
                            isInFootprint = zOffset <= maxZForThisPoint;
                        }
                        
                        footprint[i][j] = isInFootprint;
                    }
                }
                return footprint;
            };
            
            // Draw intermediate horizontal grid slices
            // For each intermediate Z level at uniform spacing
            for (let slice = 1; slice <= numSlices; slice++) {
                const sliceZOffset = slice * spacing * Math.sign(config.zSeparation); // Uniform spacing in Z
                const targetZ = backZ + sliceZOffset;
                
                // Get the cube footprint at this Z level
                const footprint = getCubeFootprintAtZ(targetZ, backZ);
                
                // Create grid points at this Z level based on footprint
                const sliceGrid = [];
                for (let i = 0; i <= config.gridDensity; i++) {
                    sliceGrid[i] = [];
                    for (let j = 0; j <= config.gridDensity; j++) {
                        const backPos = backGrid[i][j].pos3D;
                        
                        if (footprint[i][j]) {
                            sliceGrid[i][j] = project3D(backPos.x, backPos.y, targetZ);
                        } else {
                            sliceGrid[i][j] = null;
                        }
                    }
                }
                
                // Draw vertical lines at this slice
                ctx.strokeStyle = `rgba(51, 51, 51, ${config.interiorAlpha * 0.6})`;
                ctx.lineWidth = 1.5;
                
                for (let i = 0; i <= config.gridDensity; i++) {
                    for (let j = 0; j < config.gridDensity; j++) {
                        const point1 = sliceGrid[i][j];
                        const point2 = sliceGrid[i][j+1];
                        
                        if (point1 && point2) {
                            ctx.beginPath();
                            ctx.moveTo(point1.x, point1.y);
                            ctx.lineTo(point2.x, point2.y);
                            ctx.stroke();
                        }
                    }
                }
                
                // Draw horizontal lines at this slice
                for (let j = 0; j <= config.gridDensity; j++) {
                    for (let i = 0; i < config.gridDensity; i++) {
                        const point1 = sliceGrid[i][j];
                        const point2 = sliceGrid[i+1][j];
                        
                        if (point1 && point2) {
                            ctx.beginPath();
                            ctx.moveTo(point1.x, point1.y);
                            ctx.lineTo(point2.x, point2.y);
                            ctx.stroke();
                        }
                    }
                }
            }
        }
    }
}

// Render loop
function render() {
    // Clear canvas
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw
    drawDualGrid();
    
    requestAnimationFrame(render);
}

// Update point sliders max values when grid density changes
function updatePointSliderMax() {
    const density = config.gridDensity;
    document.getElementById('pointXSlider').max = density;
    document.getElementById('pointYSlider').max = density;
    
    // Clamp current values if needed
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

// Initialize UI from config
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
    
    document.getElementById('viewToggleBtn').textContent = config.usePerspective ? 'Switch to Side View' : 'Switch to Front View';
}

// Controls
document.getElementById('densitySlider').addEventListener('input', (e) => {
    config.gridDensity = parseInt(e.target.value);
    document.getElementById('densityValue').textContent = config.gridDensity;
    updatePointSliderMax();
    saveConfig();
});

document.getElementById('pointXSlider').addEventListener('input', (e) => {
    config.selectedPointX = parseInt(e.target.value);
    document.getElementById('pointXValue').textContent = config.selectedPointX;
    saveConfig();
});

document.getElementById('pointYSlider').addEventListener('input', (e) => {
    config.selectedPointY = parseInt(e.target.value);
    document.getElementById('pointYValue').textContent = config.selectedPointY;
    saveConfig();
});

document.getElementById('zSeparationSlider').addEventListener('input', (e) => {
    config.zSeparation = parseInt(e.target.value);
    document.getElementById('zSeparationValue').textContent = config.zSeparation;
    saveConfig();
});

document.getElementById('cubeSizeSlider').addEventListener('input', (e) => {
    config.cubeSize = parseInt(e.target.value);
    document.getElementById('cubeSizeValue').textContent = config.cubeSize;
    saveConfig();
});

document.getElementById('influenceRadiusSlider').addEventListener('input', (e) => {
    config.influenceRadius = parseInt(e.target.value);
    document.getElementById('influenceRadiusValue').textContent = config.influenceRadius + '%';
    saveConfig();
});

document.getElementById('backGridAlphaSlider').addEventListener('input', (e) => {
    config.backGridAlpha = parseFloat(e.target.value);
    document.getElementById('backGridAlphaValue').textContent = config.backGridAlpha.toFixed(1);
    saveConfig();
});

document.getElementById('frontGridAlphaSlider').addEventListener('input', (e) => {
    config.frontGridAlpha = parseFloat(e.target.value);
    document.getElementById('frontGridAlphaValue').textContent = config.frontGridAlpha.toFixed(1);
    saveConfig();
});

document.getElementById('connectionAlphaSlider').addEventListener('input', (e) => {
    config.connectionAlpha = parseFloat(e.target.value);
    document.getElementById('connectionAlphaValue').textContent = config.connectionAlpha.toFixed(1);
    saveConfig();
});

document.getElementById('interiorAlphaSlider').addEventListener('input', (e) => {
    config.interiorAlpha = parseFloat(e.target.value);
    document.getElementById('interiorAlphaValue').textContent = config.interiorAlpha.toFixed(1);
    saveConfig();
});

document.getElementById('viewToggleBtn').addEventListener('click', (e) => {
    config.usePerspective = !config.usePerspective;
    e.target.textContent = config.usePerspective ? 'Switch to Side View' : 'Switch to Front View';
    saveConfig();
});

// Initialize
initializeUI();
updatePointSliderMax();

// Start render loop
render();
