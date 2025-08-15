// Simulate email sending
async function sendEmail(to, subject, content) {
  // Simulate email sending delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Simulate 95% success rate
  const isSuccess = Math.random() > 0.05;

  if (isSuccess) {
    console.log(`Email sent to ${to}: ${subject}`);
    return { success: true };
  } else {
    console.log(`Email failed to ${to}: ${subject}`);
    return { success: false, error: "SMTP server error" };
  }
}

// Simulate SMS sending
async function sendSMS(to, content) {
  // Simulate SMS sending delay
  await new Promise((resolve) => setTimeout(resolve, 300));

  // Simulate 90% success rate
  const isSuccess = Math.random() > 0.1;

  if (isSuccess) {
    console.log(`SMS sent to ${to}: ${content.substring(0, 50)}...`);
    return { success: true };
  } else {
    console.log(`SMS failed to ${to}`);
    return { success: false, error: "SMS gateway error" };
  }
}

// Simulate push notification sending
async function sendPushNotification(to, content) {
  // Simulate push notification delay
  await new Promise((resolve) => setTimeout(resolve, 200));

  // Simulate 85% success rate
  const isSuccess = Math.random() > 0.15;

  if (isSuccess) {
    console.log(
      `Push notification sent to ${to}: ${content.substring(0, 50)}...`
    );
    return { success: true };
  } else {
    console.log(`Push notification failed to ${to}`);
    return { success: false, error: "Push service error" };
  }
}

// Send notification based on type
async function sendNotificationByType(type, recipient, subject, content) {
  switch (type) {
    case "email":
      return await sendEmail(recipient, subject, content);
    case "sms":
      return await sendSMS(recipient, content);
    case "push":
      return await sendPushNotification(recipient, content);
    default:
      return { success: false, error: "Unknown notification type" };
  }
}

module.exports = {
  sendEmail,
  sendSMS,
  sendPushNotification,
  sendNotificationByType,
};
