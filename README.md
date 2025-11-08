#SIGN_SPEAK
# 🧏‍♀️ SignSpeak - Real-Time Sign Language to Text & Speech

SignSpeak is a web-based application that allows users to translate **sign language gestures into text and speech in real-time** using a webcam.  
The goal of this project is to help bridge communication between **deaf / hard-of-hearing individuals** and non-signers.

---

## ✨ Features

-  **Real-time camera-based hand tracking**
-  Detects basic **sign language alphabet and common words**
-  Converts recognized gestures into **text**
- Text-to-Speech output with **voice & speed controls**
-  User **Login / Register / Profile**
- **Translation History** saved for each user
-  Works on **desktop and mobile browsers**

---

## 🛠️ Tech Stack

| Section | Technologies Used |
|--------|-------------------|
| Frontend | HTML, CSS, JavaScript |
| Hand Detection | TensorFlow.js Handpose / MediaPipe Hands |
| Backend | Node.js, Express |
| Database | MongoDB + Mongoose |
| Authentication | JSON Web Token (JWT) |

---

## 📂 Folder Structure

project/
│
├── app.js # Server entry
├── routes.js # API routes
├── api.js # Backend logic controller
├── mongoSchema.js # User & history database schema
│
├── public/
│ ├── index.html
│ ├── script.js # Main frontend logic + camera processing
│ └── style.css
│
└── README.md

---

## ⚙️ Installation & Setup

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/SignSpeak.git
cd SignSpeak

**WEBSITE LINK**
https://signspeak4.netlify.app/

