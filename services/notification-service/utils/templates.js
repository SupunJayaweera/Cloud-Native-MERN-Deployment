// Email templates
const emailTemplates = {
  welcome: {
    subject: "Welcome to Hotel Booking System!",
    content:
      "<h2>Welcome {{firstName}}!</h2>" +
      "<p>Thank you for joining our hotel booking platform. We are excited to help you find the perfect accommodation for your travels.</p>" +
      "<p>You can now browse hotels, make reservations, and manage your bookings through our platform.</p>" +
      "<p>Happy travels!</p>" +
      "<p>The Hotel Booking Team</p>",
  },
  booking_confirmation: {
    subject: "Booking Confirmation - {{hotelName}}",
    content:
      "<h2>Booking Confirmed!</h2>" +
      "<p>Dear {{firstName}},</p>" +
      "<p>Your booking has been confirmed. Here are the details:</p>" +
      "<ul>" +
      "<li><strong>Booking ID:</strong> {{bookingId}}</li>" +
      "<li><strong>Hotel:</strong> {{hotelName}}</li>" +
      "<li><strong>Room:</strong> {{roomType}}</li>" +
      "<li><strong>Check-in:</strong> {{checkInDate}}</li>" +
      "<li><strong>Check-out:</strong> {{checkOutDate}}</li>" +
      "<li><strong>Total Amount:</strong> ${{totalAmount}}</li>" +
      "</ul>" +
      "<p>We look forward to hosting you!</p>" +
      "<p>The Hotel Booking Team</p>",
  },
  booking_cancellation: {
    subject: "Booking Cancellation - {{bookingId}}",
    content:
      "<h2>Booking Cancelled</h2>" +
      "<p>Dear {{firstName}},</p>" +
      "<p>Your booking (ID: {{bookingId}}) has been cancelled as requested.</p>" +
      "<p>If you paid for this booking, a refund will be processed within 3-5 business days.</p>" +
      "<p>We hope to serve you again in the future.</p>" +
      "<p>The Hotel Booking Team</p>",
  },
  payment_confirmation: {
    subject: "Payment Confirmation - {{bookingId}}",
    content:
      "<h2>Payment Received</h2>" +
      "<p>Dear {{firstName}},</p>" +
      "<p>We have successfully received your payment for booking {{bookingId}}.</p>" +
      "<p><strong>Amount Paid:</strong> ${{amount}}</p>" +
      "<p><strong>Transaction ID:</strong> {{transactionId}}</p>" +
      "<p>Your booking is now confirmed and you will receive a separate confirmation email.</p>" +
      "<p>The Hotel Booking Team</p>",
  },
  payment_failed: {
    subject: "Payment Failed - {{bookingId}}",
    content:
      "<h2>Payment Failed</h2>" +
      "<p>Dear {{firstName}},</p>" +
      "<p>Unfortunately, we were unable to process your payment for booking {{bookingId}}.</p>" +
      "<p><strong>Reason:</strong> {{reason}}</p>" +
      "<p>Please try again with a different payment method or contact your bank for assistance.</p>" +
      "<p>Your booking will be held for 24 hours to allow you to complete the payment.</p>" +
      "<p>The Hotel Booking Team</p>",
  },
};

// SMS templates
const smsTemplates = {
  booking_confirmation:
    "Booking confirmed! {{hotelName}}, Check-in: {{checkInDate}}, Booking ID: {{bookingId}}",
  payment_confirmation:
    "Payment received for booking {{bookingId}}. Amount: ${{amount}}",
  booking_cancellation:
    "Booking {{bookingId}} has been cancelled. Refund will be processed if applicable.",
};

// Replace template variables
function replaceTemplateVariables(template, data) {
  let result = template;
  for (const [key, value] of Object.entries(data)) {
    const regex = new RegExp(`{{${key}}}`, "g");
    result = result.replace(regex, value);
  }
  return result;
}

// Get template by channel and type
function getTemplate(channel, type = "email") {
  if (type === "email") {
    return emailTemplates[channel];
  } else if (type === "sms") {
    return smsTemplates[channel];
  }
  return null;
}

module.exports = {
  emailTemplates,
  smsTemplates,
  replaceTemplateVariables,
  getTemplate,
};
