# Unilorin Physio Portal & E-Voting System

A comprehensive, full-stack web application designed for the Nigerian Association of Physiotherapy Students (NAPS) at the University of Ilorin. This platform centralizes departmental resources and facilitates secure, high-integrity student elections through a custom-built digital voting infrastructure.

## 🚀 Project Overview

The Unilorin Physio Portal replaces manual administrative tasks with a streamlined digital experience. The core of this system is a robust e-voting module built from first principles, engineered to handle concurrent user operations, secure authentication, and complex data relationships while ensuring zero voter fraud or data corruption.

## 🛠️ Tech Stack

**Backend Architecture**
* Node.js & Express.js
* MongoDB & Mongoose (Database)
* Render (Cloud API Hosting)
* Custom SMTP Integration

**Frontend & UI**
* Semantic HTML5, CSS Grid, & Flexbox
* Vanilla JavaScript / React 
* Responsive Dark/Light Mode UI
* Netlify (Frontend Delivery)

## ⚙️ Key Features & Engineering Highlights

### Security & Authentication
* **Cryptographic PIN Hashing:** Secure voter login flow utilizing encrypted hashing for all student matriculation numbers and PIN credentials.
* **Strict Session Management:** Engineered secure post-logout session lockouts to prevent unauthorized device access and session hijacking.
* **Access Control:** Role-based access preventing multiple votes from a single user.

### Database Integrity
* **Automated Database Rollbacks:** Implemented transactional rollbacks in MongoDB to ensure data consistency during complex voting operations. If any step of the voting execution fails, the entire transaction reverts, preventing partial data writes or lost votes.
* **Optimized Media Handling:** Secure endpoints for processing, validating, and storing candidate image uploads seamlessly.

### System Reliability
* **Resilient Notifications:** Integrated Gmail SMTP for automated system alerts and voter confirmations, complete with custom timeout handling to prevent the server from hanging during email dispatch.
* **Concurrency Handling:** Designed the API to efficiently process simultaneous voting requests during peak election hours without bottlenecking the database.

## 💻 Local Development Setup

To run this project locally, ensure you have Node.js and MongoDB installed.

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/Khalakoh00/unilorin-physio-portal.git](https://github.com/Xhalakoh00/unilorin-physio-portal.git)
