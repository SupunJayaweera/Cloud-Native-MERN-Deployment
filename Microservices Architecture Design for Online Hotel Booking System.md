
# Microservices Architecture Design for Online Hotel Booking System

## 1. Core Services Identification

An online hotel booking system typically involves several key functionalities that can be naturally separated into distinct microservices. Based on the project requirements and common patterns in such systems, the following core services are identified:

### 1.1. User Service

**Responsibility:** Manages user authentication, authorization, and profile information. This includes user registration, login, password management, and storing user-specific details.

**Data Model (Conceptual):**
- User ID (Primary Key)
- Username
- Email
- Password Hash
- First Name
- Last Name
- Contact Information
- Roles (e.g., Guest, Admin)

### 1.2. Hotel Service

**Responsibility:** Manages hotel properties, room types, availability, and pricing. This service will handle CRUD operations for hotels and their associated rooms.

**Data Model (Conceptual):**
- Hotel ID (Primary Key)
- Hotel Name
- Address
- City
- Country
- Description
- Amenities
- Contact Information

### 1.3. Room Service

**Responsibility:** Manages individual room details, including room numbers, types, capacity, and current status (available, booked, under maintenance). This service is closely related to the Hotel Service but can be separated for better scalability and management of room-specific attributes.

**Data Model (Conceptual):**
- Room ID (Primary Key)
- Hotel ID (Foreign Key to Hotel Service)
- Room Number
- Room Type (e.g., Single, Double, Suite)
- Capacity
- Price per Night
- Availability Status
- Description

### 1.4. Booking Service

**Responsibility:** Handles the core booking logic, including creating, modifying, and canceling reservations. This service will interact with the Room Service to check availability and the Payment Service to process transactions.

**Data Model (Conceptual):**
- Booking ID (Primary Key)
- User ID (Foreign Key to User Service)
- Room ID (Foreign Key to Room Service)
- Check-in Date
- Check-out Date
- Number of Guests
- Total Price
- Booking Status (e.g., Pending, Confirmed, Cancelled)
- Payment ID (Foreign Key to Payment Service)

### 1.5. Payment Service

**Responsibility:** Manages all payment-related operations, including processing payments, handling refunds, and managing payment methods. This service will integrate with external payment gateways.

**Data Model (Conceptual):**
- Payment ID (Primary Key)
- Booking ID (Foreign Key to Booking Service)
- User ID (Foreign Key to User Service)
- Amount
- Currency
- Payment Method
- Transaction ID (from Payment Gateway)
- Payment Status (e.g., Initiated, Completed, Failed, Refunded)
- Timestamp

### 1.6. Notification Service

**Responsibility:** Sends notifications to users via email, SMS, or other channels for booking confirmations, cancellations, payment updates, and other relevant events.

**Data Model (Conceptual):**
- Notification ID (Primary Key)
- User ID (Foreign Key to User Service)
- Type (e.g., Email, SMS)
- Content
- Timestamp
- Status (e.g., Sent, Failed)

These services will communicate with each other primarily through asynchronous messaging using an Event-Driven Architecture (EDA) and Saga pattern for complex, distributed transactions.



## 2. Event-Driven Architecture (EDA) and Communication Methods

To ensure scalability, resilience, and loose coupling between services, an Event-Driven Architecture (EDA) will be adopted. Services will communicate primarily through asynchronous messaging, publishing events when significant state changes occur and subscribing to events relevant to their operations. A message broker will facilitate this communication.

### 2.1. Message Broker

A robust message broker, such as Apache Kafka or RabbitMQ, will be used as the central nervous system for inter-service communication. It will enable:

*   **Asynchronous Communication:** Services can publish events without waiting for an immediate response, improving responsiveness and throughput.
*   **Decoupling:** Services do not need direct knowledge of each other, reducing dependencies and making the system more flexible to changes.
*   **Scalability:** The message broker can handle high volumes of events, and services can scale independently based on their load.
*   **Resilience:** Events can be persisted, allowing services to recover from failures and process events once they are back online.

### 2.2. Communication Flow Examples

#### 2.2.1. Synchronous Communication (REST/HTTP)

While asynchronous communication is preferred for most inter-service interactions, some scenarios might require synchronous communication, typically for direct queries or requests where an immediate response is necessary. For instance:

