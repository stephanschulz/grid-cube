# Floor Plane Grid

## What Was Added

A horizontal grid plane positioned at the bottom of the cube, creating a "floor" effect.

## Visual Structure

```
        Top Face
           ___________
          /|         /|
   Left  / |  Front / |  Right
   Face /  |  Face /  |  Face
       /___|______/   |
       |   |______|___|
       |  /  Back |  /
       | /   Face | /
       |/________|/
       Bottom Face
       
       ============== <- Floor Plane (extends beyond cube)
```

## Floor Plane Details

**Position**: 
- Y coordinate = bottom of cube (cubeSize / -2)
- Extends in X and Z directions

**Size**:
- Default: 800 units (larger than cube)
- Adjustable: 400-1200 units

**Grid Density**:
- Default: 20 divisions
- Adjustable: 5-40 divisions

**Appearance**:
- Gray color (#666666)
- Lower opacity (0.3) to not overwhelm the cube
- Sits "behind" the cube visually

## Controls Added

1. **Floor Size** - How large the floor extends
2. **Floor Grid Density** - How many grid lines
3. **Floor Opacity** - Transparency of floor grid
4. **Show Floor** - Toggle floor on/off

## Use Cases

- Provides spatial reference for the cube
- Shows the "ground" the cube sits on
- Helps visualize 3D depth and perspective
- Creates a more complete 3D scene

## Technical Implementation

The floor is created as a separate grid face:
- 4 corners define the rectangular plane
- Lines run parallel to X axis (left-right)
- Lines run parallel to Z axis (front-back)
- All lines at the same Y coordinate (flat plane)

## Relationship to Cube

- Floor Y position updates when cube size changes
- Floor is independent of cube faces
- Can be shown/hidden separately
- Larger than cube to provide context

Open `cube-demo.html` to see it in action!
