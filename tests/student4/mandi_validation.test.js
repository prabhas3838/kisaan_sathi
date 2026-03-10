
// Simulated function to be tested
function validateMandiData(mandi) {
    if (!mandi.name || !mandi.location) return false;
    if (mandi.prices && !Array.isArray(mandi.prices)) return false;
    return true;
}

describe('Mandi Validation (Student 4)', () => {

    test('should return true for valid mandi data', () => {
        const validMandi = {
            name: 'Azadpur',
            location: 'Delhi',
            prices: [{ crop: 'Wheat', price: 20 }]
        };
        expect(validateMandiData(validMandi)).toBe(true);
    });

    test('should return false if name is missing', () => {
        const invalidMandi = {
            location: 'Delhi'
        };
        expect(validateMandiData(invalidMandi)).toBe(false);
    });

    test('should return false if prices is not an array', () => {
        const invalidMandi = {
            name: 'Azadpur',
            location: 'Delhi',
            prices: 'invalid'
        };
        expect(validateMandiData(invalidMandi)).toBe(false);
    });
});
