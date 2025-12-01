# Cloth Extension Control

## New Feature: Cloth Extension Slider

Control how far the cloth extends from the cube edge, measured in grid steps.

## How It Works

### Cloth Extension Values

**Extension = 0 (Clings to Cube)**
```
Top View:
    [CUBE]
    
No extension - cloth exactly follows cube boundary
```

**Extension = 1 (One Grid Step)**
```
Top View:
   ┌─┐
   │C│  <- Cube
   └─┘
  ┌───┐
  │   │ <- Cloth extends 1 grid step
  └───┘
```

**Extension = 3 (Three Grid Steps)**
```
Top View:
     ┌─┐
     │C│  <- Cube
     └─┘
  ┌───────┐
  │       │ <- Cloth extends 3 grid steps
  │       │
  └───────┘
```

**Extension = 10 (Ten Grid Steps)**
```
Top View:
         ┌─┐
         │C│  <- Cube
         └─┘
  ┌─────────────┐
  │             │ <- Cloth extends 10 grid steps
  │             │
  │             │
  └─────────────┘
```

## Influence Distance Calculation

```javascript
influenceDistance = clothExtension * gridSpacing
```

**Example:**
- Grid spacing: 30 units
- Cloth extension: 3 steps
- Influence distance: 90 units

## Interaction with Stiffness

The **Cloth Extension** and **Cloth Stiffness** work together:

### Extension = 0 (Any Stiffness)
```
Side View:
    ____
    |  |  <- Cloth clings to cube
    |__|
    
No falloff zone
```

### Extension = 3, Stiffness = 0 (Soft)
```
Side View:
    ____
    |  |\
    |  | \___  <- Gradual drop over 3 steps
    |__|
```

### Extension = 3, Stiffness = 1 (Stiff)
```
Side View:
    ____
    |  ||
    |  ||___  <- Steep drop over 3 steps
    |__|
```

### Extension = 10, Stiffness = 0 (Soft)
```
Side View:
    ____
    |  |\
    |  | \
    |  |  \
    |  |   \___  <- Very gradual drop over 10 steps
    |__|
```

## Use Cases

### Extension = 0: Tight Fit
- Cloth wraps tightly around cube
- No draping beyond cube edges
- Like shrink-wrap or tight fabric

### Extension = 1-3: Moderate Drape
- Natural cloth behavior
- Slight extension beyond cube
- Like a fitted tablecloth

### Extension = 5-7: Loose Drape
- Generous fabric
- Extends well beyond cube
- Like a loose tablecloth

### Extension = 8-10: Very Loose
- Lots of excess fabric
- Wide deformation area
- Like a large blanket over small object

## Grid Step Measurement

The extension is measured in **grid steps**, not absolute units:

```
Grid Density = 10, Cube Size = 300
- Grid spacing = 30 units
- Extension = 3 steps
- Actual distance = 90 units

Grid Density = 20, Cube Size = 300
- Grid spacing = 15 units
- Extension = 3 steps
- Actual distance = 45 units
```

This means the cloth extension **scales with grid density**.

## Visual Examples

### Comparison at Different Extensions

**Extension = 0:**
```
    ████
    ████  <- Cube only
    ████
```

**Extension = 2:**
```
  ▒▒████▒▒
  ▒▒████▒▒  <- Cube + 2 steps
  ▒▒████▒▒
```

**Extension = 5:**
```
░░░░████░░░░
░░░░████░░░░  <- Cube + 5 steps
░░░░████░░░░
```

Legend:
- █ = Full displacement (cube)
- ▒ = Partial displacement (close)
- ░ = Minimal displacement (far)

## Practical Tips

1. **Start with 3**: Good default for natural draping
2. **Use 0 for tight fit**: When you want cloth to exactly follow cube
3. **Increase for soft materials**: Silk, satin need more extension
4. **Decrease for stiff materials**: Canvas, leather need less extension
5. **Combine with stiffness**: 
   - High extension + low stiffness = flowing fabric
   - Low extension + high stiffness = rigid material

## Performance Note

Higher extension values create larger deformation areas but don't significantly impact performance since the grid size is determined by floor size, not extension.

## Slider Range

- **Minimum**: 0 (clings to cube)
- **Maximum**: 10 (very loose drape)
- **Default**: 3 (moderate drape)
- **Step**: 1 (whole grid steps)

Try adjusting the slider to see how the cloth behavior changes!
