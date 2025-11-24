# Implementation Plan

- [x] 1. Refactor geometric classification system
  - Extract classification logic into pure functions
  - Implement `classifyPoint(i, j, z, frontGrid, config)` function
  - Implement `isInsideShape(i, j, shapeType, size)` helper
  - Implement `isOnShapeShell(i, j, shapeType, size)` helper
  - Implement `isInClothRegion(i, j, frontGrid)` helper
  - _Requirements: 1.1, 1.2, 1.3, 4.4, 4.5_

- [ ]* 1.1 Write property test for point classification
  - **Property 14: Cube shell detection formula**
  - **Validates: Requirements 4.4**

- [ ]* 1.2 Write property test for sphere shell detection
  - **Property 15: Sphere shell detection with tolerance**
  - **Validates: Requirements 4.5**

- [ ] 2. Implement line filtering logic for foreground grid
  - Create `shouldRenderForegroundLine(p1, p2, frontGrid, config)` function
  - Filter out lines where either endpoint is inside-shape (but not on shell)
  - Filter out lines where both endpoints have no displacement
  - Update `updateVisualization()` to use new filtering logic
  - _Requirements: 1.1, 1.2, 1.3_

- [ ]* 2.1 Write property test for foreground line filtering
  - **Property 1: Foreground lines only connect shape or cloth points**
  - **Validates: Requirements 1.1, 1.2, 1.3**

- [ ]* 2.2 Write property test for interior point exclusion
  - **Property 2: Interior points have no foreground connections**
  - **Validates: Requirements 1.2**

- [ ] 3. Fix Z-direction connecting lines
  - Update Z-connection logic to only render for shell and cloth points
  - Remove Z-connections for interior points
  - Apply correct alpha values based on point classification
  - _Requirements: 4.1, 4.2, 4.3_

- [ ]* 3.1 Write property test for shell Z-connections
  - **Property 11: Shell points have Z connections**
  - **Validates: Requirements 4.1**

- [ ]* 3.2 Write property test for interior Z-connection exclusion
  - **Property 12: Interior points have no Z connections**
  - **Validates: Requirements 4.2**

- [ ] 4. Improve intermediate slice generation
  - Update slice point inclusion logic to use proper Z bounds checking
  - Apply line filtering to slice grid lines
  - Ensure slice lines only connect points that both belong to the slice
  - _Requirements: 3.1, 3.2, 3.3, 3.5_

- [ ]* 4.1 Write property test for slice generation
  - **Property 8: Intermediate slices generated when needed**
  - **Validates: Requirements 3.1, 3.5**

- [ ]* 4.2 Write property test for slice point inclusion
  - **Property 9: Slice points are between back and front**
  - **Validates: Requirements 3.2**

- [ ] 5. Implement proper cloth draping effect
  - Verify cosine falloff formula in `calculateZPull()`
  - Ensure influence distance correctly bounds the cloth region
  - Test with various influence distance values including zero
  - _Requirements: 2.1, 2.2, 2.3_

- [ ]* 5.1 Write property test for shell displacement
  - **Property 4: Shell points have full displacement**
  - **Validates: Requirements 2.1**

- [ ]* 5.2 Write property test for cloth falloff
  - **Property 5: Cloth points use cosine falloff**
  - **Validates: Requirements 2.2, 2.3**

- [ ] 6. Verify distance metric implementations
  - Confirm Chebyshev distance for cube shapes
  - Confirm Euclidean distance for sphere shapes
  - Test shape type switching recalculates correctly
  - _Requirements: 2.5, 2.6, 6.4_

- [ ]* 6.1 Write property test for cube distance metric
  - **Property 6: Cube distance uses Chebyshev metric**
  - **Validates: Requirements 2.5**

- [ ]* 6.2 Write property test for sphere distance metric
  - **Property 7: Sphere distance uses Euclidean metric**
  - **Validates: Requirements 2.6**

- [ ]* 6.3 Write property test for shape type recalculation
  - **Property 18: Shape type change recalculates grid**
  - **Validates: Requirements 6.4**

- [ ] 7. Implement gradient alpha system
  - Update `createGradientLine()` to accept per-endpoint alpha values
  - Modify line building logic to calculate alpha based on endpoint classifications
  - Apply correct alpha values: clothAlpha, shapeShellAlpha, insideShapeAlpha, backGridAlpha
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ]* 7.1 Write property test for alpha assignments
  - **Property 16: Alpha values match classifications**
  - **Validates: Requirements 5.1, 5.2, 5.3, 5.4**

- [ ] 8. Optimize points rendering mode
  - Update points mode to use new classification system
  - Apply correct alpha values to point vertices
  - Verify circular point shader discards fragments correctly
  - _Requirements: 9.2, 9.4, 9.5_

- [ ]* 8.1 Write property test for points mode rendering
  - **Property 20: Points mode renders point geometry**
  - **Validates: Requirements 9.2**

- [ ]* 8.2 Write property test for point size updates
  - **Property 22: Point size updates rendering**
  - **Validates: Requirements 9.5**

- [ ] 9. Add configuration validation
  - Implement clamping for all configuration values
  - Add validation in UI event handlers
  - Ensure selectedPoint coordinates stay within grid bounds
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ]* 9.1 Write property test for configuration updates
  - **Property 17: Configuration changes trigger updates**
  - **Validates: Requirements 5.5, 7.1, 7.2, 7.3, 7.4, 7.5**

- [ ] 10. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
