const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// Set canvas size
canvas.width = 1000;
canvas.height = 1000;

// Configuration
let config = {
    gridDensity: 30,
    cubeSize: 200,
    rotationSpeed: 1,
    deformationStrength: 1,
    gridAlpha: 1,
    cubeAlpha: 1,
    isPaused: false,
    usePerspective: true
};

// Rotation angles
let angleX = 0;
let angleY = 0;
let angleZ = 0;

// 3D to 2D projection
function project3D(x, y, z) {
    if (config.usePerspective) {
        const perspective = 800;
        const scale = perspective / (perspective + z);
        return {
            x: x * scale + canvas.width / 2,
            y: y * scale + canvas.height / 2,
            scale: scale
        };
    } else {
        // Orthographic projection
        return {
            x: x + canvas.width / 2,
            y: y + canvas.height / 2,
            scale: 1
        };
    }
}

// Rotate point in 3D space
function rotate3D(x, y, z, ax, ay, az) {
    // Rotate around X axis
    let tempY = y * Math.cos(ax) - z * Math.sin(ax);
    let tempZ = y * Math.sin(ax) + z * Math.cos(ax);
    y = tempY;
    z = tempZ;
    
    // Rotate around Y axis
    let tempX = x * Math.cos(ay) + z * Math.sin(ay);
    tempZ = -x * Math.sin(ay) + z * Math.cos(ay);
    x = tempX;
    z = tempZ;
    
    // Rotate around Z axis
    tempX = x * Math.cos(az) - y * Math.sin(az);
    tempY = x * Math.sin(az) + y * Math.cos(az);
    x = tempX;
    y = tempY;
    
    return { x, y, z };
}

// Get cube vertices in 3D space
function getCubeVertices3D() {
    const s = config.cubeSize / 2;
    const vertices = [
        { x: -s, y: -s, z: -s },
        { x:  s, y: -s, z: -s },
        { x:  s, y:  s, z: -s },
        { x: -s, y:  s, z: -s },
        { x: -s, y: -s, z:  s },
        { x:  s, y: -s, z:  s },
        { x:  s, y:  s, z:  s },
        { x: -s, y:  s, z:  s }
    ];
    
    return vertices.map(v => rotate3D(v.x, v.y, v.z, angleX, angleY, angleZ));
}

// Get cube vertices projected to 2D
function getCubeVertices2D() {
    return getCubeVertices3D().map(v => project3D(v.x, v.y, v.z));
}

// Distance from point to 3D line segment
function distanceToSegment3D(p, v1, v2) {
    const dx = v2.x - v1.x;
    const dy = v2.y - v1.y;
    const dz = v2.z - v1.z;
    
    const px = p.x - v1.x;
    const py = p.y - v1.y;
    const pz = p.z - v1.z;
    
    const dot = px * dx + py * dy + pz * dz;
    const lenSq = dx * dx + dy * dy + dz * dz;
    
    let param = -1;
    if (lenSq !== 0) param = dot / lenSq;
    
    param = Math.max(0, Math.min(1, param));
    
    const closestX = v1.x + param * dx;
    const closestY = v1.y + param * dy;
    const closestZ = v1.z + param * dz;
    
    const distX = p.x - closestX;
    const distY = p.y - closestY;
    const distZ = p.z - closestZ;
    
    return {
        distance: Math.sqrt(distX * distX + distY * distY + distZ * distZ),
        closest: { x: closestX, y: closestY, z: closestZ }
    };
}

// Deform a 3D grid point based on the cube
function deformGridPoint3D(gridX, gridY, gridZ) {
    const cubeVertices = getCubeVertices3D();
    const edges = [
        [0, 1], [1, 2], [2, 3], [3, 0], // back face
        [4, 5], [5, 6], [6, 7], [7, 4], // front face
        [0, 4], [1, 5], [2, 6], [3, 7]  // connecting edges
    ];
    
    let deformedPoint = { x: gridX, y: gridY, z: gridZ };
    let totalInfluence = 0;
    let totalDisplacement = { x: 0, y: 0, z: 0 };
    
    // Calculate influence from each edge
    edges.forEach(edge => {
        const v1 = cubeVertices[edge[0]];
        const v2 = cubeVertices[edge[1]];
        
        const result = distanceToSegment3D(deformedPoint, v1, v2);
        const dist = result.distance;
        
        // Influence falls off with distance
        const maxInfluenceDist = 300;
        if (dist < maxInfluenceDist) {
            const influence = Math.pow(1 - dist / maxInfluenceDist, 2) * config.deformationStrength;
            
            // Calculate displacement direction (from grid point towards edge)
            const dirX = result.closest.x - gridX;
            const dirY = result.closest.y - gridY;
            const dirZ = result.closest.z - gridZ;
            
            const dirLength = Math.sqrt(dirX * dirX + dirY * dirY + dirZ * dirZ);
            if (dirLength > 0) {
                const normalizedX = dirX / dirLength;
                const normalizedY = dirY / dirLength;
                const normalizedZ = dirZ / dirLength;
                
                // Push the grid point towards the cube edge
                const pushAmount = influence * 80;
                totalDisplacement.x += normalizedX * pushAmount;
                totalDisplacement.y += normalizedY * pushAmount;
                totalDisplacement.z += normalizedZ * pushAmount;
                totalInfluence += influence;
            }
        }
    });
    
    // Apply accumulated displacement
    if (totalInfluence > 0) {
        deformedPoint.x += totalDisplacement.x;
        deformedPoint.y += totalDisplacement.y;
        deformedPoint.z += totalDisplacement.z;
    }
    
    // Add influence from cube center (attraction/repulsion)
    const centerX = 0;
    const centerY = 0;
    const centerZ = 0;
    
    const toCenterX = centerX - gridX;
    const toCenterY = centerY - gridY;
    const toCenterZ = centerZ - gridZ;
    const distToCenter = Math.sqrt(toCenterX * toCenterX + toCenterY * toCenterY + toCenterZ * toCenterZ);
    
    if (distToCenter < config.cubeSize * 1.5 && distToCenter > 0) {
        const centerInfluence = Math.pow(1 - distToCenter / (config.cubeSize * 1.5), 2) * config.deformationStrength;
        const pullAmount = centerInfluence * 30;
        
        deformedPoint.x += (toCenterX / distToCenter) * pullAmount;
        deformedPoint.y += (toCenterY / distToCenter) * pullAmount;
        deformedPoint.z += (toCenterZ / distToCenter) * pullAmount;
    }
    
    return deformedPoint;
}

