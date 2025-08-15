// Simulate payment gateway processing
async function processPaymentWithGateway(paymentData) {
  // Simulate processing delay
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Simulate 90% success rate
  const isSuccess = Math.random() > 0.1;

  if (isSuccess) {
    return {
      success: true,
      transactionId: `txn_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`,
      gatewayTransactionId: `gw_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`,
    };
  } else {
    return {
      success: false,
      error: "Payment declined by bank",
    };
  }
}

// Simulate refund processing
async function processRefundWithGateway(paymentData, refundAmount) {
  // Simulate processing delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Simulate 95% success rate for refunds
  const isSuccess = Math.random() > 0.05;

  if (isSuccess) {
    return {
      success: true,
      refundId: `ref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
  } else {
    return {
      success: false,
      error: "Refund processing failed",
    };
  }
}

// Validate payment details
function validatePaymentDetails(paymentMethod, paymentDetails) {
  if (!paymentDetails) {
    return { valid: false, error: "Payment details are required" };
  }

  switch (paymentMethod) {
    case "credit_card":
    case "debit_card":
      if (
        !paymentDetails.cardNumber ||
        !paymentDetails.cardHolderName ||
        !paymentDetails.expiryMonth ||
        !paymentDetails.expiryYear
      ) {
        return { valid: false, error: "Card details are incomplete" };
      }
      break;
    case "paypal":
      if (!paymentDetails.email) {
        return { valid: false, error: "PayPal email is required" };
      }
      break;
    case "bank_transfer":
      if (!paymentDetails.accountNumber || !paymentDetails.routingNumber) {
        return { valid: false, error: "Bank account details are incomplete" };
      }
      break;
  }

  return { valid: true };
}

// Mask sensitive payment details
function maskPaymentDetails(paymentMethod, paymentDetails) {
  if (!paymentDetails) return {};

  const masked = { ...paymentDetails };

  switch (paymentMethod) {
    case "credit_card":
    case "debit_card":
      if (masked.cardNumber) {
        masked.cardNumber = `****${masked.cardNumber.slice(-4)}`;
      }
      break;
    case "bank_transfer":
      if (masked.accountNumber) {
        masked.accountNumber = `****${masked.accountNumber.slice(-4)}`;
      }
      break;
  }

  return masked;
}

module.exports = {
  processPaymentWithGateway,
  processRefundWithGateway,
  validatePaymentDetails,
  maskPaymentDetails,
};
