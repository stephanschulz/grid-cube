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
    gridAlpha: 1,
    cubeAlpha: 0, // Not used for now
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
            
            // Influence radius in grid units
            const influenceRadius = config.gridDensity * 0.6;
            
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
    const alpha = config.gridAlpha;
    
    // Draw back grid (lighter gray)
    ctx.strokeStyle = `rgba(150, 150, 150, ${alpha * 0.5})`;
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
    ctx.fillStyle = `rgba(150, 150, 150, ${alpha * 0.6})`;
    for (let i = 0; i <= config.gridDensity; i++) {
        for (let j = 0; j <= config.gridDensity; j++) {
            const point = backGrid[i][j].pos2D;
            ctx.beginPath();
            ctx.arc(point.x, point.y, 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    // Draw connecting lines for points with significant pull
    if (config.zSeparation > 0) {
        ctx.strokeStyle = `rgba(100, 150, 255, ${alpha * 0.4})`;
        ctx.lineWidth = 1;
        
        for (let i = 0; i <= config.gridDensity; i++) {
            for (let j = 0; j <= config.gridDensity; j++) {
                if (frontGrid[i][j].pull > 5) {
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
        
        ctx.strokeStyle = `rgba(255, 100, 100, ${alpha * 0.8})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(backPoint.x, backPoint.y);
        ctx.lineTo(frontPoint.x, frontPoint.y);
        ctx.stroke();
        
        // Highlight the selected back point
        ctx.fillStyle = `rgba(255, 100, 100, ${alpha})`;
        ctx.beginPath();
        ctx.arc(backPoint.x, backPoint.y, 5, 0, Math.PI * 2);
        ctx.fill();
        
        // Highlight the pulled front point
        ctx.fillStyle = `rgba(255, 50, 50, ${alpha})`;
        ctx.beginPath();
        ctx.arc(frontPoint.x, frontPoint.y, 7, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Draw front grid (darker)
    ctx.strokeStyle = `rgba(51, 51, 51, ${alpha})`;
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
    ctx.fillStyle = `rgba(51, 51, 51, ${alpha})`;
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

document.getElementById('gridAlphaSlider').addEventListener('input', (e) => {
    config.gridAlpha = parseFloat(e.target.value);
    document.getElementById('gridAlphaValue').textContent = config.gridAlpha.toFixed(1);
});

document.getElementById('cubeAlphaSlider').addEventListener('input', (e) => {
    config.cubeAlpha = parseFloat(e.target.value);
    document.getElementById('cubeAlphaValue').textContent = config.cubeAlpha.toFixed(1);
});

document.getElementById('viewToggleBtn').addEventListener('click', (e) => {
    config.usePerspective = !config.usePerspective;
    e.target.textContent = config.usePerspective ? 'Switch to Orthographic' : 'Switch to Perspective';
});

// Initialize
updatePointSliderMax();

// Start render loop
render();
