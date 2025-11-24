import { describe, it, expect } from 'vitest';
import {
    isInsideCube,
    isOnCubeEdge,
    isInsideSphere,
    isOnSphereSurface,
    isInsideShape,
    isOnShapeShell,
    isInClothRegion,
    classifyPoint
} from './classification.js';

describe('Geometric Classification Functions', () => {
    describe('isInsideCube', () => {
        it('should return true for center point', () => {
            expect(isInsideCube(10, 10, 10, 10, 5)).toBe(true);
        });

        it('should return true for point inside cube', () => {
            expect(isInsideCube(12, 12, 10, 10, 5)).toBe(true);
        });

        it('should return false for point outside cube', () => {
            expect(isInsideCube(15, 15, 10, 10, 5)).toBe(false);
        });

        it('should return true for point on edge', () => {
            expect(isInsideCube(14, 10, 10, 10, 5)).toBe(true);
        });
    });

    describe('isOnCubeEdge', () => {
        it('should return false for center point', () => {
            expect(isOnCubeEdge(10, 10, 10, 10, 5)).toBe(false);
        });

        it('should return true for point on edge', () => {
            expect(isOnCubeEdge(14, 10, 10, 10, 5)).toBe(true);
            expect(isOnCubeEdge(6, 10, 10, 10, 5)).toBe(true);
            expect(isOnCubeEdge(10, 14, 10, 10, 5)).toBe(true);
            expect(isOnCubeEdge(10, 6, 10, 10, 5)).toBe(true);
        });

        it('should return true for corner point', () => {
            expect(isOnCubeEdge(14, 14, 10, 10, 5)).toBe(true);
        });

        it('should return false for point outside cube', () => {
            expect(isOnCubeEdge(15, 15, 10, 10, 5)).toBe(false);
        });
    });

    describe('isInsideSphere', () => {
        it('should return true for center point', () => {
            expect(isInsideSphere(10, 10, 10, 10, 5)).toBe(true);
        });

        it('should return true for point inside sphere', () => {
            expect(isInsideSphere(12, 10, 10, 10, 5)).toBe(true);
        });

        it('should return false for point outside sphere', () => {
            expect(isInsideSphere(15, 15, 10, 10, 5)).toBe(false);
        });
    });

    describe('isOnSphereSurface', () => {
        it('should return false for center point', () => {
            expect(isOnSphereSurface(10, 10, 10, 10, 5)).toBe(false);
        });

        it('should return true for point on surface', () => {
            // Point at distance 4 from center (radius - 1)
            expect(isOnSphereSurface(14, 10, 10, 10, 5)).toBe(true);
        });

        it('should return false for point far outside', () => {
            expect(isOnSphereSurface(20, 20, 10, 10, 5)).toBe(false);
        });
    });

    describe('isInsideShape', () => {
        it('should delegate to cube functions for cube shape', () => {
            expect(isInsideShape(10, 10, 'cube', 5, 10, 10)).toBe(true);
            expect(isInsideShape(15, 15, 'cube', 5, 10, 10)).toBe(false);
        });

        it('should delegate to sphere functions for sphere shape', () => {
            expect(isInsideShape(10, 10, 'sphere', 5, 10, 10)).toBe(true);
            expect(isInsideShape(20, 20, 'sphere', 5, 10, 10)).toBe(false);
        });

        it('should return false for unknown shape type', () => {
            expect(isInsideShape(10, 10, 'triangle', 5, 10, 10)).toBe(false);
        });
    });

    describe('isOnShapeShell', () => {
        it('should delegate to cube functions for cube shape', () => {
            expect(isOnShapeShell(14, 10, 'cube', 5, 10, 10)).toBe(true);
            expect(isOnShapeShell(10, 10, 'cube', 5, 10, 10)).toBe(false);
        });

        it('should delegate to sphere functions for sphere shape', () => {
            expect(isOnShapeShell(14, 10, 'sphere', 5, 10, 10)).toBe(true);
            expect(isOnShapeShell(10, 10, 'sphere', 5, 10, 10)).toBe(false);
        });

        it('should return false for unknown shape type', () => {
            expect(isOnShapeShell(10, 10, 'triangle', 5, 10, 10)).toBe(false);
        });
    });

    describe('isInClothRegion', () => {
        it('should return true for point with significant displacement', () => {
            const frontGrid = [[{ pull: 50 }]];
            expect(isInClothRegion(0, 0, frontGrid)).toBe(true);
        });

        it('should return false for point with no displacement', () => {
            const frontGrid = [[{ pull: 0 }]];
            expect(isInClothRegion(0, 0, frontGrid)).toBe(false);
        });

        it('should return false for point with minimal displacement', () => {
            const frontGrid = [[{ pull: 0.05 }]];
            expect(isInClothRegion(0, 0, frontGrid)).toBe(false);
        });

        it('should return true for point with displacement just above threshold', () => {
            const frontGrid = [[{ pull: 0.15 }]];
            expect(isInClothRegion(0, 0, frontGrid)).toBe(true);
        });
    });

    describe('classifyPoint', () => {
        const createFrontGrid = (size, pullValue = 0) => {
            const grid = [];
            for (let i = 0; i <= size; i++) {
                grid[i] = [];
                for (let j = 0; j <= size; j++) {
                    grid[i][j] = { pull: pullValue };
                }
            }
            return grid;
        };

        it('should classify center point as inside-shape for cube', () => {
            const config = { shapeType: 'cube', cubeSize: 5, selectedPointX: 10, selectedPointY: 10 };
            const frontGrid = createFrontGrid(20);
            expect(classifyPoint(10, 10, 0, frontGrid, config)).toBe('inside-shape');
        });

        it('should classify edge point as shape-shell for cube', () => {
            const config = { shapeType: 'cube', cubeSize: 5, selectedPointX: 10, selectedPointY: 10 };
            const frontGrid = createFrontGrid(20);
            expect(classifyPoint(14, 10, 0, frontGrid, config)).toBe('shape-shell');
        });

        it('should classify outside point as cloth for cube', () => {
            const config = { shapeType: 'cube', cubeSize: 5, selectedPointX: 10, selectedPointY: 10 };
            const frontGrid = createFrontGrid(20);
            expect(classifyPoint(16, 10, 0, frontGrid, config)).toBe('cloth');
        });

        it('should classify center point as inside-shape for sphere', () => {
            const config = { shapeType: 'sphere', cubeSize: 5, selectedPointX: 10, selectedPointY: 10 };
            const frontGrid = createFrontGrid(20);
            expect(classifyPoint(10, 10, 0, frontGrid, config)).toBe('inside-shape');
        });

        it('should classify surface point as shape-shell for sphere', () => {
            const config = { shapeType: 'sphere', cubeSize: 5, selectedPointX: 10, selectedPointY: 10 };
            const frontGrid = createFrontGrid(20);
            expect(classifyPoint(14, 10, 0, frontGrid, config)).toBe('shape-shell');
        });

        it('should classify outside point as cloth for sphere', () => {
            const config = { shapeType: 'sphere', cubeSize: 5, selectedPointX: 10, selectedPointY: 10 };
            const frontGrid = createFrontGrid(20);
            expect(classifyPoint(16, 10, 0, frontGrid, config)).toBe('cloth');
        });
    });
});
