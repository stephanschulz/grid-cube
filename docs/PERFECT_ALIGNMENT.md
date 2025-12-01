# Perfect Grid Alignment - Cube and Floor

## The Problem

Previously, the cube and floor grids had the same spacing but weren't necessarily aligned at intersection points. The cube corners might fall between grid lines.

## The Solution

Now both the cube and floor use **exact grid coordinates** - every corner and every line sits precisely on grid intersection points.

## How It Works

### 1. Grid Spacing (The Foundation)
```javascript
gridSpacing = cubeSize / gridDensity
```
Example: 300 / 10 = 30 units per cell

### 2. Cube Corners (Snapped to Grid)
```javascript
// Cube corners are at exact multiples of gridSpacing
bottomY = -cubeSize / 2
topY = cubeSize / 2

// All corners sit on grid points
corners = {
    fbl: (-150, -150, 150),  // front bottom left
    fbr: (150, -150, 150),   // front bottom right
    bbl: (-150, -150, -150), // back bottom left
    bbr: (150, -150, -150)   // back bottom right
    // ... etc
}
```

### 3. Floor Grid (Same Grid System)
```javascript
// Floor uses EXACT same grid spacing
numCellsX = floor(floorSize / gridSpacing)
numCellsZ = floor(floorSize / gridSpacing)

// Floor lines at exact grid positions
for (i = 0; i <= numCells; i++) {
    x = -halfSize + (i * gridSpacing)
    // Draw line at x
}
```

### 4. Perfect Alignment
```
Floor Grid (top view):
    |     |     |     |     |     |
----+-----+-----+-----+-----+-----+----
    |     |     |     |     |     |
----+-----+-----+-----+-----+-----+----
    |     |  [CUBE]   |     |     |
----+-----+--+-----+--+-----+-----+----
    |     |  |     |  |     |     |
----+-----+--+-----+--+-----+-----+----
    |     |     |     |     |     |
----+-----+-----+-----+-----+-----+----
         ^           ^
         |           |
    Cube corners sit exactly on grid intersections!
```

## Key Changes

1. **Cube Creation**
   - Corners calculated to sit on grid points
   - Size is always exact multiple of grid spacing

2. **Floor Creation**
   - Uses exact same `gridSpacing` value
   - Lines drawn at exact multiples: `i * gridSpacing`
   - No interpolation - direct positioning

3. **Coordinate System**
   - Both centered at origin (0, 0, 0)
   - Both use same grid spacing
   - Floor Y = cube bottom Y

## Result

✅ Cube bottom edges sit **exactly** on floor grid lines
✅ Cube corners sit **exactly** on floor grid intersection points
✅ All grid lines align perfectly
✅ No gaps, no misalignment

## Visual Test

To verify perfect alignment:
1. Open `cube-demo.html`
2. Hide the top, front, back, left, and right faces
3. Show only the bottom face and floor
4. Rotate to top view
5. You'll see the cube bottom grid **perfectly overlaps** the floor grid!

The cube literally "sits" on the floor grid with perfect alignment.
