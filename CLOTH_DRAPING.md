# Cloth Draping Feature

## Overview

A cloth grid that drapes from **all four sides** of the cube down to the floor, simulating fabric falling under gravity with adjustable stiffness. The cloth wraps around the entire cube like a tablecloth.

## How It Works

### Cloth Structure (Top View)

```
        BACK DRAPE
           |||
    LEFT   |||   RIGHT
    DRAPE  |||   DRAPE
      |||  |||   |||
      ||| [CUBE] |||
      |||  |||   |||
      |||  |||   |||
           |||
        FRONT DRAPE
```

### Cloth Structure (Side View)

```
Cube Top Edge
    |||||||||||||
    ||||||||||||  <- Cloth attached to all 4 top edges
    |||||||||||
    ||||||||||
    |||||||||     <- Cloth drapes down on all sides
    ||||||||
    |||||||
    ||||||
    |||||
    ||||
    |||
    ||
    |
Floor Grid (all around)
```

### Stiffness Control

The **Cloth Stiffness** parameter (0 to 1) controls how the cloth falls:

**Stiffness = 0 (Soft, Gradual Drape)**
```
Cube ___
        \
         \
          \
           \
            \
             \_____ Floor
```
- Gentle curve
- Cloth falls gradually
- Like silk or light fabric

**Stiffness = 0.5 (Medium)**
```
Cube ___
        \
         \
          \___
              \____ Floor
```
- Balanced curve
- Natural draping
- Like cotton or linen

**Stiffness = 1 (Stiff, Steep Drop)**
```
Cube ___
        |
        |
        |_____ Floor
```
- Sharp drop
- Cloth falls quickly
- Like heavy canvas or leather

### Mathematical Formula

The cloth Y position is calculated using an exponential falloff:

```javascript
// Distance from cube front face
distanceFromCube = j * gridSpacing

// Normalize to 0-1 range
normalizedDistance = distanceFromCube / maxDistance

// Exponential curve (controlled by stiffness)
exponent = 1 + (stiffness * 4)  // Range: 1 to 5
dropFactor = normalizedDistance ^ exponent

// Final Y position
y = cubeTopY - (dropFactor * totalDrop)
```

**Effect of Exponent:**
- Exponent = 1 (stiffness 0): Linear drop
- Exponent = 3 (stiffness 0.5): Moderate curve
- Exponent = 5 (stiffness 1): Steep curve

### Grid Alignment

The cloth grid:
- Uses the **same grid spacing** as the cube and floor
- Attaches to the **top edge** of the cube's front face
- Extends from the cube front to the floor edge
- All grid lines align perfectly with cube and floor

### Cloth Properties

**Position:**
- Starts at: All four top edges of the cube (Y = cubeSize/2)
- Ends at: Floor level (Y = -cubeSize/2)
- Extends outward from each cube face to the floor edge

**Four Sides:**
1. **Front Drape**: From front top edge, extends in +Z direction
2. **Back Drape**: From back top edge, extends in -Z direction
3. **Left Drape**: From left top edge, extends in -X direction
4. **Right Drape**: From right top edge, extends in +X direction

**Grid Density:**
- Along cube edge: Matches cube grid density
- Perpendicular to cube: Calculated from cloth extension distance

**Color:**
- Blue (#4444ff) to distinguish from cube (black) and floor (gray)

## Controls

1. **Cloth Stiffness** (0.00 - 1.00)
   - Adjusts the draping curve
   - 0 = soft, gradual fall
   - 1 = stiff, steep drop

2. **Cloth Opacity** (0.0 - 1.0)
   - Controls transparency
   - Default: 0.6

3. **Show Cloth** (checkbox)
   - Toggle cloth visibility on/off

## Use Cases

- **Visualization**: See how fabric would drape over a 3D shape
- **Physics Simulation**: Approximate cloth behavior
- **Design**: Understand how materials fall and fold
- **Education**: Demonstrate gravity and material properties

## Technical Details

**Grid Generation:**
1. Calculate attachment points on all four top edges of cube
2. For each side (front, back, left, right):
   - Create grid extending outward from cube
   - Calculate Y drop based on distance and stiffness
3. Create horizontal lines (parallel to cube edges)
4. Create vertical lines (draping curves perpendicular to cube)

**Performance:**
- Efficient: Only recalculates when stiffness changes
- Grid-based: No physics simulation needed
- Lightweight: Simple mathematical formula

## Tips

- **Soft Drape**: Set stiffness to 0.0-0.3 for flowing fabric
- **Natural Look**: Use stiffness 0.4-0.6 for realistic cloth
- **Stiff Material**: Set stiffness to 0.7-1.0 for rigid materials
- **Combine with Cube**: Hide cube faces to see cloth alone
- **Adjust Opacity**: Lower opacity to see through cloth to floor

Try adjusting the stiffness slider in real-time to see the cloth behavior change!
