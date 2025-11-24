# Simple Cube Grid Visualization

## Concept

This is a simplified approach to 3D grid visualization. Instead of complex deformation calculations, we represent a 3D cube by explicitly defining its 6 faces as grids.

## How It Works

### Cube Structure
A cube has 6 faces:
- **Front** face (facing +Z)
- **Back** face (facing -Z)
- **Left** face (facing -X)
- **Right** face (facing +X)
- **Top** face (facing +Y)
- **Bottom** face (facing -Y)

### Grid Face Creation
Each face is defined by 4 corner points and a grid density:
1. Define the 4 corners of the face in 3D space
2. Interpolate between corners to create grid lines
3. Create horizontal lines by interpolating along the vertical edges
4. Create vertical lines by interpolating along the horizontal edges

### Example: Front Face
```javascript
// Front face corners (Z = +s)
topLeft:     (-s, +s, +s)
topRight:    (+s, +s, +s)
bottomRight: (+s, -s, +s)
bottomLeft:  (-s, -s, +s)
```

## Files

- **cube-demo.html** - Simple demo page with controls
- **cube-grid.js** - Core implementation
- **index.html** - Original complex deformation demo (still available)

## Usage

1. Open `cube-demo.html` in a browser
2. Use the controls to:
   - Adjust grid density (2-30 divisions)
   - Change cube size (100-500 units)
   - Control line opacity
   - Toggle individual faces on/off
   - Reset camera view

## Advantages of This Approach

1. **Simplicity**: Each face is independent and easy to understand
2. **Flexibility**: Easy to add/remove faces or modify individual faces
3. **Performance**: No complex calculations, just linear interpolation
4. **Extensibility**: Easy to add features like:
   - Different grid densities per face
   - Different colors per face
   - Deformations applied to individual faces
   - Non-cubic shapes (by adjusting corner positions)

## Next Steps

This simple foundation can be extended to:
- Apply deformations to individual faces
- Create non-rectangular shapes
- Add textures or colors to faces
- Animate face transformations
- Create more complex polyhedra

## Comparison with Original

**Original Approach** (index.html):
- Complex Z-displacement calculations
- Cloth-like deformation effects
- Intermediate slices
- Shape classification system

**Simple Approach** (cube-demo.html):
- Direct face definition
- Clean grid structure
- Easy to understand and modify
- Foundation for future complexity

Start with the simple approach, then add complexity as needed!
