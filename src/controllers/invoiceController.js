const PDFDocument = require("pdfkit");
const Deal = require("../models/Deal");
const path = require("path");
const fs = require("fs");

exports.generateInvoice = async (req, res) => {
    try {
        const { dealId } = req.params;
        const deal = await Deal.findById(dealId)
            .populate("buyer", "name phone role")
            .populate("seller", "name phone role");

        if (!deal) {
            return res.status(404).json({ message: "Deal not found" });
        }

        if (deal.status !== "ACCEPTED") {
            return res.status(400).json({ message: "Invoice can only be generated for accepted deals" });
        }

        const doc = new PDFDocument({ margin: 50 });

        // Set response headers
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename=invoice-${dealId}.pdf`);

        doc.pipe(res);

        // Header
        doc.fillColor("#444444")
            .fontSize(20)
            .text("DIGITAL MARKETPLACE", 110, 57)
            .fontSize(10)
            .text("Transaction Invoice", 200, 65, { align: "right" })
            .moveDown();

        // Line
        doc.strokeColor("#aaaaaa")
            .lineWidth(1)
            .moveTo(50, 90)
            .lineTo(550, 90)
            .stroke();

        // Deal Info
        doc.fontSize(12)
            .text(`Invoice Number: INV-${dealId.substring(0, 8).toUpperCase()}`, 50, 110)
            .text(`Date: ${new Date().toLocaleDateString()}`, 50, 125)
            .text(`Status: ${deal.status}`, 50, 140)
            .moveDown();

        // Parties
        doc.text("Seller Information:", 50, 170)
            .fontSize(10)
            .text(`Name: ${deal.seller.name}`, 50, 185)
            .text(`Phone: ${deal.seller.phone}`, 50, 200)
            .moveDown();

        doc.fontSize(12)
            .text("Buyer Information:", 300, 170)
            .fontSize(10)
            .text(`Name: ${deal.buyer.name}`, 300, 185)
            .text(`Phone: ${deal.buyer.phone}`, 300, 200)
            .moveDown();

        // Transaction Table Header
        const tableTop = 250;
        doc.fontSize(10)
            .text("Crop", 50, tableTop)
            .text("Quantity (Kg)", 150, tableTop)
            .text("Unit Price (INR)", 250, tableTop)
            .text("Total Price (INR)", 350, tableTop);

        doc.moveTo(50, tableTop + 15)
            .lineTo(550, tableTop + 15)
            .stroke();

        // Transaction Table Row
        const rowTop = tableTop + 30;
        doc.text(deal.crop, 50, rowTop)
            .text(deal.quantityKg.toString(), 150, rowTop)
            .text(deal.currentOffer.toString(), 250, rowTop)
            .text((deal.quantityKg * deal.currentOffer).toString(), 350, rowTop);

        // Footer
        doc.fontSize(10)
            .text("Thank you for using Digital Marketplace.", 50, 500, { align: "center", width: 500 });

        doc.end();

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
