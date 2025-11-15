const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// Set canvas size
canvas.width = 1000;
canvas.height = 1000;

// Configuration
let config = {
    gridDensity: 20,
    selectedPointX: 10,
    selectedPointY: 10,
    zSeparation: 200,
    influenceRadius: 60, // Percentage of grid density
    backGridAlpha: 0.5,
    frontGridAlpha: 1.0,
    connectionAlpha: 0.4,
    usePerspective: true
};

// 3D to 2D projection
function project3D(x, y, z) {
    if (config.usePerspective) {
        const perspective = 800;
        const scale = perspective / (perspective + z);
        return {
            x: x * scale + canvas.width / 2,
            y: y * scale + canvas.height / 2,
            z: z,
            scale: scale
        };
    } else {
        // Orthographic projection
        return {
            x: x + canvas.width / 2,
            y: y + canvas.height / 2,
            z: z,
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
            
            // Front grid point - calculate distance-based pull (tent effect)
            let zPull = 0;
            
            // Calculate grid distance from selected point
            const dx = i - config.selectedPointX;
            const dy = j - config.selectedPointY;
            const gridDistance = Math.sqrt(dx * dx + dy * dy);
            
            // Influence radius in grid units (percentage of grid density)
            const influenceRadius = config.gridDensity * (config.influenceRadius / 100);
            
            if (gridDistance < influenceRadius) {
                // Smooth falloff using cosine interpolation
                const normalizedDist = gridDistance / influenceRadius;
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
    
    // Draw back grid (lighter gray)
    ctx.strokeStyle = `rgba(150, 150, 150, ${config.backGridAlpha})`;
    ctx.lineWidth = 1.5;
    
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
    ctx.fillStyle = `rgba(150, 150, 150, ${config.backGridAlpha * 0.8})`;
    for (let i = 0; i <= config.gridDensity; i++) {
        for (let j = 0; j <= config.gridDensity; j++) {
            const point = backGrid[i][j].pos2D;
            ctx.beginPath();
            ctx.arc(point.x, point.y, 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    // Draw connecting lines for points with significant pull
    if (config.zSeparation !== 0 && config.connectionAlpha > 0) {
        // Color depends on whether pushing forward (blue) or backward (green)
        const isForward = config.zSeparation > 0;
        ctx.strokeStyle = isForward ? `rgba(100, 150, 255, ${config.connectionAlpha})` : `rgba(100, 255, 150, ${config.connectionAlpha})`;
        ctx.lineWidth = 1;
        
        for (let i = 0; i <= config.gridDensity; i++) {
            for (let j = 0; j <= config.gridDensity; j++) {
                if (Math.abs(frontGrid[i][j].pull) > 5) {
                    const backPoint = backGrid[i][j].pos2D;
                    const frontPoint = frontGrid[i][j].pos2D;
                    
                    ctx.beginPath();
                    ctx.moveTo(backPoint.x, backPoint.y);
                    ctx.lineTo(frontPoint.x, frontPoint.y);
                    ctx.stroke();
                }
            }
        }
        
        // Highlight the selected point with thicker line
        const i = config.selectedPointX;
        const j = config.selectedPointY;
        
        const backPoint = backGrid[i][j].pos2D;
        const frontPoint = frontGrid[i][j].pos2D;
        
        ctx.strokeStyle = isForward ? `rgba(255, 100, 100, ${config.connectionAlpha * 1.5})` : `rgba(100, 255, 100, ${config.connectionAlpha * 1.5})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(backPoint.x, backPoint.y);
        ctx.lineTo(frontPoint.x, frontPoint.y);
        ctx.stroke();
        
        // Highlight the selected back point
        ctx.fillStyle = isForward ? `rgba(255, 100, 100, ${config.backGridAlpha})` : `rgba(100, 255, 100, ${config.backGridAlpha})`;
        ctx.beginPath();
        ctx.arc(backPoint.x, backPoint.y, 5, 0, Math.PI * 2);
        ctx.fill();
        
        // Highlight the pulled/pushed front point
        ctx.fillStyle = isForward ? `rgba(255, 50, 50, ${config.frontGridAlpha})` : `rgba(50, 255, 50, ${config.frontGridAlpha})`;
        ctx.beginPath();
        ctx.arc(frontPoint.x, frontPoint.y, 7, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Draw front grid (darker)
    ctx.strokeStyle = `rgba(51, 51, 51, ${config.frontGridAlpha})`;
    ctx.lineWidth = 2;
    
    // Front grid vertical lines
    for (let i = 0; i <= config.gridDensity; i++) {
        ctx.beginPath();
        for (let j = 0; j <= config.gridDensity; j++) {
            const point = frontGrid[i][j].pos2D;
            if (j === 0) {
                ctx.moveTo(point.x, point.y);
            } else {
                ctx.lineTo(point.x, point.y);
            }
        }
        ctx.stroke();
    }
    
    // Front grid horizontal lines
    for (let j = 0; j <= config.gridDensity; j++) {
        ctx.beginPath();
        for (let i = 0; i <= config.gridDensity; i++) {
            const point = frontGrid[i][j].pos2D;
            if (i === 0) {
                ctx.moveTo(point.x, point.y);
            } else {
                ctx.lineTo(point.x, point.y);
            }
        }
        ctx.stroke();
    }
    
    // Draw front grid points
    ctx.fillStyle = `rgba(51, 51, 51, ${config.frontGridAlpha})`;
    for (let i = 0; i <= config.gridDensity; i++) {
        for (let j = 0; j <= config.gridDensity; j++) {
            const point = frontGrid[i][j].pos2D;
            ctx.beginPath();
            ctx.arc(point.x, point.y, 2.5, 0, Math.PI * 2);
            ctx.fill();
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

// Controls
document.getElementById('densitySlider').addEventListener('input', (e) => {
    config.gridDensity = parseInt(e.target.value);
    document.getElementById('densityValue').textContent = config.gridDensity;
    updatePointSliderMax();
});

document.getElementById('pointXSlider').addEventListener('input', (e) => {
    config.selectedPointX = parseInt(e.target.value);
    document.getElementById('pointXValue').textContent = config.selectedPointX;
});

document.getElementById('pointYSlider').addEventListener('input', (e) => {
    config.selectedPointY = parseInt(e.target.value);
    document.getElementById('pointYValue').textContent = config.selectedPointY;
});

document.getElementById('zSeparationSlider').addEventListener('input', (e) => {
    config.zSeparation = parseInt(e.target.value);
    document.getElementById('zSeparationValue').textContent = config.zSeparation;
});

document.getElementById('influenceRadiusSlider').addEventListener('input', (e) => {
    config.influenceRadius = parseInt(e.target.value);
    document.getElementById('influenceRadiusValue').textContent = config.influenceRadius + '%';
});

document.getElementById('backGridAlphaSlider').addEventListener('input', (e) => {
    config.backGridAlpha = parseFloat(e.target.value);
    document.getElementById('backGridAlphaValue').textContent = config.backGridAlpha.toFixed(1);
});

document.getElementById('frontGridAlphaSlider').addEventListener('input', (e) => {
    config.frontGridAlpha = parseFloat(e.target.value);
    document.getElementById('frontGridAlphaValue').textContent = config.frontGridAlpha.toFixed(1);
});

document.getElementById('connectionAlphaSlider').addEventListener('input', (e) => {
    config.connectionAlpha = parseFloat(e.target.value);
    document.getElementById('connectionAlphaValue').textContent = config.connectionAlpha.toFixed(1);
});

document.getElementById('viewToggleBtn').addEventListener('click', (e) => {
    config.usePerspective = !config.usePerspective;
    e.target.textContent = config.usePerspective ? 'Switch to Orthographic' : 'Switch to Perspective';
});

// Initialize
updatePointSliderMax();

// Start render loop
render();
