# 🚨 Sahaya – Unified Safety & Disaster Platform

A full-stack web application prototype designed to improve personal safety and emergency response for women, children, senior citizens, and disaster situations.

The project demonstrates a unified platform where users can register, manage emergency contacts, raise SOS alerts, and access safety-related services through a single interface.

> **Note:** This project was developed as a college project and serves as a functional prototype. Some emergency features are simulated for demonstration purposes and are not connected to real-world emergency services.

---

# Features

## User Authentication

* User Registration
* Secure Login
* JWT Authentication
* User Profile Management

## Emergency & Safety

* SOS Alert Interface
* Emergency Contact Management
* Family Member Management
* Disaster Response Dashboard
* Safety Information Portal

## Disaster Management

* Emergency Awareness Interface
* Disaster Information Dashboard
* Safety Guidelines
* Shelter Information Prototype

## User Dashboard

* Personalized Dashboard
* Profile Information
* Emergency Contact Details
* Family Member Information

---

# Tech Stack

## Frontend

* HTML5
* CSS3
* JavaScript (Vanilla)

## Backend

* Node.js
* Express.js

## Database

* MongoDB
* Mongoose

## Authentication

* JSON Web Token (JWT)
* bcrypt.js

## File Upload

* Multer

---

# Project Structure

```
Sahaya-Unified-Safety-Platform
│
├── index.html
├── dashboard.html
├── script.js
├── styles.css
├── README.md
│
├── dark-bg.jpeg
├── light-bg-pat.jpeg
├── light-logo.png
├── sahaya-logo.png
│
└── backend
    ├── server.js
    ├── package.json
    ├── models
    ├── routes
    ├── middleware
    ├── uploads
    └── .env.example
```

---

# Installation

## 1. Clone the repository

```bash
git clone https://github.com/BHAVYA-dendi/Sahaya-Unified-Safety-Platform.git
```

## 2. Navigate to backend

```bash
cd backend
```

## 3. Install dependencies

```bash
npm install
```

## 4. Configure Environment Variables

Create a `.env` file inside the backend folder.

Example:

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
```

---

## 5. Start the Backend

```bash
npm start
```

or

```bash
npm run dev
```

---

## 6. Open the Frontend

Open `index.html` in your browser

or use

```bash
npx serve .
```

---

# API Modules

* Authentication
* User Management
* SOS Alerts
* Family Management
* File Upload

---

# Screenshots

Add screenshots here after deployment.

Example:

```
screenshots/
    home.png
    login.png
    dashboard.png
    sos.png
    profile.png
```

---

# Future Improvements

* Real-time Emergency Notifications
* Live GPS Tracking
* Google Maps Integration
* Real Phone Call Integration
* SMS Notification Service
* Push Notifications
* AI-based Disaster Alerts
* Deployment on Cloud

---

# Learning Outcomes

This project helped in understanding:

* Full Stack Web Development
* REST API Design
* MongoDB Integration
* JWT Authentication
* Express.js Routing
* File Upload Handling
* Frontend and Backend Integration

---

# Disclaimer

This project was developed for academic and learning purposes.

Some features represent workflow demonstrations and prototype interfaces rather than production-ready emergency services.

---

# Author

**Dendi Bhavya Reddy**

GitHub:
https://github.com/BHAVYA-dendi

- `GET /api/sos/alerts` - Get history
- `PUT /api/sos/resolve/:id` - Resolve alert

### Family
- `POST /api/family` - Add member
- `GET /api/family` - Get members
- `PUT /api/family/:id` - Update member
- `DELETE /api/family/:id` - Remove member

### Upload
- `POST /api/upload/profile` - Upload profile photo
- `POST /api/upload/aadhaar` - Upload Aadhaar

## Environment Variables

Edit `backend/.env`:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/sahaya
JWT_SECRET=your_secret_key_here
JWT_EXPIRE=7d
```

## Default Ports

| Service | Port | URL |
|---------|------|-----|
| Frontend | 8080 | http://localhost:8080 |
| Backend API | 5000 | http://localhost:5000 |
| MongoDB | 27017 | mongodb://localhost:27017 |

## Testing

1. Open frontend in browser
2. Click "New Registration"
3. Complete all 6 steps
4. Login with registered credentials
5. Test SOS button (press for 2 seconds)
6. Navigate through different portals

## Tech Stack

### Frontend
- HTML5
- CSS3 (custom styles)
- JavaScript (vanilla)
- Font Awesome icons
- Google Fonts (Poppins)

### Backend
- Node.js
- Express.js
- MongoDB with Mongoose
- JWT authentication
- bcrypt password hashing
- Multer file uploads

## Troubleshooting

### Backend won't start
- Check MongoDB is running
- Verify `.env` file exists with correct MONGODB_URI
- Check port 5000 is not in use

### Frontend can't connect to backend
- Verify backend is running on port 5000
- Check CORS is enabled in server.js
- Check browser console for errors

### Login not working
- Clear browser localStorage
- Check network tab for API errors
- Verify JWT token is being stored

## Security Notes

- JWT tokens are stored in localStorage
- Passwords are hashed with bcrypt
- File uploads are limited to images (5MB max)
- CORS is enabled for all origins (configure for production)
- MongoDB should use authentication in production

## License

This project is for educational purposes.

## Support

For issues or questions, check the backend README at `backend/README.md`
