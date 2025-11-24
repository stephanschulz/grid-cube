# Grid Alignment - Floor and Cube

## What Changed

The floor grid now automatically matches the cube's grid spacing, ensuring perfect alignment.

## How It Works

### Grid Spacing Calculation

**Cube Grid Spacing:**
```
spacing = cubeSize / gridDensity
```

Example: 
- Cube size: 300 units
- Grid density: 10 divisions
- Spacing: 300 / 10 = 30 units per grid cell

**Floor Grid Density (Auto-calculated):**
```
floorDensity = floor(floorSize / cubeGridSpacing)
```

Example:
- Floor size: 800 units
- Cube spacing: 30 units
- Floor density: 800 / 30 ≈ 26 divisions

### Result

- Every grid line on the floor aligns with the cube's grid
- When you change cube grid density, floor updates automatically
- When you change cube size, floor updates automatically
- Floor size can be adjusted independently while maintaining alignment

## Visual Example

```
Cube (300 units, 10 divisions = 30 unit spacing):
    |--30--|--30--|--30--|
    
Floor (800 units, auto = 26 divisions, also 30 unit spacing):
|--30--|--30--|--30--|--30--|--30--|--30--|--30--|--30--|...
    ^       ^       ^
    |       |       |
    Aligns with cube grid lines
```

## Benefits

1. **Visual Coherence**: Grid lines flow seamlessly from cube to floor
2. **Automatic**: No manual adjustment needed
3. **Consistent**: Same spacing everywhere
4. **Flexible**: Floor size can change while maintaining alignment

## Controls

- **Grid Density**: Controls both cube AND floor grid spacing
- **Cube Size**: Affects cube and floor position
- **Floor Size**: How far the floor extends (grid spacing stays aligned)
- **Floor Opacity**: Visual appearance only

The floor grid density is now calculated automatically - you don't need to adjust it manually!
