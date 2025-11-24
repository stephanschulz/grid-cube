# Requirements Document

## Introduction

This document specifies requirements for an interactive 3D grid deformation visualization system. The system displays two parallel grid layers (background and foreground) where a 3D shape (cube or sphere) is represented by deforming the foreground grid toward the viewer. The shape's walls perpendicular to the XY plane display the same grid structure, creating a cloth-like draping effect. The visualization must correctly render grid lines only where appropriate: on the shape's surface and in the stretched cloth region, but not inside or outside the shape volume.

## Glossary

- **Background Grid**: The fixed grid layer positioned at a constant Z depth behind the foreground
- **Foreground Grid**: The deformable grid layer that displaces toward the viewer to represent the shape
- **Shape Volume**: The 3D region enclosed by the shape (cube or sphere)
- **Shape Shell**: The outer boundary surface of the shape where the grid is fully displaced
- **Cloth Region**: The area outside the shape where the grid transitions smoothly from displaced to flat (falloff zone)
- **Grid Point**: An intersection point in the grid structure at coordinates (i, j, z)
- **Z Displacement**: The distance a grid point is pulled forward from the background layer
- **Influence Distance**: The distance beyond the shape boundary where the cloth-like falloff effect occurs
- **Intermediate Slice**: A horizontal grid layer at a Z position between the background and foreground layers

## Requirements

### Requirement 1

**User Story:** As a user, I want to see a clean grid visualization where lines only appear on the shape surface and cloth region, so that the 3D structure is clearly visible without visual clutter.

#### Acceptance Criteria

1. WHEN rendering the foreground grid THEN the system SHALL draw grid lines only for points within the shape volume or cloth region
2. WHEN a grid point is inside the shape volume but not on the shape shell THEN the system SHALL NOT draw grid lines connecting to that point on the foreground layer
3. WHEN a grid point is outside both the shape volume and cloth region THEN the system SHALL NOT draw grid lines for that point on the foreground layer
4. WHEN two adjacent grid points are both outside the shape and cloth regions THEN the system SHALL NOT draw a line segment connecting them on the foreground layer
5. WHEN the background grid is rendered THEN the system SHALL draw all grid lines uniformly across the entire background layer

### Requirement 2

**User Story:** As a user, I want the cloth-like draping effect to smoothly transition from the shape boundary to the flat background, so that the deformation appears natural and continuous.

#### Acceptance Criteria

1. WHEN a grid point is on the shape shell THEN the system SHALL apply full Z displacement equal to the configured separation distance
2. WHEN a grid point is in the cloth region THEN the system SHALL apply partial Z displacement using cosine interpolation based on distance from shape boundary
3. WHEN calculating cloth falloff THEN the system SHALL use the influence distance parameter to determine the extent of the transition zone
4. WHEN the influence distance is zero THEN the system SHALL apply no cloth effect and transition sharply at the shape boundary
5. WHEN computing distance for cube shapes THEN the system SHALL use Chebyshev distance (maximum of absolute differences)
6. WHEN computing distance for sphere shapes THEN the system SHALL use Euclidean distance (square root of sum of squared differences)

### Requirement 3

**User Story:** As a user, I want intermediate grid slices to correctly represent the 3D shape structure, so that I can understand the volume and depth of the deformation.

#### Acceptance Criteria

1. WHEN the Z displacement exceeds the grid spacing THEN the system SHALL generate intermediate horizontal grid slices at uniform Z intervals
2. WHEN determining which points belong to an intermediate slice THEN the system SHALL include only points where the slice Z position is between the background and foreground Z positions
3. WHEN rendering intermediate slice grid lines THEN the system SHALL draw lines only between adjacent points that both belong to that slice
4. WHEN a point's Z displacement is less than the slice Z offset THEN the system SHALL exclude that point from the intermediate slice
5. WHEN calculating the number of intermediate slices THEN the system SHALL divide the maximum Z displacement by the grid spacing

### Requirement 4

**User Story:** As a user, I want connecting lines (Z-direction walls) to appear only on the shape shell, so that the shape boundary is clearly defined without interior clutter.

