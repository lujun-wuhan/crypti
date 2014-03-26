class Block {

   var version; // int
   var timestamp; // int
   var previousBlockId; // Long
   var generatorPublicKey; // byte[]
   var previousBlockHash; // byte[]
   var totalAmount; // int
   var totalFee; // int
   var payloadLength; // int
   var generationSignature; // byte[]
   var payloadHash; // byte[]
   var transactionIds; // List<Long>
   var blockTransactions; // List<TransactionImpl>

   var blockSignature; // byte[]
   var cumulativeDifficulty = BigInteger.ZERO; // BigInteger
   var baseTarget = Constants.INITIAL_BASE_TARGET; // long
   var nextBlockId; // volatile Long
   var height = -1; // int
   var id; // volatile Long
   var stringId = null; // volatile String
   var generatorId; // volatile Long

    /**
     * throws NxtException.ValidationException
     * @param version
     * @param timestamp
     * @param previousBlockId
     * @param totalAmount
     * @param totalFee
     * @param payloadLength
     * @param payloadHash
     * @param generatorPublicKey
     * @param generationSignature
     * @param blockSignature
     * @param previousBlockHash
     * @param transactions
     * @constructor
     */
    function Block(version, timestamp, previousBlockId, totalAmount,  totalFee,  payloadLength, payloadHash,
        generatorPublicKey, generationSignature, blockSignature, previousBlockHash, transactions)
    {

        if (transactions.size() > Constants.MAX_NUMBER_OF_TRANSACTIONS) {
            throw new Error("attempted to create a block with " + transactions.size() + " transactions");
        }

        if (payloadLength > Constants.MAX_PAYLOAD_LENGTH || payloadLength < 0) {
            throw new Error("attempted to create a block with payloadLength " + payloadLength);
        }

        this.version = version;
        this.timestamp = timestamp;
        this.previousBlockId = previousBlockId;
        this.totalAmount = totalAmount;
        this.totalFee = totalFee;
        this.payloadLength = payloadLength;
        this.payloadHash = payloadHash;
        this.generatorPublicKey = generatorPublicKey;
        this.generationSignature = generationSignature;
        this.blockSignature = blockSignature;

        this.previousBlockHash = previousBlockHash;
        this.blockTransactions = Collections.unmodifiableList(transactions);
        var transactionIds = new Array(this.blockTransactions.size());
        var previousId = Long.MIN_VALUE;
        for (var transaction in this.blockTransactions) {
            if (transaction.getId() < previousId) {
                throw new Error("Block transactions are not sorted!");
            }
            transactionIds.add(transaction.getId());
            previousId = transaction.getId();
        }
        this.transactionIds = Collections.unmodifiableList(transactionIds);

    }

    /**
     * throws NxtException.ValidationException
     * @param version
     * @param timestamp
     * @param previousBlockId
     * @param totalAmount
     * @param totalFee
     * @param payloadLength
     * @param payloadHash
     * @param generatorPublicKey
     * @param generationSignature
     * @param blockSignature
     * @param previousBlockHash
     * @param transactions
     * @param cumulativeDifficulty
     * @param baseTarget
     * @param nextBlockId
     * @param height
     * @param id
     * @constructor
     */
    function Block(version, timestamp, previousBlockId, totalAmount, totalFee, payloadLength, payloadHash,
        generatorPublicKey, generationSignature, blockSignature, previousBlockHash, transactions,
        cumulativeDifficulty, baseTarget, nextBlockId, height, id)
    {
        this(version, timestamp, previousBlockId, totalAmount, totalFee, payloadLength, payloadHash,
            generatorPublicKey, generationSignature, blockSignature, previousBlockHash, transactions);
        this.cumulativeDifficulty = cumulativeDifficulty;
        this.baseTarget = baseTarget;
        this.nextBlockId = nextBlockId;
        this.height = height;
        this.id = id;
    }

    function getVersion()
    {
        return version;
    }

    function getTimestamp() {
        return timestamp;
    }

    function getPreviousBlockId() {
        return previousBlockId;
    }

    function getGeneratorPublicKey() {
        return generatorPublicKey;
    }

    function getPreviousBlockHash() {
        return previousBlockHash;
    }

    function getTotalAmount() {
        return totalAmount;
    }

    function getTotalFee() {
        return totalFee;
    }

    function getPayloadLength() {
        return payloadLength;
    }

    function getTransactionIds() {
        return transactionIds;
    }

    function getPayloadHash() {
        return payloadHash;
    }

    function getGenerationSignature() {
        return generationSignature;
    }

    function getBlockSignature() {
        return blockSignature;
    }

    function getTransactions() {
        return blockTransactions;
    }

    function getBaseTarget() {
        return baseTarget;
    }

    function getCumulativeDifficulty() {
        return cumulativeDifficulty;
    }

    function getNextBlockId() {
        return nextBlockId;
    }

    function getHeight() {
        if (height == -1) {
            throw new Error("Block height not yet set");
        }
        return height;
    }

    function getId() {
        if (id == null) {
            if (blockSignature == null) {
                throw new Error("Block is not signed yet");
            }
            var hash = Crypto.sha256().digest(getBytes());
            var bigInteger = new BigInteger(1, new Array( hash[7], hash[6], hash[5], hash[4], hash[3], hash[2], hash[1], hash[0]));
            id = bigInteger.longValue();
            stringId = bigInteger.toString();
        }
        return id;
    }

    function getStringId() {
        if (stringId == null) {
            getId();
            if (stringId == null) {
                stringId = Convert.toUnsignedLong(id);
            }
        }
        return stringId;
    }

    function getGeneratorId() {
        if (generatorId == null) {
            generatorId = Account.getId(generatorPublicKey);
        }
        return generatorId;
    }

    function equals(o) {
        return o instanceof Block && this.getId().equals((o).getId());
    }

    function hashCode() {
        return getId().hashCode();
    }

    function getBytes() {

        var buffer = ByteBuffer.allocate(124); // 4 + 4 + 8 + 4 + 4 + 4 + 4 + 32 + 32 + (32 + 32) + 64
        buffer.order(ByteOrder.LITTLE_ENDIAN);
        buffer.putInt(version);
        buffer.putInt(timestamp);
        buffer.putLong(Convert.nullToZero(previousBlockId));
        buffer.putInt(blockTransactions.size());
        buffer.putInt(totalAmount);
        buffer.putInt(totalFee);
        buffer.putInt(payloadLength);
        buffer.put(payloadHash);
        buffer.put(generatorPublicKey);
        buffer.put(generationSignature);
        if (version > 1) {
            buffer.put(previousBlockHash);
        }
        buffer.put(blockSignature);
        return buffer.array();
    }

    function getJSONObject()
    {
        var transactionsData;
        for (var transaction in this.blockTransactions) {
            transactionsData.add(transaction.getJSONObject());
        }

        return {
            "version": version,
            "timestamp": timestamp,
            "previousBlock": Convert.toUnsignedLong(previousBlockId),
            "numberOfTransactions": blockTransactions.size(),
            "totalAmount": totalAmount,
            "totalFee": totalFee,
            "payloadLength": payloadLength,
            "payloadHash": Convert.toHexString(payloadHash),
            "generatorPublicKey": Convert.toHexString(generatorPublicKey),
            "generationSignature": Convert.toHexString(generationSignature),
            "previousBlockHash": (version > 1 ? Convert.toHexString(previousBlockHash) : ""),
            "blockSignature": Convert.toHexString(blockSignature),
            "transactions": transactionsData
        };
    }

    function sign(secretPhrase) {
        if (blockSignature != null) {
            throw new Error("Block already signed");
        }
        blockSignature = new array(64);
        var data = getBytes();
        var data2 = new byte[data.length - 64];
        System.arraycopy(data, 0, data2, 0, data2.length);
        blockSignature = Crypto.sign(data2, secretPhrase);
    }

    function verifyBlockSignature() {

        var account = Account.getAccount(getGeneratorId());
        if (account == null) {
            return false;
        }

        var data = getBytes();
        var data2 = new byte[data.length - 64];
        System.arraycopy(data, 0, data2, 0, data2.length);

        return Crypto.verify(blockSignature, data2, generatorPublicKey) && account.setOrVerify(generatorPublicKey, this.height);

    }
    /**
     * throws BlockchainProcessor.BlockOutOfOrderException
     * @returns {boolean}
     */
    function verifyGenerationSignature() {

        try {

            var previousBlock = Nxt.getBlockchain().getBlock(this.previousBlockId);
            if (previousBlock == null) {
                throw new Error("Can't verify signature because previous block is missing");
            }

            if (version == 1 && !Crypto.verify(generationSignature, previousBlock.generationSignature, generatorPublicKey)) {
                return false;
            }

            var account = Account.getAccount(getGeneratorId());
            var effectiveBalance = account == null ? 0 : account.getEffectiveBalance();
            if (effectiveBalance <= 0) {
                return false;
            }

            var elapsedTime = timestamp - previousBlock.timestamp;
            var target = BigInteger.valueOf(Nxt.getBlockchain().getLastBlock().getBaseTarget())
                .multiply(BigInteger.valueOf(effectiveBalance))
                .multiply(BigInteger.valueOf(elapsedTime));

            var digest = Crypto.sha256();
            var generationSignatureHash;
            if (version == 1) {
                generationSignatureHash = digest.digest(generationSignature);
            } else {
                digest.update(previousBlock.generationSignature);
                generationSignatureHash = digest.digest(generatorPublicKey);
                if (!Arrays.equals(generationSignature, generationSignatureHash)) {
                    return false;
                }
            }

            var hit = new BigInteger(1, new array(generationSignatureHash[7], generationSignatureHash[6], generationSignatureHash[5], generationSignatureHash[4], generationSignatureHash[3], generationSignatureHash[2], generationSignatureHash[1], generationSignatureHash[0]));

            return hit.compareTo(target) < 0;

        } catch (e) {

            Logger.logMessage("Error verifying block generation signature", e);
            return false;

        }

    }

    function apply() {
        var generatorAccount = Account.addOrGetAccount(getGeneratorId());
        generatorAccount.apply(generatorPublicKey, this.height);
        generatorAccount.addToBalanceAndUnconfirmedBalance(totalFee * 100);
    }

    function undo() {
        var generatorAccount = Account.getAccount(getGeneratorId());
        generatorAccount.undo(getHeight());
        generatorAccount.addToBalanceAndUnconfirmedBalance(-totalFee * 100);
    }

    function setPrevious(previousBlock) {
        if (previousBlock != null) {
            if (! previousBlock.getId().equals(getPreviousBlockId())) {
                // shouldn't happen as previous id is already verified, but just in case
                throw new Error("Previous block id doesn't match");
            }
            this.height = previousBlock.getHeight() + 1;
            this.calculateBaseTarget(previousBlock);
        } else {
            this.height = 0;
        }
        for (var transaction in blockTransactions) {
            transaction.setBlock(this);
        }
    }

    function calculateBaseTarget(previousBlock) {

        if (this.getId().equals(Genesis.GENESIS_BLOCK_ID) && previousBlockId == null) {
            baseTarget = Constants.INITIAL_BASE_TARGET;
            cumulativeDifficulty = BigInteger.ZERO;
        } else {
            var curBaseTarget = previousBlock.baseTarget;
            var newBaseTarget = BigInteger.valueOf(curBaseTarget)
                .multiply(BigInteger.valueOf(this.timestamp - previousBlock.timestamp))
                .divide(BigInteger.valueOf(60)).longValue();
            if (newBaseTarget < 0 || newBaseTarget > Constants.MAX_BASE_TARGET) {
                newBaseTarget = Constants.MAX_BASE_TARGET;
            }
            if (newBaseTarget < curBaseTarget / 2) {
                newBaseTarget = curBaseTarget / 2;
            }
            if (newBaseTarget == 0) {
                newBaseTarget = 1;
            }
            var twofoldCurBaseTarget = curBaseTarget * 2;
            if (twofoldCurBaseTarget < 0) {
                twofoldCurBaseTarget = Constants.MAX_BASE_TARGET;
            }
            if (newBaseTarget > twofoldCurBaseTarget) {
                newBaseTarget = twofoldCurBaseTarget;
            }
            baseTarget = newBaseTarget;
            cumulativeDifficulty = previousBlock.cumulativeDifficulty.add(Convert.two64.divide(BigInteger.valueOf(baseTarget)));
        }
    }

}