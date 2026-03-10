const { Given, When, Then, Before } = require('@cucumber/cucumber');
const request = require('supertest');

let expect;

Before(async function () {
    const chai = await import('chai');
    expect = chai.expect;
});

let inventory = [];

Given('a farmer is logged in', function () {
    // Simulate login
    this.user = { role: 'farmer', name: 'Test Farmer' };
});

When('the farmer adds {string} with quantity {int} kg and price {int}', function (crop, qty, price) {
    // Simulate adding to inventory
    const item = { crop, qty, price, farmer: this.user.name };
    inventory.push(item);
    this.lastAdded = item;
});

Then('the inventory should contain {string} with {int} kg', function (crop, qty) {
    const item = inventory.find(i => i.crop === crop && i.qty === qty);
    expect(item).to.not.be.undefined;
    expect(item.crop).to.equal(crop);
    expect(item.qty).to.equal(qty);
});
