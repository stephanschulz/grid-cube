# Single Layer Deformation Approach

## Concept

The cloth is now a **single continuous grid layer** at floor level (Y = -cubeSize/2) that gets **lifted upward in the Y direction** by the cube. This creates a deformation effect where the grid "bulges" upward around the cube.

## How It Works

### Starting Point: Flat Grid
```
Side View (no cube):
Floor: ________________
       (all at Y = -s)
```

### With Cube: Grid Deformation
```
Side View (with cube):

        ___
       /   \  <- Grid lifted upward
      /     \
_____/       \_____ Floor level (Y = -s)
     
Y displacement varies by distance from cube
```

### Top View: Displacement Map
```
    Low ← → High ← → Low
     ↓     ↓     ↓
    [  [  CUBE  ]  ]
     ↓     ↓     ↓
    Low ← → High ← → Low

Displacement is highest at cube,
decreases with distance
```

## Y Displacement Calculation

For each grid point at position (x, z):

### 1. Calculate Distance from Cube
```javascript
dx = |x|
dz = |z|
distanceFromCenter = max(dx, dz)  // Chebyshev distance
```

### 2. Determine Displacement

**Inside Cube** (distance ≤ cubeRadius):
```
yDisplacement = cubeSize  // Full upward lift
```

**Outside Cube** (distance > cubeRadius):
```
distanceFromCube = distance - cubeRadius
normalizedDistance = distanceFromCube / influenceDistance
falloff = 1 - normalizedDistance^exponent
yDisplacement = cubeSize * falloff
```

**Beyond Influence** (distance > cubeRadius + influenceDistance):
```
yDisplacement = 0  // No displacement
```

### 3. Apply Displacement
```javascript
finalY = floorY + yDisplacement
point = (x, finalY, z)
```

## Stiffness Control

Stiffness affects the **falloff curve**:

**Stiffness = 0 (Soft)**
```
Displacement Profile:
|
|___
|   \___
|       \___
|___________\___
Cube  →  Gradual falloff
```

**Stiffness = 1 (Stiff)**
```
Displacement Profile:
|
|___
|   |___
|       |___
|___________|___
Cube  →  Steep falloff
```

## Key Differences from Previous Approach

### Old Approach (Multiple Sections)
- ❌ 9 separate grid sections
- ❌ Complex corner handling
- ❌ Gaps and seams
- ❌ Draping downward (Y displacement)

### New Approach (Single Layer)
- ✅ One continuous grid
- ✅ Natural deformation
- ✅ No gaps or seams
- ✅ Forward push (Z displacement)

## Visual Comparison

### Old: Draping Down
```
Side View:
    Cube
    ____
    |  |
    |  |\
    |  | \  <- Cloth falls down
    |__|  \
         Floor
```

### New: Lifting Upward
```
Side View:
         Cube
         ____
        /|  |\
       / |  | \  <- Grid lifted upward
      /  |__|  \
_____/          \_____ Floor
Floor (grid deforms upward)
```

## Grid Properties

**Position:**
- Base Y = floorY (floor level)
- X and Z span the entire floor area
- Y displacement (height) varies by distance from cube

**Displacement:**
- Maximum at cube center: `cubeSize` (lifted to top of cube)
- Decreases with distance
- Zero beyond influence distance (flat on floor)

**Continuity:**
- Single 2D grid (no sections)
- Smooth transitions
- No gaps or holes

## Influence Distance

The influence distance determines how far the deformation extends:

```javascript
influenceDistance = cubeSize * (1 - stiffness * 0.8)
```

- **Stiffness 0**: Large influence (soft, wide deformation)
- **Stiffness 1**: Small influence (stiff, narrow deformation)

## Mathematical Formula

```
For point (x, z):

1. distance = max(|x|, |z|)

2. If distance ≤ cubeRadius:
     displacement = cubeSize
   
3. Else if distance ≤ cubeRadius + influence:
     d = distance - cubeRadius
     normalized = d / influence
     exponent = 1 + (stiffness * 4)
     falloff = 1 - normalized^exponent
     displacement = cubeSize * falloff
   
4. Else:
     displacement = 0

5. finalPosition = (x, floorY + displacement, z)
```

## Advantages

1. **Simplicity**: One grid, one formula
2. **Continuity**: No seams or gaps
3. **Performance**: Fewer calculations
4. **Realism**: Natural deformation effect
5. **Flexibility**: Easy to modify displacement formula

## Use Cases

- **Cloth Simulation**: Fabric stretched over object
- **Force Field**: Energy emanating from cube
- **Magnetic Field**: Attraction/repulsion visualization
- **Terrain Deformation**: Ground bulging around object
- **Water Surface**: Displacement by submerged object

## Visualization Tips

1. **Hide Cube Faces**: See pure grid deformation
2. **Adjust Stiffness**: See how falloff changes
3. **Rotate View**: Observe 3D deformation
4. **Compare with Floor**: See displacement clearly

The grid now behaves like a flexible sheet being lifted upward by the cube!