// Draw deformed grid
function drawGrid() {
    const alpha = config.gridAlpha;
    ctx.strokeStyle = `rgba(51, 51, 51, ${alpha})`;
    ctx.lineWidth = 2;
    
    const spacing = canvas.width / config.gridDensity;
    const gridZ = -400; // Position the grid in 3D space
    
    // Create 3D grid points and deform them
    const gridPoints = [];
    for (let i = 0; i <= config.gridDensity; i++) {
        gridPoints[i] = [];
        for (let j = 0; j <= config.gridDensity; j++) {
            // Convert 2D grid position to 3D coordinates
            const x = (i - config.gridDensity / 2) * (canvas.width / config.gridDensity);
            const y = (j - config.gridDensity / 2) * (canvas.height / config.gridDensity);
            const z = gridZ;
            
            // Deform the 3D point based on cube
            const deformed = deformGridPoint3D(x, y, z);
            
            // Project to 2D
            const projected = project3D(deformed.x, deformed.y, deformed.z);
            gridPoints[i][j] = projected;
        }
    }
    
    // Draw vertical lines
    for (let i = 0; i <= config.gridDensity; i++) {
        ctx.beginPath();
        for (let j = 0; j <= config.gridDensity; j++) {
            const point = gridPoints[i][j];
            if (j === 0) {
                ctx.moveTo(point.x, point.y);
            } else {
                ctx.lineTo(point.x, point.y);
            }
        }
        ctx.stroke();
    }
    
    // Draw horizontal lines
    for (let j = 0; j <= config.gridDensity; j++) {
        ctx.beginPath();
        for (let i = 0; i <= config.gridDensity; i++) {
            const point = gridPoints[i][j];
            if (i === 0) {
                ctx.moveTo(point.x, point.y);
            } else {
                ctx.lineTo(point.x, point.y);
            }
        }
        ctx.stroke();
    }
}

// Draw cube wireframe
function drawCube() {
    const alpha = config.cubeAlpha;
    const vertices = getCubeVertices2D();
    const edges = [
        [0, 1], [1, 2], [2, 3], [3, 0],
        [4, 5], [5, 6], [6, 7], [7, 4],
        [0, 4], [1, 5], [2, 6], [3, 7]
    ];
    
    ctx.strokeStyle = `rgba(255, 107, 107, ${alpha})`;
    ctx.lineWidth = 3;
    
    edges.forEach(edge => {
        const v1 = vertices[edge[0]];
        const v2 = vertices[edge[1]];
        
        ctx.beginPath();
        ctx.moveTo(v1.x, v1.y);
        ctx.lineTo(v2.x, v2.y);
        ctx.stroke();
    });
    
    // Draw vertices
    ctx.fillStyle = `rgba(255, 107, 107, ${alpha})`;
    vertices.forEach(v => {
        ctx.beginPath();
        ctx.arc(v.x, v.y, 4, 0, Math.PI * 2);
        ctx.fill();
    });
}

// Animation loop
function animate() {
    // Clear canvas
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Update rotation
    if (!config.isPaused) {
        angleX += 0.005 * config.rotationSpeed;
        angleY += 0.008 * config.rotationSpeed;
        angleZ += 0.003 * config.rotationSpeed;
    }
    
    // Draw
    drawGrid();
    drawCube();
    
    requestAnimationFrame(animate);
}

// Controls
document.getElementById('speedSlider').addEventListener('input', (e) => {
    config.rotationSpeed = parseFloat(e.target.value);
    document.getElementById('speedValue').textContent = config.rotationSpeed.toFixed(1) + 'x';
});

document.getElementById('densitySlider').addEventListener('input', (e) => {
    config.gridDensity = parseInt(e.target.value);
    document.getElementById('densityValue').textContent = config.gridDensity;
});

document.getElementById('deformSlider').addEventListener('input', (e) => {
    config.deformationStrength = parseFloat(e.target.value);
    document.getElementById('deformValue').textContent = config.deformationStrength.toFixed(1) + 'x';
});

document.getElementById('sizeSlider').addEventListener('input', (e) => {
    config.cubeSize = parseInt(e.target.value);
    document.getElementById('sizeValue').textContent = config.cubeSize;
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

document.getElementById('pauseBtn').addEventListener('click', (e) => {
    config.isPaused = !config.isPaused;
    e.target.textContent = config.isPaused ? 'Resume Animation' : 'Pause Animation';
});

// Start animation
animate();
