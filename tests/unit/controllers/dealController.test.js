const dealController = require('../../../src/controllers/dealController');
const Deal = require('../../../src/models/Deal');

// Mock the Deal model
jest.mock('../../../src/models/Deal');

describe('Deal Controller Unit Tests', () => {
    let req, res;

    beforeEach(() => {
        req = {
            body: {},
            params: {},
            user: { _id: 'seller123' }
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        jest.clearAllMocks();
    });

    describe('createDeal', () => {
        it('should create a deal successfully', async () => {
            req.body = {
                crop: 'Wheat',
                buyerId: 'buyer123',
                originalPrice: 100,
                quantityKg: 50
            };

            const mockDeal = { _id: 'deal123', ...req.body };
            Deal.create.mockResolvedValue(mockDeal);

            await dealController.createDeal(req, res);

            expect(Deal.create).toHaveBeenCalledWith(expect.objectContaining({
                crop: 'Wheat',
                buyer: 'buyer123',
                seller: 'seller123',
                originalPrice: 100,
                status: 'PENDING'
            }));
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({ success: true, deal: mockDeal });
        });

        it('should return 400 if fields are missing', async () => {
            req.body = { crop: 'Wheat' }; // Missing other fields

            await dealController.createDeal(req, res);

            expect(Deal.create).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: "All fields are required" });
        });
    });

    describe('makeOffer', () => {
        it('should make an offer successfully', async () => {
            req.params.id = 'deal123';
            req.body.price = 90;
            req.user._id = 'buyer123';

            const mockDeal = {
                _id: 'deal123',
                status: 'PENDING',
                history: [],
                save: jest.fn().mockResolvedValue(true)
            };
            Deal.findById.mockResolvedValue(mockDeal);

            await dealController.makeOffer(req, res);

            expect(mockDeal.currentOffer).toBe(90);
            expect(mockDeal.lastOfferBy).toBe('buyer123');
            expect(mockDeal.history).toHaveLength(1);
            expect(mockDeal.save).toHaveBeenCalled();
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, message: "Offer sent" }));
        });

        it('should return 404 if deal not found', async () => {
            req.params.id = 'invalidId';
            Deal.findById.mockResolvedValue(null);

            await dealController.makeOffer(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ message: "Deal not found" });
        });

        it('should return 400 if deal is not pending', async () => {
            req.params.id = 'deal123';
            const mockDeal = { status: 'ACCEPTED' };
            Deal.findById.mockResolvedValue(mockDeal);

            await dealController.makeOffer(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: "Cannot offer on a ACCEPTED deal" });
        });
    });

    describe('acceptOffer', () => {
        it('should accept offer successfully', async () => {
            req.params.id = 'deal123';
            req.user._id = 'seller123';

            const mockDeal = {
                _id: 'deal123',
                status: 'PENDING',
                lastOfferBy: 'buyer123', // Offer made by OTHER party
                expiresAt: Date.now() + 10000,
                save: jest.fn().mockResolvedValue(true)
            };
            Deal.findById.mockResolvedValue(mockDeal);

            await dealController.acceptOffer(req, res);

            expect(mockDeal.status).toBe('ACCEPTED');
            expect(mockDeal.save).toHaveBeenCalled();
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, message: "Deal Accepted!" }));
        });

        it('should prevent accepting own offer', async () => {
            req.params.id = 'deal123';
            req.user._id = 'seller123';

            const mockDeal = {
                _id: 'deal123',
                status: 'PENDING',
                lastOfferBy: 'seller123', // Offer made by SELF
                expiresAt: Date.now() + 10000,
                toString: () => 'deal123'
            };
            Deal.findById.mockResolvedValue(mockDeal);

            await dealController.acceptOffer(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: "You cannot accept your own offer. Wait for the other party." });
        });
    });
});