*   **Frontend to Backend API Gateway:** The React-Vite frontend will communicate with a central API Gateway (not explicitly listed as a separate service but implied as an entry point) using RESTful HTTP requests.
*   **User Service for Authentication:** When a user logs in, the API Gateway might synchronously call the User Service to authenticate credentials.

#### 2.2.2. Asynchronous Communication (Events)

Most inter-service communication will be event-driven. Services will publish events to specific topics or queues in the message broker, and other interested services will consume these events.

**Example Events:**

*   `UserCreated`: Published by User Service when a new user registers.
*   `HotelAdded`: Published by Hotel Service when a new hotel is listed.\n*   `RoomAvailabilityUpdated`: Published by Room Service when a room's availability changes.
*   `BookingInitiated`: Published by Booking Service when a user attempts to make a reservation.
*   `PaymentProcessed`: Published by Payment Service after a payment attempt.
*   `PaymentFailed`: Published by Payment Service if a payment fails.
*   `BookingConfirmed`: Published by Booking Service when a reservation is successfully confirmed.
*   `BookingCancelled`: Published by Booking Service when a reservation is cancelled.

## 3. Saga EDA Pattern for Distributed Transactions

Complex business processes, such as booking a hotel room, involve multiple services and require atomicity across these services. Since traditional two-phase commits are not suitable for distributed microservices environments, the Saga pattern will be employed to manage distributed transactions and ensure data consistency.

### 3.1. Saga Orchestration

For the online hotel booking system, an **Orchestration-based Saga** will be implemented. A dedicated **Saga Orchestrator** (which can be part of the Booking Service or a separate lightweight service) will be responsible for coordinating the steps of a distributed transaction. It will send commands to participant services and react to events published by them, deciding the next step or initiating compensating transactions in case of failures.

### 3.2. Booking Process Saga Example

Let's illustrate the Saga pattern with the `Create Booking` process:

**Scenario:** A user attempts to book a room.

**Participants:** Booking Service (Orchestrator), Room Service, Payment Service, Notification Service.

**Steps:**

1.  **Booking Service (Orchestrator) receives `CreateBooking` request:**
    *   It first sends a command/event to the **Room Service** to `ReserveRoom`.

2.  **Room Service receives `ReserveRoom` command:**
    *   It checks room availability.
    *   If available, it marks the room as temporarily reserved and publishes `RoomReserved` event.
    *   If not available, it publishes `RoomReservationFailed` event.

3.  **Booking Service (Orchestrator) receives `RoomReserved` event:**
    *   It then sends a command/event to the **Payment Service** to `ProcessPayment`.

4.  **Payment Service receives `ProcessPayment` command:**
    *   It attempts to process the payment with the external payment gateway.
    *   If successful, it records the payment and publishes `PaymentProcessed` event.
    *   If failed, it publishes `PaymentFailed` event.

5.  **Booking Service (Orchestrator) receives `PaymentProcessed` event:**
    *   It confirms the booking, updates the booking status to `Confirmed`, and publishes `BookingConfirmed` event.
    *   It then sends a command/event to the **Notification Service** to `SendBookingConfirmation`.

6.  **Notification Service receives `SendBookingConfirmation` command:**
    *   It sends a confirmation email/SMS to the user.
    *   Publishes `BookingConfirmationSent` event.

**Compensating Transactions (Rollback Scenario):**

If any step in the Saga fails, the Orchestrator initiates compensating transactions to undo the changes made by previously completed steps.

*   **If `RoomReservationFailed` is received:**
    *   Booking Service (Orchestrator) updates booking status to `Failed`.
    *   Sends `BookingFailedNotification` to Notification Service.

*   **If `PaymentFailed` is received:**
    *   Booking Service (Orchestrator) updates booking status to `Failed`.
    *   Sends a command/event to **Room Service** to `ReleaseRoomReservation` (compensating transaction).
    *   Sends `BookingFailedNotification` to Notification Service.

This orchestration ensures that even in a distributed environment, the booking process maintains data consistency and atomicity, handling both successful paths and failure scenarios gracefully. The state of the Saga can be persisted in the Booking Service's database to ensure recovery from orchestrator failures.

