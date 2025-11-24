/**
 * Pure geometric classification functions for grid deformation visualization
 * These functions don't depend on global state
 */

/**
 * Check if a point is inside a cube shape
 * @param {number} i - Grid X coordinate
 * @param {number} j - Grid Y coordinate
 * @param {number} centerX - Cube center X coordinate
 * @param {number} centerY - Cube center Y coordinate
 * @param {number} cubeSize - Size of the cube
 * @returns {boolean}
 */
export function isInsideCube(i, j, centerX, centerY, cubeSize) {
    const dx = Math.abs(i - centerX);
    const dy = Math.abs(j - centerY);
    const gridDistance = Math.max(dx, dy);
    return gridDistance <= cubeSize - 1;
}

/**
 * Check if a point is on the edge of a cube shape
 * @param {number} i - Grid X coordinate
 * @param {number} j - Grid Y coordinate
 * @param {number} centerX - Cube center X coordinate
 * @param {number} centerY - Cube center Y coordinate
 * @param {number} cubeSize - Size of the cube
 * @returns {boolean}
 */
export function isOnCubeEdge(i, j, centerX, centerY, cubeSize) {
    const dx = Math.abs(i - centerX);
    const dy = Math.abs(j - centerY);
    const maxDist = Math.max(dx, dy);
    return maxDist === cubeSize - 1;
}

/**
 * Check if a point is inside a sphere shape
 * @param {number} i - Grid X coordinate
 * @param {number} j - Grid Y coordinate
 * @param {number} centerX - Sphere center X coordinate
 * @param {number} centerY - Sphere center Y coordinate
 * @param {number} sphereRadius - Radius of the sphere
 * @returns {boolean}
 */
export function isInsideSphere(i, j, centerX, centerY, sphereRadius) {
    const dx = i - centerX;
    const dy = j - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance <= sphereRadius - 1;
}

/**
 * Check if a point is on the surface of a sphere shape
 * @param {number} i - Grid X coordinate
 * @param {number} j - Grid Y coordinate
 * @param {number} centerX - Sphere center X coordinate
 * @param {number} centerY - Sphere center Y coordinate
 * @param {number} sphereRadius - Radius of the sphere
 * @returns {boolean}
 */
export function isOnSphereSurface(i, j, centerX, centerY, sphereRadius) {
    const dx = i - centerX;
    const dy = j - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    // Surface is within 0.7 grid units of the radius
    return Math.abs(distance - (sphereRadius - 1)) <= 0.7;
}

/**
 * Check if a point is inside a shape (cube or sphere)
 * @param {number} i - Grid X coordinate
 * @param {number} j - Grid Y coordinate
 * @param {string} shapeType - 'cube' or 'sphere'
 * @param {number} size - Size of the shape
 * @param {number} centerX - Shape center X coordinate
 * @param {number} centerY - Shape center Y coordinate
 * @returns {boolean}
 */
export function isInsideShape(i, j, shapeType, size, centerX, centerY) {
    if (shapeType === 'cube') return isInsideCube(i, j, centerX, centerY, size);
    if (shapeType === 'sphere') return isInsideSphere(i, j, centerX, centerY, size);
    return false;
}

/**
 * Check if a point is on the shell (boundary) of a shape
 * @param {number} i - Grid X coordinate
 * @param {number} j - Grid Y coordinate
 * @param {string} shapeType - 'cube' or 'sphere'
 * @param {number} size - Size of the shape
 * @param {number} centerX - Shape center X coordinate
 * @param {number} centerY - Shape center Y coordinate
 * @returns {boolean}
 */
export function isOnShapeShell(i, j, shapeType, size, centerX, centerY) {
    if (shapeType === 'cube') return isOnCubeEdge(i, j, centerX, centerY, size);
    if (shapeType === 'sphere') return isOnSphereSurface(i, j, centerX, centerY, size);
    return false;
}

/**
 * Check if a point is in the cloth region (outside shape but with displacement)
 * @param {number} i - Grid X coordinate
 * @param {number} j - Grid Y coordinate
 * @param {Array} frontGrid - 2D array of front grid points
 * @returns {boolean}
 */
export function isInClothRegion(i, j, frontGrid) {
    // A point is in the cloth region if it has displacement > threshold
    const point = frontGrid[i][j];
    return Math.abs(point.pull) > 0.1;
}

/**
 * Classify a grid point into one of the regions
 * @param {number} i - Grid X coordinate
 * @param {number} j - Grid Y coordinate
 * @param {number} z - Z coordinate of the point
 * @param {Array} frontGrid - 2D array of front grid points
 * @param {Object} config - Configuration object with shapeType, cubeSize, selectedPointX, selectedPointY
 * @returns {string} - 'shape-shell', 'inside-shape', or 'cloth'
 */
export function classifyPoint(i, j, z, frontGrid, config) {
    const { shapeType, cubeSize, selectedPointX, selectedPointY } = config;
    
    // Check if on shape shell (boundary)
    const isOnShell = isOnShapeShell(i, j, shapeType, cubeSize, selectedPointX, selectedPointY);
    if (isOnShell) {
        return 'shape-shell';
    }
    
    // Check if inside shape volume
    const isInShape = isInsideShape(i, j, shapeType, cubeSize, selectedPointX, selectedPointY);
    if (isInShape) {
        return 'inside-shape';
    }
    
    // Everything else is cloth (outside shape with displacement)
    return 'cloth';
}
