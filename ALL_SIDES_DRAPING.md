# All-Sides Cloth Draping

## Concept

The cloth now drapes from **all four top edges** of the cube, creating a complete tablecloth-like effect that surrounds the cube on all sides.

## Top View Diagram

```
Floor Grid extends in all directions
        
        ↓ ↓ ↓ ↓ ↓ ↓ ↓
        B A C K
        ↓ ↓ ↓ ↓ ↓ ↓ ↓
        
← ← ← ← ┌─────────┐ → → → →
← ← ← ← │         │ → → → →
  L E F │  CUBE   │ R I G H
  T     │         │ T
← ← ← ← │         │ → → → →
← ← ← ← └─────────┘ → → → →
        
        ↓ ↓ ↓ ↓ ↓ ↓ ↓
        F R O N T
        ↓ ↓ ↓ ↓ ↓ ↓ ↓
```

## Side View (Looking from Front)

```
        Cube Top
         _____
        |     |
        |     |  <- Cloth attached to top edges
        |_____|
       /       \
      /         \    <- Cloth drapes down
     /           \
    /             \
   /               \
  /                 \
 /___________________\
      Floor Grid
```

## 3D Perspective View

```
         Back Drape
            |||
           /|||\ 
          / ||| \
    Left /  |||  \ Right
   Drape|  CUBE  |Drape
        |   |||  |
         \  |||  /
          \ ||| /
           \|||/
            |||
        Front Drape
            |||
         Floor Grid
```

## Four Draping Sections

### 1. Front Drape
- **Attachment**: Front top edge of cube (Z = +cubeSize/2)
- **Direction**: Extends in +Z direction (toward viewer)
- **Grid**: X varies along cube width, Z increases outward

### 2. Back Drape
- **Attachment**: Back top edge of cube (Z = -cubeSize/2)
- **Direction**: Extends in -Z direction (away from viewer)
- **Grid**: X varies along cube width, Z decreases outward

### 3. Left Drape
- **Attachment**: Left top edge of cube (X = -cubeSize/2)
- **Direction**: Extends in -X direction (to the left)
- **Grid**: Z varies along cube depth, X decreases outward

### 4. Right Drape
- **Attachment**: Right top edge of cube (X = +cubeSize/2)
- **Direction**: Extends in +X direction (to the right)
- **Grid**: Z varies along cube depth, X increases outward

## Grid Alignment

All four draping sections:
- Use the **same grid spacing** as the cube
- Attach at **Y = cubeSize/2** (top of cube)
- Drop to **Y = -cubeSize/2** (floor level)
- Extend to the edge of the floor grid

## Stiffness Effect on All Sides

The stiffness parameter affects all four sides equally:

**Stiffness = 0 (Soft)**
```
Top View:
    \  |  /
     \ | /
      \|/
    --CUBE--
      /|\
     / | \
    /  |  \
```
Gentle, flowing drape on all sides

**Stiffness = 1 (Stiff)**
```
Top View:
    |  |  |
    |  |  |
    |  |  |
    --CUBE--
    |  |  |
    |  |  |
    |  |  |
```
Steep, immediate drop on all sides

## Implementation Details

### Point Calculation
For each side, we calculate a 2D grid of points:
```javascript
// Example for front side
for (i along cube width) {
    for (j extending outward) {
        x = cube position
        z = cube edge + (j * spacing)
        y = calculateDrapY(distance, stiffness)
    }
}
```

### Line Creation
For each side:
1. **Horizontal lines**: Connect points at same distance from cube
2. **Vertical lines**: Connect points along draping direction

### Symmetry
All four sides use the same draping formula, just rotated:
- Front/Back: Vary X, extend Z
- Left/Right: Vary Z, extend X

## Visual Result

When viewed from above with the cube hidden, you see:
- A square "hole" where the cube is
- Cloth extending outward in all directions
- Grid lines radiating from the cube edges
- Perfect symmetry in all four directions

## Use Cases

- **Tablecloth Simulation**: Realistic cloth over a table
- **Tent/Canopy**: Fabric draped over a structure
- **Waterfall Effect**: Liquid flowing down all sides
- **Force Field**: Energy emanating from a cube
- **Architectural Draping**: Fabric installations

Try rotating the view to see the cloth draping from all angles!
