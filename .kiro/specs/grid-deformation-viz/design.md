# Design Document

## Overview

The grid deformation visualization system renders two parallel grid layers where a 3D shape (cube or sphere) is represented by displacing the foreground grid toward the viewer. The key challenge is correctly determining which grid lines should be drawn based on geometric classification of grid points and line segments.

The system uses Three.js for 3D rendering with WebGL shaders for efficient gradient alpha rendering. The architecture separates concerns into grid generation, geometric classification, line filtering, and rendering layers.

## Architecture

### High-Level Components

1. **Configuration Manager**: Manages user settings and persistence to localStorage
2. **Grid Generator**: Creates 3D grid point positions with Z displacement calculations
3. **Geometric Classifier**: Determines which region each grid point belongs to (shape shell, inside shape, cloth, or background)
4. **Line Filter**: Decides which line segments should be rendered based on endpoint classifications
5. **Renderer**: Creates Three.js geometry and materials for visualization
6. **UI Controller**: Handles user input and updates visualization

### Data Flow

```
User Input → Configuration Manager → Grid Generator → Geometric Classifier → Line Filter → Renderer → Display
                                                                                              ↑
                                                                                         Camera Controls
```

## Components and Interfaces

### Grid Generator

**Responsibility**: Calculate 3D positions for all grid points

**Interface**:
```javascript
function generateGridPoints(config) {
  // Returns: { backGrid: Point3D[][], frontGrid: Point3D[][] }
  // where Point3D = { x, y, z, pull }
}

function calculateZPull(i, j, config) {
  // Returns: number (Z displacement for grid point at i,j)
}
```

**Algorithm**:
- For each grid point (i, j):
  - Calculate distance from shape center using appropriate metric (Chebyshev for cube, Euclidean for sphere)
  - If distance ≤ shapeSize - 1: apply full displacement
  - Else if distance ≤ shapeSize - 1 + influenceDistance: apply cosine falloff
  - Else: no displacement

### Geometric Classifier

**Responsibility**: Classify grid points and line segments into regions

**Interface**:
```javascript
function classifyPoint(i, j, z, frontGrid, config) {
  // Returns: 'shape-shell' | 'inside-shape' | 'cloth' | 'background'
}

function classifyLineSegment(point1Class, point2Class) {
  // Returns: { shouldRender: boolean, alpha1: number, alpha2: number }
}
```

**Classification Rules**:

1. **Shape Shell**: Point is on the boundary of the shape
   - Cube: max(|dx|, |dy|) === shapeSize - 1
   - Sphere: |distance - (shapeSize - 1)| ≤ 0.7

2. **Inside Shape**: Point is within the shape volume but not on shell
   - Cube: max(|dx|, |dy|) < shapeSize - 1
   - Sphere: distance < shapeSize - 1

3. **Cloth**: Point is outside shape but has displacement > threshold
   - Has Z displacement > 0.1 units
   - Not inside shape

4. **Background**: Point on the back grid layer or no displacement

### Line Filter

**Responsibility**: Determine which line segments should be rendered

**Core Logic**:

For **foreground grid lines** (horizontal and vertical in XY plane):
- Render if BOTH endpoints are (shape-shell OR cloth)
- Do NOT render if either endpoint is inside-shape (but not on shell)
- Do NOT render if both endpoints are background (no displacement)

For **Z-direction connecting lines** (back to front):
- Render if point is on shape-shell
- Render if point is in cloth region
- Do NOT render if point is inside-shape (but not on shell)

For **intermediate slice lines**:
- Only include points where slice Z is between back Z and front Z
- Apply same filtering rules as foreground grid

**Implementation**:
```javascript
function shouldRenderForegroundLine(p1, p2, frontGrid, config) {
  const class1 = classifyPoint(p1.i, p1.j, p1.z, frontGrid, config);
  const class2 = classifyPoint(p2.i, p2.j, p2.z, frontGrid, config);
  
  // Don't render if either point is inside (but not on shell)
  if (class1 === 'inside-shape' || class2 === 'inside-shape') {
    return false;
  }
  
  // Don't render if both points have no displacement
  if (Math.abs(p1.pull) < 0.1 && Math.abs(p2.pull) < 0.1) {
    return false;
  }
  
  return true;
}
```

## Data Models

### Configuration Object
```javascript
{
  gridDensity: number,        // Points per dimension (10-40)
  selectedPointX: number,     // Shape center X (0 to gridDensity)
  selectedPointY: number,     // Shape center Y (0 to gridDensity)
  zSeparation: number,        // Displacement magnitude (-500 to 500)
  cubeSize: number,           // Shape size in grid units (1-15)
  influenceRadius: number,    // Cloth falloff distance as % (0-100)
  clothAlpha: number,         // Opacity for cloth region (0-1)
  shapeShellAlpha: number,    // Opacity for shape boundary (0-1)
  insideShapeAlpha: number,   // Opacity for interior (0-1)
  shapeType: string,          // 'cube' | 'sphere'
  renderMode: string,         // 'lines' | 'points'
  pointSize: number           // Point diameter (1-10)
}
```