#### Acceptance Criteria

1. WHEN a grid point is on the shape shell THEN the system SHALL draw a connecting line from the background layer to the foreground layer
2. WHEN a grid point is inside the shape but not on the shell THEN the system SHALL NOT draw a Z-direction connecting line
3. WHEN a grid point is in the cloth region THEN the system SHALL draw a Z-direction connecting line with appropriate alpha based on displacement
4. WHEN determining if a cube point is on the shell THEN the system SHALL check if the Chebyshev distance equals the shape size minus one
5. WHEN determining if a sphere point is on the shell THEN the system SHALL check if the Euclidean distance is within 0.7 grid units of the shape radius

### Requirement 5

**User Story:** As a user, I want to control the visualization appearance through opacity settings, so that I can emphasize different regions and improve visual clarity.

#### Acceptance Criteria

1. WHEN rendering grid lines in the cloth region THEN the system SHALL apply the cloth alpha opacity value
2. WHEN rendering grid lines on the shape shell THEN the system SHALL apply the shape shell alpha opacity value
3. WHEN rendering grid lines inside the shape volume THEN the system SHALL apply the inside shape alpha opacity value
4. WHEN rendering the background grid THEN the system SHALL apply the background grid alpha opacity value
5. WHEN the user adjusts an alpha slider THEN the system SHALL update the corresponding region opacity and re-render the visualization

### Requirement 6

**User Story:** As a user, I want to switch between cube and sphere shapes, so that I can explore different geometric deformations.

#### Acceptance Criteria

1. WHEN the shape type is set to cube THEN the system SHALL use Chebyshev distance for all shape calculations
2. WHEN the shape type is set to sphere THEN the system SHALL use Euclidean distance for all shape calculations
3. WHEN the user clicks the shape type button THEN the system SHALL toggle between cube and sphere modes
4. WHEN the shape type changes THEN the system SHALL recalculate all grid point classifications and Z displacements
5. WHEN determining sphere shell membership THEN the system SHALL use a tolerance of 0.7 grid units to account for discrete grid sampling

### Requirement 7

**User Story:** As a user, I want to adjust grid density, shape size, and influence distance, so that I can customize the visualization to my needs.

#### Acceptance Criteria

1. WHEN the user adjusts the grid density slider THEN the system SHALL regenerate the grid with the new point count per dimension
2. WHEN the user adjusts the shape size slider THEN the system SHALL recalculate which points are inside the shape and on the shell
3. WHEN the user adjusts the influence distance slider THEN the system SHALL recalculate the cloth region extent and falloff
4. WHEN the user adjusts the Z separation slider THEN the system SHALL update the displacement magnitude for all affected points
5. WHEN the user adjusts the grid point position sliders THEN the system SHALL recenter the shape at the new grid coordinates

### Requirement 8

**User Story:** As a user, I want to interact with the 3D visualization using mouse controls, so that I can view the structure from different angles.

#### Acceptance Criteria

1. WHEN the user left-clicks and drags THEN the system SHALL rotate the camera around the scene center
2. WHEN the user right-clicks and drags THEN the system SHALL pan the camera parallel to the view plane
3. WHEN the user scrolls the mouse wheel THEN the system SHALL zoom the camera in or out
4. WHEN the user clicks the reset camera button THEN the system SHALL return the camera to the default front view position
5. WHEN the camera moves THEN the system SHALL update the rendered view smoothly using orbit controls

### Requirement 9

**User Story:** As a user, I want to switch between line rendering and point rendering modes, so that I can optimize performance or focus on different visual aspects.

#### Acceptance Criteria

1. WHEN the render mode is set to lines THEN the system SHALL draw all grid lines with gradient alpha interpolation
2. WHEN the render mode is set to points THEN the system SHALL render only point vertices with appropriate alpha values
3. WHEN the user clicks the render mode button THEN the system SHALL toggle between lines and points modes
4. WHEN in points mode THEN the system SHALL use circular point shapes with configurable size
5. WHEN the user adjusts the point size slider THEN the system SHALL update the rendered point diameter
