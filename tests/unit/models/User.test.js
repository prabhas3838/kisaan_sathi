const User = require('../../../src/models/User');
const bcrypt = require('bcryptjs');

// Mock bcrypt
jest.mock('bcryptjs');

describe('User Model Unit Tests', () => {
    describe('matchPassword', () => {
        it('should return true if passwords match', async () => {
            bcrypt.compare.mockResolvedValue(true);
            const user = new User({ password: 'hashedPassword' });
            // By default, Mongoose models need a connection, but for unit testing methods 
            // that don't satisfy DB constraints, we can sometimes instantiate them dry.
            // However, methods are on the prototype.

            const isMatch = await user.matchPassword('password123');
            expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashedPassword');
            expect(isMatch).toBe(true);
        });

        it('should return false if passwords do not match', async () => {
            bcrypt.compare.mockResolvedValue(false);
            const user = new User({ password: 'hashedPassword' });

            const isMatch = await user.matchPassword('wrongpassword');
            expect(bcrypt.compare).toHaveBeenCalledWith('wrongpassword', 'hashedPassword');
            expect(isMatch).toBe(false);
        });
    });
});