### Grid Point
```javascript
{
  x: number,      // World X coordinate
  y: number,      // World Y coordinate
  z: number,      // World Z coordinate
  pull: number,   // Z displacement amount
  i: number,      // Grid index X
  j: number       // Grid index Y
}
```

### Line Segment
```javascript
{
  p1: { x, y, z },
  p2: { x, y, z },
  alpha1: number,
  alpha2: number
}
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Foreground lines only connect shape or cloth points

*For any* grid configuration and any rendered foreground grid line, at least one endpoint should be classified as either on the shape shell or in the cloth region (not interior, not background-only).

**Validates: Requirements 1.1, 1.2, 1.3**

### Property 2: Interior points have no foreground connections

*For any* grid configuration and any point classified as inside-shape (but not on shell), that point should not be an endpoint of any foreground grid line.

**Validates: Requirements 1.2**

### Property 3: Background grid is complete

*For any* grid configuration with density N, the background grid should contain exactly 2N(N+1) line segments (N+1 vertical lines with N segments each, plus N+1 horizontal lines with N segments each).

**Validates: Requirements 1.5**

### Property 4: Shell points have full displacement

*For any* grid configuration and any point classified as on the shape shell, the Z displacement should equal the configured zSeparation value.

**Validates: Requirements 2.1**

### Property 5: Cloth points use cosine falloff

*For any* grid configuration and any point in the cloth region, the Z displacement should equal `zSeparation * ((cos(normalizedDistance * π) + 1) / 2)` where normalizedDistance is the distance beyond the shape boundary divided by the influence distance.

**Validates: Requirements 2.2, 2.3**

### Property 6: Cube distance uses Chebyshev metric

*For any* grid configuration with shapeType='cube' and any grid point (i,j), the distance from the shape center should be calculated as `max(|i - centerX|, |j - centerY|)`.

**Validates: Requirements 2.5**

### Property 7: Sphere distance uses Euclidean metric

*For any* grid configuration with shapeType='sphere' and any grid point (i,j), the distance from the shape center should be calculated as `sqrt((i - centerX)² + (j - centerY)²)`.

**Validates: Requirements 2.6**

### Property 8: Intermediate slices generated when needed

*For any* grid configuration where |zSeparation| > gridSpacing, the number of intermediate slices should equal `floor(|zSeparation| / gridSpacing)`.

**Validates: Requirements 3.1, 3.5**

### Property 9: Slice points are between back and front

*For any* intermediate slice at Z position sliceZ and any point (i,j) included in that slice, the point's front Z position should satisfy: `(zSeparation > 0 && sliceZ > backZ && sliceZ < frontZ) || (zSeparation < 0 && sliceZ < backZ && sliceZ > frontZ)`.

**Validates: Requirements 3.2**

### Property 10: Slice lines connect colocated points

*For any* intermediate slice and any rendered line in that slice, both endpoints should be included in that slice's point set.

**Validates: Requirements 3.3**

### Property 11: Shell points have Z connections

*For any* grid configuration and any point classified as on the shape shell, there should exist a Z-direction connecting line from the background layer to the foreground layer at that point's (i,j) coordinates.

**Validates: Requirements 4.1**

### Property 12: Interior points have no Z connections

*For any* grid configuration and any point classified as inside-shape (but not on shell), there should not exist a Z-direction connecting line at that point's (i,j) coordinates.

**Validates: Requirements 4.2**

### Property 13: Cloth points have Z connections

*For any* grid configuration and any point in the cloth region with |pull| > 0.1, there should exist a Z-direction connecting line at that point's (i,j) coordinates.

**Validates: Requirements 4.3**

### Property 14: Cube shell detection formula

*For any* grid configuration with shapeType='cube' and any point (i,j), the point should be classified as on-shell if and only if `max(|i - centerX|, |j - centerY|) === shapeSize - 1`.

**Validates: Requirements 4.4**

### Property 15: Sphere shell detection with tolerance

*For any* grid configuration with shapeType='sphere' and any point (i,j), the point should be classified as on-shell if and only if `|distance - (shapeSize - 1)| ≤ 0.7` where distance is the Euclidean distance from center.

**Validates: Requirements 4.5**

### Property 16: Alpha values match classifications

*For any* rendered line segment, the alpha values at each endpoint should match the configured alpha for that endpoint's classification (clothAlpha for cloth, shapeShellAlpha for shell, insideShapeAlpha for interior, backGridAlpha for background).

**Validates: Requirements 5.1, 5.2, 5.3, 5.4**

### Property 17: Configuration changes trigger updates

*For any* configuration parameter change (gridDensity, shapeSize, influenceRadius, zSeparation, selectedPointX, selectedPointY, or any alpha value), the visualization should recalculate affected grid points and re-render.

**Validates: Requirements 5.5, 7.1, 7.2, 7.3, 7.4, 7.5**

### Property 18: Shape type change recalculates grid

*For any* configuration where shapeType changes from cube to sphere or vice versa, all grid point classifications and Z displacements should be recalculated using the new distance metric.

**Validates: Requirements 6.4**

### Property 19: Lines mode renders line geometry

*For any* grid configuration with renderMode='lines', the rendered scene should contain Line geometry objects with gradient alpha interpolation, not Points geometry.

**Validates: Requirements 9.1**

### Property 20: Points mode renders point geometry

*For any* grid configuration with renderMode='points', the rendered scene should contain Points geometry objects with alpha attributes, not Line geometry.

**Validates: Requirements 9.2**

### Property 21: Point shapes are circular

*For any* grid configuration with renderMode='points', the fragment shader should discard fragments where the distance from point center exceeds 0.5 (creating circular points).

**Validates: Requirements 9.4**

### Property 22: Point size updates rendering

*For any* configuration where pointSize changes, the rendered point diameter in the shader should equal the new pointSize value.

**Validates: Requirements 9.5**

## Error Handling

### Invalid Configuration Values

- Grid density must be clamped to [10, 40]
- Shape size must be clamped to [1, 15]
- Influence radius must be clamped to [0, 100]
- Z separation must be clamped to [-500, 500]
- Alpha values must be clamped to [0, 1]
- Point size must be clamped to [1, 10]
- Selected point coordinates must be clamped to [0, gridDensity]

### WebGL Context Loss

- Detect context loss events
- Attempt to restore context
- Reinitialize renderer and scene if restoration succeeds
- Display error message if restoration fails

### Performance Degradation

- Monitor frame rate
- Suggest reducing grid density if FPS drops below 30
- Automatically switch to points mode if FPS drops below 15

### Browser Compatibility

- Check for WebGL support on initialization
- Display fallback message if WebGL is not available
- Verify shader compilation success
- Log shader errors to console for debugging

## Testing Strategy

### Unit Testing

The system will use **Vitest** as the testing framework for unit tests. Unit tests will cover:

1. **Distance Calculation Functions**
   - Test Chebyshev distance for cube shapes with known inputs
   - Test Euclidean distance for sphere shapes with known inputs
   - Test edge cases: zero distance, maximum distance

2. **Classification Functions**
   - Test point classification with known configurations
   - Test shell detection for cubes and spheres
   - Test cloth region boundaries

3. **Z Displacement Calculation**
   - Test full displacement for shell points
   - Test zero displacement for distant points
   - Test cosine falloff in cloth region

4. **Configuration Management**
   - Test localStorage save/load
   - Test default configuration values
   - Test configuration validation and clamping

### Property-Based Testing

The system will use **fast-check** as the property-based testing library for JavaScript. Each property-based test will run a minimum of 100 iterations to ensure thorough coverage.

Property-based tests will verify the correctness properties defined above:

1. **Grid Line Filtering Properties** (Properties 1-3)
   - Generate random grid configurations
   - Verify foreground lines only connect appropriate points
   - Verify interior points have no connections
   - Verify background grid completeness

2. **Displacement Calculation Properties** (Properties 4-7)
   - Generate random shape configurations
   - Verify shell points have full displacement
   - Verify cloth falloff formula
   - Verify distance metrics for both shape types

3. **Intermediate Slice Properties** (Properties 8-10)
   - Generate random configurations with varying Z separation
   - Verify slice count calculation
   - Verify slice point inclusion criteria
   - Verify slice line connectivity

4. **Z-Connection Properties** (Properties 11-13)
   - Generate random grid configurations
   - Verify shell points have Z connections
   - Verify interior points lack Z connections
   - Verify cloth points have Z connections

5. **Shape Detection Properties** (Properties 14-15)
   - Generate random point positions
   - Verify cube shell detection formula
   - Verify sphere shell detection with tolerance

6. **Rendering Properties** (Properties 16-22)
   - Generate random configurations
   - Verify alpha value assignments
   - Verify geometry types for render modes
   - Verify shader behavior

Each property-based test must be tagged with a comment explicitly referencing the correctness property from this design document using the format: **Feature: grid-deformation-viz, Property {number}: {property_text}**

### Integration Testing

Integration tests will verify the complete data flow:

1. **Configuration to Rendering Pipeline**
   - Change configuration values
   - Verify grid regeneration
   - Verify correct rendering output

2. **UI Interaction Flow**
   - Simulate slider changes
   - Verify configuration updates
   - Verify visualization updates

3. **Shape Type Switching**
   - Toggle between cube and sphere
   - Verify complete recalculation
   - Verify correct distance metrics applied

### Visual Regression Testing

- Capture screenshots of known configurations
- Compare against baseline images
- Flag visual differences for review
- Maintain baseline library for different shape types and settings
