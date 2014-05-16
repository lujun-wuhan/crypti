var transaction = require("./transactions.js"),
    epochTime = require('../utils.js').getEpochTime,
    accountprocessor = require("../account").accountprocessor,
    bignum = require('bignum');

var transactionprocessor = function () {
    this.transactions = {};
    this.unconfirmedTransactions = {};
    this.doubleSpendingTransactions = {};
}

transactionprocessor.prototype.setApp = function (app) {
    this.app = app;
    this.logger = app.logger;
    this.accountprocessor = app.accountprocessor;
}

transactionprocessor.prototype.getTransaction = function (id) {
    return this.transactions[id];
}

transactionprocessor.prototype.getUnconfirmedTransaction = function (id) {
    return this.unconfirmedTransactions[id];
}

transactionprocessor.prototype.processTransaction = function (transaction) {
    this.logger.info("Process transaction: " + transaction.getId());

    var currentTime = epochTime(new Date().getTime());
    if (transaction.timestamp > currentTime || transaction.deadline < 1 || transaction.timestamp + transaction.deadline < currentTime || transaction.fee <= 0) {
        return false;
    }

    var id = transaction.getId();
    if (this.transactions[id] || this.unconfirmedTransactions[id] || this.doubleSpendingTransactions[id] || !transaction.verify()) {
        return false;
    }

    var isDoubleSpending = false;
    var a = this.accountprocessor.getAccountByPublicKey(transaction.senderPublicKey);

    if (!a) {
        isDoubleSpending = true;
    } else {
        var amount = transaction.amount + transaction.fee;

        if (amount.unconfirmedBalance < amount) {
            isDoubleSpending = true;
        } else {
            a.setUnconfirmedBalance(a.unconfirmedBalance - amount);
        }


    }

    // add index

    if (isDoubleSpending) {
        this.doubleSpendingTransactions[id] = transaction;
    } else {
        this.unconfirmedTransactions[id] = transaction;
    }

    var msg = "";

    if (isDoubleSpending) {
        this.logger.info("Double spending transaction processed: " + transaction.getId());
    } else {
        this.logger.info("Transaction processed: " + transaction.getId());
    }

    // send to users
}

transactionprocessor.prototype.addTransaction = function (t) {
    if (this.transactions[t.getId()]) {
        return false;
    } else {
        this.transactions[t.getId()] = t;
        return true;
    }
}

transactionprocessor.prototype.removeUnconfirmedTransaction = function (t) {
    if (this.unconfirmedTransactions[t.getId()]) {
        delete this.unconfirmedTransactions[t.getId()];
        return true;
    } else {
        return false;
    }
}

transactionprocessor.prototype.transactionFromBuffer = function (bb) {
    var t = new transaction();
    t.type = bb.readByte();
    t.subtype = bb.readByte();
    t.timestamp = bb.readInt();
    t.deadline = bb.readShort();

    var buffer = new Buffer(32);
    for (var i = 0; i < 32; i++) {
        buffer[i] = bb.readByte();
    }

    t.senderPublicKey = buffer;

    var recepientBuffer = new Buffer(8);

    for (var i = 0; i < 8; i++) {
        recepientBuffer[i] = bb.readByte();
    }

    var recepient = bignum.fromBuffer(recepientBuffer).toString();
    t.recipientId = recepient + "C";
    t.amount = bb.readInt();
    t.fee = bb.readInt();

    var referencedTransactionBuffer = new Buffer(8);

    for (var i = 0; i < 8; i++) {
        referencedTransactionBuffer[i] = bb.readByte();
    }

    t.referencedTransaction = bignum.fromBuffer(referencedTransactionBuffer).toString();

    var signature = new Buffer(64);
    for (var i = 0; i < 64; i++) {
        signature[i] = bb.readByte();
    }

    t.signature = signature;
    return t;
}

transactionprocessor.prototype.transactionFromBytes = function (bytes) {
    var bb = ByteBuffer.wrap(buffer, true);
    bb.flip();

    var t = new transaction();
    t.type = bb.readByte();
    t.subtype = bb.readByte();
    t.timestamp = bb.readInt();
    t.deadline = bb.readShort();

    var buffer = new Buffer(32);
    for (var i = 0; i < 32; i++) {
        buffer[i] = bb.readByte();
    }

    t.senderPublicKey = buffer;

    var recepientBuffer = new Buffer(8);

    for (var i = 0; i < 8; i++) {
        recepientBuffer[i] = bb.readByte();
    }

    var recepient = bignum.fromBuffer(recepientBuffer).toString();
    t.recipientId = recepient + "C";
    t.amount = bb.readInt();
    t.fee = bb.readInt();

    var referencedTransactionBuffer = new Buffer(8);

    for (var i = 0; i < 8; i++) {
        referencedTransactionBuffer[i] = bb.readByte();
    }

    t.referencedTransaction = bignum.fromBuffer(referencedTransactionBuffer).toString();

    var signature = new Buffer(64);
    for (var i = 0; i < 64; i++) {
        signature[i] = bb.readByte();
    }

    t.signature = signature;
    return t;
}

transactionprocessor.prototype.transactionFromJSON = function (transaction) {
    try {
        var json = JSON.parse(JSON);
        return new transaction(json.type, json.id, json.timestamp, json.senderPublicKey, json.recipientId, json.amount, json.deadline, json.fee, json.referencedTransaction, json.signature);
    } catch (e) {
        return null;
    }
}

var tp = null;

module.exports.init = function () {
    tp = new transactionprocessor();
    return tp;
}

module.exports.getInstance = function () {
    return tp;
}